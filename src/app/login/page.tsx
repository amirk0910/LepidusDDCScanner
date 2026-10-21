import { AuthForm, AuthShell } from "@/components/auth";
import { supabaseConfig } from "@/lib/supabase/config";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return <AuthShell><div id="main-content"><AuthForm mode="login" configured={!!supabaseConfig()} confirmationError={params.error === "confirmation"} /></div></AuthShell>;
}
