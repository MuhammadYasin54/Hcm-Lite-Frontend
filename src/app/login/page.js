"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthLayout, { FormAlert, FormField, SubmitButton } from "@/components/auth/AuthLayout";
import SweetAlert from "@/components/auth/SweetAlert";
import { authApi, ApiError } from "@/lib/api";

const roleHomes = {
  admin: "/admin/dashboard",
  hr: "/hr/dashboard",
  employee: "/employee/dashboard",
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedRole, setSelectedRole] = useState("employee");
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [nextPath, setNextPath] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setBusy(true);

    try {
      const result = await authApi.login({ email: email.trim(), password });
      const user = result?.user ?? result;
      const role = String(user?.role || "").toLowerCase();
      if (role !== selectedRole) {
        setMessage(`This account is not registered as ${selectedRole === "hr" ? "an HR" : `an ${selectedRole}`} account.`);
        return;
      }
      if (!roleHomes[role]) {
        setMessage("The server returned an unrecognized account role. Contact your administrator.");
        return;
      }
      setNextPath(user.mustChangePassword ? "/change-password" : roleHomes[role]);
      setLoginSuccess(true);
      setEmail("");
      setPassword("");
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Sign-in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout>
      <SweetAlert icon="success" title={loginSuccess ? "Login successful" : ""} text="Welcome back to your workspace." onConfirm={() => { setLoginSuccess(false); router.replace(nextPath); router.refresh(); }} />
      <div className="eyebrow auth-eyebrow">Welcome to your workspace</div>
      <h2 className="auth-heading">Sign in to HCM Lite</h2>
      <p className="auth-subheading">Sign in with your work account. Your access is based on your assigned role.</p>

      <div className="login-role-picker" role="group" aria-label="Choose account type">
        {[ ["employee", "Employee"], ["hr", "HR"], ["admin", "Admin"] ].map(([role, label]) => (
          <button key={role} type="button" className={`login-role-option${selectedRole === role ? " login-role-selected" : ""}`} onClick={() => { setSelectedRole(role); setMessage(""); }} aria-pressed={selectedRole === role}>{label}</button>
        ))}
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <FormAlert message={message} />
        <FormField
          id="email"
          label="Work email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
          autoComplete="off"
          disabled={busy}
          inputMode="email"
        />
        <div className="field">
          <div className="field-label-row">
            <label className="field-label" htmlFor="password">Password</label>
          </div>
          <div className="password-wrap">
            <input
              className="field-input"
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete="new-password"
              required
              disabled={busy}
            />
            <button className="password-toggle" type="button" onClick={() => setShowPassword((shown) => !shown)} aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>
        <SubmitButton busy={busy}>Sign in <span aria-hidden="true">→</span></SubmitButton>
      </form>

      <div className="auth-switch">
        New to HCM Lite?
        <Link className="secondary-link" href="/setup"> Create an organization account</Link>
      </div>
      <p className="form-legal">Secure sign-in · Access is determined by your assigned role</p>
    </AuthLayout>
  );
}
