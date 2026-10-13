# ANTIGRAVITY - SON CANG YMS - CHOT CLOUD DEV DEPLOY + UAT

Ngay: 12/10/2026
Du an duy nhat: Supabase Cloud DEV `son-cang-yms-dev`, project ref `euswzyespwaxyrjkfkrq`.

## Boi canh va muc tieu

Da ghi nhan: Local Gate 181/181 pgTAP, 11 nhom E2E; 7 tai khoan Auth UAT tren Cloud DEV da duoc AG bao cao login PASS; trang `/exit` da co luong xe ra khong mang container; Real Write van OFF. Khong mo lai kiem toan toan bo Backend. Muc tieu la xu ly dung cac rao can cuoi cung va tien toi Pilot UAT.

## 1. Sua deployment plan truoc khi xin phe duyet Cloud

Trong `MIGRATION_005_008_CLOUD_DEPLOYMENT_PLAN.md`, khong mac dinh rang cac lenh `supabase db push --project-ref ...` va `supabase db dump --project-ref ... --data` co ho tro o ban CLI dang cai. Xac minh bang `npx supabase db push --help` va `npx supabase db dump --help` ngay tren may AG. Cu phap duoc tai lieu Supabase CLI pho bien huong dan: link dung project bang `npx supabase link --project-ref euswzyespwaxyrjkfkrq`, sau do `npx supabase db push --linked --dry-run`, va CHI khi duoc duyet moi `npx supabase db push --linked`. Dung cu phap thuc te theo `--help`; khong chay lenh push trong nhiem vu nay.

Chuan bi backup SCHEMA va DATA theo hai buoc tuong ung voi cu phap CLI dang cai (tuy phien ban, `db dump --data-only` chu khong phai `--data`). Khong duoc noi file data-only la ban sao luu schema. Xac nhan pham vi sao luu; `supabase db dump` mac dinh khong bao gom auth/storage managed schemas. Khong khang dinh co snapshot phuc hoi tu dong neu chua kiem chung goi dich vu va backup thuc te. Viet ro quy trinh kiem chung file backup va phuong an khoi phuc, tuyet doi khong reset, khong repair history.

## 2. Sua dut diem duong thu phi luu bai o PWA truoc Real Write ON

Da doi chieu source ban giao:
- `src/lib/services/supabase-repository.ts`: ham `confirmPhysicalExit()` hien luon goi RPC voi `p_paid_at_gate: false`.
- `supabase/migrations/20261012000008_domain_exit_clearance.sql`: neu phi luu bai > 0 ma khong `p_paid_at_gate=true`, ham chan xuat tru khi co ngoai le no `CLEARED_WITH_DEBT`.
- `src/app/exit/page.tsx`: phi luu bai "tam tinh" dung `floor((now - inbound)/24h)-1`, khong tuong duong quy tac qua dem 22:00-06:00 gio Viet Nam cua Database.

Yeu cau: bo sung su lua chon thu phi luu bai tai cong neu nguoi dung co quyen `storage.payment.collect`, truyen `p_paid_at_gate`, hinh thuc thanh toan va ma bien nhan (neu can) dung schema. Neu khong thu ma phat sinh phi, hien thong bao no/ngoai le va dung luong theo dung Backend. Khong tu dong danh dau PAID. Phi hien thi tren UI phai lay tu tinh toan thuc te cua Backend, khong duoc suy ra bang 24h; co the dung RPC tinh phi chi-doc de hien thi preview. Test ca 0d, qua 1 dem mien, >=2 dem co phi; test ca nguoi co quyen va nguoi khong co quyen. Tiep tuc de server RBAC/RLS quyet dinh quyen cuoi cung.

Neu day la chinh sach nghiep vu can chu du an quyet, bao ro va dat mac dinh chan thu/chan xuat an toan; khong tu dat chinh sach moi.

## 3. Kiem tra UAT browser va thong bao moi truong

`verify_uat_screens.mjs` dang tinh danh sach man hinh bang mapping tu source/RPC; ket qua nay khong thay the thao tac browser tren 7 account. Kiem tra it nhat 3 role dai dien (SEC_STAFF, PORT_LEAD, DIS_STAFF) tren trinh duyet that, login/log out, load du lieu, route, permission-denied de khong nham "RPC PASS" voi "UI PASS". Khong ghi Cloud khi flag OFF.

`src/components/layout/app-shell.tsx` hien co banner "Cloud DEV (Chi doc)" co dinh; dieu chinh dong bo trang thai flag de khong noi "chi doc" sau khi da duoc duyet bat ghi.

## 4. Tai khoan va bao mat

Giu nguyen 7 tai khoan UAT da tao. KHONG chay lai `scripts/setup_cloud_uat_accounts.mjs`, vi script co nhanh reset mat khau khi gap tai khoan da ton tai. Khong in/zip/dinh kem passwords, access tokens hoac service_role key. File credentials `%USERPROFILE%\.soncang\uat_credentials.json` nen duoc chuyen sang password manager va gioi han quyen OS.

## 5. Gioi han va ban giao

- CHUA DUOC: Push migrations 005-008, bat `NEXT_PUBLIC_ENABLE_REAL_WRITE`, tao giao dich Cloud, reset/repair DB, deploy Production, tao them tai khoan.
- DUOC: Sua ma nguon local, sua deployment plan, chay test tren Local an toan, xem Cloud READ-ONLY neu can.
- Ban giao 1 file `SONCANG_CLOUD_DEV_RELEASE_CHECKLIST.md` co cac bang chung: CLI options, backup schema+data, smoke test local cho fee/storage, UI browser test, build PASS, 7 tai khoan con login PASS neu kiem tra read-only duoc.
- CHOT STOP POINT: Dung cho chu du an PHE DUYET RIENG (A) deploy migrations 005-008 Cloud DEV va sau do (B) bat Real Write UAT. Khong gop phe duyet hai buoc thanh mot.

Muc tieu: ket thuc ngay cac viec predeploy, cho phep chu du an dang nhap va thu nghiem PWA theo luong vao cong -> trong bai -> cam/rut dien -> thanh toan -> ra cong. Khong viet lai kien truc hay mo them vong static audit.
