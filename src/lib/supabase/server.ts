import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppError } from "../errors";
import { supabaseConfig } from "./config";
import type { Database } from "./database";

export async function createSupabaseServer(writable = true) {
  const config = supabaseConfig();
  if (!config) throw new AppError("Supabase is not configured. Complete the local setup before signing in or scanning.", 503);
  const store = await cookies();
  return createServerClient<Database>(config.url, config.key, {
    cookies: {
      getAll: () => store.getAll(),
      // Server Components are read-only; the request proxy owns cookie refresh for them.
      ...(writable ? { setAll: (values: { name: string; value: string; options: Parameters<typeof store.set>[2] }[]) => {
        values.forEach(({ name, value, options }) => store.set(name, value, options));
      } } : {}),
    },
  });
}

export async function requireApiUser() {
  const client = await createSupabaseServer();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new AppError("Your session has expired. Sign in to continue.", 401);
  return { client, user: data.user };
}

export async function requirePageUser() {
  if (!supabaseConfig()) redirect("/setup");
  const client = await createSupabaseServer(false);
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) redirect("/login");
  return { client, user: data.user };
}
