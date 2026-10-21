import { DETECTORS, highestRisk, type Detector, type Scan } from "./types";

const samples: { filename: string; day: number; types: [Detector, number][] }[] = [
  { filename: "customer-export.csv", day: 0, types: [["email", 18], ["uk_phone", 6], ["payment_card", 4]] },
  { filename: "employee-records.csv", day: 0, types: [["email", 11], ["uk_nino", 8]] },
  { filename: "newsletter-subscribers.csv", day: 1, types: [["email", 46]] },
  { filename: "office-directory.txt", day: 1, types: [["email", 14], ["uk_phone", 14]] },
  { filename: "payment-test-data.csv", day: 2, types: [["payment_card", 12]] },
  { filename: "project-notes.txt", day: 2, types: [] },
  { filename: "onboarding-sample.csv", day: 3, types: [["email", 6], ["uk_nino", 3]] },
  { filename: "contact-list.csv", day: 3, types: [["email", 22], ["uk_phone", 8]] },
  { filename: "billing-fixture.csv", day: 4, types: [["email", 9], ["payment_card", 3]] },
  { filename: "training-readme.txt", day: 4, types: [] },
  { filename: "regional-directory.csv", day: 5, types: [["uk_phone", 7]] },
  { filename: "mailing-fixture.csv", day: 6, types: [["email", 38]] },
];
const examples: Record<Detector, string> = { email: "a***@example.test", uk_phone: "07******123", uk_nino: "AB******C", payment_card: "************1111" };

export const PREVIEW_SCANS: Scan[] = samples.map((sample, index) => {
  const findings = sample.types.map(([detector, count]) => ({ detector, risk: DETECTORS[detector].risk, count, masked_example: examples[detector] }));
  const date = new Date("2026-10-21T09:30:00.000Z");
  date.setUTCDate(date.getUTCDate() - sample.day);
  date.setUTCMinutes(date.getUTCMinutes() - index * 3);
  return {
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    owner_id: "00000000-0000-4000-8000-000000000000",
    filename: sample.filename, created_at: date.toISOString(), size_bytes: 250 + index * 173,
    duration_ms: 12 + index * 2, findings, risk: highestRisk(findings),
    total_findings: findings.reduce((sum, finding) => sum + finding.count, 0),
  };
});
