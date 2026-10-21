"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { z } from "zod";
import { ArrowRight, Check, Eye, EyeOff, FileCheck2, LockKeyhole, ShieldCheck } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase/browser";
import { Brand, Button, Checkbox, Field, Message, Panel, RiskBadge } from "./ui";
import { ThemeControls } from "./providers";
import { RiskDonut, TrendChart } from "./charts";

type AuthMode = "login" | "signup" | "forgot" | "update";
const authCopy = {
  login: { eyebrow: "YOUR SECURITY WORKSPACE", title: "Welcome back.", description: "Sign in to discover sensitive data and see what needs your attention.", button: "Sign in" },
  signup: { eyebrow: "A CLEARER VIEW OF YOUR DATA", title: "Start with visibility.", description: "Create your training workspace. Discover, classify, and understand your data risk.", button: "Create account" },
  forgot: { eyebrow: "ACCOUNT RECOVERY", title: "Reset your password.", description: "We'll email you a secure link to get back to your workspace.", button: "Send reset link" },
  update: { eyebrow: "SECURE YOUR ACCOUNT", title: "Set a new password.", description: "Choose a unique password with at least 12 characters.", button: "Update password" },
};

export function AuthShell({ children }: { children: ReactNode }) {
  return <div className="auth-page">
    <aside className="auth-insights" aria-label="Illustrative security insights">
      <Link href="/login" className="brand-link" aria-label="Lepide MiniDSP home"><Brand tone="inverse" /></Link>
      <div className="auth-story"><span className="eyebrow">DATA DISCOVERY & CLASSIFICATION</span>
        <h2>Know your data.<br />Understand your risk.</h2>
        <p>A clear view of sensitive data.<br />A more confident next step.</p>
      </div>
      <div className="auth-analytics">
        <div className="illustration-label"><span className="status-dot" />Security overview<span>Illustrative data</span></div>
        <div className="insight-kpis">
          <div><FileCheck2 aria-hidden="true" /><strong>128</strong><span>Files classified</span></div>
          <div><ShieldCheck aria-hidden="true" /><strong>486</strong><span>Masked findings</span></div>
          <div><LockKeyhole aria-hidden="true" /><strong>100%</strong><span>Examples masked</span></div>
        </div>
        <div className="auth-chart-heading"><strong>Discovery activity</strong><span className="caption">Example week</span></div>
        <TrendChart labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]} values={[28, 44, 36, 78, 60, 98, 142]} compact />
        <div className="auth-risk-strip"><RiskBadge risk="Critical" /><span>Payment card candidates identified</span><ShieldCheck size={18} aria-hidden="true" /></div>
      </div>
      <div className="auth-promise"><Check size={18} aria-hidden="true" /><span>Server-side scanning</span><Check size={18} aria-hidden="true" /><span>Masked results only</span></div>
      <p className="auth-disclaimer">MiniDSP is a training prototype. Use synthetic data only.<br />The example insights above are not live account data.</p>
    </aside>
    <main className="auth-content"><div className="auth-topline"><Link href="/preview" className="lp-link lp-link--inline">Explore interface preview <ArrowRight size={16} aria-hidden="true" /></Link><ThemeControls /></div>
      {children}
      <footer className="auth-footer"><ShieldCheck size={15} aria-hidden="true" />Designed for visibility. Built with privacy in mind.</footer>
    </main>
  </div>;
}

export function AuthForm({ mode, configured, confirmationError = false, registered = false }: { mode: AuthMode; configured: boolean; confirmationError?: boolean; registered?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState(confirmationError ? "The confirmation link is invalid or expired. Request a new email or sign in again." : "");
  const [success, setSuccess] = useState(registered ? "Account created. Sign in with your email and password to continue." : "");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const copy = authCopy[mode];
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured || busy) return;
    setError(""); setSuccess(""); setFieldErrors({});
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    const errors: Record<string, string> = {};
    if (mode !== "update" && !z.email().safeParse(email).success) errors.email = "Enter a valid email address.";
    if (mode !== "forgot" && password.length < (mode === "login" ? 1 : 12)) errors.password = mode === "login" ? "Enter your password." : "Use at least 12 characters.";
    if (mode === "signup" && String(form.get("name") || "").trim().length < 2) errors.name = "Enter at least two characters.";
    if (mode === "update" && password !== form.get("confirm")) errors.confirm = "The passwords do not match.";
    if (Object.keys(errors).length) { setFieldErrors(errors); return; }
    setBusy(true);
    try {
      const client = createSupabaseBrowser();
      if (mode === "login") {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) { setError(error.message); return; }
        router.replace("/dashboard"); router.refresh();
      } else if (mode === "signup") {
        const { data, error } = await client.auth.signUp({
          email, password,
          options: { data: { display_name: String(form.get("name")).trim() }, emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) { setError(error.message); return; }
        if (data.session) {
          const { error: signOutError } = await client.auth.signOut();
          if (signOutError) { setError("Your account was created, but we could not finish setting it up. Go to the sign-in page and sign in."); return; }
          router.replace("/login?registered=1"); router.refresh();
        }
        else setSuccess("Check your inbox to confirm your email, then sign in. If you already have an account, use the sign-in page.");
      } else if (mode === "forgot") {
        const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/update-password` });
        if (error) { setError(error.message); return; }
        setSuccess("If this address has an account, a password reset link will arrive shortly. Check your spam folder too.");
      } else {
        const { data } = await client.auth.getUser();
        if (!data.user) { setError("The reset session is missing or expired. Request another password reset link."); return; }
        const { error } = await client.auth.updateUser({ password });
        if (error) { setError(error.message); return; }
        router.replace("/dashboard"); router.refresh();
      }
    } catch {
      setError("The authentication service could not be reached. Check your Supabase configuration and internet connection, then retry.");
    } finally { setBusy(false); }
  }
  return <div className="auth-form-wrap">
    <span className="eyebrow">{copy.eyebrow}</span>
    <h1>{copy.title}</h1><p className="auth-description">{copy.description}</p>
    {!configured && <div className="setup-notice"><LockKeyhole size={18} aria-hidden="true" /><span>Supabase setup is pending. <Link href="/setup" className="lp-link lp-link--inline">View setup steps</Link> or explore the read-only preview.</span></div>}
    {error && <Message title="Unable to continue">{error}</Message>}
    {success && <Message title="Request completed" variant="success">{success}</Message>}
    <form onSubmit={submit} className="auth-form" aria-busy={busy}>
      {mode === "signup" && <Field id="name" name="name" label="Full name" autoComplete="name" placeholder="Alex Morgan" maxLength={80} required disabled={busy || !configured} error={fieldErrors.name} />}
      {mode !== "update" && <Field id="email" name="email" label="Email address" type="email" autoComplete="email" placeholder="you@example.test" maxLength={254} required disabled={busy || !configured} error={fieldErrors.email} />}
      {mode !== "forgot" && <div className="password-group">
        <Field id="password" name="password" label={mode === "update" ? "New password" : "Password"} type={visible ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder={mode === "login" ? "Enter your password" : "At least 12 characters"} maxLength={128} required disabled={busy || !configured} error={fieldErrors.password} />
        <Button variant="secondary" small aria-label={visible ? "Hide password" : "Show password"} onClick={() => setVisible(!visible)} disabled={!configured}>{visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}</Button>
      </div>}
      {mode === "update" && <Field id="confirm" name="confirm" label="Confirm password" type={visible ? "text" : "password"} autoComplete="new-password" required disabled={busy || !configured} error={fieldErrors.confirm} />}
      {mode === "login" && <div className="auth-form-links"><span className="caption"><LockKeyhole size={13} aria-hidden="true" />Secure Supabase sign-in</span><Link href="/forgot-password" className="lp-link lp-link--inline">Forgot password?</Link></div>}
      {mode === "signup" && <Checkbox required disabled={busy || !configured}>I understand this workspace is for synthetic training data only.</Checkbox>}
      <button type="submit" className="lp-button lp-button--primary lp-button--md lp-button--full-width" disabled={busy || !configured}>{busy ? "Please wait..." : copy.button}<span className="lp-button__icon-right"><ArrowRight aria-hidden="true" /></span></button>
    </form>
    <div className="auth-switch">{mode === "login" ? <>New to MiniDSP? <Link className="lp-link lp-link--inline" href="/signup">Create an account</Link></> : <>Already have an account? <Link className="lp-link lp-link--inline" href="/login">Sign in</Link></>}</div>
    <div className="auth-security-note"><ShieldCheck size={19} aria-hidden="true" /><p>Your files stay out of storage.<br /><span>Only metadata and masked findings are saved.</span></p></div>
  </div>;
}

export function SetupContent() {
  return <div className="setup-content">
    <span className="eyebrow">LOCAL DEVELOPMENT</span><h1>Connect your workspace.</h1>
    <p className="auth-description">The app is ready for a Supabase training project. No database or authentication connection is being simulated.</p>
    <ol className="setup-steps">
      <li><strong>Create a Supabase project</strong><p>Use an isolated training project, not a production database.</p></li>
      <li><strong>Add local environment variables</strong><p>Copy the environment example to your local environment file. Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>. Never use a service-role key.</p></li>
      <li><strong>Apply the database migration</strong><p>Run the SQL migration in the Supabase SQL editor. It creates owner-isolated records and the atomic save function.</p></li>
      <li><strong>Configure authentication URLs</strong><p>Set Site URL to <code>http://localhost:3000</code>. Allow <code>http://localhost:3000/auth/callback</code> and the same URL with <code>?next=/update-password</code>.</p></li>
      <li><strong>Restart, sign up, and verify</strong><p>Restart the development server, create two test users, and run the documented ownership checks.</p></li>
    </ol>
    <div className="actions"><Link href="/login" className="lp-link lp-link--standalone">Return to sign in <ArrowRight size={16} aria-hidden="true" /></Link><Link href="/preview" className="lp-link lp-link--standalone">Preview the interface</Link></div>
    <Panel title="Privacy by design"><div className="setup-chart"><RiskDonut data={[{ risk: "Critical", value: 2 }, { risk: "High", value: 3 }, { risk: "Medium", value: 5 }, { risk: "Low", value: 8 }]} /><p className="caption">Illustrative risk distribution. Not connected to a live account.</p></div></Panel>
  </div>;
}
