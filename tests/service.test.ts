import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { scanAndSave } from "../src/lib/scan-service";
import type { Database } from "../src/lib/supabase/database";
import { filterScans, exportFilterSchema } from "../src/lib/filters";
import { PREVIEW_SCANS } from "../src/lib/preview";
import { activity, summarize } from "../src/lib/metrics";

describe("server scan persistence boundary", () => {
  it("sends only masked, aggregated metadata to one atomic database call", async () => {
    const calls: string[] = [];
    const client = createClient<Database>("https://training.supabase.test", "test-publishable-key", {
      auth: { persistSession: false },
      global: { fetch: async (_url, init) => {
        calls.push(String(init?.body));
        return Response.json("11111111-1111-4111-8111-111111111111");
      } },
    });
    const raw = "alex@example.test\n4111 1111 1111 1111\nalex@example.test";
    const result = await scanAndSave(new File([raw], "training.txt"), client);
    expect(calls).toHaveLength(1);
    expect(calls[0]).not.toContain("alex@example.test");
    expect(calls[0]).not.toContain("4111 1111 1111 1111");
    expect(calls[0]).toContain("************1111");
    expect(calls[0]).toContain("a***@example.test");
    expect(result.total_findings).toBe(3);
    expect(Object.keys(JSON.parse(calls[0])).sort()).toEqual(["p_duration_ms", "p_filename", "p_findings", "p_size_bytes"]);
  });
  it("does not write invalid uploads", async () => {
    const fetch = vi.fn();
    const client = createClient<Database>("https://training.supabase.test", "test-key", { global: { fetch } });
    await expect(scanAndSave(new File([""], "empty.txt"), client)).rejects.toThrow("empty");
    await expect(scanAndSave(new File(["hello\0"], "binary.txt"), client)).rejects.toThrow("Binary");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("surfaces database failure without logging exception contents", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const client = createClient<Database>("https://training.supabase.test", "test-key", {
      global: { fetch: async () => Response.json({ code: "23514", message: "DO NOT LOG SOURCE CONTENT" }, { status: 400 }) },
    });
    try {
      await expect(scanAndSave(new File(["alex@example.test"], "sample.txt"), client)).rejects.toThrow("could not be saved");
      expect(log.mock.calls.flat().join(" ")).not.toContain("DO NOT LOG SOURCE CONTENT");
      expect(log).toHaveBeenCalled();
    } finally { log.mockRestore(); }
  });
});

describe("dashboard, filters, and export share correct totals", () => {
  it("derives totals from records rather than illustrative hardcoded metrics", () => {
    const summary = summarize(PREVIEW_SCANS);
    expect(summary.files).toBe(12);
    expect(summary.findings).toBe(229);
    expect(summary.critical).toBe(3);
    expect(summary.high).toBe(2);
    expect(summary.distribution.reduce((sum, item) => sum + item.value, 0)).toBe(12);
  });
  it("filters occurrence counts by type and risk, not just file risk", () => {
    const filters = exportFilterSchema.parse({ scope: "findings", detector: "email", risk: "Low" });
    const filtered = filterScans(PREVIEW_SCANS, filters);
    expect(filtered).toHaveLength(8);
    expect(filtered.every((scan) => scan.findings.every((finding) => finding.detector === "email" && finding.risk === "Low"))).toBe(true);
    expect(filtered.reduce((sum, scan) => sum + scan.findings.reduce((n, finding) => n + finding.count, 0), 0)).toBe(164);
  });
  it("filters history by highest file risk and filenames", () => {
    expect(filterScans(PREVIEW_SCANS, exportFilterSchema.parse({ risk: "Critical" }))).toHaveLength(3);
    expect(filterScans(PREVIEW_SCANS, exportFilterSchema.parse({ search: "CUSTOMER" }))).toHaveLength(1);
    expect(filterScans(PREVIEW_SCANS, exportFilterSchema.parse({ scope: "findings", scan: PREVIEW_SCANS[5].id }))).toHaveLength(0);
  });
  it("generates UTC activity without losing occurrence totals", () => {
    const trend = activity(PREVIEW_SCANS, 7, new Date("2026-10-21T12:00:00Z"));
    expect(trend.values).toHaveLength(7);
    expect(trend.labels[6]).toBe("21 Oct");
    expect(trend.values.reduce((sum, value) => sum + value, 0)).toBe(229);
  });
});
