import { DETECTORS, highestRisk, type Detector, type Finding } from "./types";

export function luhn(value: string): boolean {
  const digits = value.replace(/[ -]/g, "");
  if (!/^\d{13,19}$/.test(digits) || /^(\d)\1+$/.test(digits)) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (double) n = n * 2 > 9 ? n * 2 - 9 : n * 2;
    sum += n;
    double = !double;
  }
  return sum % 10 === 0;
}

function mask(detector: Detector, value: string): string {
  if (detector === "email") {
    const [local, domain] = value.split("@");
    return `${local[0]}***@${domain.toLowerCase()}`;
  }
  const compact = value.replace(/[\s()-]/g, "").toUpperCase();
  if (detector === "uk_nino") return `${compact.slice(0, 2)}******${/[A-D]$/.test(compact) ? compact.slice(-1) : ""}`;
  const digits = compact.replace(/\D/g, "");
  if (detector === "uk_phone") return `${digits.startsWith("44") ? "+44" : digits.slice(0, 2)}******${digits.slice(-3)}`;
  return `${"*".repeat(digits.length - 4)}${digits.slice(-4)}`;
}

export function scanText(input: string) {
  const text = input.replace(/\u00a0/g, " ");
  const occupied = new Uint8Array(text.length);
  const findings = new Map<Detector, Finding>();
  const add = (detector: Detector, value: string, index: number) => {
    for (let i = index; i < index + value.length; i++) if (occupied[i]) return;
    occupied.fill(1, index, index + value.length);
    const existing = findings.get(detector);
    if (existing) existing.count++;
    else findings.set(detector, { detector, risk: DETECTORS[detector].risk, count: 1, masked_example: mask(detector, value) });
  };

  // Consume complete numeric runs so an oversized/invalid candidate cannot yield a valid substring.
  const numbers = [...text.matchAll(/\+?(?:\(\d|\d)(?:[\d \t()-]*\d)?\)?/g)].filter((match) => {
    const before = text[match.index - 1] || "";
    const after = text[match.index + match[0].length] || "";
    const end = match.index + match[0].length;
    return !/[\p{L}\p{N}_+-]/u.test(before) && !/[\p{L}\p{N}_+-]/u.test(after) &&
      !(before === "." && /\d/.test(text[match.index - 2] || "")) &&
      !(after === "." && /\d/.test(text[end + 1] || ""));
  });
  for (const match of numbers) {
    if (/^[\d -]+$/.test(match[0]) && luhn(match[0])) add("payment_card", match[0], match.index);
  }
  for (const match of text.matchAll(/(?<![\p{L}\p{N}])[A-Z]{2}(?:[ \t]*\d){6}(?:[ \t]*[A-Z])?(?![\p{L}\p{N}])/giu)) {
    const value = match[0].replace(/\s/g, "").toUpperCase();
    if (/^[ABCEGHJKLMNOPRSTWXYZ][ABCEGHJKLMNPRSTWXYZ]\d{6}[A-D]?$/.test(value) &&
        !/^(BG|GB|KN|NK|NT|TN|ZZ)/.test(value)) add("uk_nino", match[0], match.index);
  }
  for (const match of numbers) {
    const value = match[0].replace(/[ \t()-]/g, "");
    const balanced = (match[0].match(/\(/g) || []).length === (match[0].match(/\)/g) || []).length;
    if (balanced && /^(?:0[127]\d{9}|\+44(?:0)?[127]\d{9})$/.test(value)) add("uk_phone", match[0], match.index);
  }
  for (const match of text.matchAll(/(?<![\p{L}\p{N}._%+@-])[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,63}(?![\p{L}\p{N}_%+@-])/giu)) {
    const [local, domain] = match[0].split("@");
    if (local.length <= 64 && domain.length <= 253 && !local.startsWith(".") && !local.endsWith(".") &&
        !local.includes("..") && domain.split(".").every((label) => /^[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?$/i.test(label))) {
      add("email", match[0], match.index);
    }
  }
  const result = [...findings.values()];
  return { risk: highestRisk(result), total_findings: result.reduce((sum, finding) => sum + finding.count, 0), findings: result };
}
