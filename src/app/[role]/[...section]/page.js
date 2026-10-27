"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ApiError, apiRequest, downloadApiFile } from "@/lib/api";
import { moduleDefinitions, organizationSections } from "@/lib/modules";
import FaceAttendanceCheckIn from "@/components/workspace/FaceAttendanceCheckIn";
import SweetAlert from "@/components/auth/SweetAlert";
import ReviewDecisionDialog from "@/components/workspace/ReviewDecisionDialog";

function unwrapRows(result) {
  if (Array.isArray(result)) return result;
  if (!result || typeof result !== "object") return [];
  for (const key of ["items", "records", "employees", "requests", "runs", "announcements", "notifications", "attendance", "entries", "data"]) {
    if (Array.isArray(result[key])) return result[key];
  }
  return [];
}

function displayValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") {
    const simpleValue = value.name || value.label || value.email;
    if (simpleValue) return simpleValue;
    return Object.entries(value).map(([key, nested]) => `${columnLabel(key)}: ${displayValue(nested)}`).join(", ") || "—";
  }
  if (typeof value === "string" && /^\d{4}-\d\d-\d\dT/.test(value)) return new Date(value).toLocaleString();
  return String(value);
}

function columnLabel(key) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
}

function currentLocalDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

const assistantPrompts = {
  admin: ["What are practical priorities for growing a business?", "What should a fair salary increase policy include?", "How can we reduce employee turnover?"],
  hr: ["What should our salary increase policy include?", "How can we make performance reviews fair?", "What helps improve employee retention?"],
  employee: ["How many leaves are pending?", "What is my attendance this month?", "How many late arrivals this month?", "Show my current payslip"],
};

function FormFields({ fields, values, onChange, disabled, referenceData = {} }) {
  return fields.map((field) => (
    <div className="module-field" key={field.name}>
      <label htmlFor={`module-${field.name}`}>{field.label}</label>
      {field.name === "body" || field.name === "reason" ? (
        <textarea id={`module-${field.name}`} value={values[field.name] || ""} onChange={(event) => onChange(field.name, event.target.value)} placeholder={field.placeholder || ""} required={field.required !== false} disabled={disabled} rows={3} />
      ) : field.options || field.optionsKey ? (
        <select id={`module-${field.name}`} name={field.name} value={values[field.name] ?? ""} onChange={(event) => onChange(field.name, event.target.value)} required={field.required !== false} disabled={disabled}>
          <option value="">Select {field.label.toLowerCase()}</option>
          {(field.options || referenceData[field.optionsKey] || []).map((option) => {
            const value = option.value ?? option.id ?? option._id ?? option.name;
            const label = option.label ?? option.name ?? option.employeeName ?? value;
            return <option key={String(value)} value={String(value)}>{label}</option>;
          })}
        </select>
      ) : (
        <input id={`module-${field.name}`} name={field.name} type={field.type || "text"} value={Array.isArray(values[field.name]) ? values[field.name].join(",") : values[field.name] ?? ""} onChange={(event) => onChange(field.name, event.target.value)} placeholder={field.placeholder || ""} required={field.required !== false} disabled={disabled} />
      )}
    </div>
  ));
}

function ModuleTable({ rows, columns, onAction, actionLabel, disabled, canAct }) {
  const visibleColumns = columns?.length ? columns : (rows[0] ? Object.keys(rows[0]).filter((key) => !["_id", "__v", "password", "updatedAt"].includes(key)).slice(0, 6) : []);
  if (!rows.length) return null;
  return (
    <div className="module-table-wrap">
      <table className="module-table">
        <thead><tr>{visibleColumns.map((column) => <th key={column}>{columnLabel(column)}</th>)}{actionLabel ? <th>Action</th> : null}</tr></thead>
        <tbody>
          {rows.map((row, index) => {
            const id = row.id || row._id;
            return <tr key={id || index}>
              {visibleColumns.map((column) => <td key={column}>{displayValue(row[column])}</td>)}
              {actionLabel ? <td><button className="module-row-action" type="button" onClick={() => onAction(row)} disabled={disabled || (canAct ? !canAct(row) : false)}>{actionLabel}</button></td> : null}
            </tr>;
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function WorkspaceModulePage() {
  const route = useParams();
  const router = useRouter();
  const role = route?.role;
  const section = Array.isArray(route?.section) ? route.section.join("/") : "";
  const definition = moduleDefinitions[role]?.[section];
  const [pageState, setPageState] = useState({ status: "loading", message: "", result: null });
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [employeePage, setEmployeePage] = useState(1);
  const [chatInput, setChatInput] = useState("");
  const [chat, setChat] = useState([]);
  const chatEndRef = useRef(null);
  const [smartPrompt, setSmartPrompt] = useState("");
  const [smartLoading, setSmartLoading] = useState(false);
  const [smartSuggestion, setSmartSuggestion] = useState(null);
  const [salaryForm, setSalaryForm] = useState({ employeeId: "", basic: "", housingAllowance: "", medicalAllowance: "", otherAllowances: "" });
  const [employeeDetail, setEmployeeDetail] = useState(null);
  const [employeeEdit, setEmployeeEdit] = useState({});
  const [analyticsFilters, setAnalyticsFilters] = useState({ from: "", to: "", departmentId: "" });
  const [appliedAnalyticsFilters, setAppliedAnalyticsFilters] = useState({ from: "", to: "", departmentId: "" });
  const [referenceData, setReferenceData] = useState({});
  const [temporaryCredential, setTemporaryCredential] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [attendanceDate, setAttendanceDate] = useState(currentLocalDate);
  const [attendanceMonth, setAttendanceMonth] = useState(() => currentLocalDate().slice(0, 7));
  const [showCameraCheckIn, setShowCameraCheckIn] = useState(false);
  const [leaveToCancel, setLeaveToCancel] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewError, setReviewError] = useState("");

  const listEndpoint = useMemo(() => {
    if (!definition) return "";
    if (definition.search) {
      const params = new URLSearchParams({ page: String(employeePage), pageSize: "20" });
      if (appliedQuery.trim()) params.set("q", appliedQuery.trim());
      return `${definition.endpoint}?${params.toString()}`;
    }
    if (["attendance-admin", "attendance-hr"].includes(definition.kind)) return `${definition.endpoint}?date=${encodeURIComponent(attendanceDate)}`;
    return definition.endpoint;
  }, [appliedQuery, attendanceDate, definition, employeePage]);

  const load = useCallback(async () => {
    if (!definition) return;
    setPageState({ status: "loading", message: "", result: null });
    try {
      const profileResult = await apiRequest("/auth/me");
      const user = profileResult?.user ?? profileResult;
      if (user?.mustChangePassword) { router.replace("/change-password"); return; }
      if (String(user?.role || "").toLowerCase() !== role) {
        const home = { admin: "/admin/dashboard", hr: "/hr/dashboard", employee: "/employee/dashboard" }[String(user?.role || "").toLowerCase()];
        router.replace(home || "/login");
        return;
      }
      if (definition.kind === "assistant") {
        setPageState({ status: "ready", message: "", result: null });
        return;
      }
      const referencePaths = new Set();
      for (const field of [...(definition.fields || []), ...(definition.editFields || [])]) {
        if (field.optionsKey === "departments") referencePaths.add("departments");
        if (field.optionsKey === "designations") referencePaths.add("designations");
        if (field.optionsKey === "leaveTypes") referencePaths.add("leave-types");
      }
      if (referencePaths.size) {
        const pairs = await Promise.all([...referencePaths].map(async (resource) => [resource, unwrapRows(await apiRequest(`/organization/${resource}`))]));
        setReferenceData(Object.fromEntries(pairs.map(([resource, values]) => [resource === "leave-types" ? "leaveTypes" : resource, values])));
      } else setReferenceData({});
      let result;
      if (["attendance-hr", "attendance-employee"].includes(definition.kind)) {
        let attendancePath = listEndpoint;
        if (definition.kind === "attendance-employee") {
          const [year, month] = attendanceMonth.split("-").map(Number);
          const lastDay = new Date(year, month, 0).getDate();
          attendancePath = `/attendance/calendar?from=${attendanceMonth}-01&to=${attendanceMonth}-${String(lastDay).padStart(2, "0")}`;
        }
        const [attendance, corrections] = await Promise.all([apiRequest(attendancePath), apiRequest("/attendance/corrections")]);
        result = { records: unwrapRows(attendance), corrections: unwrapRows(corrections) };
      } else if (definition.kind === "leave-employee") {
        const [requests, balance] = await Promise.all([
          apiRequest(listEndpoint),
          apiRequest("/leave/balance"),
        ]);
        result = { records: unwrapRows(requests), balance };
      } else if (definition.kind === "payroll-hr") {
        const [runs, salaryStructures] = await Promise.all([
          apiRequest(listEndpoint),
          apiRequest("/payroll/salary-structures"),
        ]);
        result = { records: unwrapRows(runs), salaryStructures: unwrapRows(salaryStructures) };
      } else {
        let endpoint = listEndpoint;
        if (definition.kind === "analytics") {
          const query = new URLSearchParams();
          Object.entries(appliedAnalyticsFilters).forEach(([key, value]) => { if (value) query.set(key, value); });
          endpoint = `${definition.endpoint}${query.size ? `?${query.toString()}` : ""}`;
        }
        result = await apiRequest(endpoint);
      }
      const single = ["settings", "profile", "analytics"].includes(definition.kind);
      const compound = ["attendance-hr", "attendance-employee", "leave-employee", "payroll-hr"].includes(definition.kind);
      const loaded = single || compound ? result : unwrapRows(result);
      setPageState({ status: "ready", message: "", result: loaded, meta: result?.meta || null });
      if (single && loaded && typeof loaded === "object") {
        setForm((current) => Object.keys(current).length || !definition.fields?.length ? current : Object.fromEntries(definition.fields.map((field) => [field.name, loaded[field.name] ?? ""])));
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) { router.replace("/login"); return; }
      setPageState({ status: "error", message: error instanceof ApiError ? error.message : "Unable to load data.", result: null, meta: null });
    }
  }, [appliedAnalyticsFilters, attendanceMonth, definition, listEndpoint, role, router]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setForm({}); setNotice(""); setEmployeeDetail(null); setTemporaryCredential(null); setReferenceData({}); setEditingId(null);
    setEmployeePage(1); setQuery(""); setAppliedQuery(""); setChat([]); setSmartSuggestion(null);
  }, [role, section]);

  useEffect(() => {
    if (chat.length) chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [busy, chat]);

  function setField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function useCurrentOfficeLocation() {
    if (!navigator.geolocation) {
      setNotice("Location is not supported by this browser.");
      return;
    }
    setNotice("Getting the office location from this device…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setForm((current) => ({ ...current, officeLatitude: String(coords.latitude), officeLongitude: String(coords.longitude) }));
        setNotice("Office coordinates filled in. Confirm this device is at the office, then save settings.");
      },
      () => setNotice("Could not get your location. Allow location access and try again while at the office."),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    );
  }

  function makePayload(fields = definition?.fields || []) {
    const payload = {};
    for (const field of fields) {
      const value = form[field.name];
      if (value === undefined) continue;
      if (value === "" && ["officeLatitude", "officeLongitude"].includes(field.name)) { payload[field.name] = null; continue; }
      if (value === "") continue;
      if (field.name === "weekendDays") payload[field.name] = typeof value === "string" ? value.split(",").map((day) => Number(day.trim())) : value;
      else if (field.type === "number") payload[field.name] = Number(value);
      else payload[field.name] = value;
    }
    return payload;
  }

  async function submitForm(event) {
    event.preventDefault();
    if (!definition?.fields?.length) return;
    setNotice("");
    setBusy(true);
    try {
      const endpoint = editingId ? `${definition.endpoint}/${encodeURIComponent(editingId)}` : definition.submitPath || definition.endpoint;
      const saved = await apiRequest(endpoint, { method: editingId ? "PATCH" : definition.method || "POST", body: JSON.stringify(makePayload()) });
      if (saved?.temporaryPassword) {
        setTemporaryCredential({ login: saved.employee?.email || saved.user?.email || form.email, password: saved.temporaryPassword });
        setNotice("Account created. The temporary password is displayed only once.");
      } else setNotice("Your request was saved successfully.");
      if (definition.kind !== "settings" && definition.kind !== "profile") setForm({});
      setEditingId(null);
      await load();
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : "Unable to save changes. Please try again.");
    } finally { setBusy(false); }
  }

  async function rowAction(row) {
    const id = row.id || row._id;
    if (!id) { setNotice("The server response did not include a record ID."); return; }
    let path = "";
    let body = null;
    let method = "PATCH";
    if (definition.kind === "employees") {
      setBusy(true);
      setNotice("");
      try {
        const response = await apiRequest(`/employees/${encodeURIComponent(id)}`);
        const employee = response?.employee ?? response;
        setEmployeeDetail(employee);
        if (role === "hr") {
          const fields = moduleDefinitions.hr.employees.editFields;
          setEmployeeEdit(Object.fromEntries(fields.map((field) => [field.name, employee[field.name] ?? ""])));
        }
      } catch (error) {
        setNotice(error instanceof ApiError ? error.message : "Unable to load employee details.");
      } finally { setBusy(false); }
      return;
    } else if (section.startsWith("organization/") && definition.kind === "collection") {
      setEditingId(id);
      setForm(Object.fromEntries(definition.fields.map((field) => {
        const value = row[field.name];
        return [field.name, value === null || value === undefined ? "" : field.options ? String(value) : value];
      })));
      setNotice("Record edit mode mein hai.");
      return;
    } else if (definition.kind === "leave-hr" || definition.kind === "attendance-hr") {
      setReviewTarget({ ...row, id, reviewKind: definition.kind });
      setReviewComment("");
      setReviewError("");
      return;
    } else if (definition.kind === "leave-employee") {
      setLeaveToCancel(id);
      return;
    } else if (definition.kind === "payroll-admin") {
      if (!window.confirm("Finalize this payroll run? A finalized run cannot be edited.")) return;
      path = `/payroll/runs/${encodeURIComponent(id)}/finalize`;
      body = {};
      method = "POST";
    } else if (definition.kind === "notifications") {
      path = `/notifications/${encodeURIComponent(id)}/read`;
      body = {};
    } else if (definition.kind === "users") {
      const action = window.prompt("reset-password, activate, ya deactivate likhein:");
      if (!action) return;
      if (action === "reset-password") { path = `/organization/users/${encodeURIComponent(id)}`; body = { action }; }
      else if (["activate", "deactivate"].includes(action)) { path = `/organization/users/${encodeURIComponent(id)}`; body = { active: action === "activate" }; }
      else { setNotice("Action reset-password, activate, ya deactivate hona chahiye."); return; }
    } else if (definition.kind === "payslips") {
      setBusy(true);
      setNotice("");
      try {
        await downloadApiFile(`/payroll/payslips/${encodeURIComponent(id)}/pdf`, `payslip-${row.period || id}.pdf`);
        setNotice("Payslip download shuru ho gayi.");
      } catch (error) {
        setNotice(error instanceof ApiError ? error.message : "Unable to download the payslip.");
      } finally { setBusy(false); }
      return;
    } else return;

    setBusy(true);
    setNotice("");
    try {
      const result = await apiRequest(path, { method, body: JSON.stringify(body) });
      if (result?.temporaryPassword) {
        setTemporaryCredential({ login: result.user?.email || row.email, password: result.temporaryPassword });
        setNotice("Password reset successfully. The temporary password is displayed only once.");
      } else setNotice("Changes saved successfully.");
      await load();
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : "Unable to complete this action.");
    } finally { setBusy(false); }
  }

  async function submitReviewDecision(decision) {
    if (!reviewTarget) return;
    const comment = reviewComment.trim();
    if (!comment) { setReviewError("Please add a comment before approving or rejecting."); return; }
    const isLeave = reviewTarget.reviewKind === "leave-hr";
    const path = isLeave
      ? `/leave/requests/${encodeURIComponent(reviewTarget.id)}/decision`
      : `/attendance/corrections/${encodeURIComponent(reviewTarget.id)}`;
    const body = isLeave ? { status: decision, comment } : { decision, comment };
    setBusy(true);
    setReviewError("");
    setNotice("");
    try {
      await apiRequest(path, { method: "PATCH", body: JSON.stringify(body) });
      setReviewTarget(null);
      setReviewComment("");
      setNotice(decision === "approved" ? "Request approved successfully." : "Request rejected successfully.");
      await load();
    } catch (error) {
      setReviewError(error instanceof ApiError ? error.message : "Unable to save this review decision.");
    } finally { setBusy(false); }
  }

  async function confirmCancelLeave() {
    if (!leaveToCancel) return;
    setBusy(true);
    setLeaveToCancel(null);
    try {
      await apiRequest(`/leave/requests/${encodeURIComponent(leaveToCancel)}/cancel`, { method: "POST", body: JSON.stringify({}) });
      setNotice("Leave request cancelled successfully.");
      await load();
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : "Unable to cancel this leave request.");
    } finally { setBusy(false); }
  }

  async function attendanceAction(action) {
    setBusy(true);
    setNotice("");
    try {
      await apiRequest(`/attendance/${action}`, { method: "POST", body: JSON.stringify({}) });
      setNotice(action === "check-in" ? "Check-in recorded successfully." : "Check-out recorded successfully.");
      await load();
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : "Unable to update attendance.");
    } finally { setBusy(false); }
  }

  async function saveSalaryStructure(event) {
    event.preventDefault();
    if (!salaryForm.employeeId.trim()) { setNotice("Employee ID is required."); return; }
    setNotice("");
    setBusy(true);
    const numeric = (value) => value === "" ? undefined : Number(value);
    try {
      await apiRequest(`/payroll/salary-structures/${encodeURIComponent(salaryForm.employeeId.trim())}`, {
        method: "PUT",
        body: JSON.stringify({
          basic: numeric(salaryForm.basic),
          allowances: {
            housing: numeric(salaryForm.housingAllowance),
            medical: numeric(salaryForm.medicalAllowance),
            other: numeric(salaryForm.otherAllowances),
          },
        }),
      });
      setNotice("Salary structure save ho gayi. Payroll calculations backend karega.");
      setSalaryForm({ employeeId: "", basic: "", housingAllowance: "", medicalAllowance: "", otherAllowances: "" });
      await load();
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : "Unable to save the salary structure.");
    } finally { setBusy(false); }
  }

  async function saveEmployeeEdit(event) {
    event.preventDefault();
    const id = employeeDetail?.id || employeeDetail?._id;
    if (!id) return;
    setBusy(true);
    setNotice("");
    try {
      const fields = moduleDefinitions.hr.employees.editFields;
      const payload = Object.fromEntries(fields.filter((field) => employeeEdit[field.name] !== undefined && employeeEdit[field.name] !== "").map((field) => [field.name, field.type === "number" ? Number(employeeEdit[field.name]) : employeeEdit[field.name]]));
      const response = await apiRequest(`/employees/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(payload) });
      setEmployeeDetail(response?.employee ?? response);
      setNotice("Employee profile update ho gayi.");
      await load();
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : "Unable to save the employee profile.");
    } finally { setBusy(false); }
  }

  async function sendChat(event) {
    if (typeof event !== "string") event?.preventDefault();
    const text = (typeof event === "string" ? event : chatInput).trim();
    if (!text || busy) return;
    setChat((items) => [...items, { role: "user", text }]);
    setChatInput("");
    setBusy(true);
    try {
      const answer = await apiRequest(definition.endpoint, { method: "POST", body: JSON.stringify({ message: text }) });
      const reply = answer?.answer || answer?.message || answer?.response;
      setChat((items) => [...items, { role: answer?.available === false ? "error" : "assistant", text: reply || "The assistant did not return a response. Please try again." }]);
    } catch (error) {
      setChat((items) => [...items, { role: "error", text: error instanceof ApiError ? error.message : "Unable to reach the AI assistant." }]);
    } finally { setBusy(false); }
  }

  async function suggestSmartLeave(event) {
    event.preventDefault();
    if (!smartPrompt.trim()) return;
    setSmartLoading(true);
    setNotice("");
    try {
      const suggestion = await apiRequest("/ai/smart-leave", { method: "POST", body: JSON.stringify({ prompt: smartPrompt.trim() }) });
      const parsed = suggestion?.suggestion ?? suggestion?.leave ?? suggestion;
      setSmartSuggestion(parsed);
      setForm((current) => ({ ...current, type: parsed.type || "", startDate: parsed.startDate || parsed.start || "", endDate: parsed.endDate || parsed.end || "", reason: parsed.reason || "" }));
      setNotice("The AI suggestion was added to the form. Review the details before submitting.");
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : "Unable to generate a leave suggestion.");
    } finally { setSmartLoading(false); }
  }

  if (!definition) {
    return <section className="workspace-page"><div className="workspace-error"><div><h1>Module not found</h1><p>This route is not available for your account role.</p></div></div></section>;
  }

  const rows = definition.kind === "settings" || definition.kind === "profile" ? [] : unwrapRows(pageState.result);
  const rawBalance = pageState.result?.balance;
  const balanceItems = Array.isArray(rawBalance?.balances) ? rawBalance.balances : Array.isArray(rawBalance) ? rawBalance : Object.entries(rawBalance || {}).filter(([key, value]) => !["employeeId", "year"].includes(key) && (typeof value !== "object" || value === null)).map(([type, remaining]) => ({ type, remaining }));
  const actionLabel = definition.kind === "employees" ? "Employee 360" : definition.kind === "users" ? "Manage" : section.startsWith("organization/") && role === "admin" && definition.kind === "collection" ? "Edit" : definition.kind === "leave-hr" || definition.kind === "attendance-hr" ? "Review" : definition.kind === "payroll-admin" ? "Finalize" : definition.kind === "notifications" ? "Mark read" : definition.kind === "payslips" ? "Download PDF" : definition.kind === "leave-employee" ? "Cancel" : "";
  const mainActionLabel = definition.kind === "attendance-hr" ? "" : actionLabel;
  const canAct = (row) => {
    const status = String(row.status || "").toLowerCase();
    if (["leave-hr", "attendance-hr"].includes(definition.kind)) return !status || status === "pending";
    if (definition.kind === "payroll-admin") return status !== "finalized";
    if (definition.kind === "notifications") return !row.readAt;
    if (definition.kind === "users") return row.role !== "admin";
    if (definition.kind === "leave-employee") return status === "pending" || status === "approved";
    return true;
  };

  return (
    <section className="workspace-page">
      <SweetAlert icon="warning" title={leaveToCancel ? "Cancel leave request?" : ""} text="This leave request will be cancelled." confirmText="Yes, cancel it" cancelText="Keep request" onConfirm={confirmCancelLeave} onCancel={() => setLeaveToCancel(null)} />
      <ReviewDecisionDialog request={reviewTarget} comment={reviewComment} onCommentChange={(value) => { setReviewComment(value); setReviewError(""); }} onClose={() => { if (!busy) { setReviewTarget(null); setReviewError(""); } }} onDecision={submitReviewDecision} busy={busy} error={reviewError} />
      <div className="workspace-page-heading">
        <div className="workspace-heading-copy"><div className="workspace-eyebrow">{role} workspace</div><h1>{definition.title}</h1><p>{definition.description}</p></div>
        <button className="workspace-refresh" type="button" onClick={load} disabled={pageState.status === "loading"}><span className={pageState.status === "loading" ? "refresh-spinner" : ""} aria-hidden="true">↻</span> {pageState.status === "loading" ? "Refreshing…" : "Refresh"}</button>
      </div>

      {section.startsWith("organization/") ? <nav className="module-subnav" aria-label="Organization sections">{organizationSections.map(([key, label]) => <a className={section === `organization/${key}` ? "module-subnav-active" : ""} href={`/admin/organization/${key}`} key={key}>{label}</a>)}</nav> : null}

      {pageState.status === "loading" ? <div className="module-loading" role="status"><span className="loading-dot module-spinner" />Loading data…</div> : null}
      {pageState.status === "error" ? <div className="workspace-error" role="alert"><div className="workspace-error-icon">!</div><div><h2>Unable to load data</h2><p>{pageState.message}</p><button className="workspace-retry" type="button" onClick={load}>Try again</button></div></div> : null}
      {notice ? <div className={`module-notice${/could not|unable|error|failed|invalid|incorrect/i.test(notice) ? " module-notice-error" : ""}`} role="status">{notice}</div> : null}
      {temporaryCredential ? <div className="module-notice" role="alert"><strong>Temporary password (shown once):</strong> <code>{temporaryCredential.password}</code>{temporaryCredential.login ? <span> · Login: {temporaryCredential.login}</span> : null}<button className="module-secondary-action" type="button" onClick={async () => { await navigator.clipboard.writeText(temporaryCredential.password); setNotice("Temporary password copied to the clipboard."); }}>Copy password</button><button className="module-secondary-action" type="button" onClick={() => setTemporaryCredential(null)}>Hide</button><p>Share this password securely. The employee must change it at first sign-in.</p></div> : null}

      {definition.kind === "assistant" && pageState.status === "ready" ? (
        <div className={`assistant-panel${chat.length ? " assistant-panel-active" : ""}`}>
          {!chat.length ? <>
            <div className="assistant-welcome-card"><div className="assistant-welcome-icon" aria-hidden="true">✦</div><div><span className="assistant-welcome-kicker">HCM LITE · AI ASSISTANT</span><h2>{role === "employee" ? "Your work assistant" : "Your business and HR assistant"}</h2><p>{role === "employee" ? "Ask about your attendance, leave, or payslip." : "Ask about business operations, HR practices, workplace policies, or company records."}</p></div></div>
            {assistantPrompts[role] ? <div className="assistant-quick-prompts" aria-label="Suggested questions">{assistantPrompts[role].map((question) => <button key={question} type="button" className="assistant-prompt-chip" onClick={() => sendChat(question)} disabled={busy}><span aria-hidden="true">✦</span>{question}<span className="assistant-prompt-arrow" aria-hidden="true">↗</span></button>)}</div> : null}
          </> : <div className="assistant-messages" aria-live="polite">{chat.map((item, index) => <div className={`assistant-message assistant-${item.role}`} key={`${index}-${item.text}`}><span>{item.role === "user" ? "You" : item.role === "assistant" ? "HCM assistant" : "Assistant notice"}</span><p>{item.text}</p></div>)}{busy ? <div className="assistant-message assistant-thinking"><span>HCM assistant</span><p><i className="assistant-thinking-spinner" aria-hidden="true" /> Thinking through your question…</p></div> : null}<div ref={chatEndRef} /></div>}
          <form className="assistant-compose" onSubmit={sendChat}><textarea aria-label="Enter your question" rows={2} value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder={role === "employee" ? "Ask about your work…" : "Ask about your business or HR…"} disabled={busy} /><button type="submit" className="primary-button" disabled={busy || !chatInput.trim()}>{busy ? "Thinking…" : <>Send <span aria-hidden="true">↗</span></>}</button></form>
        </div>
      ) : null}

      {definition.kind === "analytics" && pageState.status === "ready" ? (
        <div className="module-analytics">
          <form className="dashboard-filters" onSubmit={(event) => { event.preventDefault(); setAppliedAnalyticsFilters(analyticsFilters); }}>
            <label>From <input type="date" value={analyticsFilters.from} onChange={(event) => setAnalyticsFilters((current) => ({ ...current, from: event.target.value }))} /></label>
            <label>To <input type="date" value={analyticsFilters.to} onChange={(event) => setAnalyticsFilters((current) => ({ ...current, to: event.target.value }))} /></label>
            {role !== "employee" ? <label>Department ID <input value={analyticsFilters.departmentId} onChange={(event) => setAnalyticsFilters((current) => ({ ...current, departmentId: event.target.value }))} placeholder="All departments" /></label> : null}
            <button className="module-secondary-action" type="submit">Apply filters</button>
          </form>
          {(Array.isArray(pageState.result?.metrics) ? pageState.result.metrics : []).length ? <div className="metric-grid">{pageState.result.metrics.map((metric, index) => <article className={`metric-card metric-accent-${index % 4}`} key={metric.key || metric.label}><div className="metric-label">{metric.label}</div><div className="metric-value">{displayValue(metric.value)}</div></article>)}</div> : <div className="workspace-empty"><div className="workspace-empty-icon">⌁</div><h2>No analytics data available</h2><p>Dashboard metrics will appear here as your organization records activity.</p></div>}
          {Array.isArray(pageState.result?.insights) && pageState.result.insights.length ? <ul className="analytics-insights">{pageState.result.insights.map((insight, index) => <li key={insight.id || index}>{insight.text || insight}</li>)}</ul> : null}
          {notice.startsWith("AI summary:") ? <p className="analytics-insights">{notice.slice("AI summary:".length).trim()}</p> : null}
          <button className="module-secondary-action" type="button" disabled={busy} onClick={async () => { setBusy(true); try { const result = await apiRequest("/dashboards/summary", { method: "POST", body: JSON.stringify({ filters: appliedAnalyticsFilters }) }); setNotice(`AI summary: ${result?.summary || "The summary is currently unavailable."}`); } catch (error) { setNotice(error instanceof ApiError ? error.message : "Unable to generate an AI summary."); } finally { setBusy(false); } }}>Summarize current dashboard</button>
        </div>
      ) : null}

      {definition.kind === "attendance-employee" && pageState.status === "ready" ? <div className="module-action-bar"><button className="primary-button" type="button" onClick={() => setShowCameraCheckIn(true)} disabled={busy}>Camera check-in</button><button className="module-secondary-action" type="button" onClick={() => attendanceAction("check-out")} disabled={busy}>Check out</button><label>Attendance month <input type="month" value={attendanceMonth} onChange={(event) => { if (event.target.value) setAttendanceMonth(event.target.value); }} disabled={busy} /></label><span className="module-helper">Your check-in time is recorded by the server.</span></div> : null}
      {showCameraCheckIn ? <FaceAttendanceCheckIn onClose={() => setShowCameraCheckIn(false)} onSuccess={async () => { setShowCameraCheckIn(false); setNotice("Camera attendance check-in recorded successfully."); await load(); }} /> : null}
      {["attendance-admin", "attendance-hr"].includes(definition.kind) && pageState.status === "ready" ? <div className="module-action-bar"><label>Attendance date <input type="date" value={attendanceDate} onChange={(event) => { if (event.target.value) setAttendanceDate(event.target.value); }} disabled={busy} /></label>{definition.kind === "attendance-hr" ? <span className="module-helper">A comment is required when approving or rejecting a correction.</span> : null}</div> : null}

      {definition.kind === "leave-employee" && pageState.status === "ready" ? <form className="smart-leave-form" onSubmit={suggestSmartLeave}><label htmlFor="smart-leave">Describe your leave in your own words</label><div className="smart-leave-row"><input id="smart-leave" value={smartPrompt} onChange={(event) => setSmartPrompt(event.target.value)} placeholder="Example: I need leave next Monday for a personal commitment" disabled={smartLoading} /><button className="module-secondary-action" type="submit" disabled={smartLoading || !smartPrompt.trim()}>{smartLoading ? "Generating suggestion…" : "Suggest with AI"}</button></div>{smartSuggestion ? <p className="module-helper">Review the AI suggestion and submit the form below to confirm it.</p> : null}</form> : null}

      {definition.kind === "leave-employee" && pageState.status === "ready" ? <section className="leave-balance-panel"><div className="module-card-heading"><div><h2>My leave balance</h2><p>Balance provided by the server after approved leave usage.</p></div></div>{balanceItems.length ? <div className="balance-grid">{balanceItems.map((item, index) => <div className="balance-item" key={item.type || item.id || index}><span>{columnLabel(item.type || item.name || "Leave")}</span><strong>{displayValue(item.remaining ?? item.balance ?? item.value)}</strong>{item.quota !== undefined ? <small>of {displayValue(item.quota)} days</small> : null}</div>)}</div> : <div className="module-empty"><p>Leave balance is currently unavailable.</p></div>}</section> : null}

      {definition.search && pageState.status === "ready" ? <form className="module-search" onSubmit={(event) => { event.preventDefault(); setEmployeePage(1); setAppliedQuery(query); }}><input aria-label="Search employees" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, email, or employee code" /><button className="module-secondary-action" type="submit">Search</button></form> : null}

      {definition.fields?.length && pageState.status === "ready" ? (
        <form className="module-form-card" onSubmit={submitForm}>
          <div className="module-card-heading"><div><h2>{definition.kind === "settings" || definition.kind === "profile" ? "Edit details" : editingId ? `Edit ${definition.title.toLowerCase().replace(/s$/, "")}` : definition.kind === "payroll-hr" ? "Create monthly draft" : `Add ${definition.title.toLowerCase().replace(/s$/, "")}`}</h2></div>{definition.kind === "settings" && role === "admin" ? <button type="button" className="module-secondary-action" onClick={useCurrentOfficeLocation} disabled={busy}>Use this device location</button> : null}{editingId ? <button type="button" className="module-secondary-action" onClick={() => { setEditingId(null); setForm({}); }}>Cancel edit</button> : null}</div>
          <div className="module-form-grid"><FormFields fields={definition.fields} values={form} onChange={setField} disabled={busy} referenceData={referenceData} /></div>
          <div className="module-form-actions"><button type="submit" className="primary-button" disabled={busy}>{busy ? "Saving…" : editingId || definition.method === "PATCH" ? "Save changes" : "Save"}</button>{definition.kind === "payroll-hr" ? <span className="module-helper">It will be finalized by Admin.</span> : null}</div>
        </form>
      ) : null}

      {definition.kind === "payroll-hr" && pageState.status === "ready" ? <form className="module-form-card" onSubmit={saveSalaryStructure}>
        <div className="module-card-heading"><div><h2>Salary structure</h2><p>Enter the base salary and allowances. The server calculates tax, gross pay, and deductions.</p></div></div>
        <div className="module-form-grid">
          <div className="module-field"><label htmlFor="salary-employeeId">Employee</label><select id="salary-employeeId" value={salaryForm.employeeId} onChange={(event) => setSalaryForm((current) => ({ ...current, employeeId: event.target.value }))} required disabled={busy}><option value="">Select employee</option>{(pageState.result?.salaryStructures || []).map((employee) => <option key={employee.employeeId} value={employee.employeeId}>{employee.employeeName} · {employee.employeeCode}</option>)}</select></div>
          {[{ name: "basic", label: "Basic salary (PKR)", type: "number" }, { name: "housingAllowance", label: "Housing allowance (PKR)", type: "number" }, { name: "medicalAllowance", label: "Medical allowance (PKR)", type: "number" }, { name: "otherAllowances", label: "Other allowances (PKR)", type: "number" }].map((field) => <div className="module-field" key={field.name}><label htmlFor={`salary-${field.name}`}>{field.label}</label><input id={`salary-${field.name}`} type={field.type} value={salaryForm[field.name]} onChange={(event) => setSalaryForm((current) => ({ ...current, [field.name]: event.target.value }))} required={field.name === "basic"} disabled={busy} /></div>)}
        </div>
        <div className="module-form-actions"><button className="primary-button" type="submit" disabled={busy}>{busy ? "Saving…" : "Save salary structure"}</button></div>
      </form> : null}

      {definition.kind === "payroll-admin" && pageState.status === "ready" ? <p className="module-helper module-lock-note">Confirmation will be taken before finalization, after finalization payroll will be locked.</p> : null}

      {definition.kind === "employees" && employeeDetail ? <section className="module-data-card employee-detail-panel"><div className="module-card-heading"><div><h2>Employee 360</h2><p>{displayValue(employeeDetail.firstName)} {displayValue(employeeDetail.lastName)} · {displayValue(employeeDetail.email)}</p></div><button className="module-secondary-action" type="button" onClick={() => setEmployeeDetail(null)}>Close</button></div>
        {role === "hr" ? <form onSubmit={saveEmployeeEdit}><div className="module-form-grid"><FormFields fields={moduleDefinitions.hr.employees.editFields} values={employeeEdit} onChange={(name, value) => setEmployeeEdit((current) => ({ ...current, [name]: value }))} disabled={busy} referenceData={referenceData} /></div><div className="module-form-actions"><button className="primary-button" type="submit" disabled={busy}>{busy ? "Saving…" : "Save employee changes"}</button></div></form> : <dl className="employee-detail-grid">{Object.entries(employeeDetail).filter(([key]) => !["_id", "__v", "password", "updatedAt"].includes(key)).map(([key, value]) => <div key={key}><dt>{columnLabel(key)}</dt><dd>{displayValue(value)}</dd></div>)}</dl>}
      </section> : null}

      {pageState.status === "ready" && !["assistant", "analytics", "settings", "profile"].includes(definition.kind) ? (
        <section className="module-data-card"><div className="module-card-heading"><div><h2>{definition.kind === "attendance-employee" ? "My attendance records" : definition.kind === "leave-employee" ? "My leave requests" : "Records"}</h2><p>{rows.length ? `${rows.length} server record${rows.length === 1 ? "" : "s"}` : ""}</p></div></div>
          {rows.length ? <ModuleTable rows={rows} columns={definition.columns} actionLabel={mainActionLabel} onAction={rowAction} disabled={busy} canAct={canAct} /> : <div className="module-empty"><span aria-hidden="true">◌</span><h3>No records yet</h3><p>Records will appear here when data is available in this module.</p></div>}
          {definition.search && pageState.meta ? <div className="module-pagination"><span>{pageState.meta.total ?? rows.length} employees · Page {pageState.meta.page || employeePage}</span><div><button type="button" onClick={() => setEmployeePage((current) => Math.max(1, current - 1))} disabled={(pageState.meta.page || employeePage) <= 1 || pageState.status !== "ready"}>Previous</button><button type="button" onClick={() => setEmployeePage((current) => current + 1)} disabled={(pageState.meta.page || employeePage) * (pageState.meta.pageSize || 20) >= (pageState.meta.total || 0) || pageState.status !== "ready"}>Next</button></div></div> : null}
          {["attendance-hr", "attendance-employee"].includes(definition.kind) ? <div className="module-secondary-table"><div className="module-card-heading"><div><h2>Correction requests</h2><p>Requests and their statuses are loaded from the server.</p></div></div>{pageState.result?.corrections?.length ? <ModuleTable rows={pageState.result.corrections} columns={["employeeName", "date", "requestedCheckIn", "requestedCheckOut", "reason", "status"]} actionLabel={definition.kind === "attendance-hr" ? "Review" : ""} onAction={rowAction} disabled={busy} canAct={canAct} /> : <div className="module-empty"><h3>No pending corrections</h3><p>New requests will appear here.</p></div>}</div> : null}
          {definition.kind === "payroll-hr" ? <div className="module-secondary-table"><div className="module-card-heading"><div><h2>Salary structures</h2><p>Current structures received from the server.</p></div></div>{pageState.result?.salaryStructures?.length ? <ModuleTable rows={pageState.result.salaryStructures} columns={["employeeName", "employeeId", "basic", "allowances", "updatedAt"]} /> : <div className="module-empty"><h3>No salary structures yet</h3><p>HR salary structures yahan dikhengi.</p></div>}</div> : null}
        </section>
      ) : null}
    </section>
  );
}
