# Developer Scorecard — Lepide MiniDSP

Generated 2026-10-21 from the application, Git history, `WORK_LOG.md`, test evidence and the conversation. Times are Git commit timestamps (IST, +05:30). Items I could not verify earn **no** objective credit and are flagged in section 6.

## 1. Score summary

| Category | Max | Score | Basis |
|---|---:|---:|---|
| Functionality | 30 | **28** | All four detectors, classification, bounded upload validation, auth, atomic save, dashboard, filters, safe CSV export and a live deployment are built. The live API flow (upload, history, export) and live RLS were executed and pass. Deducted for no UI click-through evidence on the deployed site beyond user reports and no recorded demo. |
| Testing and reliability | 25 | **22** | 103 unit and integration tests, real PostgreSQL RLS and rollback tests, **20/20 live Supabase RLS checks**, **22/22 deployed API checks**, typecheck, lint and build pass, and CI is green on GitHub. Deducted for no Playwright or component tests and no coverage report. |
| AI orchestration | 20 | **13** | Several defects found and fixed by testing and review; the work log was corrected and kept evidence-based. Deducted for the log being stale for much of the session and no evidence of the two-chat Instructor and Developer flow. |
| Lepide design compliance | 10 | **7** | Official Lepidus CSS, JS and tokens, `lp-` components, light, dark and high-contrast themes, the Lepide logo. Deducted for an approved chart exception, no validator run and partial theme and mobile checks. |
| Git and deployment | 10 | **8** | 10 meaningful commits, pushed to GitHub, Vercel live and verified, CI green, secrets excluded. Deducted for a public repository (brief requires private). |
| Learning and demonstration | 5 | **2** | `LEARNINGS.md` is filled but was drafted by the agent for the developer to confirm; no demo is evidenced. |
| **Total** | **100** | **80** | |

## 2. Evidence by category

| Category | Supporting evidence |
|---|---|
| Functionality | Detectors, masking and classification in `src/lib/scanner.ts` (email, UK phone, NINO, Luhn card). Server-side upload limits (1 MiB, UTF-8, binary, type, bounded streaming) in `src/lib/upload.ts`. Auth via Supabase SSR with a request proxy. Atomic `save_scan` function with owner-scoped RLS in `supabase/migrations/202610210001_minidsp.sql`. Dashboard, filters, history and spreadsheet-safe export (`src/lib/csv.ts`). Live URL https://lepidusddcscanner.vercel.app/ returned HTTP 200 on `/login` and `/preview` after the redeploy. |
| Testing and reliability | `npm test`: 6 files, **103 passed**. `npm run typecheck` exit 0, `npm run lint` pass, `npm run build` pass. All 30 supplied fixtures run against expected risk. Real PostgreSQL (PGlite) tests cover cross-user read, update and delete denial, cross-owner finding attachment, anonymous denial, rollback with no partial scan, and forged risk or ownership. **Live:** `npm run test:rls` on the Supabase project, 20/20 pass (2026-10-21T16:06+05:30). `npm run test:live` on https://lepidusddcscanner.vercel.app, 22/22 pass: auth and origin guards, invalid uploads rejected with no writes, Critical classification, no raw values in response, history or export, formula-safe filename, User B isolation, cleanup. GitHub Actions CI (`.github/workflows/ci.yml`) run on `7b03066` concluded **success**. |
| AI orchestration | A fixture caught a detector boundary defect (79/80 passed): valid repeated cards were missed after a full stop; it was fixed and covered by regression tests. A TLS root cause (`SELF_SIGNED_CERT_IN_CHAIN`) was diagnosed from server logs and fixed without disabling verification. Invisible panel text in dark and high contrast, the Vercel 404 and the per-page loading screen were each traced to a cause and fixed. A human correction of expected totals (259 to 229) is recorded. |
| Lepide design compliance | Official `lepidus.css` and `lepidus.js`, token-only layout CSS (no raw hex), `lp-button`, `lp-card`, `lp-input`, `lp-table`, `lp-badge`, `lp-sidebar`, `lp-dropdown`, `lp-checkbox`, `lp-message`, `lp-empty-state`, `lp-pagination`. Light, dark and high-contrast themes checked on the login page; light and dark checked on the app. Official logo and favicon added (`c5285f3`). Charts are token-styled SVG, an approved exception because the Lepidus React package was not on npm. |
| Git and deployment | Commits `4b82d44` (2026-10-21T12:16:11+05:30) through `7b03066` (2026-10-21T16:08:53+05:30), all with the Co-authored-by trailer. Pushed to `amirk0910/LepidusDDCScanner` `main`. CI green. Secret scan of tracked files clean; `.env*` ignored with only the blank `.env.example` tracked. `vercel.json` added in `74d4444` (2026-10-21T13:32:56+05:30) to fix the 404. |
| Learning and demonstration | `LEARNINGS.md` is filled with lessons drawn from real defects, marked as agent-drafted for the developer to review. No demo recording is in the repository. |

## 3. Acceptance checks from `PRODUCT_BRIEF.md`

| # | Check | Status | Evidence |
|---:|---|---|---|
| 1 | Email low and masked; `alex@@example.test` ignored | Pass | Fixtures 03 and 06, scanner tests |
| 2 | UK phone medium; `12345` ignored | Pass | Fixtures 07 to 10, scanner tests |
| 3 | NINO high; malformed ignored | Pass | Fixtures 12 to 15, scanner tests |
| 4 | Card critical; fails Luhn when last digit is 2 | Pass | Fixtures 17 to 20, Luhn tests |
| 5 | Mixed critical, clean none, repeats counted | Pass | Fixtures 01, 02, 22, 23 |
| 6 | Invalid, empty or over 1 MiB rejected with no database write | Pass | Fixtures 28 to 30, `service.test.ts` |
| 7 | User B cannot read or write User A's scans | Pass | PGlite tests and live Supabase script, 20/20 |
| 8 | Failed finding write leaves no partial scan; no raw matches stored | Pass | Rollback tests (local and live), masked-only persistence and API tests |
| 9 | Dashboard and filter totals match; export masked and spreadsheet-safe | Pass | Metrics, filter and CSV tests |
| 10 | Tests and build run; deployed login to upload to findings to export works | Pass at API level | Tests, build and CI run. Deployed upload, history and export verified through the API (22/22). Browser click-through on Vercel is user-reported only |

## 4. Strengths

| # | Strength |
|---:|---|
| 1 | Privacy is enforced in layers: server-side validation, masking before any database call, database constraints that reject unmasked values, and RLS with an atomic save function, each backed by tests. |
| 2 | Defects were diagnosed from evidence (fixture failures, server logs, connectivity checks) and fixed at the root cause rather than by weakening a check. |
| 3 | The UI follows the supplied design system with persistent navigation, three themes and security insight charts on every auth page. |

## 5. Improvements

| # | Improvement |
|---:|---|
| 1 | Add Playwright browser tests for login, upload, findings and export, and a coverage report; the API-level live tests do not click through the UI. |
| 2 | Keep `WORK_LOG.md` current at every milestone; the log contradicted reality for much of the session. |
| 3 | Make the repository private as the brief requires, and record a short demo. |

## 6. Unverified items (no objective credit; for facilitator review)

| # | Item | Why unverified |
|---:|---|---|
| 1 | Browser click-through of the deployed site (sign-up, navigation, upload, export) | The API flow is verified (22/22); the UI itself is user-reported only |
| 2 | Supabase redirect URLs for email links (confirmation and password reset) | Set by the user; not exercised by any test |
| 3 | Signed-in navigation after the persistent-layout change | Agent verified build, tests and signed-out redirects only |
| 4 | High-contrast theme on app screens and all mobile widths | Only login and parts of the app were visually checked |
| 5 | Lepidus automated HTML validator | Not available or not run |
| 6 | Withheld synthetic acceptance pack | Not provided |
| 7 | Instructor and Developer two-chat workflow and the demo | No evidence in the repository or log |
| 8 | `LEARNINGS.md` content | Drafted by the agent; the developer has not confirmed it |
| 9 | Five development-only dependency advisories (Next.js lint chain) | Present; no non-breaking fix applied |

## 7. Safety review

| Check | Result |
|---|---|
| Raw uploads or raw matches persisted, logged or exported | None found; covered by tests, including live API checks |
| Secrets in Git | None found by pattern scan; `.env*` ignored |
| Owner isolation | Enforced by RLS; tested on local PostgreSQL and live Supabase (20/20) |
| Repository visibility | **Public**, contrary to the brief; a human decision |
| Session token pasted into chat by the user | Short-lived; recommended sign-out |
