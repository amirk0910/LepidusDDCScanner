import { describe, expect, it } from "vitest";
import { csvCell, exportCsv } from "../src/lib/csv";
import type { Scan } from "../src/lib/types";

describe("spreadsheet-safe export", () => {
  it.each(["=SUM(1,2)", "+cmd", "-1+2", "@SUM(A1)", "  =cmd", "\t=cmd", "\r=cmd", "\n=cmd"])("neutralizes %j", (value) => {
    expect(csvCell(value).startsWith('"\'')).toBe(true);
  });
  it("quotes commas, double quotes and newlines", () => {
    expect(csvCell('a,"b"\nc')).toBe('"a,""b""\nc"');
  });
  it("exports only explicit masked fields, and includes clean scans", () => {
    const scans: Scan[] = [{
      id: "scan", owner_id: "owner", filename: "=SUM(1,2).csv", size_bytes: 100, duration_ms: 1,
      created_at: "2026-01-01T00:00:00Z", risk: "Low", total_findings: 1,
      findings: [{ detector: "email", risk: "Low", count: 1, masked_example: "a***@example.test" }],
    }, {
      id: "clean", owner_id: "owner", filename: "safe.txt", size_bytes: 1, duration_ms: 1,
      created_at: "2026-01-01T00:00:00Z", risk: "None", total_findings: 0, findings: [],
    }];
    const csv = exportCsv(scans);
    expect(csv).toContain('"\'=SUM(1,2).csv"');
    expect(csv).toContain("a***@example.test");
    expect(csv).toContain("No findings");
    expect(csv).not.toContain("owner");
    expect(csv.startsWith("\uFEFF")).toBe(true);
  });
});
