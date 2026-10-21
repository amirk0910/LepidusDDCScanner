"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { z } from "zod";
import type { Scan, WorkspaceView } from "@/lib/types";
import { Workspace } from "./workspace";

const VIEWS: readonly WorkspaceView[] = ["overview", "scan", "history", "findings", "settings"];

export function DashboardClient({ scans, displayName, email }: { scans: Scan[]; displayName: string; email: string }) {
  const segment = usePathname().split("/")[2] || "overview";
  const view = VIEWS.find((item) => item === segment) ?? "overview";
  const scan = useSearchParams().get("scan");
  const scanId = scan && z.uuid().safeParse(scan).success ? scan : undefined;
  return <Workspace key={`${view}:${scanId ?? ""}`} scans={scans} view={view} displayName={displayName} email={email} initialScanId={scanId} />;
}
