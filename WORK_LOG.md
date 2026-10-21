# Work log — Agent maintains this automatically

## Environment / baseline
- Local workspace: Windows, Node.js v24.18.1, npm 11.16.0.
- Next.js / React / TypeScript application with Supabase integration and supplied Lepidus assets.
- Development server is already running at http://127.0.0.1:3000. Not restarted or rechecked in this milestone.
- No Git repository existed at baseline; initialized locally during this milestone.
- No `.env.local` or live Supabase connection is configured.

## Progress (append a short entry per task)
| Time (UTC) | Task | Changed files | Tests: command + actual result | Problems / fix | Git status |
|---|---|---|---|---|---|
| 2026-10-21T06:44:39.8287587Z | Record verified local baseline and prepare first commit | `WORK_LOG.md`; user-corrected `tests/service.test.ts` | User-verified: `npm test` **99/99 PASS**; `npm run typecheck` **PASS**; `npm run build` **PASS**. Not rerun in this milestone. Earlier agent runs: 79/80, then 97/99 tests passed; typecheck and corrected lint passed. | User fixed expected totals from 259 to 229 to match `src/lib/preview.ts`. Earlier sentence-punctuation detector defect was fixed and covered by regression tests. | Git initialized; first-commit milestone. Environment files and dependency directories are ignored; the blank `.env.example` template is intentionally tracked. |

## Decisions and known gaps
- The missing Git repository was a baseline gap, resolved by local initialization in this milestone. No GitHub remote or push has been configured.
- No `.env.local` / Supabase connection: live authentication, persistence, and two-user Supabase isolation remain UNVERIFIED.
- `scripts/test-rls.mjs` is missing; the `test:rls` script cannot run until it is supplied.
- Not deployed to GitHub or Vercel. Deployment and hosted end-to-end behavior remain UNVERIFIED.
- Local sign-in bounced back to `/login` (2026-10-21): server-side Node calls to Supabase failed with `SELF_SIGNED_CERT_IN_CHAIN` (TLS inspection on this machine; browser trusts the OS store, Node does not). Fix: `npm run dev` now starts Next.js via `scripts/dev.mjs` with `--use-system-ca`; certificate verification is NOT disabled. Node connectivity check with the OS store returned HTTP 200; the full browser sign-in retest is UNVERIFIED until the user retries.
- The read-only interface preview contains fictional data, not a simulated live Supabase connection.
- Token-based SVG charts are an approved design exception because the documented Lepidus React package was unavailable from npm.
- Dependency audit: production dependencies reported zero vulnerabilities; five development-only advisories remain in the Next.js lint dependency chain. No forced framework downgrade was performed.

## Security checks
- Local PostgreSQL/PGlite tests executed for owner-scoped reads, denied cross-user writes, parent-child integrity, atomic rollback, masked findings, and anonymous access denial. These do not substitute for verification against a configured Supabase project.
- Upload validation, detector masking, CSV formula neutralization, and masked-only persistence-boundary tests are included in the user-verified 99-test pass.
- Git ignore checks confirmed `.env.local`, root dependencies, and reference-scanner dependencies are excluded.

**Rule:** Keep failures and retests. Do not claim PASS without executing a test.

**Rule:** Use actual UTC timestamps or Git commit timestamps. Never estimate times.
