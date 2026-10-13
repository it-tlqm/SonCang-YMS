# SON CANG - INDEPENDENT REVIEW OF BUGFIX SPRINT (12/10/2026)

**Du an:** Phan mem quan ly ben bai/cang can Son Cang - Cong ty Co phan Ta Lung Quang Minh.

**Nguon:** `soncang_overnight_code_bundle(2).zip`, `SONCANG_P0P1_FIX_REPORT.md`, bao cao Antigravity. Kiem tra noi dung SQL/TypeScript va doi chieu migrations 001-004, seed RBAC V5 trong chinh ZIP.

## 1. Ket luan

- ZIP mo duoc, 526 entries, CRC PASS; SHA-256 `216f7fabdff6eb90bffe427ce3e1cd841573160df07156f4aee21a129a982825` khop bao cao.
- Ca 4 migrations 005-008, 4 tests pgTAP va cac file frontend da duoc sua thuc te so voi bundle truoc.
- `plan()` cua bo pgTAP moi la 15 + 13 + 10 + 12 = **50**; so lan goi assertion o muc top-level doi chieu tinh khop theo phep dem. **KHONG dong nghia 50 PASS**: chua co test PostgreSQL runtime.
- **NO-GO Cloud DEV** va **NOT READY de gan PASS runtime**: phat hien loi schema/constraint trong 007/008 va data fixture; phai sua ban va P0 roi test tren PostgreSQL Local.
- Bao cao `pnpm lint`, `tsc`, `pnpm build` PASS la ket qua do Antigravity cung cap; khong coi do la bang chung test nghiep vu PostgreSQL.

## 2. Loi chan (P0)

### SC-R3-01: INSERT vao `app_payments` sai cot

- `supabase/migrations/20261012000008_domain_exit_clearance.sql`, dong **263-269**: `INSERT INTO public.app_payments(yard_id, charge_id, amount, payment_method, receipt_code, collected_by, status, notes)`.
- Bang do migration 007 khai bao tai dong **83-98** co `payment_amount` va `collector_dept` (NOT NULL), **khong co** `amount` hay `status`.
- Nhanh xuat bai co thu phi luu (p_paid_at_gate=true) khong the INSERT thanh cong. Sua dung cot, ghi chinh xac `payment_amount`, `collector_dept`, va dong bo `app_charges.paid_amount = amount`, `status=PAID` trong cung transaction. Nen tai su dung mot luong ghi payment duoc kiem soat thay vi duplicate logic.

### SC-R3-02: Xe xuat bai thieu `exit_by`

- Migration 008, dong **302-309**: UPDATE `app_vehicle_visits SET status='EXITED', exit_at=...` nhung **khong SET `exit_by`**.
- Migration 004, dong **89-95**: `ck_vehicle_status_exit` yeu cau neu `status='EXITED'` thi `exit_at IS NOT NULL` **va** `exit_by IS NOT NULL`.
- Nhanh co `p_outbound_vehicle_id` se bi check constraint chan. Sua bang `exit_by=auth.uid()` va xac minh xe ra dung bai/trang thai, khong ngam bo qua 0 row UPDATE.

### SC-R3-03: Test 008 thao tac role-permissions khong hop le

- `supabase/tests/008_exit_clearance.test.sql`, doan gan **dong 88-99**: INSERT `app_role_permissions(role_code, permission_code)` thieu `scope` NOT NULL (schema 001, dong 48-53).
- Con chen permission `finance.payment.collect` **khong co trong 67 action V5**. Bo test fixture cap them quyen nay; dung 206 grants goc ma seed V5 da co. Khong tu tao permission moi chi de test PASS.
- Viec exception khong dung hay schema error se lam DO block dung, nen assertion count dung van khong dam bao test chay.

### SC-R3-04: Dieu kien xuat bai chua kiem tra day du cong no/dien

- Migration 008 `sc_approve_exit_clearance`, dong 118-160, chi kiem tra `PLUGGED`, khong kiem tra khoan REEFER/TICKET chua thu; `sc_confirm_physical_exit`, dong 229-289, chi xu ly phi luu bai.
- Can doi chieu AP06/AP07: truoc khi clearance/ra cong, cac khoan can thanh toan phai duoc doi soat, hoac co ngoai le no duoc duyet; khong duoc lay `p_paid_at_gate` de xem nhu toan bo cong no da thanh toan.
- Cung can test truong hop container duoc cam dien lai sau khi clearance truoc khi xuat cong. Chua du bang chung dau-cuoi thanh toan/clearance.

## 3. P1 - can giai quyet trong cung sprint

### SC-R3-05: Quyen tai chinh dung ma khong co trong V5; RLS qua rong

- Migration 007 goi `billing.charge.read`, `finance.payment.read`, `billing.charge.manage` - **khong co** trong 67 permission seed 002.
- Migration 008 goi `finance.payment.collect` - **khong co** trong V5.
- `app_charges` SELECT cho phep `vehicle.visit.read` hoac `container.visit.read` (007 dong 70-77); `app_payments` SELECT cung cho `vehicle.visit.read` (007 dong 104-111). Neu co SELECT grant thi nguoi co quyen xem xe co the doc thong tin tien; neu chua grant thi truy van co the loi permission denied. Thiet ke lai policy theo quyen thuc su cua V5 va pham vi SELF/DEPARTMENT/YARD/ALL, khong dua vao quyen xem xe de mo toan bo so cai.
- Thu ve dung quyen `ticket.payment.collect` (thay vi `vehicle.visit.create`) va phan biet `reefer.payment.partial_collect` khi thu mot phan. Khoan OTHER chua co permission cu the: chon fail-closed cho den khi duoc duyet.

### SC-R3-06: Thanh toan mot phan va so cai khong dong bo

- 007, dong 231-261: neu thu mot phan ve xe, `v_new_status='PARTIALLY_PAID'` roi cap nhat `app_vehicle_visits.ticket_payment_status`.
- 004, dong 79-80: CHECK ve xe chi cho `UNPAID`, `PAID`, `EXEMPT`, `CANCELLED`; giao dich se rollback. De xuat fail-closed voi thu mot phan ve neu V5 chua cho phep, thay vi tu mo rong status 004.
- 007 nen chan thu tren `CANCELLED`/`EXEMPT` va kiem tra so du; idempotency replay phai so phuong thuc/receipt va quyen actor/yard, khong chi amount+charge. Test giao dich dong thoi.
- 007 `app_payments` chua co immutable trigger ro rang; RLS READ-only khong tu dong dam bao bat bien voi cac kenh privileged/migration/script.

### SC-R3-07: Frontend quyen that va hardcode chua khop RBAC V5

- `src/contexts/auth-context.tsx`, dong gan **150-182**, doc truc tiep `app_role_permissions`.
- Migration 003, dong **489-493**: RLS chi cho user co `admin.role_permissions.manage` doc bang nay. Nhan vien thuong se khong lay duoc permissions, du login thanh cong.
- Doi sang RPC chinh thuc `sc_my_permissions()`; xu ly scope/yard va loi truy van fail-closed; khoi phuc session sau refresh.
- Doi chieu truc tiep `src/lib/rbac-rules.ts` voi seed V5: Frontend **196 role-permission pairs**, seed **206**; **thieu 14** va **thua 4**. Danh sach tĩnh chi nen la demo, sinh tu seed neu can; Real Mode bat buoc dung effective RBAC.

### SC-R3-08: Idempotency atomic chua du

- Migration 005, dong **347-386**: replay chi doi chieu vehicle_type, license_plate va so/size/type container; chua doi chieu `driver_name`, `driver_phone`, `ticket_code`, `note`, `cargo_status` duoc truyen.
- Cu phap SELECT roi INSERT khong bat `unique_violation` cho race retry cung key; can test hai ket noi dong thoi cung key va thay doi payload.

### SC-R3-09: Mang nghiep vu thanh toan chua thong nhau

- 006 khi rut dien chi update `app_reefer_power_sessions`, khong tao khoản phải thu `app_charges`; 005 khi tao luot ve khong tu tao TICKET charge. 007 co bang charges nhung khong co luong tao charges end-to-end ro rang.
- Can dam bao phat sinh charge theo 1 nguon du lieu tin cay, snapshot bieu phi va audit, tranh lech so cai; neu chua co thi danh dau BLOCKED, khong tuyên bo billing Real Mode da san sang.

## 4. Phan da sua hop le/ghi nhan

- Ca 8 file SQL/test moi **da thay doi** thuc su so voi ZIP truoc.
- 006 co unique partial index ngan hai session PLUGGED va cong thuc chia block 15 phut; chua kiem thu runtime.
- 007 da co chan so thu > so du va idempotency key - can test concurrency.
- 008 da bổ sung check no STORAGE hoac ngoai le AP06 nhung duong thanh toan dang loi.
- `public/sw.js` da gioi han fetch cache vao static same-origin; hien khong cache navigation/API.
- Demo da dong bo gia 7 ma xe trong source; van can test giao dien.

## 5. De xuat Gate Local (khong mo vong static audit moi)

1. Giao mot nhiem vu sua **SC-R3-01..09** (uu tien 01-04), sau do chay PostgreSQL Local theo thu tu 005 -> 008. Khong Cloud push, khong reset existing DB.
2. Thu cac luong P0: dau keo 0/250k va atomic retry; reefer 0s/15-phut, thu dien; ticket/reefer/storage paid/partial/idempotency; CCKB clearance; An ninh xuat cont voi/khong xe ra, phi luu tai cong, no ngoai le; RLS role SEC/PORT/DIS va khac yard.
3. Doi chieu tat ca ma quyen voi 67 action V5 va 206 grants. Test `SET ROLE authenticated` hay client du role, khong chi SQL la postgres superuser.
4. Bat buoc log nguyen ban pgTAP, exit code, migration status, fixture rollback, sha256 cuoi va ket luan P0/P1. Neu Docker Local khong chay duoc thi ghi BLOCKED, khong goi la PASS.
5. Chung minh 001-004 giu nguyen bytes; 005-008 la LOCAL-ONLY. Sau khi Local PASS moi xin phe duyet Cloud DEV rieng.

**Quyet dinh:** NO-GO Cloud DEV. GO cho bugfix gioi han + PostgreSQL Local Runtime khi chu du an giao prompt cho phep chay local an toan.
