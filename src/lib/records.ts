import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "./errors";
import { RISKS, type Scan } from "./types";
import type { Database } from "./supabase/database";

const findingSchema = z.object({
  detector: z.enum(["email", "uk_phone", "uk_nino", "payment_card"]),
  risk: z.enum(RISKS),
  count: z.number().int().positive(),
  masked_example: z.string(),
});
const scanSchema = z.object({
  id: z.uuid(), owner_id: z.uuid(), filename: z.string(),
  size_bytes: z.number(), duration_ms: z.number(),
  risk: z.enum(RISKS), total_findings: z.number().int().nonnegative(),
  created_at: z.string(), findings: z.array(findingSchema),
});

export async function readScans(client: SupabaseClient<Database>, ownerId: string): Promise<Scan[]> {
  const scans: Scan[] = [];
  let total = Infinity;
  while (scans.length < total) {
    const { data, error, count } = await client.from("scans")
      .select("id,owner_id,filename,size_bytes,duration_ms,risk,total_findings,created_at,findings:scan_findings(detector,risk,count,masked_example)", { count: "exact" })
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false }).order("id", { ascending: false })
      .range(scans.length, scans.length + 499);
    if (error) {
      console.error(`[MiniDSP] Reading scan records failed (database code: ${error.code}).`);
      throw new AppError("Scan history could not be loaded. Check your Supabase connection and database migration, then retry.", 503);
    }
    const parsed = z.array(scanSchema).safeParse(data);
    if (!parsed.success || count === null) throw new AppError("The database returned an unexpected record format. Check that the current migration is installed.", 503);
    total = count;
    if (!parsed.data.length && scans.length < total) throw new AppError("The database returned incomplete history. Retry loading your records.", 503);
    scans.push(...parsed.data);
  }
  return scans;
}
