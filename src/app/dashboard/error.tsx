"use client";

import Link from "next/link";
import { Button, Message } from "@/components/ui";

export default function DashboardError({ reset }: { reset: () => void }) {
  return <main id="main-content" className="error-page"><h1>Your workspace could not load.</h1><Message title="Scan records are unavailable">Check your Supabase connection and confirm that the database migration has been applied. Your saved records have not been replaced with example data.</Message><div className="actions"><Button onClick={reset}>Try again</Button><Link href="/setup" className="lp-link lp-link--standalone">View setup instructions</Link><Link href="/login" className="lp-link lp-link--standalone">Return to sign in</Link></div></main>;
}
