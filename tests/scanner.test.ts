import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { luhn, scanText } from "../src/lib/scanner";
import { validateUpload, MAX_FILE_BYTES } from "../src/lib/upload";
import expected from "./fixtures/additional/EXPECTED_RESULTS.json";

describe("supplied synthetic acceptance fixtures", () => {
  for (const fixture of expected) {
    it(`${fixture.file}: ${fixture.purpose} -> ${fixture.expected_file_risk}`, async () => {
      const bytes = readFileSync(path.join(process.cwd(), "tests", "fixtures", "additional", fixture.file));
      const file = new File([bytes], fixture.file);
      if (fixture.expected_file_risk === "Reject") await expect(validateUpload(file)).rejects.toThrow();
      else expect(scanText(await validateUpload(file)).risk).toBe(fixture.expected_file_risk);
    });
  }
});

describe("detector correctness and privacy", () => {
  it("masks all four types and never returns the source values", () => {
    const raw = ["alex@example.test", "07700 900123", "AB 12 34 56 C", "4111 1111 1111 1111"];
    const result = scanText(raw.join("\n"));
    expect(result.risk).toBe("Critical");
    expect(result.total_findings).toBe(4);
    expect(result.findings).toHaveLength(4);
    raw.forEach((value) => expect(JSON.stringify(result)).not.toContain(value));
    expect(result.findings.map((f) => f.masked_example)).toEqual(["************1111", "AB******C", "07******123", "a***@example.test"]);
  });
  it("counts every occurrence, including more than the reference scanner's 500-match cap", () => {
    expect(scanText("alex@example.test\n".repeat(601)).findings[0].count).toBe(601);
    expect(scanText("4111-1111-1111-1111\n4111-1111-1111-1111").findings[0].count).toBe(2);
  });
  it.each(["alex@@example.test", "a..b@example.test", ".alex@example.test", "alex@-example.test", "alex@example..test", "élex@example.test"])("rejects malformed email %s", (value) => {
    expect(scanText(value).total_findings).toBe(0);
  });
  it.each(["077009001234", "x07700900123", "07700900123x", "+4477009001234", "41111111111111111111", "x4111111111111111", "4111111111111111x"])("does not match a partial numeric candidate %s", (value) => {
    expect(scanText(value).total_findings).toBe(0);
  });
  it.each(["BG123456A", "GB123456A", "KN123456A", "NK123456A", "NT123456A", "TN123456A", "ZZ123456A", "QQ123456C", "AO123456A", "AB123456X", "AB123456 X", "AB1234567C"])("rejects invalid NINO %s", (value) => {
    expect(scanText(value).total_findings).toBe(0);
  });
  it.each(["AB123456", "AB123456A", "ab 12 34 56 c"])("accepts NINO format %s", (value) => {
    expect(scanText(value).risk).toBe("High");
  });
  it.each(["07700 900123", "+44 7700 900123", "020 7946 0123", "(020) 7946 0123", "+44 (0) 7700 900123"])("accepts common UK phone format %s", (value) => {
    expect(scanText(value).risk).toBe("Medium");
  });
  it("handles sentence punctuation, Unicode text, and clean data", () => {
    expect(scanText("Contact alex@example.test.").risk).toBe("Low");
    expect(scanText("Card: 4111 1111 1111 1111. Another: 4111 1111 1111 1111.").findings[0].count).toBe(2);
    expect(scanText("Phone: 07700 900123.").risk).toBe("Medium");
    expect(scanText("Hello 世界, alex@example.test").risk).toBe("Low");
    expect(scanText("Nothing sensitive here.").risk).toBe("None");
  });
  it("validates Luhn and card lengths", () => {
    expect(luhn("4111 1111 1111 1111")).toBe(true);
    expect(luhn("4111-1111-1111-1111")).toBe(true);
    expect(luhn("4111111111111112")).toBe(false);
    expect(luhn("0000000000000000")).toBe(false);
    expect(luhn("79927398713")).toBe(false);
  });
});

describe("upload boundary validation", () => {
  it("accepts exactly 1 MiB", async () => {
    const file = new File(["a".repeat(MAX_FILE_BYTES)], "boundary.txt");
    expect((await validateUpload(file)).length).toBe(MAX_FILE_BYTES);
  });
  it("rejects one byte over 1 MiB", async () => {
    await expect(validateUpload(new File(["a".repeat(MAX_FILE_BYTES + 1)], "large.txt"))).rejects.toThrow("exceeds");
  });
  it("rejects malformed UTF-8 and binary data", async () => {
    await expect(validateUpload(new File([new Uint8Array([0xc3, 0x28])], "invalid.txt"))).rejects.toThrow("UTF-8");
    await expect(validateUpload(new File(["hello\u0000world"], "binary.txt"))).rejects.toThrow("Binary");
  });
  it("rejects unsupported MIME and unsafe filenames", async () => {
    await expect(validateUpload(new File(["hello"], "test.txt", { type: "application/pdf" }))).rejects.toThrow("supported");
    await expect(validateUpload(new File(["hello"], "../test.txt"))).rejects.toThrow("filename");
  });
});
