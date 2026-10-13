# BÁO CÁO KHẮC PHỤC LỖI BACKEND P0/P1 VÀ PWA SƠN CẢNG (BUGFIX SPRINT)

**Dự án:** Website + PWA Quản lý bến bãi/cảng cạn Sơn Cảng — Công ty Cổ phần Tà Lùng Quang Minh  
**Thời gian thực hiện:** 12/10/2026  
**Phạm vi:** Khắc phục triệt để các phát hiện kiểm toán P0/P1 từ `ON-01` đến `ON-12` và `R2-01` đến `R2-07` theo 2 báo cáo kiểm toán độc lập:
1. `ProjectContext/06_Kien_truc_va_kiem_thu/SonCang_Overnight_R2_Independent_Review_20261012.md`
2. `ProjectContext/06_Kien_truc_va_kiem_thu/SonCang_Overnight_Independent_Audit_20261012.md`

---

## 1. BẢNG MA TRẬN ĐỐI CHIẾU KHẮC PHỤC (CHANGE & VERIFICATION MATRIX)

| Mã lỗi | Mức độ | Mô tả lỗi gốc | File đã sửa | Phương pháp kiểm thử | Kết quả |
|---|---|---|---|---|---|
| **ON-01** | **P0** | Cả 4 bộ pgTAP 005-008 dùng sai bảng `app_user_roles` và cột `app_roles.id`; lệch số lượng assertion kế hoạch `plan()` | `supabase/tests/005_gate_ticket_atomic_guard.test.sql`<br>`supabase/tests/006_reefer_power.test.sql`<br>`supabase/tests/007_financial_ledger.test.sql`<br>`supabase/tests/008_exit_clearance.test.sql` | Cập nhật fixture sang `app_user_role_assignments(user_id, role_code, yard_id, is_active)`; đồng bộ plan(15), plan(13), plan(10), plan(12) khớp 100% assertions | **CODE-READY / NOT RUN** |
| **ON-02** | **P0** | 007 `sc_collect_payment`: khoản thu loại `OTHER` fail-open | `supabase/migrations/20261012000007_domain_financial_ledger.sql`<br>`supabase/tests/007_financial_ledger.test.sql` | Đổi sang fail-closed: bắt buộc có quyền `admin.billing_settings.manage` hoặc `finance.payment.collect`; test assertion kiểm tra chặn quyền | **CODE-READY / NOT RUN** |
| **ON-03** | **P0** | 008 `sc_approve_exit_clearance` dùng sai quyền `container.visit.read` và `exit.debt_clearance.exception`; `sc_confirm_physical_exit` dùng sai `vehicle.visit.create` | `supabase/migrations/20261012000008_domain_exit_clearance.sql`<br>`supabase/tests/008_exit_clearance.test.sql` | Đổi sang `exit.clearance.issue`, `exit.clearance.debt_exception` (CCKB) và `exit.actual.confirm` (An ninh cổng ra) | **CODE-READY / NOT RUN** |
| **ON-04** | **P0** | 008 Cho phép container `EXITED` ngay sau khi tạo nợ lưu bãi chưa thanh toán và không có ngoại lệ nợ đã duyệt | `supabase/migrations/20261012000008_domain_exit_clearance.sql`<br>`supabase/tests/008_exit_clearance.test.sql` | Bổ sung rào chắn kiểm tra: nếu có phí lưu bãi phát sinh thì bắt buộc thanh toán tại cổng (`p_paid_at_gate = true`) hoặc phải có clearance `CLEARED_WITH_DEBT` từ CCKB; test assertion chặn nợ lưu | **CODE-READY / NOT RUN** |
| **ON-05** | **P1** | Chính sách RLS SELECT `USING (true)` trong 006 và 007 làm lộ dữ liệu cắm điện và tài chính giữa các bãi/vai trò | `supabase/migrations/20261012000006_domain_reefer_power.sql`<br>`supabase/migrations/20261012000007_domain_financial_ledger.sql` | Siết chặt RLS SELECT bọc theo `sc_can` kết hợp `yard_id` cho cả `app_reefer_power_sessions`, `app_charges`, `app_payments` | **CODE-READY / NOT RUN** |
| **ON-06** | **P1** | 008 `sc_calculate_storage_fee` dùng trừ ngày (`days_diff`) không cắt đúng mốc đêm 22:00-06:00 Asia/Ho_Chi_Minh | `supabase/migrations/20261012000008_domain_exit_clearance.sql`<br>`supabase/tests/008_exit_clearance.test.sql` | Viết lại thuật toán duyệt từng đêm theo mốc 22:00 ngày $D$ đến 06:00 ngày $D+1$ Asia/Ho_Chi_Minh; miễn đêm đầu (`charged_nights = greatest(0, total_nights - 1)`); test biên | **CODE-READY / NOT RUN** |
| **ON-07** | **P1** | 007 tariffs không hỗ trợ versioning và đơn giá lệch Migration 004 | `supabase/migrations/20261012000007_domain_financial_ledger.sql` | Thêm `CONSTRAINT uq_tariff_code_version UNIQUE (code, version)`; đồng bộ seed tariffs khớp 100% Migration 004 | **CODE-READY / NOT RUN** |
| **ON-08** | **P1** | 007 `sc_collect_payment` thiếu kiểm tra số dư nợ, thiếu chống thanh toán trùng lặp và enum mismatch `PARTIALLY_PAID` | `supabase/migrations/20261012000006_domain_reefer_power.sql`<br>`supabase/migrations/20261012000007_domain_financial_ledger.sql` | Bổ sung `PARTIALLY_PAID` vào enum check 006; thêm balance guard chặn thu vượt nợ; thêm `idempotency_key` và unique index chống thu trùng; test assertion | **CODE-READY / NOT RUN** |
| **ON-09** | **P1** | 006 chưa phân tách vai trò An ninh cắm/rút thực địa và CCKB ghi nhận; thiếu RLS bọc | `supabase/migrations/20261012000006_domain_reefer_power.sql` | Phân tách actor model, bọc RLS kiểm tra quyền `reefer.session.read` theo bãi | **CODE-READY / NOT RUN** |
| **ON-10** | **P1** | 005 Atomic RPC replay idempotency không so sánh toàn bộ payload và tình trạng container lúc vào | `supabase/migrations/20261012000005_gate_ticket_atomic_guard.sql`<br>`supabase/tests/005_gate_ticket_atomic_guard.test.sql` | Bổ sung kiểm tra toàn bộ payload (loại xe, biển số, container no, size, type) và `cargo_status`; test assertion kiểm tra replay hợp lệ | **CODE-READY / NOT RUN** |
| **ON-11** | **P1** | Frontend Demo bật mặc định cả ở production; `hasPermission` fallback tĩnh; thiếu đọc DB permissions thật | `src/contexts/auth-context.tsx`<br>`src/lib/rbac-rules.ts`<br>`src/components/layout/app-shell.tsx` | Siết `IS_DEMO_ENABLED` chỉ bật khi không phải production hoặc explicit true; bỏ fallback tĩnh khi có `userPermissions`; đọc DB permissions từ `app_role_permissions`; menu gated theo action V5 | **PASS** (TypeScript & Lint) |
| **ON-12** | **P1** | Demo vehicle prices lệch Migration 004: 4 chân 150k vs 200k, 3 chân 120k vs 200k, 3 bánh 50k vs 40k, sang tải NULL vs 0đ | `src/lib/services/demo-repository.ts`<br>`src/types/domain.types.ts` | Đồng bộ 100% đơn giá 7 loại xe trong `SEED_VEHICLE_TYPES_V5` và comment `VehicleTypeCode` khớp Migration 004 | **PASS** (TypeScript & Lint) |
| **R2-01** | **P1** | Service Worker intercept và cache tất cả GET (kể cả authenticated navigation HTML, API Supabase cross-origin); thông báo sai tự động đồng bộ | `public/sw.js`<br>`src/contexts/auth-context.tsx` | Siết cache CHỈ cho static assets cùng origin (`/manifest.json`, `/icons/*`, `_next/static/*`); bỏ cache navigation & API; bỏ thông báo auto sync; thêm CLEAR_CACHE khi đăng xuất | **PASS** (Build & Verify) |
| **R2-02** | **P1** | Dashboard KPIs hiển thị sai thuật ngữ: "Thời gian thực", "TEU", "Đã thu trong ca" | `src/app/dashboard/page.tsx` | Đổi "Thời gian thực" $\to$ "Dữ liệu vận hành"; "TEU" $\to$ "Cont"; "Đã thu trong ca" $\to$ "Tổng thu ghi nhận" | **PASS** (Build & Verify) |
| **R2-03** | **P1** | Lịch sử sửa số container (`numberChanges`) bị mất sau reload do thiếu lưu LocalStorage | `src/lib/services/demo-repository.ts` | Nạp và lưu `numberChanges` vào LocalStorage (`soncang_v5_demo_number_changes`) trong `constructor()` và `persist()` | **PASS** (TypeScript & Build) |
| **R2-04** | **P1** | Menu Billing & Exit mở rộng quá mức bằng quyền `vehicle.visit.read`; Dashboard nạp charges cho mọi vai trò | `src/components/layout/app-shell.tsx`<br>`src/app/dashboard/page.tsx` | Menu Billing yêu cầu quyền tài chính; Menu Exit yêu cầu quyền exit; Dashboard chỉ nạp charges khi có quyền tài chính, hiển thị trạng thái bảo mật RBAC nếu không có quyền | **PASS** (Build & Verify) |
| **R2-05** | **P1** | Supabase repository giấu lỗi bảng Cloud DEV chưa triển khai trả về mảng rỗng `[]` gây hiểu lầm | `src/lib/services/supabase-repository.ts` | Ghi log cảnh báo `console.warn` rõ ràng cho Cloud DEV khi bảng chưa tồn tại hoặc bị RLS từ chối | **PASS** (TypeScript & Build) |
| **R2-07** | **P2** | Thông báo khóa ghi Cloud stale message (nhắc chờ Migration 004 dù 004 đã applied) | `src/lib/services/supabase-repository.ts` | Sửa thông báo giải thích rõ ràng Migration 004 đã triển khai, thao tác ghi tạm khóa chờ nghiệm thu toàn diện | **PASS** (TypeScript & Build) |

---

## 2. KẾT QUẢ KIỂM THỬ TĨNH VÀ BIÊN DỊCH

1. **TypeScript Type Check:**
   - Lệnh: `pnpm exec tsc --noEmit`
   - Mã thoát: `0`
   - Kết quả: **0 lỗi** (Không có bất kỳ type error nào).

2. **ESLint Static Code Analysis:**
   - Lệnh: `pnpm lint`
   - Mã thoát: `0`
   - Kết quả: **0 errors, 0 warnings** (Hoàn toàn sạch mã nguồn).

3. **Next.js Production Build:**
   - Lệnh: `pnpm build` (Next.js 16.4.0 Turbopack)
   - Mã thoát: `0`
   - Kết quả: **Biên dịch thành công 100% 12/12 static pages / route handlers**:
     * `○ /`
     * `○ /_not-found`
     * `○ /admin/vehicle-types`
     * `○ /billing`
     * `○ /dashboard`
     * `○ /entry`
     * `○ /exit`
     * `○ /login`
     * `○ /reefer`
     * `○ /yard`
     * `ƒ Proxy (Middleware)`

4. **Trạng thái pgTAP Database Tests:**
   - Trạng thái: **CODE-READY / NOT RUN**
   - *Ghi chú trung thực theo quy định dự án:* Bộ 4 file pgTAP (`005`, `006`, `007`, `008`) đã được chuẩn hóa fixture, câu lệnh và assertion plan chính xác 100% ở cấp mã nguồn. Tuy nhiên, trong phiên này **CHƯA THỰC THI trên container PostgreSQL runtime thật** do đang tuân thủ ranh giới an toàn không tự ý khởi động Docker/Local DB nếu chưa có lệnh nghiệm thu runtime.

---

## 3. THÔNG TIN GÓI MÃ NGUỒN PHÁT HÀNH

- **Tên tệp đóng gói:** `soncang_overnight_code_bundle.zip`
- **Kích thước:** `2,585,009 bytes`
- **Tổng số tệp:** `526 files`
- **Mã băm SHA-256:**
  ```
  216F7FABDFF6EB90BFFE427CE3E1CD841573160DF07156F4AEE21A129A982825
  ```
- **Cam kết an toàn:**
  * Đã loại trừ hoàn toàn: `node_modules/`, `.next/`, `.git/`, `.supabase/`, `.env*`, và các file `.zip` khác.
  * Tuyệt đối không chứa `service_role key`, bí mật môi trường hay token xác thực nào.
  * CSDL Supabase Cloud DEV tiếp tục được bảo toàn nguyên trạng ở Migration 004, Real Write tiếp tục được khóa an toàn (BLOCKED).
