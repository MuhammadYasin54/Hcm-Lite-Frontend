"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AuthLayout, { FormAlert, FormField, isStrongPassword, PasswordRequirements, SubmitButton } from "@/components/auth/AuthLayout";
import { ApiError, authApi } from "@/lib/api";

export default function SetupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ companyName: "", name: "", email: "", password: "" });
  const [status, setStatus] = useState("loading");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);

  useEffect(() => {
    let active = true;
    authApi.setupStatus()
      .then((result) => {
        if (!active) return;
        const configured = Boolean(result?.isConfigured);
        setStatus(configured ? "configured" : "ready");
        if (configured) setMessage("This organization has already been set up. Sign in to continue.");
      })
      .catch((error) => {
        if (!active) return;
        setStatus("unavailable");
        setMessage(error instanceof ApiError ? error.message : "The setup status could not be verified.");
      });
    return () => { active = false; };
  }, []);

  function update(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (status !== "ready") return;
    if (!isStrongPassword(form.password)) {
      setMessage("Choose a password that meets all the requirements below.");
      return;
    }
    setMessage("");
    setBusy(true);
    try {
      const result = await authApi.setup({
        companyName: form.companyName.trim(),
        admin: { name: form.name.trim(), email: form.email.trim(), password: form.password },
      });
      const user = result?.user ?? result;
      if (String(user?.role || "").toLowerCase() !== "admin") {
        setMessage("The setup response did not confirm an administrator account. Please check the backend configuration.");
        return;
      }
      router.replace("/admin/dashboard");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Organization setup failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const blocked = status !== "ready" || busy;

  return (
    <AuthLayout>
      <Link className="back-link" href="/login"><span aria-hidden="true">←</span>&nbsp; Back to sign in</Link>
      <div className="eyebrow auth-eyebrow">First-time setup</div>
      <h2 className="auth-heading">Create your organization account</h2>
      <p className="auth-subheading">Set up your organization and its first administrator account. Organization settings are managed securely.</p>

      <form className="auth-form" onSubmit={handleSubmit}>
        {status === "loading" ? <FormAlert kind="info" message="Checking setup status…" /> : null}
        {status === "unavailable" ? <FormAlert message={message} /> : null}
        {status === "configured" ? <FormAlert kind="info" message={message} /> : null}
        {status === "ready" && message ? <FormAlert message={message} /> : null}
        <FormField id="companyName" label="Company name" value={form.companyName} onChange={update("companyName")} placeholder="Your organization" autoComplete="organization" disabled={blocked} />
        <div className="form-divider" />
        <FormField id="name" label="Administrator full name" value={form.name} onChange={update("name")} placeholder="Enter your full name" autoComplete="name" disabled={blocked} />
        <FormField id="email" label="Administrator work email" type="email" value={form.email} onChange={update("email")} placeholder="admin@company.com" autoComplete="email" inputMode="email" disabled={blocked} />
        <div className="field">
          <label className="field-label" htmlFor="password">Create a strong password</label>
          <div className="password-wrap">
            <input className="field-input" id="password" name="password" type={passwordVisible ? "text" : "password"} value={form.password} onChange={update("password")} placeholder="Create a strong password" autoComplete="new-password" required minLength={12} maxLength={128} disabled={blocked} aria-describedby="password-requirements" />
            <button className="password-toggle" type="button" onClick={() => setPasswordVisible((visible) => !visible)} aria-label={passwordVisible ? "Hide password" : "Show password"}>
              {passwordVisible ? "Hide" : "Show"}
            </button>
          </div>
          <PasswordRequirements value={form.password} />
        </div>
        <SubmitButton busy={busy}>Create organization account <span aria-hidden="true">→</span></SubmitButton>
        <p className="form-legal">This creates your organization and administrator account, then signs you in.</p>
      </form>
    </AuthLayout>
  );
}
