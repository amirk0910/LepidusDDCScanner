import { createClient } from "@supabase/supabase-js";

const { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key } = process.env;
const creds = {
  A: { email: process.env.TEST_USER_A_EMAIL, password: process.env.TEST_USER_A_PASSWORD },
  B: { email: process.env.TEST_USER_B_EMAIL, password: process.env.TEST_USER_B_PASSWORD },
};
if (!url || !key || Object.values(creds).some((c) => !c.email || !c.password)) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or TEST_USER_* variables.");
  process.exit(2);
}

const newClient = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function signedIn({ email, password }) {
  const client = newClient();
  let { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    const signUp = await client.auth.signUp({ email, password });
    if (signUp.error) throw new Error(`Sign-up failed: ${signUp.error.message}`);
    if (!signUp.data.session) {
      ({ error } = await client.auth.signInWithPassword({ email, password }));
      if (error) throw new Error(`Sign-in failed after sign-up (is email confirmation still on?): ${error.message}`);
    }
  }
  const { data } = await client.auth.getUser();
  return { client, id: data.user.id };
}

const results = [];
function check(name, pass, detail = "") {
  results.push(pass);
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${pass || !detail ? "" : ` -> ${detail}`}`);
}
const denied = (error) => Boolean(error);
const ownScanCount = async (client) => (await client.from("scans").select("id", { count: "exact", head: true })).count;

const validFindings = [
  { detector: "email", risk: "Low", count: 2, masked_example: "a***@example.test" },
  { detector: "payment_card", risk: "Critical", count: 1, masked_example: "************1111" },
];

const a = await signedIn(creds.A);
const b = await signedIn(creds.B);
const anon = newClient();
const createdByA = [];

try {
  check("Test users are two different accounts", a.id !== b.id);

  const save = await a.client.rpc("save_scan", { p_filename: "rls-training.txt", p_size_bytes: 10, p_duration_ms: 1, p_findings: validFindings });
  check("User A can save a scan through save_scan", !save.error && typeof save.data === "string", save.error?.message);
  const scanId = save.data;
  if (scanId) createdByA.push(scanId);

  const own = await a.client.from("scans").select("id, owner_id, risk, total_findings").eq("id", scanId).single();
  check("Saved scan is owned by A, risk is Critical, total is 3", own.data?.owner_id === a.id && own.data?.risk === "Critical" && own.data?.total_findings === 3, JSON.stringify(own.data ?? own.error));

  const ownFindings = await a.client.from("scan_findings").select("masked_example").eq("scan_id", scanId);
  check("Stored findings contain only masked examples", ownFindings.data?.length === 2 && ownFindings.data.every((row) => row.masked_example.includes("*")));

  const bScans = await b.client.from("scans").select("id").eq("id", scanId);
  check("User B cannot read A's scan", !bScans.error && bScans.data.length === 0);
  const bAll = await b.client.from("scans").select("id, owner_id");
  check("User B only ever sees B's own scans", !bAll.error && bAll.data.every((row) => row.owner_id === b.id));
  const bFindings = await b.client.from("scan_findings").select("id").eq("scan_id", scanId);
  check("User B cannot read A's findings", !bFindings.error && bFindings.data.length === 0);

  const bDelete = await b.client.from("scans").delete().eq("id", scanId).select();
  const stillThere = await a.client.from("scans").select("id").eq("id", scanId);
  check("User B cannot delete A's scan", stillThere.data?.length === 1 && !bDelete.data?.length, bDelete.error?.message);

  const bUpdate = await b.client.from("scans").update({ filename: "hacked.txt" }).eq("id", scanId).select();
  check("User B cannot update A's scan", denied(bUpdate.error) || !bUpdate.data?.length);
  const aUpdate = await a.client.from("scans").update({ filename: "edited.txt" }).eq("id", scanId).select();
  check("Even the owner cannot edit scans directly (only save_scan writes)", denied(aUpdate.error) || !aUpdate.data?.length);

  const bInsertScan = await b.client.from("scans").insert({ owner_id: a.id, filename: "forged.txt", size_bytes: 1, duration_ms: 1, risk: "None", total_findings: 0 });
  check("User B cannot insert a scan directly (even for A)", denied(bInsertScan.error));
  const bInsertFinding = await b.client.from("scan_findings").insert({ scan_id: scanId, owner_id: a.id, detector: "email", risk: "Low", count: 1, masked_example: "a***@example.test" });
  check("User B cannot attach findings to A's scan", denied(bInsertFinding.error));
  const bInsertOwn = await b.client.from("scan_findings").insert({ scan_id: scanId, owner_id: b.id, detector: "uk_phone", risk: "Medium", count: 1, masked_example: "07******123" });
  check("User B cannot attach findings to A's scan under B's own id", denied(bInsertOwn.error));

  const anonRead = await anon.from("scans").select("id");
  check("Anonymous users cannot read scans", denied(anonRead.error));
  const anonSave = await anon.rpc("save_scan", { p_filename: "x.txt", p_size_bytes: 1, p_duration_ms: 1, p_findings: [] });
  check("Anonymous users cannot call save_scan", denied(anonSave.error));

  const before = await ownScanCount(a.client);
  const rawLeak = await a.client.rpc("save_scan", { p_filename: "raw.txt", p_size_bytes: 1, p_duration_ms: 1, p_findings: [{ detector: "email", risk: "Low", count: 1, masked_example: "alex@example.test" }] });
  check("Unmasked (raw) examples are rejected by the database", denied(rawLeak.error));
  const partial = await a.client.rpc("save_scan", { p_filename: "partial.txt", p_size_bytes: 1, p_duration_ms: 1, p_findings: [validFindings[0], { detector: "payment_card", risk: "Critical", count: 1, masked_example: "4111111111111111" }] });
  check("A failure on the second finding is rejected", denied(partial.error));
  const badFile = await a.client.rpc("save_scan", { p_filename: "../evil.txt", p_size_bytes: 1, p_duration_ms: 1, p_findings: [] });
  check("Path-like filenames are rejected", denied(badFile.error));
  const after = await ownScanCount(a.client);
  check("Failed saves leave no partial scan or findings behind", before === after, `before=${before} after=${after}`);
  const findingRows = await a.client.from("scan_findings").select("id, scan_id");
  const scanIds = new Set((await a.client.from("scans").select("id")).data.map((row) => row.id));
  check("Every stored finding belongs to an existing scan", !findingRows.error && findingRows.data.every((row) => scanIds.has(row.scan_id)));
} finally {
  for (const id of createdByA) await a.client.from("scans").delete().eq("id", id);
}

const failed = results.filter((pass) => !pass).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
