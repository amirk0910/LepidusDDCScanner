import { DETECTORS, type Scan } from "./types";

export function csvCell(value: string | number): string {
  let text = String(value);
  if (/^[\s\u0000-\u001f]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function exportCsv(scans: Scan[]): string {
  const rows: (string | number)[][] = [["Filename", "Scanned at (UTC)", "File risk", "Data type", "Finding risk", "Occurrences", "Masked example"]];
  for (const scan of scans) {
    if (!scan.findings.length) rows.push([scan.filename, scan.created_at, scan.risk, "No findings", "None", 0, ""]);
    for (const finding of scan.findings) {
      rows.push([scan.filename, scan.created_at, scan.risk, DETECTORS[finding.detector].label, finding.risk, finding.count, finding.masked_example]);
    }
  }
  return "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
