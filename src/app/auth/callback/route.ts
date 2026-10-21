import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!supabaseConfig()) return NextResponse.redirect(new URL("/setup", url.origin));
  const code = url.searchParams.get("code");
  if (code) {
    const client = await createSupabaseServer();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) {
      const next = url.searchParams.get("next") === "/update-password" ? "/update-password" : "/dashboard";
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }
  return NextResponse.redirect(new URL("/login?error=confirmation", url.origin));
}
