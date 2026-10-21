import { notFound } from "next/navigation";
import { Workspace } from "@/components/workspace";
import { readScans } from "@/lib/records";
import { requirePageUser } from "@/lib/supabase/server";
import type { WorkspaceView } from "@/lib/types";
import { z } from "zod";

export const dynamic = "force-dynamic";

export default async function DashboardPage({ params, searchParams }: {
  params: Promise<{ section?: string[] }>;
  searchParams: Promise<{ scan?: string }>;
}) {
  const { client, user } = await requirePageUser();
  const { section } = await params;
  const { scan } = await searchParams;
  const key = section?.[0] || "overview";
  if ((section?.length || 0) > 1 || !["overview", "scan", "history", "findings", "settings"].includes(key)) notFound();
  const view = z.enum(["overview", "scan", "history", "findings", "settings"]).parse(key) satisfies WorkspaceView;
  const scans = await readScans(client, user.id);
  const name = typeof user.user_metadata.display_name === "string" ? user.user_metadata.display_name : user.email?.split("@")[0] || "User";
  return <Workspace key={view} scans={scans} view={view} displayName={name} email={user.email || "Email not available"} initialScanId={z.uuid().safeParse(scan).success ? scan : undefined} />;
}
