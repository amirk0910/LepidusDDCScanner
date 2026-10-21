"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseConfig } from "./config";
import type { Database } from "./database";

export function createSupabaseBrowser() {
  const config = supabaseConfig();
  if (!config) throw new Error("Supabase is not configured. Follow the local setup instructions.");
  return createBrowserClient<Database>(config.url, config.key);
}
