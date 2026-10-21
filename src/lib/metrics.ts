import { RISKS, type Scan } from "./types";

export function summarize(scans: Scan[]) {
  return {
    files: scans.length,
    findings: scans.reduce((sum, scan) => sum + scan.total_findings, 0),
    critical: scans.filter((scan) => scan.risk === "Critical").length,
    high: scans.filter((scan) => scan.risk === "High").length,
    distribution: [...RISKS].reverse().map((risk) => ({ risk, value: scans.filter((scan) => scan.risk === risk).length })),
  };
}

export function activity(scans: Scan[], days: number, now = new Date()) {
  const dates = Array.from({ length: days }, (_, index) => {
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() - (days - 1 - index));
    return date;
  });
  const labels = dates.map((date) => date.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }));
  const values = dates.map((date) => scans.filter((scan) => scan.created_at.slice(0, 10) === date.toISOString().slice(0, 10)).reduce((sum, scan) => sum + scan.total_findings, 0));
  return { labels, values };
}
