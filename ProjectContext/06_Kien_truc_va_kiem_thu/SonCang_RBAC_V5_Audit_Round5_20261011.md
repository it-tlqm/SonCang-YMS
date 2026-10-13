# Son Cang V5 RBAC - Independent Source Audit, Round 5

Date: 2026-10-11
Scope: `rbac_v5_verification_bundle(4).zip` (22 entries), canonical `PWA_Son_Cang_V5_Phan_quyen_RBAC_DONG_HOAN_THIEN.xlsx`, migrations 001-003, scripts, and pgTAP suite.

## Verification actually performed

- ZIP extracted successfully: 22 entries.
- Executed `python scripts/audit_rbac_exact.py` with the original V5 workbook available at the expected path: **exit 0**.
- Executed `node scripts/verify_rbac_invariants.js`: **52 PASS / 0 FAIL**, exit 0.
- Executed `python scripts/test_audit_mutation.py`: **4/4 PASS**, exit 0.
- Confirmed the workbook grant `SEC_STAFF / report.revenue.read / SELF` and AP10, AP11, AP12 policy descriptions.
- Counted 40 pgTAP assertion calls in `supabase/tests/rbac_verification.sql`, matching `plan(40)`.
- No PostgreSQL, Docker Desktop on the user's Windows machine, or Supabase runtime was available to this independent audit. No claim is made that migrations or pgTAP tests have passed at runtime.

## Confirmed defects and test-quality gaps

### SC-R5-01 - BLOCKER: invalid audit fixture INSERT

- Source: `supabase/migrations/20261011000001_foundation_rbac.sql`, line 133, defines `app_audit_events.id bigint GENERATED ALWAYS AS IDENTITY`.
- Source: `supabase/tests/rbac_verification.sql`, lines 213-217, inserts an explicit `id = 999999` without `OVERRIDING SYSTEM VALUE`.
- Effect: PostgreSQL rejects explicit non-DEFAULT values for `GENERATED ALWAYS` identity columns. The test aborts before its assertions for immutable audit rows.
- Fix: Omit `id` in the fixture INSERT and capture the generated ID using `RETURNING id` in a DO block, then reference that generated ID in tests 5.1 and 5.2. Do not modify the audit table schema to accommodate a broken fixture.

### SC-R5-02 - HIGH: scope matrix does not test RLS under authenticated

- Source: `supabase/tests/rbac_verification.sql`, lines 238-250, changes the SQL role only for test 6.1 and calls `RESET ROLE`.
- Source: lines 330-401, calculates the full 15-case scope matrix in a DO block without switching to SQL role `authenticated`. It changes JWT claims and directly calls `sc_can()` while SQL execution has reverted to its previous privileged role.
- Effect: This validates part of the `sc_can()` business logic but does not prove row-level SELECT/INSERT/UPDATE policies under the normal app database role. The reporting label 'RLS tested across 4 scopes' would therefore be misleading.
- Fix: Run authorization tests under `SET LOCAL ROLE authenticated` after creating fixtures with privileged setup. Add actual row queries on `app_audit_events` and `app_approval_requests` for allowed and denied scope cases. Assert both rows visible and rows hidden, as applicable. Keep clear differentiation between unit tests for `sc_can()` and integration tests for RLS.

### SC-R5-03 - HIGH: approval tests can match the wrong exception

- Source: lines 270-278 and 309-318, `throws_ok()` is given a string containing two SQL commands: a session-setup SELECT followed by the tested RPC SELECT. Its SQLSTATE assertion checks `P0001`, but does not check the business error text.
- Effect: The pgTAP documented contract expects an SQL statement or prepared statement; the multi-statement string is unreliable and may fail for a reason different from the intended AP06/Four-Eyes branch. Different business RAISE EXCEPTION paths also use `P0001`.
- Fix: Set authentication context in a separate statement before `throws_ok()`; pass only a single RPC SELECT to `throws_ok()`. Match a distinctive message (or explicitly assigned SQLSTATE) for AP06 and for Four-Eyes. Verify request status remains PENDING after each denied action.

### SC-R5-04 - MEDIUM: test overrides an actual Supabase auth function

- Source: lines 25-39, `CREATE OR REPLACE FUNCTION auth.uid()` and `auth.role()` in the test suite.
- Effect: Tests can inadvertently validate their own redefined behavior rather than the actual Supabase Auth helper implementations. Transaction rollback limits persistence but does not restore authenticity during the test.
- Fix: Do not replace `auth.uid()` or `auth.role()` in an integration test. Configure supported JWT claims for the actual Supabase functions, and explicitly verify the effective user ID as authenticated.

### SC-R5-05 - NOT VERIFIED: database runtime remains blocked

- The Antigravity report states Docker CLI is installed but the Docker Linux engine is not running (Windows named-pipe connection failure).
- `npx supabase start`, migrations 001-003, `npx supabase test db`, and authenticated RPC/RLS integration testing have not passed at runtime.
- Fix: The user opens Docker Desktop and waits for Engine Running; verify `docker info` shows Server information; run `npx supabase start` followed by `npx supabase status`, and only then run `npx supabase test db`. Keep all work LOCAL and record exact output/exit codes.

## Scope accepted for now

- Original V5 mapping: 8 roles, 67 permission codes, 206 grant tuples. 60 V1/CORE permissions active, seven deferred permissions inactive.
- AP10 two-actor request/publish, AP11 deferred, AP12 security kiosk identity policy included in migration seed.
- Audit RPC EXECUTE revoked from `authenticated`; direct approval INSERT REVOKE and policy drop present in migration 003. Their effective PostgreSQL privileges are **not** independently verified on the runtime database.

## Exit criteria for Phase 1B

1. Docker/Supabase Local PostgreSQL starts and all three migrations apply without errors.
2. Fix SC-R5-01/02/03/04; pgTAP suite is actually run under local PostgreSQL and all planned assertions pass.
3. Evidence includes privileged and authenticated sessions, effective roles, positive/negative scope tests, real RLS row visibility, and RPC privilege checks.
4. `CURRENT_STATUS.md` records clear distinctions between authored code, static checks, database execution and functionality actually verified.
5. Do not start Phase 1C or write to remote/production databases before this gate.
