import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfig } from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  const config = supabaseConfig();
  if (!config) return NextResponse.next();
  let response = NextResponse.next({ request });
  const client = createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { error } = await client.auth.getUser();
  if (error && error.name !== "AuthSessionMissingError" && error.status !== 400 && error.status !== 401 && error.status !== 403) {
    console.error("[MiniDSP] Authentication refresh failed. Check Supabase connectivity.");
  }
  return response;
}

export const config = { matcher: ["/dashboard/:path*", "/login", "/signup", "/update-password"] };
