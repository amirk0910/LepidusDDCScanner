import { readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const email = { detector: "email", risk: "Low", count: 2, masked_example: "a***@example.test" };
let db: PGlite;

async function asUser(id: string | null) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id || ""]);
  await db.exec(`set role ${id ? "authenticated" : "anon"}`);
}

async function save(findings: unknown[] = [email]) {
  const result = await db.query<{ id: string }>("select public.save_scan($1, $2, $3, $4::jsonb) as id", ["synthetic.csv", 100, 5, JSON.stringify(findings)]);
  return result.rows[0].id;
}

describe("real local PostgreSQL migration, atomicity, and RLS", () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      create role anon;
      create role authenticated;
      create schema auth;
      create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth to anon, authenticated;
      insert into auth.users values ('${A}'), ('${B}');
    `);
    await db.exec(readFileSync(path.join(process.cwd(), "supabase", "migrations", "202610210001_minidsp.sql"), "utf8"));
  }, 60_000);
  beforeEach(async () => { await db.exec("reset role; delete from public.scans;"); });
  afterAll(async () => { await db?.close(); });

  it("saves correct metadata and aggregated masked findings", async () => {
    await asUser(A);
    const id = await save([email, { detector: "payment_card", risk: "Critical", count: 1, masked_example: "************1111" }]);
    const scans = await db.query<{ risk: string; total_findings: number; owner_id: string }>("select * from public.scans where id = $1", [id]);
    expect(scans.rows[0]).toMatchObject({ owner_id: A, risk: "Critical", total_findings: 3 });
    expect((await db.query("select * from public.scan_findings")).rows).toHaveLength(2);
  });
  it("isolates two users for reads, updates, and deletes", async () => {
    await asUser(A); const id = await save();
    await asUser(B);
    expect((await db.query("select * from public.scans")).rows).toHaveLength(0);
    expect((await db.query("select * from public.scan_findings")).rows).toHaveLength(0);
    await expect(db.query("update public.scans set filename = 'changed.txt' where id = $1", [id])).rejects.toThrow("permission denied");
    expect((await db.query("delete from public.scans where id = $1 returning id", [id])).rows).toHaveLength(0);
    const own = await save();
    expect((await db.query("select id from public.scans")).rows).toEqual([{ id: own }]);
    await asUser(A);
    expect((await db.query("select id from public.scans")).rows).toEqual([{ id }]);
  });
  it("denies direct writes and cross-owner finding attachment", async () => {
    await asUser(A); const id = await save();
    await asUser(B);
    await expect(db.query("insert into public.scan_findings (scan_id, owner_id, detector, risk, count, masked_example) values ($1,$2,'email','Low',1,'a***@example.test')", [id, B])).rejects.toThrow("permission denied");
    await db.exec("reset role");
    await expect(db.query("insert into public.scan_findings (scan_id, owner_id, detector, risk, count, masked_example) values ($1,$2,'uk_phone','Medium',1,'07******123')", [id, B])).rejects.toThrow("foreign key");
  });
  it("rolls back both the parent and earlier findings if a later finding fails", async () => {
    await asUser(A);
    await expect(save([email, { detector: "payment_card", risk: "Critical", count: 1, masked_example: "4111111111111111" }])).rejects.toThrow("must be masked");
    expect((await db.query("select * from public.scans")).rows).toHaveLength(0);
    expect((await db.query("select * from public.scan_findings")).rows).toHaveLength(0);
  });
  it("rejects caller ownership fields and forged risk without partial writes", async () => {
    await asUser(B);
    await expect(save([{ ...email, owner_id: A }])).rejects.toThrow("shape");
    await expect(save([{ ...email, risk: "Critical" }])).rejects.toThrow("Invalid masked finding");
    expect((await db.query("select * from public.scans")).rows).toHaveLength(0);
  });
  it("denies anonymous records and function execution", async () => {
    await asUser(null);
    await expect(db.query("select * from public.scans")).rejects.toThrow("permission denied");
    await expect(db.query("select * from public.scan_findings")).rejects.toThrow("permission denied");
    await expect(save()).rejects.toThrow("permission denied");
  });
  it("classifies a clean scan as None and cascades deletion", async () => {
    await asUser(A);
    const clean = await save([]);
    expect((await db.query("select risk, total_findings from public.scans where id=$1", [clean])).rows).toEqual([{ risk: "None", total_findings: 0 }]);
    const id = await save();
    await db.query("delete from public.scans where id=$1", [id]);
    expect((await db.query("select * from public.scan_findings")).rows).toHaveLength(0);
  });
});
