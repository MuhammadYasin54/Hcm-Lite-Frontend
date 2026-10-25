"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthLayout, { FormAlert, FormField, isStrongPassword, PasswordRequirements, SubmitButton } from "@/components/auth/AuthLayout";
import { ApiError, apiRequest } from "@/lib/api";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event) {
    event.preventDefault();
    setMessage("");
    if (newPassword !== confirmPassword) {
      setMessage("The new password and confirmation do not match.");
      return;
    }
    if (!isStrongPassword(newPassword)) {
      setMessage("Choose a password that meets all the requirements below.");
      return;
    }
    setBusy(true);
    try {
      const profile = await apiRequest("/auth/me");
      await apiRequest("/auth/password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const user = profile?.user ?? profile;
      const role = String(user?.role || "").toLowerCase();
      const target = { admin: "/admin/dashboard", hr: "/hr/dashboard", employee: "/employee/dashboard" }[role];
      if (!target) throw new Error("Your account role could not be verified.");
      router.replace(target);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "The password could not be updated. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout>
      <div className="eyebrow auth-eyebrow">Account security</div>
      <h1 className="auth-heading">Change your password</h1>
      <p className="auth-subheading">For your security, set a new password before continuing.</p>
      <form className="auth-form" onSubmit={submit}>
        <FormAlert message={message} />
        <FormField id="currentPassword" label="Temporary password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" disabled={busy} />
        <FormField id="newPassword" label="New password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" minLength={12} maxLength={128} disabled={busy} />
        <PasswordRequirements value={newPassword} />
        <FormField id="confirmPassword" label="Confirm new password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" disabled={busy} />
        <SubmitButton busy={busy}>Update password</SubmitButton>
      </form>
    </AuthLayout>
  );
}
