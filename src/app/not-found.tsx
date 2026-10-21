import Link from "next/link";

export default function NotFound() {
  return <main id="main-content" className="error-page"><span className="eyebrow">PAGE NOT FOUND</span><h1>This page is out of scope.</h1><p>Return to the workspace or sign in to continue.</p><Link href="/login" className="lp-link lp-link--standalone">Return to sign in</Link></main>;
}
