import { z } from "zod";
import { RISKS, type Scan } from "./types";

export const exportFilterSchema = z.object({
  scope: z.enum(["scans", "findings"]).default("scans"),
  risk: z.enum(["All", ...RISKS]).default("All"),
  detector: z.enum(["All", "email", "uk_phone", "uk_nino", "payment_card"]).default("All"),
  search: z.string().max(255).default(""),
  scan: z.uuid().optional(),
});
export type ExportFilters = z.infer<typeof exportFilterSchema>;

export function filterScans(scans: Scan[], filters: ExportFilters): Scan[] {
  return scans.flatMap((scan) => {
    if (filters.scan && scan.id !== filters.scan) return [];
    if (!scan.filename.toLowerCase().includes(filters.search.toLowerCase())) return [];
    if (filters.scope === "scans") return filters.risk === "All" || scan.risk === filters.risk ? [scan] : [];
    const findings = scan.findings.filter((finding) =>
      (filters.risk === "All" || finding.risk === filters.risk) &&
      (filters.detector === "All" || finding.detector === filters.detector));
    return findings.length ? [{ ...scan, findings }] : [];
  });
}
