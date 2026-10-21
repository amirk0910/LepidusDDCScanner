import { describe, expect, it } from "vitest";
import { isTrustedOrigin } from "../src/lib/origin";

const post = (url: string, origin?: string) => new Request(url, { method: "POST", headers: origin ? { origin } : {} });

describe("upload origin check", () => {
  it("accepts an exact same-origin request", () => {
    expect(isTrustedOrigin(post("https://app.example.test/api/scans", "https://app.example.test"), false)).toBe(true);
  });
  it("rejects missing and foreign origins", () => {
    expect(isTrustedOrigin(post("http://127.0.0.1:3000/api/scans"), true)).toBe(false);
    expect(isTrustedOrigin(post("http://127.0.0.1:3000/api/scans", "https://evil.example.test"), true)).toBe(false);
    expect(isTrustedOrigin(post("http://127.0.0.1:3000/api/scans", "not a url"), true)).toBe(false);
  });
  it("lets localhost and 127.0.0.1 interchange on the same port in development only", () => {
    const request = post("http://127.0.0.1:3000/api/scans", "http://localhost:3000");
    expect(isTrustedOrigin(request, true)).toBe(true);
    expect(isTrustedOrigin(request, false)).toBe(false);
  });
  it("still rejects a loopback origin on a different port or scheme", () => {
    expect(isTrustedOrigin(post("http://127.0.0.1:3000/api/scans", "http://localhost:4000"), true)).toBe(false);
    expect(isTrustedOrigin(post("http://127.0.0.1:3000/api/scans", "https://localhost:3000"), true)).toBe(false);
  });
});
