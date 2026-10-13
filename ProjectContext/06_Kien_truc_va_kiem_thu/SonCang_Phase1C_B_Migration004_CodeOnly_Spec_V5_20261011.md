# SON CANG PWA — PHASE 1C-B / MIGRATION 004 CODE-ONLY SPECIFICATION

**Document date:** 2026-10-11  
**Project:** Son Cang Yard Management PWA — Ta Lung Quang Minh  
**Workspace:** `D:\thanhnx\OpenCode\YMS-project`  
**Cloud DEV:** `son-cang-yms-dev`, project ref `euswzyespwaxyrjkfkrq`  
**Authorization:** WRITE SOURCE FILES ONLY. **NO database execution, NO remote push, NO local Docker startup.**

> This file is an implementation brief for Antigravity, not executed SQL or a passed test report. Its purpose is to produce reviewable migration code, RLS/RPC definitions, pgTAP tests, and a code-review report. Do not interpret this instruction as permission to deploy to any database.

## 1. Source-of-truth and decision log

Read, in precedence order:

1. The project owner's latest instruction: **keep a flexible one-vehicle-visit to many-container-visits data model; do NOT assert that two 20-foot containers on one truck are approved at Son Cang.**
2. `AGENTS.md`, `00_START_HERE.md`, `ProjectContext/01_Nghiep_vu_V5/PROJECT_CONTEXT.md` and the canonical Workbook V5: `ProjectContext/02_RBAC_V5/PWA_Son_Cang_V5_Phan_quyen_RBAC_DONG_HOAN_THIEN.xlsx`, especially tabs `20_V5_DANH_MUC_QUYEN`, `21_V5_CAP_QUYEN_SEED`, `23_V5_PHE_DUYET`, `26_V5_LUONG_THAO_TAC`, and `27_V5_RUI_RO_UAT`. Locate the actual Unicode name of tab 23; do not rename it.
3. `ProjectContext/06_Kien_truc_va_kiem_thu/DOMAIN_SCHEMA_DESIGN_V5.md` and `PHASE1C_A_DESIGN_REVIEW_REPORT.md`.
4. `ProjectContext/06_Kien_truc_va_kiem_thu/SonCang_Phase1C_A_Final_Design_Gate_20261011.md` and `SonCang_Phase1C_A_Independent_Review_V5_20261011.md`.
5. `ProjectContext/05_Nhat_ky_du_an/OPEN_DECISIONS_UAT.md`, `DECISION_LOG.md`, `CURRENT_STATUS.md`, `WORK_LOG.md`.
6. Existing Supabase migrations `20261011000001` through `20261011000003` and the current RBAC pgTAP suite.

**Important source nuance:** `PROJECT_CONTEXT.md` V5 currently says one container per vehicle visit in V1. That is an existing *operational* baseline, but the owner has not confirmed local handling of `2 x 20ft`. Preserve the V1 limit as **provisional and explicitly documented**, not as a permanent database `UNIQUE` constraint. No claim that 2x20 handling is approved. Do not introduce a new policy that a vehicle can carry 2x20 simply because the schema permits multiple references. If exact V1 behavior for swapping inbound A and outbound B is ambiguous, record it as UAT OPEN rather than inventing a rule.

**Scope approval in this turn:** code drafting for 004 only. RV02, RV04, RV09, and specific 2x20 operations remain OPEN. Migration 005, 006, and 007 are NOT authorized.

## 2. Deliverables and exact proposed file paths

Create or update the following local files:

1. `supabase/migrations/20261011000004_domain_vehicles_containers.sql` — SQL migration DRAFT. It must **NOT** be deployed.
2. `supabase/tests/domain_vehicles_containers_004.sql` — isolated pgTAP test suite. Separate it clearly from existing foundation RBAC tests.
3. `ProjectContext/06_Kien_truc_va_kiem_thu/MIGRATION_004_CODE_REVIEW_REPORT.md` — design choices, permission matrix, test coverage, blockers, file inventory, explicit unexecuted status.
4. Update `DOMAIN_SCHEMA_DESIGN_V5.md` **only for corrections needed to match the code**, retaining open UAT items.
5. Update `CURRENT_STATUS.md` and `WORK_LOG.md` as **CODE DRAFT / PENDING REVIEW**, not "deployed", "approved" or "runtime PASS".

Do not edit migration 001-003, RBAC role/grant seed, existing published approval policy rows, or unrelated Next.js code. Do not create tariff, reefer, payments, debt clearance, or container physical-exit tables in 004.

## 3. Migration 004 database scope: exactly three new domain tables

### 3.1 `public.app_vehicle_visits`

Required design concerns:

- Primary key: independent `id uuid` generated server-side. A license plate is never a primary key.
- `yard_id uuid NOT NULL REFERENCES public.app_yards(id)`; verify selected yard is active before creation.
- Vehicle plate text may be null in V5-permitted vehicle categories; normalization must not silently change identifiers.
- Vehicle type code must be compatible with the canonical V5 service/tariff vocabulary but **must not reference an uncreated tariff table**.
- Separate server-trusted physical `entry_at`, optional `exit_at`, created actor and audit metadata; `exit_at >= entry_at` if both exist.
- Explicit bounded visit status, e.g. `IN_YARD`, `EXITED`, `CANCELLED`, with documented allowed transitions; **do not enable public finalization of physical exit at 004**.
- Avoid silently filling actual physical exit time when a record is only created or edited.
- Decide a minimal safe data model for future ticket/payment references without creating migration 006 entities.
- Add practical indexes on yard, visit status and time; do not create unnecessary global uniqueness on plate.

### 3.2 `public.app_container_visits`

Required design concerns:

- Independent `id uuid` PK, never container number as PK.
- `yard_id` FK to `public.app_yards`; `container_no_current` and original/current display identifier; optional `cargo_status` (`HANG` / `RONG` / null or an exactly justified controlled representation).
- `inbound_vehicle_visit_id` and `outbound_vehicle_visit_id` are **independent, nullable FKs** referencing `public.app_vehicle_visits(id)`. They represent different vehicle visits and must be allowed to differ.
- **Database cardinality is 1 vehicle visit : N container visits.** Do not create `UNIQUE(inbound_vehicle_visit_id)`, `UNIQUE(outbound_vehicle_visit_id)` or the previous partial unique indexes that force 1:1.
- Preserve `inbound_at` and optional `outbound_at`; if both, outbound cannot precede inbound. Actual exit is NOT finalizable until the financial/clearance workflow in 006-007 exists.
- A vehicle visit can end while a container visit remains `IN_YARD`; never cascade vehicle exit status to a container exit.
- Cross-yard linking is forbidden. Use trusted database-layer checks for inbound/outbound vehicle linkage: linked vehicle must belong to the same yard as the container. A normal user cannot bypass that via REST or direct table update.
- Do not add global `UNIQUE(container_no_current)` across historic visits. Duplicates must be checked/flagged within active visits without auto-merging; the exact collision policy is UAT-sensitive.
- Do not auto-match by seven trailing digits, fuzzy identifiers, or proposed reefer request identifiers.
- Future cases of a vehicle carrying 2x20 remain structurally possible but are NOT an approved operational workflow. Preserve the current V1 baseline at the **trusted operational RPC layer**, subject to documented UAT; if the exact occupancy/swap rule cannot be verified with available events, fail closed and explain the gap instead of pretending to enforce it.
- Cargo state change for an exited container must not be directly editable by staff; a future AP05 request/approval path is required.

### 3.3 `public.app_container_number_changes`

Required design concerns:

- Stable event PK (`bigint GENERATED ALWAYS AS IDENTITY` or UUID, choice documented).
- FK to the same `app_container_visits.id`.
- Record `old_number`, `new_number`, non-empty reason, effective/recorded timestamp, actor derived from `auth.uid()`, optional evidence reference and CCKB reconciliation/notification state.
- Preserve the container visit UUID, foreign key relations, fee records and historic number changes even when the correction happens after billing.
- Changes are **append-only**. Unauthorized UPDATE/DELETE and history rewriting must be denied via GRANT/RLS and, if necessary, an immutable trigger.
- The business operation to correct a number updates `app_container_visits.container_no_current` and inserts the corresponding change event plus a trusted audit entry **in one PostgreSQL transaction**.
- Correcting a number must not silently adjust tariff, collected payment, fee or create a new container visit.
- Enforce separation between the Security role correcting a number and the CCKB role reconciling discrepancy. Avoid inventing new permission codes.

## 4. Authorization and safe mutation entry points

Use **existing permission codes only**, as seeded by the canonical V5 workbook:

| Action | Permission code | Main V5 operational owner |
| --- | --- | --- |
| Read vehicle visits | `vehicle.visit.read` | All relevant operational roles within granted scope |
| Create vehicle visit | `vehicle.visit.create` | Security, SYS_ADMIN with their grant scope |
| Update basic vehicle fields | `vehicle.visit.update_basic` | Security, SYS_ADMIN with their grant scope |
| Read container visits | `container.visit.read` | Authorized operational roles within granted scope |
| Create container visit | `container.visit.create` | Security, SYS_ADMIN with their grant scope |
| Correct container number | `container.number.correct` | Security, SYS_ADMIN with their grant scope |
| Read discrepancy | `container.number.discrepancy.view` | Security / Port, SYS_ADMIN within scope |
| Security discrepancy acknowledgement | `container.number.discrepancy.sec_ack` | Security, SYS_ADMIN |
| CCKB discrepancy reconciliation | `container.number.discrepancy.port_reconcile` | Port, SYS_ADMIN |
| Read cargo status | `container.cargo.read` | Authorized operational roles |
| Update cargo status while in yard | `container.cargo.update` | Dispatch, SYS_ADMIN |
| Request post-exit cargo correction | `container.cargo.post_exit.request` | Dispatch, SYS_ADMIN; future integrated workflow |
| Approve post-exit cargo correction | `container.cargo.post_exit.approve` | DIS_LEAD / SYS_ADMIN; future integrated workflow |

Check exact role/scope grants from sheet `21_V5_CAP_QUYEN_SEED` rather than deriving them from labels; `sc_can(permission_code, row_yard_id, row_department_code, row_owner_id)` already exists in migration 003. Existing role/grant seed is immutable for 004.

Security requirements:

- Enable RLS on all three new tables, with SELECT restricted by `sc_can()` and the **row's real yard**, not client-supplied yard labels or role claims.
- Strongly prefer **narrow RPC entry points for writes**, with direct `INSERT`, `UPDATE`, `DELETE` denied to `anon` and `authenticated` on new domain tables. If a different approach is proposed, justify with a complete privilege/RLS attack analysis before implementation.
- Candidate RPC names: `sc_create_vehicle_visit`, `sc_update_vehicle_visit_basic`, `sc_create_container_visit`, `sc_correct_container_number`, `sc_update_container_cargo`, `sc_ack_container_number_discrepancy`, `sc_reconcile_container_number_discrepancy`. Make names/signatures consistent, documenting which are implemented now and which are deferred. A partial code path must never advertise a feature that is not safely implemented.
- New `SECURITY DEFINER` functions must use `SET search_path = ''`, fully qualified SQL references, least-privilege `REVOKE EXECUTE FROM PUBLIC` and explicit trusted-role grants. Require non-null `auth.uid()` and check permissions and row status in the function.
- Do not accept an arbitrary `created_by`, `changed_by`, `role_code`, `department_code`, `yard_id` or `is_admin` from client as authoritative; derive authority from trusted authentication and server-side records.
- Validate the target row with `SELECT ... FOR UPDATE` (or equivalent appropriate locking) for sensitive corrections and status transitions, checking yard consistency and preventing stale writes.
- Generate trusted append-only audit events; client must not gain permission to call `sc_log_audit_event` directly. Migration 003 intentionally revokes that EXECUTE from `authenticated`. Respect the actual signature and owner privileges of that existing function rather than granting it publicly.
- No `service_role` key in browser code, SQL test output, files shared with reviewers, or Git.
- No user action may claim a physical vehicle/container **exit** is final or financially cleared in this migration. The final exit workflow belongs to migration 007.

## 5. Operational boundary: flexible DB does not approve 2x20

The following distinction is mandatory:

- **Database structure:** One vehicle visit may be linked from multiple container visits; this is future-proofing, not operational approval.
- **Current V1 document:** `PROJECT_CONTEXT.md` says V1 at most one container per vehicle visit. Do not delete this historic decision or silently announce that V1 permits two 20-foot containers.
- **New owner instruction:** The real-world ability to carry two 20-foot containers at Son Cang has NOT been confirmed.
- **Server workflow:** Must follow documented current V1 behavior where unambiguous and deny unsupported multi-container flows by default. The particular meaning of 'one container per visit' (one simultaneously, one per inbound/outbound direction, or one across the entire visit) should be reported as a pending clarification if source files do not settle it. Do not hardcode an unreviewed interpretation or invent a configurable policy value.
- **Testing:** Prove the FK model can represent more than one related container **in a controlled test fixture**; independently prove normal authenticated operational calls do NOT implicitly activate a 2x20 feature. Mark full 2x20 business UAT as NOT RUN / NOT APPROVED.

## 6. Additional correctness requirements

1. Use source-level `NOT NULL`, sensible `CHECK` constraints and adequate indexes, avoiding overconstraining legitimate status or history.
2. Treat actual timestamps as trusted physical events, not arbitrary client timestamps without checks and audit; make delayed entry and corrections explicit.
3. Store timestamptz in PostgreSQL; display in `Asia/Ho_Chi_Minh`; do not substitute database server locale for the business timezone.
4. Handle race conditions for creating/closing visits, number corrections and cargo updates; no silent last-write-wins for a sensitive action.
5. Make correction reasons mandatory and non-whitespace; record before/after values and actor.
6. Use a clearly specified treatment of cancellation and correction; do not hard-delete operational history from normal client roles.
7. Protect records marked as departed against unauthorized edits; however, post-exit **number correction with audit** may be valid under V5, while post-exit **cargo correction** requires AP05.
8. Preserve compatible future relationships to reefer, storage fees, clearance, evidence and migration/import processes without creating their tables prematurely.
9. Existing foundation RBAC definitions, 8 roles, 67 permissions, 206 grants, 60 active + 7 future permissions, stay unchanged.

## 7. pgTAP tests to author (do NOT execute in this task)

Create meaningful positive AND negative assertions. Fixture setup must use proper authenticated DB role for RLS checks (e.g. `SET LOCAL ROLE authenticated`), not just JWT GUCs. No replacing `auth.uid()` with a mock definition. Distinguish real permissions from non-permission errors.

| Test ID | Required scenario | Expected result |
| --- | --- | --- |
| M004-T01 | Three tables and required columns/FKs exist | Pass schema checks |
| M004-T02 | New domain tables have RLS enabled | All three true |
| M004-T03 | `anon` cannot access protected rows or mutate tables | Deny |
| M004-T04 | Security user with YARD grant creates a vehicle in own yard | Allow |
| M004-T05 | Same Security user cannot create a visit in another yard | Deny |
| M004-T06 | Port/Dispatch user without create right cannot create vehicle/container visits | Deny |
| M004-T07 | Container and vehicle have separate UUID lifecycles | Allow; UUIDs differ |
| M004-T08 | Vehicle A drops container C and later departs, C stays `IN_YARD` | Must be representable; do not expose final exit RPC in 004 |
| M004-T09 | Vehicle B later picks up C | Linkage model supports B != A; final physical exit deferred |
| M004-T10 | Same-yard linkage valid; mismatched yard linkage | Valid / Deny |
| M004-T11 | Schema can represent N container visits related to one vehicle | Pass structural fixture; NOT 2x20 business approval |
| M004-T12 | Current V1 client/RPC may not silently create unapproved multi-container operation | Deny unsupported scenario; open UAT noted |
| M004-T13 | Invalid outbound timestamp earlier than inbound | Constraint denial |
| M004-T14 | Security corrects container number with reason | Update same ID + append history + audit |
| M004-T15 | Correction without reason, different-yard correction, unauthorized actor | Deny; no partial rows |
| M004-T16 | Container number correction after simulated billing/exit state | Number can be corrected via permitted audited path; no fee changes; integration deferred |
| M004-T17 | Normal client cannot UPDATE/DELETE number-change history | Deny |
| M004-T18 | Port can reconcile discrepancy but cannot impersonate Security correction | Enforce distinct permissions |
| M004-T19 | Dispatch updates HANG/RONG while in yard | Allow with own-yard grant |
| M004-T20 | Security/Port cannot update cargo if not granted | Deny |
| M004-T21 | Direct cargo mutation after exit is denied pending AP05 | Deny |
| M004-T22 | Duplicate write attempt / concurrent correction / stale row | No double event or lost update |
| M004-T23 | Repeated container number across historic visits | Allowed without conflating UUIDs |
| M004-T24 | Role inactive, expired, no role, feature disabled | Deny |
| M004-T25 | Public API cannot falsely mark vehicle/container departed | Deny |
| M004-T26 | No functions grant unsafe EXECUTE to PUBLIC/anon; no direct audit spoof | Deny |

Testing rules:

- Prefer `BEGIN`/`ROLLBACK` fixtures; test scripts must never target linked Cloud automatically.
- If a scenario requires migration 005-007, write a precise **DEFERRED** case and rationale; do not forge a passing assertion.
- If tests cannot be run without a local PostgreSQL engine and the user prohibits Docker for this task, report **TESTS AUTHORED, NOT EXECUTED**, not 'PASS'.
- Verify the pgTAP `plan(...)` matches the actual assertion count (count dynamically where possible; avoid counting comments as assertions).
- No fake SQLSTATE checking; denial must demonstrate the expected permission, constraint or business reason.

## 8. Allowed and forbidden commands

**Allowed:** inspect/read files, git diff/status, edit local 004 SQL and tests, run static linters, syntax-oriented checks that do not need a database, run `pnpm exec tsc --noEmit`, `pnpm lint`, optionally `pnpm build`, and read-only CLI verification if needed.

**FORBIDDEN in this task:**

```text
npx supabase db push --linked
npx supabase db push
npx supabase db reset --linked
npx supabase migration repair
npx supabase test db --linked
npx supabase start
docker start
docker run
```

Never execute SQL DDL/DML via Supabase Dashboard, linked database API, `psql`, MCP, or any agent integration. Do not connect to another project. Do not remove or rewrite migrations 001-003. A generated 004 file under the migrations directory **is NOT deployment authorization**.

## 9. Review report format

Use this table in `MIGRATION_004_CODE_REVIEW_REPORT.md`:

| Item | Evidence / file:line | Status |
| --- | --- | --- |
| Existing RBAC baseline unchanged | Git diff; script result if run | PASS/FAIL/NOT VERIFIED |
| Three-table migration drafted | Full relative path | DRAFT |
| DB 1:N cardinality, no hard 1:1 | FK and index SQL | REVIEWED/FAIL |
| 2x20 operational rule unapproved | Open UAT entry | OPEN |
| Current V1 operational limit | RPC choice and rationale | REVIEW/OPEN |
| Yard/actor permission enforcement | Policy and RPC lines | REVIEW/FAIL |
| Number correction history + audit | SQL transaction/function lines | REVIEW/FAIL |
| No premature final exit / money | SQL audit | REVIEW/FAIL |
| pgTAP authored, plan consistent | Tests and count | DRAFT/FAIL |
| Actual PostgreSQL runtime | Logs from real execution, if any | **NOT RUN** |
| Supabase Cloud migration status | Read-only verification only | **UNCHANGED** |

Finish by listing all unresolved business and technical questions, exact changed files, commands executed and exit codes, and a short explicit **STOP / WAIT FOR HUMAN CODE REVIEW AND SEPARATE CLOUD DEPLOYMENT APPROVAL** statement.

## 10. Definition of done for this instruction

- Migration 004 draft exists in local source, creating exactly three domain tables and safe RPC/RLS support.
- pgTAP test suite exists but is **not claimed as executed**.
- No semantic changes to migrations 001-003, RBAC seed, or existing cloud data.
- No permission changes outside existing V5 entitlement matrix.
- No implied 2x20 approval, fee finalization, or production readiness.
- Review report explains all deliberately deferred features and unresolved UAT items.
- Antigravity stops and asks the owner to review code and testing strategy before any database execution.
