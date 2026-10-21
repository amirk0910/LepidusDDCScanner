import { AuthForm, AuthShell } from "@/components/auth";
import { supabaseConfig } from "@/lib/supabase/config";

export default function ForgotPasswordPage() {
  return <AuthShell><div id="main-content"><AuthForm mode="forgot" configured={!!supabaseConfig()} /></div></AuthShell>;
}
