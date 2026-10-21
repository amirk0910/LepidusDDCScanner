import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "./errors";
import { scanText } from "./scanner";
import { validateUpload } from "./upload";
import type { Database } from "./supabase/database";

export async function scanAndSave(file: File, client: SupabaseClient<Database>) {
  const text = await validateUpload(file);
  const started = performance.now();
  const result = scanText(text);
  const duration = Math.max(1, Math.round(performance.now() - started));
  const { data, error } = await client.rpc("save_scan", {
    p_filename: file.name,
    p_size_bytes: file.size,
    p_duration_ms: duration,
    p_findings: result.findings.map((finding) => ({ ...finding })),
  });
  if (error || !data) {
    console.error(`[MiniDSP] Atomic scan save failed (database code: ${error?.code || "missing-result"}).`);
    throw new AppError("The scan could not be saved. No partial scan was stored. Check your database migration and connection, then retry.", 503);
  }
  return { id: data, ...result, duration_ms: duration };
}
