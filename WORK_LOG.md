# Work log — Agent maintains this automatically

## Environment / baseline
- Local workspace: Windows, Node.js v24.18.1, npm 11.16.0.
- Next.js / React / TypeScript application with Supabase integration and supplied Lepidus assets.
- Supabase project connected locally via an ignored `.env.local` (values not recorded here); GitHub remote `amirk0910/LepidusDDCScanner` (public, `main`); Vercel deployment at https://lepidusddcscanner.vercel.app/.
- Baseline had no Git repository; initialized and first commit made at 2026-10-21T12:16:11+05:30.

## Progress (append a short entry per task)
| Time (UTC) | Task | Changed files | Tests: command + actual result | Problems / fix | Git status |
|---|---|---|---|---|---|
| 2026-10-21T06:44:39.8287587Z | Record verified local baseline and prepare first commit | `WORK_LOG.md`; user-corrected `tests/service.test.ts` | User-verified: `npm test` **99/99 PASS**; `npm run typecheck` **PASS**; `npm run build` **PASS**. Not rerun in this milestone. Earlier agent runs: 79/80, then 97/99 tests passed; typecheck and corrected lint passed. | User fixed expected totals from 259 to 229 to match `src/lib/preview.ts`. Earlier sentence-punctuation detector defect was fixed and covered by regression tests. | Git initialized; first-commit milestone. Environment files and dependency directories are ignored; the blank `.env.example` template is intentionally tracked. |
| Git: 2026-10-21T12:16:11+05:30 to 12:49:19+05:30 (`4b82d44`, `e416ab3`, `4ed3003`) | First commit; chart hydration fix; two-user Supabase RLS script (`scripts/test-rls.mjs`) added | charts, `scripts/test-rls.mjs` | Chart fix and RLS script were made outside this agent's runs; the RLS script was NOT executed by the agent. UNVERIFIED. | Hydration mismatch in SVG chart titles fixed. | Committed locally. |
| Git: 2026-10-21T13:23:43+05:30 (`451a1f9`) | Sign-in bounced to `/login`; auth-panel text invisible in dark/high-contrast | `scripts/dev.mjs`, `globals.css`, `package.json`, `src/lib/origin.ts` | Agent ran: Node-to-Supabase check failed 8/8 with `SELF_SIGNED_CERT_IN_CHAIN`, then HTTP 200 with `--use-system-ca`. Final tree later: `npm test` 103/103, typecheck, lint, build PASS. | TLS inspection root cause; wrong nav token used for panel text. | Committed, pushed 2026-10-21 (GitHub `main`). |
| Git: 2026-10-21T13:32:56+05:30 to 13:52:27+05:30 (`74d4444`, `0a40816`, `c5285f3`) | Vercel 404 fixed (`vercel.json` pins Next.js); sign-up now redirects to login; official Lepide logo and favicon | `vercel.json`, `auth.tsx`, `ui.tsx`, `public/brand/*` | Agent ran: `/login` and `/preview` on the Vercel URL returned HTTP 200 after redeploy; `npm test` 103/103, typecheck, lint, build PASS. | Vercel preset was not building Next.js. Sign-up auto sign-in was by Supabase config (Confirm email off). | Pushed. |
| Git: 2026-10-21T15:42:59+05:30 (`8337265`) | Removed per-page "Loading your workspace" screen via persistent dashboard layout | `src/app/dashboard/(workspace)/*`, `dashboard-client.tsx` | Agent ran: `npm test` 103/103, `npm run typecheck` exit 0, `npm run lint` pass, `npm run build` pass; signed-out `/dashboard*` returns 307 to login. Signed-in navigation NOT tested by the agent (user-reported only). | Per-navigation server fetch caused the full-page fallback. | Pushed. |
| 2026-10-21T16:06+05:30 | Live verification: Supabase RLS and deployed API | `scripts/test-live-api.mjs`, `package.json` (`test:live`), `.github/workflows/ci.yml`, `LEARNINGS.md` | Agent ran `npm run test:rls` against the live Supabase project: **20/20 PASS**. Agent ran `npm run test:live -- https://lepidusddcscanner.vercel.app`: **22/22 PASS** (401 and 403 guards, empty/JSON/binary/over-1-MiB rejected with no writes, mixed file Critical with 5 occurrences, no raw values in response/history/export, formula-safe filename, User B isolated, test data deleted). A first attempt against the local server failed with ECONNREFUSED because the dev server was not running. | None in the app. | Committed with this entry. |

## Decisions and known gaps
- The missing Git repository was a baseline gap, resolved by local initialization. The repository was pushed to GitHub as **public** at the human's explicit decision, although `PRODUCT_BRIEF.md` requires private.
- Live Supabase two-user RLS isolation was executed by the agent (`npm run test:rls`, 20/20 PASS) at 2026-10-21T16:06+05:30. Local PostgreSQL (PGlite) isolation tests also pass.
- Deployed to Vercel. The agent verified the deployed API end to end with `npm run test:live` (22/22 PASS), which also confirms the Vercel environment variables and Supabase connection work. Browser-driven flow (clicking through the UI) on Vercel remains user-reported only.
- Supabase "Confirm email" is off, so sign-ups are unverified accounts; the human chose to redirect to login after sign-up.
- Not done: Playwright/RTL browser tests, the Lepidus HTML validator script, high-contrast and mobile checks on every screen, and a recorded demo. `LEARNINGS.md` was drafted by the agent for the developer to review.
- The read-only interface preview contains fictional data, not a simulated live Supabase connection.
- Token-based SVG charts are an approved design exception because the documented Lepidus React package was unavailable from npm.
- Dependency audit: production dependencies reported zero vulnerabilities; five development-only advisories remain in the Next.js lint dependency chain. No forced framework downgrade was performed.

## Security checks
- Local PostgreSQL/PGlite tests executed for owner-scoped reads, denied cross-user writes, parent-child integrity, atomic rollback, masked findings, and anonymous access denial. These do not substitute for verification against a configured Supabase project.
- Upload validation, detector masking, CSV formula neutralization, and masked-only persistence-boundary tests are included in the user-verified 99-test pass.
- Git ignore checks confirmed `.env.local`, root dependencies, and reference-scanner dependencies are excluded.

**Rule:** Keep failures and retests. Do not claim PASS without executing a test.

**Rule:** Use actual UTC timestamps or Git commit timestamps. Never estimate times.
