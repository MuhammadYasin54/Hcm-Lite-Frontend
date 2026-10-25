import { Suspense } from "react";
import WorkspaceShell from "@/components/workspace/WorkspaceShell";

function RoleWorkspaceFallback() {
  return <section className="workspace-page"><div className="module-loading" role="status">Loading workspace…</div></section>;
}

export function generateStaticParams() {
  return [{ role: "admin" }, { role: "hr" }, { role: "employee" }];
}

async function RoleWorkspace({ children, params }) {
  const { role } = await params;
  return <WorkspaceShell role={role}>{children}</WorkspaceShell>;
}

export default function RoleLayout({ children, params }) {
  return <Suspense fallback={<RoleWorkspaceFallback />}><RoleWorkspace params={params}>{children}</RoleWorkspace></Suspense>;
}
