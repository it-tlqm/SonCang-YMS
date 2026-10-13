# SON CANG — REVIEW DOC LAP PHASE 1B (11/10/2026)

**Phan he:** Next.js / Supabase Local / RBAC V5 / RLS & pgTAP.
**Tai lieu nhan:** `rbac_v5_verification_bundle(5).zip` (24 tep), bao cao Antigravity `Pasted text(20261011-112858).txt`.
**Ket luan:** **Co the tam chap nhan nghiem thu Phase 1B o pham vi nen tang RBAC/RLS tren Supabase Local theo log da ban giao; KHONG phai nghiem thu end-to-end Auth, Domain Schema, tai chinh hay Production.**

## 1. Bang chung doc lap

- File ZIP hop le, `ZipFile.testzip()` khong phat hien loi, du 24 tep.
- 3 migrations SQL 001, 002, 003 co hash khong thay doi so voi goi vong truoc; khac biet chinh la `supabase/tests/rbac_verification.sql` va log/tai lieu.
- Tu chay `node scripts/verify_rbac_invariants.js` tren ban giai nen: **52 PASS, 0 FAIL, exit 0**.
- Tu chay `python scripts/audit_rbac_exact.py` voi workbook V5 goc: **exit 0**, trung 8 roles, 67 permissions (60 CORE active, 7 tuong lai inactive), 206 grants.
- Tu chay `python scripts/test_audit_mutation.py`: **4/4 PASS, exit 0**.
- Dem doc lap tep pgTAP: `SELECT plan(49)` va **49** phep kiem tra `SELECT is / ok / throws_ok`. Trong do **hai doan** `SET LOCAL ROLE authenticated` (2 test truc tiep ve INSERT, 7 test doc audit), con lai bao gom kiem tra SQL, rang buoc va logic `sc_can`.
- Tep `supabase/tests/pgtap_runtime_execution.log` bao `All tests successful`, `Files=1, Tests=49`, `Result: PASS`, `Process exit code: 0`. **Day la bang chung do Antigravity cung cap, khong phai ket qua tu chay PostgreSQL tren may cua nguoi dung trong vong review nay**. Tep log co phan tom tat duoc soan them, khong phai transcript stdout day du.

## 2. Co the ket luan

- Nen tang ma tran vai tro / ma quyen / grants phu hop workbook V5.
- Cau truc test da khac phuc loi test do many vong truoc va co bao cao pgTAP runtime PASS.
- Kiem soat hien tai: truc tiep INSERT vao `app_approval_requests` bi REVOKE; `sc_log_audit_event` khong EXECUTE boi authenticated; audit UPDATE/DELETE bi trigger chan; RLS SELECT tren `app_audit_events` co kiem tra `DEPARTMENT/YARD` theo gia tri dong du lieu.

## 3. Pham vi chua duoc nghiem thu / can co trong Phase 1C

1. **Approval nghiep vu chua mo:** `sc_create_approval_request()` chu dong `RAISE EXCEPTION` vo dieu kien trong migration 003, de cho schema target. Day la fail-closed co chu dich; khong coi la luong create/approve hoan chinh.
2. **Approval RPC positive/unauthorized chua duoc bao phu:** 49 bai test co AP06 va four-eyes DENY, nhung chua co phe duyet hop le thanh cong, nguoi khac bo phan/khac bai bi tu choi, snapshot / target thuc te va state transition hai buoc. Test sau khi co domain record.
3. **RLS moi thu tren nhat ky:** 7 bai integration SELECT kiem tra `app_audit_events`; chua thay test duong doc `app_approval_requests`, thay doi quan ly roles/grants bang role authenticated, thay doi assigned role do lech pham vi.
4. **Chua co Auth end-to-end qua HTTP/JWT:** pgTAP thiet lap `request.jwt.claims` noi bo la hop le de test SQL-RLS nhung khong thay the kiem thu dang nhap, cookie, API, proxy Next.js. `src/proxy.ts` hien goi helper refresh session; khong thay redirect guard hoac route authorization tai day. Truoc khi mo `/portal`, can kiem tra entrypoint Auth/route guard va RLS.
5. **Bao ve ngu canh permission:** `sc_can(permission, yard, department, owner)` chi nen duoc goi tu RLS/RPC ma gia tri target da doc tu DB, khong duoc tin scope du client tu khai bao.
6. **Chung cu runtime doc lap:** Nho luu lai raw stdout/stderr va exit code cua `npx supabase start`, `npx supabase status`, `npx supabase test db --local`, kem hash/revision git. Log hien tai co tinh tong hop nen chua phai audit trace day du.

## 4. De nghi gate tiep theo

**Chap nhan buoc chuyen giai doan co dieu kien:** bat dau **Phase 1C/Design** voi Domain Schema, tariff versioning, lap bang lifecycle xe/container doc lap va quan he xe nhan/tra, quy tac thu phi; chi merge cac migration nghiep vu khi duoc chay Supabase Local va test pgTAP tren target that. Khong duoc xac nhan Phase 1B/1C la san sang Production.

### Dieu kien bao ve V5
- Phan biet `vehicle_visit_id` voi `container_visit_id` va cac xe vao/ra nhan container co the khac nhau.
- Tinh phi luu theo dem 22:00-06:00, mien dem dau, `max(0, dem-1)*100000`, FINAL chi khi An ninh ghi nhan xe/cont ra thuc te.
- Dien cont moi session lam tron 15 phut, khong tao session khi moi la phieu yeu cau du kien; FINAL khi rut dien vat ly.
- CCKB duyet thanh toan/clearance, An ninh thao tac vat ly; dong tien va audit phai transactional/idempotent, append-only.
- Tuong thich 8 roles, 67 permission codes, 206 grants; chua thay doi UAT RV01-RV12.

*Day la bao cao code review tinh va doi chieu nguon. Moi ket qua PostgreSQL duoc danh dau ro la bang chung ban giao, khong duoc tu nhan la kiem chung runtime doc lap.*
