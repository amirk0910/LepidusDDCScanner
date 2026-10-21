import { AuthForm, AuthShell } from "@/components/auth";
import { supabaseConfig } from "@/lib/supabase/config";

export default function SignupPage() {
  return <AuthShell><div id="main-content"><AuthForm mode="signup" configured={!!supabaseConfig()} /></div></AuthShell>;
}
