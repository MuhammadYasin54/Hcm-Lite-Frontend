"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { apiRequest } from "@/lib/api";
import { Brand } from "@/components/auth/AuthLayout";

const navigation = {
  admin: [
    { label: "Dashboard", path: "/admin/dashboard", icon: "▦", active: true },
    { label: "Organization setup", path: "/admin/organization/settings", icon: "⌂" },
    { label: "Employees", path: "/admin/employees", icon: "♙" },
    { label: "Attendance", path: "/admin/attendance", icon: "◷" },
    { label: "Leave", path: "/admin/leave", icon: "▤" },
    { label: "Payroll", path: "/admin/payroll", icon: "＄" },
    { label: "Analytics", path: "/admin/analytics", icon: "⌁" },
    { label: "Announcements", path: "/admin/announcements", icon: "◉" },
    { label: "Notifications", path: "/admin/notifications", icon: "♧" },
    { label: "Audit log", path: "/admin/audit", icon: "≡" },
    { label: "AI assistant", path: "/admin/assistant", icon: "✦" },
  ],
  hr: [
    { label: "Dashboard", path: "/hr/dashboard", icon: "▦", active: true },
    { label: "Employees", path: "/hr/employees", icon: "♙" },
    { label: "Attendance", path: "/hr/attendance", icon: "◷" },
    { label: "Leave inbox", path: "/hr/leave", icon: "▤" },
    { label: "Payroll", path: "/hr/payroll", icon: "＄" },
    { label: "Analytics", path: "/hr/analytics", icon: "⌁" },
    { label: "Announcements", path: "/hr/announcements", icon: "◉" },
    { label: "Notifications", path: "/hr/notifications", icon: "♧" },
    { label: "AI assistant", path: "/hr/assistant", icon: "✦" },
  ],
  employee: [
    { label: "Dashboard", path: "/employee/dashboard", icon: "▦", active: true },
    { label: "Attendance", path: "/employee/attendance", icon: "◷" },
    { label: "My leave", path: "/employee/leave", icon: "▤" },
    { label: "Payslips", path: "/employee/payslips", icon: "＄" },
    { label: "My profile", path: "/employee/profile", icon: "♙" },
    { label: "Announcements", path: "/employee/announcements", icon: "◉" },
    { label: "Notifications", path: "/employee/notifications", icon: "♧" },
    { label: "AI assistant", path: "/employee/assistant", icon: "✦" },
  
  ],
};

const roleNames = { admin: "Administrator", hr: "Human Resources", employee: "Employee" };

export default function WorkspaceShell({ role, children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const items = navigation[role] || [];

  async function signOut() {
    setSigningOut(true);
    try { await apiRequest("/auth/logout", { method: "POST" }); }
    catch { /* Leave the workspace even if the session endpoint is temporarily unavailable. */ }
    finally { router.replace("/login"); router.refresh(); }
  }

  return (
    <div className="workspace-shell">
      <button className="mobile-menu-toggle" type="button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}>
        <span /> <span /> <span />
      </button>
      {menuOpen ? <button className="mobile-scrim" type="button" onClick={() => setMenuOpen(false)} aria-label="Close navigation menu" /> : null}
      <aside className={`workspace-sidebar${menuOpen ? " workspace-sidebar-open" : ""}`}>
        <div className="workspace-brand"><Brand /></div>
        <div className="workspace-role"><span className="role-indicator" />{roleNames[role] || "Workspace"}</div>
        <nav className="workspace-nav" aria-label={`${roleNames[role] || "Workspace"} navigation`}>
          <div className="workspace-nav-label">WORKSPACE</div>
          {items.map((item) => {
            const active = pathname === item.path;
            const implemented = true;
            return implemented ? (
              <Link className={`workspace-nav-item${active ? " workspace-nav-active" : ""}`} href={item.path} key={item.path} onClick={() => setMenuOpen(false)}>
                <span className="nav-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span>
              </Link>
            ) : (
              <div className="workspace-nav-item workspace-nav-pending" key={item.path} title="This module is coming soon" aria-disabled="true">
                <span className="nav-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span><span className="nav-pending-dot" aria-label="Not yet available" />
              </div>
            );
          })}
        </nav>
        <div className="workspace-sidebar-bottom">
          <div className="sidebar-help"><span className="help-spark">✓</span><div><strong>Role-based access</strong><span>Your data stays in scope</span></div></div>
          <button className="workspace-signout" type="button" onClick={signOut} disabled={signingOut}>
            <span aria-hidden="true">↪</span>{signingOut ? "Signing out…" : "Sign out"}
          </button>
          <div className="workspace-version">HCM Lite <span>·</span> Secure workspace</div>
        </div>
      </aside>
      <main className="workspace-main">{children}</main>
    </div>
  );
}
