import { AuthForm, AuthShell } from "@/components/auth";
import { supabaseConfig } from "@/lib/supabase/config";

export default function UpdatePasswordPage() {
  return <AuthShell><div id="main-content"><AuthForm mode="update" configured={!!supabaseConfig()} /></div></AuthShell>;
}
