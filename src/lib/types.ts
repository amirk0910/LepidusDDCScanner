export const RISKS = ["None", "Low", "Medium", "High", "Critical"] as const;
export type Risk = typeof RISKS[number];
export type Detector = "email" | "uk_phone" | "uk_nino" | "payment_card";

export const DETECTORS: Record<Detector, { label: string; risk: Risk; description: string }> = {
  email: { label: "Email address", risk: "Low", description: "Common email formats with validated domain labels." },
  uk_phone: { label: "UK phone number", risk: "Medium", description: "UK mobile and geographic numbers in local or +44 format." },
  uk_nino: { label: "National Insurance", risk: "High", description: "UK NINO format and permitted prefixes. Not identity verification." },
  payment_card: { label: "Payment card", risk: "Critical", description: "13-19 digit candidates that pass a Luhn checksum. Not card verification." },
};

export interface Finding {
  detector: Detector;
  risk: Risk;
  count: number;
  masked_example: string;
}

export interface Scan {
  id: string;
  owner_id: string;
  filename: string;
  size_bytes: number;
  duration_ms: number;
  risk: Risk;
  total_findings: number;
  created_at: string;
  findings: Finding[];
}

export type WorkspaceView = "overview" | "scan" | "history" | "findings" | "settings";

export function highestRisk(findings: Finding[]): Risk {
  return findings.reduce<Risk>((highest, finding) =>
    RISKS.indexOf(finding.risk) > RISKS.indexOf(highest) ? finding.risk : highest, "None");
}
