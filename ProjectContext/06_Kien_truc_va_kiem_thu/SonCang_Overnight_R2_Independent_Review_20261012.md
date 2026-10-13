# Son Cang YMS - Independent R2 review after 09:20 upgrade

Review date: 2026-10-12. Scope: `soncang_overnight_code_bundle(1).zip`, prior overnight bundle, original independent audit ON-01 through ON-12, and supplied build/changelog reports.

## Decision

**UI PROTOTYPE: conditional acceptance. BACKEND 005-008: NO-GO. CLOUD DEV PUSH: NOT APPROVED.**

The new release has actual changes to the dashboard, container-number correction/history UI and repository, app shell, and PWA manifest/service worker. However, it has **NOT** implemented the previously requested ON-01 through ON-12 Backend/RBAC fixes. No new runtime PostgreSQL evidence was supplied for migrations 005-008.

The new ZIP was opened and checked without errors: 2,573,556 bytes, 530 ZIP entries (524 files), SHA-256 `fcab4bf0f2fcc2357de1826c1dcd5046965b4bbb1ba158da760f1efecdc9fab9` (matches Antigravity report). No `.env` path was found in the ZIP listing. This is a static source review; no Cloud calls, PostgreSQL execution, or interactive browser testing were performed by the independent reviewer.

## A. Direct comparison to earlier audited release

Comparison used `soncang_overnight_code_bundle.zip` (SHA `37336b3d089ebc8f3a5289f4a4dde2e22b4d9261296fe7ca7d4c9ed7629f13ce`) versus `(1).zip`.

**Byte-identical old and new:**

- `supabase/migrations/20261012000005_gate_ticket_atomic_guard.sql` (SHA prefix `bcd8f4b64014`)
- `supabase/migrations/20261012000006_domain_reefer_power.sql` (`7c7911ccaa06`)
- `supabase/migrations/20261012000007_domain_financial_ledger.sql` (`e4a4a13af2bf`)
- `supabase/migrations/20261012000008_domain_exit_clearance.sql` (`9cadf1c684f4`)
- All four corresponding `supabase/tests/005...008...sql` files.
- `src/contexts/auth-context.tsx` and `src/lib/rbac-rules.ts`.

Therefore the original findings **ON-01 through ON-12 remain open unless separately fixed outside the delivered bundle**. No unsupported claim of Backend completion may be made from HTTP 200 or Next.js build results.

## B. Blocking findings still open

| Finding | Priority | Evidence / expected repair |
|---|---|---|
| ON-01 | P0 | All 005-008 pgTAP tests use missing `app_user_roles` and nonexistent `app_roles.id` instead of `app_user_role_assignments` and `app_roles.code`. Test 005 declares 15 but has 14 top-level assertions; 006 declares 12 but has 13. Fix fixtures and TAP plans; run on actual PostgreSQL Local. |
| ON-02 | P0 | 007 `sc_collect_payment`: `OTHER` charge permission check fails open. Fail closed or explicitly authorized using an existing V5 permission. |
| ON-03 | P0 | 008 `sc_approve_exit_clearance` uses `container.visit.read` instead of `exit.clearance.issue`; wrong code `exit.debt_clearance.exception` instead of `exit.clearance.debt_exception`; `sc_confirm_physical_exit` uses `vehicle.visit.create` instead of `exit.actual.confirm`. |
| ON-04 | P0 | 008 may record container `EXITED` immediately after creating unpaid STORAGE charge. Reconcile new fees/payment or authorized debt exception before physical exit. |
| ON-05 | P1 | Broad `USING (true)` read policies in 006/007 expose reefer/financial data across yards/roles. Scope RLS and GRANT/EXECUTE using V5 `sc_can`. |
| ON-06 | P1 | 008 storage fee uses date difference rather than each 22:00-06:00 billing night and first-night-free rule. Test midnight and boundary cases. |
| ON-07 | P1 | 007 tariffs disagree with 004 already applied to DEV; `code UNIQUE` does not allow versions per tariff code. Follow approved V5 source and Four-Eyes AP10. |
| ON-08 | P1 | 007 payment lacks balance guard, idempotency and append-only payment safeguards; partial-collect mismatches 006 enums. |
| ON-09 | P1 | 006 does not separate actual Security physical plugging/unplugging from CCKB entry; lacks proper request/session linkage and tariff snapshot. |
| ON-10 | P1 | 005 atomic RPC repeats same idempotency key without comparing full payload and arrival-time container status. |
| ON-11 | P1 | Frontend Auth/RBAC remains unchanged: static role grants differ from 206 V5 assignments; first assignment used without validity/scope; `hasPermission` falls back to hardcoded grants; demo enabled by default (`!== 'false'`) even in production. |
| ON-12 | P1 | Demo vehicle prices remain wrong: 4-axle 150k vs 200k, 3-axle 120k vs 200k, 3-wheel 50k vs 40k; `XE_SANG_TAI` NULL vs approved zero. |

## C. New or newly visible frontend/PWA issues

| Finding | Priority | File / detail |
|---|---|---|
| R2-01: unsafe SW caching | P1 before any deployment with real users | `public/sw.js:42-100` intercepts **all GET** fetches, not only public same-origin static files, and caches authenticated navigation HTML (`:51-60`), API/cross-origin GET results, with cached fallback. Restrict to immutable public assets; bypass auth/REST/API/navigation with user data; clear caches on sign-out/version upgrade. Offline transactions require an explicitly designed queue and conflicts policy: no queue exists. |
| R2-02: incorrect dashboard KPIs | P1 for UAT | `src/app/dashboard/page.tsx:115-120` labels amount as 'collected in shift' but sums paid charges of all times, ignores payments and partial payments; `:108` counts containers but `:199` labels them TEU (a 40ft container is 2 TEU). Do not show false real financial/TEU metrics. `:143-146` displays 'real-time' even though data loads on mount/manual refresh only. |
| R2-03: history not persisted | P1 for reliable demo/UAT | `src/lib/services/demo-repository.ts:733-796` keeps `numberChanges` in an instance array; `persist()` only stores vehicles and containers (`:232-235`), so correction history disappears after a page reload, while correction count/number may remain. Persist audit history, or explicitly label volatile demo and prevent false immutability claims. |
| R2-04: unsupported financial read and navigation | P1 for Real Mode | `src/components/layout/app-shell.tsx:63-74`: both billing and exit menu items are gated merely by `vehicle.visit.read`; `dashboard/page.tsx:40-54` fetches financial charges for every dashboard role. Gate displays by appropriate V5 financial permissions and Backend RLS. |
| R2-05: permission/read errors disguised as zero | P1 for Real Mode | `src/lib/services/supabase-repository.ts:194-260` returns `[]` on unauthorized/unavailable table errors for reefer and charges; Cloud DEV has only Migration 004 so dashboard must show 'not available' rather than fake zero or 100% real-time. |
| R2-06: PWA activation / installation unverified | P2 | `src/components/pwa-register.tsx:7-17` attaches a `window.load` listener inside `useEffect`, which may miss the already-fired event. `manifest.json` only declares SVG icons; verify install support via Chrome/Edge actual device and offer appropriate PNG icons if required. HTTP 200 for SW/manifest is not evidence of installability/offline correctness. |
| R2-07: stale Cloud write-block message | P2 | `supabase-repository.ts:328-334` suggests `sc_correct_container_number` waits for Migration 004 although 004 is already APPLIED. Keep Real Write blocked until explicitly authorized but correct the explanation. |

## D. One targeted correction round, no further UI expansion

1. **Stop adding screens/components.** Fix ON-01..ON-12 and R2-01..R2-05. Leave cosmetic P2 to backlog. Preserve existing UI and V5 approval model.
2. Fix test fixtures/plans FIRST. Never replace actual PostgreSQL test evidence with assertions count, docs or HTTP 200.
3. Fix SQL 005-008 in place **only because they have NOT been pushed**. Never edit applied migrations 001-004. No Cloud push/reset/repair/production.
4. Correct financial auth/RLS, payment, physical exit, storage nights and reefer actor model. Fully compare both idempotency payload and arrival-time container condition. Keep the default OFF for unconfirmed `empty_in_loaded_out_surcharge`; enable only through approved config/audit.
5. Fix frontend Auth/RBAC from `sc_my_permissions()` and valid effective assignments. Demo opt-in local development only. Financial UI permission guard, dashboard metrics and SW cache scope. Align Demo prices to Migration 004. Persist correction history.
6. Run TypeScript, ESLint and Next build; report actual exit codes. If isolated PostgreSQL Local can be used without touching existing data, run 005->008 migrations and pgTAP with full output; otherwise stop at code-ready and seek permission for local runtime verification. Do not assert pgTAP PASS without logs.
7. Provide a compact change matrix: original finding -> exact edited files/line ranges -> reproduction test -> observed result -> PASS/FAIL/BLOCKED. Add SHA-256 and source ZIP; no secrets.

**Acceptance gate:** UI can stay as a demo prototype; Backend 005-008 only eligible for Cloud approval after clean PostgreSQL Local runtime, financial/RBAC negative tests, and a separate explicit approval. An HTTP 200 or Next.js compilation is not proof of business correctness.
