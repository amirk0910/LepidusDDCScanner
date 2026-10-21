import { createClient } from "@supabase/supabase-js";

// Black-box test of the deployed (or local) API using the two synthetic test accounts.
// Usage: node --use-system-ca --env-file=.env.local scripts/test-live-api.mjs [baseUrl]
const base = (process.argv[2] || "http://127.0.0.1:3000").replace(/\/$/, "");
const { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key } = process.env;
const creds = {
  A: { email: process.env.TEST_USER_A_EMAIL, password: process.env.TEST_USER_A_PASSWORD },
  B: { email: process.env.TEST_USER_B_EMAIL, password: process.env.TEST_USER_B_PASSWORD },
};
if (!url || !key || Object.values(creds).some((c) => !c.email || !c.password)) {
  console.error("Missing Supabase or TEST_USER_* environment variables.");
  process.exit(2);
}

const ref = new URL(url).hostname.split(".")[0];
async function login({ email, password }) {
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Sign-in failed: ${error.message}`);
  const value = "base64-" + Buffer.from(JSON.stringify(data.session)).toString("base64url");
  const parts = value.match(/.{1,3000}/g);
  const cookie = parts.length === 1 ? `sb-${ref}-auth-token=${value}` : parts.map((part, i) => `sb-${ref}-auth-token.${i}=${part}`).join("; ");
  return { client, cookie, id: data.user.id };
}

const results = [];
const check = (name, pass, detail = "") => {
  results.push(pass);
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${pass || !detail ? "" : ` -> ${detail}`}`);
};
const origin = new URL(base).origin;
const upload = (cookie, file, extra = {}) => {
  const form = new FormData();
  form.set("file", file);
  form.set("synthetic", "true");
  return fetch(`${base}/api/scans`, { method: "POST", body: form, headers: { origin, ...(cookie ? { cookie } : {}), ...extra } });
};
const get = (path, cookie) => fetch(`${base}${path}`, { headers: cookie ? { cookie } : {} });

const raw = { email: "alex@example.test", phone: "07700 900123", nino: "AB 12 34 56 C", card: "4111 1111 1111 1111" };
const content = `email,phone,nino,card\n${raw.email},${raw.phone},${raw.nino},${raw.card}\n${raw.email},,,\n`;
const filename = "=SUM(1,2)-live-test.csv";

console.log(`Target: ${base}`);
const a = await login(creds.A);
const b = await login(creds.B);
const created = [];

try {
  check("Unauthenticated upload is rejected (401)", (await upload(null, new File([content], "x.csv"))).status === 401);
  check("Unauthenticated history and export are rejected (401)", (await get("/api/scans")).status === 401 && (await get("/api/export")).status === 401);
  check("Cross-origin upload is rejected (403)", (await upload(a.cookie, new File([content], "x.csv"), { origin: "https://evil.example" })).status === 403);

  const before = (await get("/api/scans", a.cookie).then((r) => r.json())).scans?.length;
  check("Authenticated history loads", Number.isInteger(before));

  const bad = [
    ["empty file", new File([""], "empty.txt"), 400],
    ["unsupported extension", new File(['{"email":"alex@example.test"}'], "data.json"), 415],
    ["binary content", new File(["abc\u0000def"], "bin.txt"), 415],
    ["over 1 MiB", new File(["a".repeat(1_048_577)], "big.txt"), 413],
  ];
  for (const [name, file, status] of bad) {
    const res = await upload(a.cookie, file);
    check(`Rejected: ${name} (${status})`, res.status === status, `got ${res.status}`);
  }
  const afterBad = (await get("/api/scans", a.cookie).then((r) => r.json())).scans?.length;
  check("Rejected uploads wrote nothing", afterBad === before, `before=${before} after=${afterBad}`);

  const noConsent = new FormData();
  noConsent.set("file", new File([content], "x.csv"));
  const consentRes = await fetch(`${base}/api/scans`, { method: "POST", body: noConsent, headers: { origin, cookie: a.cookie } });
  check("Upload without synthetic-data confirmation is rejected (400)", consentRes.status === 400);

  const res = await upload(a.cookie, new File([content], filename, { type: "text/csv" }));
  const body = await res.text();
  const result = JSON.parse(body);
  if (result.id) created.push(result.id);
  check("Mixed synthetic file scans and saves (201)", res.status === 201, `status ${res.status}`);
  check("Classified Critical with 5 occurrences across 4 types", result.risk === "Critical" && result.total_findings === 5 && result.findings?.length === 4, JSON.stringify({ risk: result.risk, total: result.total_findings }));
  check("Response contains no raw detected values", Object.values(raw).every((value) => !body.includes(value)));

  const history = await get("/api/scans", a.cookie).then((r) => r.json());
  const saved = history.scans.find((scan) => scan.id === result.id);
  check("Saved scan appears in the owner's history with masked findings", saved?.findings.length === 4 && saved.findings.every((f) => f.masked_example.includes("*")));
  check("History payload contains no raw values", Object.values(raw).every((value) => !JSON.stringify(history).includes(value)));

  const exported = await get("/api/export?scope=findings", a.cookie);
  const csv = await exported.text();
  check("Export succeeds as an attachment", exported.status === 200 && /attachment/.test(exported.headers.get("content-disposition") || ""));
  check("Export contains masked data and no raw values", csv.includes("************1111") && Object.values(raw).every((value) => !csv.includes(value)));
  check("Export neutralises the formula-like filename", csv.includes(`"'${filename}"`));

  const bHistory = await get("/api/scans", b.cookie).then((r) => r.json());
  check("User B cannot see User A's scan through the API", !bHistory.scans.some((scan) => scan.id === result.id));
  const bExport = await get("/api/export", b.cookie).then((r) => r.text());
  check("User B's export excludes User A's data", !bExport.includes("live-test"));
  const badFilter = await get("/api/export?risk=Nope", a.cookie);
  check("Invalid export filters are rejected (400)", badFilter.status === 400);
} finally {
  for (const id of created) await a.client.from("scans").delete().eq("id", id);
}

const remaining = created.length ? (await a.client.from("scans").select("id").in("id", created)).data?.length : 0;
check("Test data cleaned up", remaining === 0);
const failed = results.filter((pass) => !pass).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
