import { describe, expect, it } from "vitest";
import { MAX_REQUEST_BYTES, readUpload } from "../src/lib/upload";

function request(body: FormData) {
  return new Request("http://localhost:3000/api/scans", { method: "POST", body });
}

describe("bounded server multipart parsing", () => {
  it("accepts a single consented file", async () => {
    const form = new FormData();
    form.set("file", new File(["hello"], "sample.txt"));
    form.set("synthetic", "true");
    const file = await readUpload(request(form));
    expect(file.name).toBe("sample.txt");
    expect(await file.text()).toBe("hello");
  });
  it("rejects missing consent, missing files, and multiple files", async () => {
    const form = new FormData();
    form.set("file", new File(["hello"], "sample.txt"));
    await expect(readUpload(request(form))).rejects.toThrow("Confirm");
    form.set("synthetic", "true");
    form.append("file", new File(["world"], "other.txt"));
    await expect(readUpload(request(form))).rejects.toThrow("exactly one");
    await expect(readUpload(request(new FormData()))).rejects.toThrow("exactly one");
  });
  it("rejects oversized declared and streamed bodies before form parsing", async () => {
    const declared = new Request("http://localhost/api/scans", {
      method: "POST", headers: { "content-length": String(MAX_REQUEST_BYTES + 1) }, body: "x",
    });
    await expect(readUpload(declared)).rejects.toThrow("too large");
    const streamed = new Request("http://localhost/api/scans", {
      method: "POST", headers: { "content-type": "multipart/form-data; boundary=test" },
      body: new Blob(["x".repeat(MAX_REQUEST_BYTES + 1)]),
    });
    await expect(readUpload(streamed)).rejects.toThrow("too large");
  });
  it("rejects malformed multipart and unsupported request types", async () => {
    await expect(readUpload(new Request("http://localhost", { method: "POST", body: "hello" }))).rejects.toThrow("multipart");
    await expect(readUpload(new Request("http://localhost", { method: "POST", body: "broken", headers: { "content-type": "multipart/form-data; boundary=test" } }))).rejects.toThrow("malformed");
  });
});
