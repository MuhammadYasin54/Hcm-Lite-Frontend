"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ApiError, apiRequest } from "@/lib/api";

const validRoles = ["admin", "hr", "employee"];

const roleCopy = {
  admin: { title: "Company overview", description: "Company-wide people operations at a glance." },
  hr: { title: "People operations", description: "Your team activity and approvals, all in one place." },
  employee: { title: "Your workspace", description: "Your attendance, leave and updates in one place." },
};

const dashboardShortcuts = {
  admin: [
    { label: "Employees", detail: "Manage your team", href: "/admin/employees", icon: "♙" },
    { label: "Attendance", detail: "Review daily activity", href: "/admin/attendance", icon: "◷" },
    { label: "Leave", detail: "View leave requests", href: "/admin/leave", icon: "▤" },
    { label: "Announcements", detail: "Share a company update", href: "/admin/announcements", icon: "◉" },
  ],
  hr: [
    { label: "Employees", detail: "People directory", href: "/hr/employees", icon: "♙" },
    { label: "Leave inbox", detail: "Review team requests", href: "/hr/leave", icon: "▤" },
    { label: "Payroll", detail: "Prepare a monthly draft", href: "/hr/payroll", icon: "＄" },
    { label: "Announcements", detail: "Post a company update", href: "/hr/announcements", icon: "◉" },
  ],
  employee: [
    { label: "Attendance", detail: "View your attendance", href: "/employee/attendance", icon: "◷" },
    { label: "My leave", detail: "Check balance or request leave", href: "/employee/leave", icon: "▤" },
    { label: "Payslips", detail: "View your pay history", href: "/employee/payslips", icon: "＄" },
    { label: "My profile", detail: "Review your details", href: "/employee/profile", icon: "♙" },
  ],
};

function formatMetric(metric) {
  if (metric.value === null || metric.value === undefined) return "—";
  if (metric.format === "currency") {
    return new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(Number(metric.value));
  }
  if (metric.format === "percent") return `${Number(metric.value).toLocaleString()}%`;
  return Number.isFinite(Number(metric.value)) ? Number(metric.value).toLocaleString() : String(metric.value);
}

export default function RoleDashboard() {
  const params = useParams();
  const router = useRouter();
  const role = params?.role;
  const [state, setState] = useState({ status: "loading", user: null, data: null, message: "" });
  const [filters, setFilters] = useState({ from: "", to: "", departmentId: "" });
  const [appliedFilters, setAppliedFilters] = useState({ from: "", to: "", departmentId: "" });

  const loadDashboard = useCallback(async () => {
    if (!validRoles.includes(role)) {
      setState({ status: "error", user: null, data: null, message: "This account role is not recognized." });
      return;
    }
    setState((current) => ({ ...current, status: "loading", message: "" }));
    try {
      const profile = await apiRequest("/auth/me");
      const user = profile?.user ?? profile;
      if (user?.mustChangePassword) { router.replace("/change-password"); return; }
      const actualRole = String(user?.role || "").toLowerCase();
      if (!actualRole || actualRole !== role) {
        const home = { admin: "/admin/dashboard", hr: "/hr/dashboard", employee: "/employee/dashboard" }[actualRole];
        if (home) router.replace(home);
        else router.replace("/login");
        return;
      }
      const query = new URLSearchParams();
      Object.entries(appliedFilters).forEach(([key, value]) => { if (value) query.set(key, value); });
      const suffix = query.size ? `?${query.toString()}` : "";
      const data = await apiRequest(`/dashboards/${role}${suffix}`);
      setState({ status: "ready", user, data, message: "" });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        router.replace("/login");
        return;
      }
      setState({
        status: "error",
        user: null,
        data: null,
        message: error instanceof ApiError ? error.message : "The dashboard could not be loaded.",
      });
    }
  }, [appliedFilters, role, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadDashboard(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadDashboard]);

  if (!validRoles.includes(role)) {
    return <section className="workspace-page"><div className="workspace-error"><h1>Page not found</h1><p>A dashboard is not available for this account role.</p></div></section>;
  }

  const copy = roleCopy[role];
  const displayName = state.user?.name || [state.user?.firstName, state.user?.lastName].filter(Boolean).join(" ");
  const metrics = Array.isArray(state.data?.metrics) ? state.data.metrics : [];
  const insights = Array.isArray(state.data?.insights) ? state.data.insights : [];

  return (
    <section className="workspace-page">
      <div className="workspace-page-heading">
        <div>
          <div className="workspace-eyebrow">{role} dashboard</div>
          <h1>{copy.title}</h1>
          <p>{copy.description}</p>
        </div>
        <button className="workspace-refresh" type="button" onClick={loadDashboard} disabled={state.status === "loading"}>
          <span className={state.status === "loading" ? "refresh-spinner" : ""} aria-hidden="true">↻</span> {state.status === "loading" ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <section className={`dashboard-welcome dashboard-welcome-${role}`}>
        <div><span className="dashboard-welcome-kicker">{displayName ? `Welcome back, ${displayName}` : `Welcome to your ${role} workspace`}</span><h2>{role === "employee" ? "Your workday, at a glance." : role === "hr" ? "Your people operations hub." : "Your company, at a glance."}</h2><p>Pick up where you left off or jump straight to a workspace task.</p></div>
        <div className="dashboard-welcome-art" aria-hidden="true"><span>✦</span><i /><i /><i /></div>
      </section>

      {role !== "employee" ? <form className="dashboard-filters" onSubmit={(event) => { event.preventDefault(); setAppliedFilters(filters); }}>
        <label>From <input type="date" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} /></label>
        <label>To <input type="date" value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} /></label>
        <label>Department ID <input value={filters.departmentId} onChange={(event) => setFilters((current) => ({ ...current, departmentId: event.target.value }))} placeholder="All departments" /></label>
        <button className="module-secondary-action" type="submit">Apply filters</button>
      </form> : <form className="dashboard-filters" onSubmit={(event) => { event.preventDefault(); setAppliedFilters(filters); }}>
        <label>From <input type="date" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} /></label>
        <label>To <input type="date" value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} /></label>
        <button className="module-secondary-action" type="submit">Apply dates</button>
      </form>}

      {state.status === "loading" ? (
        <div className="metric-grid" aria-label="Loading dashboard" aria-busy="true">
          {[1, 2, 3, 4].map((item) => <div className="metric-skeleton" key={item}><span /><strong /></div>)}
        </div>
      ) : null}

      {state.status === "error" ? (
        <div className="workspace-error" role="alert">
          <div className="workspace-error-icon">!</div>
          <div><h2>Unable to load dashboard</h2><p>{state.message}</p>
            <button className="workspace-retry" type="button" onClick={loadDashboard}>Try again</button>
          </div>
        </div>
      ) : null}

      {state.status === "ready" ? (
        <>
          {metrics.length ? (
            <div className="metric-grid">
              {metrics.map((metric, index) => (
                <article className={`metric-card metric-accent-${index % 4}`} key={metric.key || metric.label}>
                  <div className="metric-label">{metric.label}</div>
                  <div className="metric-value">{formatMetric(metric)}</div>
                  {metric.change ? <div className="metric-change">{metric.change}</div> : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="workspace-empty">
              <div className="workspace-empty-icon" aria-hidden="true">✳</div>
              <h2>No dashboard data yet</h2>
              <p>Metrics will appear here as records are added to your organization.</p>
            </div>
          )}
          <section className="dashboard-shortcuts" aria-label="Quick links">
            <div className="dashboard-section-heading"><div><span>QUICK LINKS</span><h2>Go to a workspace</h2></div></div>
            <div className="dashboard-shortcut-grid">{dashboardShortcuts[role].map((item) => <Link className="dashboard-shortcut" href={item.href} key={item.href}><span className="dashboard-shortcut-icon" aria-hidden="true">{item.icon}</span><span className="dashboard-shortcut-copy"><strong>{item.label}</strong><small>{item.detail}</small></span><span className="dashboard-shortcut-arrow" aria-hidden="true">↗</span></Link>)}</div>
          </section>
          {insights.length ? (
            <section className="insights-panel">
              <div className="insights-title"><span>✦</span><div><h2>Dashboard insights</h2><p>A summary based on current data</p></div></div>
              <ul>{insights.map((item, index) => <li key={item.id || `${index}-${item.text || item}`}>{item.text || item}</li>)}</ul>
            </section>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
