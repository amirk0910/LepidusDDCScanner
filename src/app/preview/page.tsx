import { z } from "zod";
import { Workspace } from "@/components/workspace";
import { PREVIEW_SCANS } from "@/lib/preview";

export default async function PreviewPage({ searchParams }: { searchParams: Promise<{ view?: string; scan?: string }> }) {
  const params = await searchParams;
  const result = z.enum(["overview", "scan", "findings", "history", "settings"]).safeParse(params.view || "overview");
  const view = result.success ? result.data : "overview";
  return <Workspace key={view} preview scans={PREVIEW_SCANS} view={view} displayName="Alex Morgan" email="alex@example.test" initialScanId={z.uuid().safeParse(params.scan).success ? params.scan : undefined} />;
}
