# Developer Scorecard — Lepide MiniDSP

Generated 2026-10-21 from the application, Git history, `WORK_LOG.md`, test evidence and the conversation. Times are Git commit timestamps (IST, +05:30). Items I could not verify earn **no** objective credit and are flagged in section 6.

## 1. Score summary

| Category | Max | Score | Basis |
|---|---:|---:|---|
| Functionality | 30 | **25** | All four detectors, classification, bounded upload validation, auth, atomic save, dashboard, filters, safe CSV export and a live deployment are built. Deducted for live upload to export and live RLS not independently evidenced. |
| Testing and reliability | 25 | **19** | 103 tests executed and passing, real PostgreSQL RLS and rollback tests, typecheck, lint and build pass. Deducted for no Playwright or component tests and the live two-user script not run. |
| AI orchestration | 20 | **11** | Several defects found and fixed by testing and review. Deducted for stale `WORK_LOG.md`, blank `LEARNINGS.md` and no evidence of the two-chat Instructor and Developer flow. |
| Lepide design compliance | 10 | **7** | Official Lepidus CSS, JS and tokens, `lp-` components, light, dark and high-contrast themes, the Lepide logo. Deducted for an approved chart exception, no validator run and partial theme and mobile checks. |
| Git and deployment | 10 | **7** | 8 meaningful commits, pushed to GitHub, Vercel live, secrets excluded. Deducted for a public repository (brief requires private) and a stale log. |
| Learning and demonstration | 5 | **1** | `LEARNINGS.md` is still the empty template and no demo is evidenced. |
| **Total** | **100** | **70** | |

## 2. Evidence by category

| Category | Supporting evidence |
|---|---|
| Functionality | Detectors, masking and classification in `src/lib/scanner.ts` (email, UK phone, NINO, Luhn card). Server-side upload limits (1 MiB, UTF-8, binary, type, bounded streaming) in `src/lib/upload.ts`. Auth via Supabase SSR with a request proxy. Atomic `save_scan` function with owner-scoped RLS in `supabase/migrations/202610210001_minidsp.sql`. Dashboard, filters, history and spreadsheet-safe export (`src/lib/csv.ts`). Live URL https://lepidusddcscanner.vercel.app/ returned HTTP 200 on `/login` and `/preview` after the redeploy. |
| Testing and reliability | `npm test`: 6 files, **103 passed**, at the final working tree. `npm run typecheck` exit 0, `npm run lint` pass, `npm run build` pass. All 30 supplied fixtures run against expected risk. Real PostgreSQL (PGlite) tests cover cross-user read, update and delete denial, cross-owner finding attachment, anonymous denial, rollback with no partial scan, and forged risk or ownership. Service tests assert only masked data reaches the database call and failure logs hold no content. |
| AI orchestration | A fixture caught a detector boundary defect (79/80 passed): valid repeated cards were missed after a full stop; it was fixed and covered by regression tests. A TLS root cause (`SELF_SIGNED_CERT_IN_CHAIN`) was diagnosed from server logs and fixed without disabling verification. Invisible panel text in dark and high contrast, the Vercel 404 and the per-page loading screen were each traced to a cause and fixed. A human correction of expected totals (259 to 229) is recorded. |
| Lepide design compliance | Official `lepidus.css` and `lepidus.js`, token-only layout CSS (no raw hex), `lp-button`, `lp-card`, `lp-input`, `lp-table`, `lp-badge`, `lp-sidebar`, `lp-dropdown`, `lp-checkbox`, `lp-message`, `lp-empty-state`, `lp-pagination`. Light, dark and high-contrast themes checked on the login page; light and dark checked on the app. Official logo and favicon added (`c5285f3`). Charts are token-styled SVG, an approved exception because the Lepidus React package was not on npm. |
| Git and deployment | Commits `4b82d44` (2026-10-21T12:16:11+05:30) through `8337265` (2026-10-21T15:42:59+05:30), all with the Co-authored-by trailer. Pushed to `amirk0910/LepidusDDCScanner` `main`. Secret scan of tracked files clean; `.env*` ignored with only the blank `.env.example` tracked. `vercel.json` added in `74d4444` (2026-10-21T13:32:56+05:30) to fix the 404. |
| Learning and demonstration | `LEARNINGS.md` contains no recorded lessons. No demo recording is in the repository. |

## 3. Acceptance checks from `PRODUCT_BRIEF.md`

| # | Check | Status | Evidence |
|---:|---|---|---|
| 1 | Email low and masked; `alex@@example.test` ignored | Pass | Fixtures 03 and 06, scanner tests |
| 2 | UK phone medium; `12345` ignored | Pass | Fixtures 07 to 10, scanner tests |
| 3 | NINO high; malformed ignored | Pass | Fixtures 12 to 15, scanner tests |
| 4 | Card critical; fails Luhn when last digit is 2 | Pass | Fixtures 17 to 20, Luhn tests |
| 5 | Mixed critical, clean none, repeats counted | Pass | Fixtures 01, 02, 22, 23 |
| 6 | Invalid, empty or over 1 MiB rejected with no database write | Pass | Fixtures 28 to 30, `service.test.ts` |
| 7 | User B cannot read or write User A's scans | Pass locally | PGlite tests. Live Supabase script not executed by me (UNVERIFIED) |
| 8 | Failed finding write leaves no partial scan; no raw matches stored | Pass locally | Rollback test, masked-only persistence test |
| 9 | Dashboard and filter totals match; export masked and spreadsheet-safe | Pass | Metrics, filter and CSV tests |
| 10 | Tests and build run; deployed login to upload to findings to export works | Partial | Tests and build run. Deployed full flow is user-reported only |

## 4. Strengths

| # | Strength |
|---:|---|
| 1 | Privacy is enforced in layers: server-side validation, masking before any database call, database constraints that reject unmasked values, and RLS with an atomic save function, each backed by tests. |
| 2 | Defects were diagnosed from evidence (fixture failures, server logs, connectivity checks) and fixed at the root cause rather than by weakening a check. |
| 3 | The UI follows the supplied design system with persistent navigation, three themes and security insight charts on every auth page. |

## 5. Improvements

| # | Improvement |
|---:|---|
| 1 | Run `npm run test:rls` against the training project and record the output; add Playwright tests for login, upload, findings and export. |
| 2 | Keep `WORK_LOG.md` current at every milestone and fill in `LEARNINGS.md`; the log contradicted reality for most of the session. |
| 3 | Make the repository private as the brief requires, and add CI to run typecheck, lint, tests and build on each push. |

## 6. Unverified items (no objective credit; for facilitator review)

| # | Item | Why unverified |
|---:|---|---|
| 1 | Two-user RLS isolation on the live Supabase project | `scripts/test-rls.mjs` exists but was not executed by the agent |
| 2 | Deployed upload, findings, history and export on Vercel | Reported working by the user; not independently tested |
| 3 | Vercel environment variables and Supabase redirect URLs | Set by the user; not inspected |
| 4 | Signed-in navigation after the persistent-layout change, and the new sign-up redirect on the live site | Agent verified build, tests and signed-out redirects only |
| 5 | High-contrast theme on app screens and all mobile widths | Only login and parts of the app were visually checked |
| 6 | Lepidus automated HTML validator | Not available or not run |
| 7 | Withheld synthetic acceptance pack | Not provided |
| 8 | Instructor and Developer two-chat workflow and the demo | No evidence in the repository or log |
| 9 | Five development-only dependency advisories (Next.js lint chain) | Present; no non-breaking fix applied |

## 7. Safety review

| Check | Result |
|---|---|
| Raw uploads or raw matches persisted, logged or exported | None found; covered by tests |
| Secrets in Git | None found by pattern scan; `.env*` ignored |
| Owner isolation | Enforced by RLS, tested on local PostgreSQL; live check unverified |
| Repository visibility | **Public**, contrary to the brief; a human decision |
| Session token pasted into chat by the user | Short-lived; recommended sign-out |
