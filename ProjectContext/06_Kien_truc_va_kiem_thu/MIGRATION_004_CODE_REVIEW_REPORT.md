# BÁO CÁO RÀ SOÁT MÃ NGUỒN MIGRATION 004 — KHẮC PHỤC TOÀN DIỆN KIỂM TOÁN VÒNG 3 (R4 / 4 TABLES)

**Dự án:** Website + PWA Quản lý bến bãi/cảng cạn Sơn Cảng — Công ty Cổ phần Tà Lùng Quang Minh  
**Môi trường:** Supabase Cloud DEV `son-cang-yms-dev` (Ref: `euswzyespwaxyrjkfkrq`)  
**Giai đoạn:** Phase 1C-B — Triển khai Mã nguồn Migration 004 (Code-Only Fix Round 3 -> Round 4)  
**Tài liệu chỉ đạo:** `ProjectContext/06_Kien_truc_va_kiem_thu/SonCang_Migration004_R3_Independent_Code_Audit_20261011.md`  
**Ngày cập nhật:** 11/10/2026  
**Trạng thái phê duyệt:** **CODE DRAFT / NOT EXECUTED. CHƯA CHẠY RUNTIME TRÊN POSTGRESQL, CHƯA PUSH LÊN CLOUD DEV.**

---

## I. BẢNG ĐỐI CHIẾU 9 PHÁT HIỆN KIỂM TOÁN VÒNG 3 VÀ KẾT QUẢ XỬ LÝ (R4)

| Mã phát hiện | Mức độ | File / Vị trí xử lý | Nội dung phát hiện & Giải pháp kỹ thuật khắc phục triệt để | Test assertion tương ứng | Trạng thái kỹ thuật |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **M004-R3-01** | **BLOCKER / TEST** | `supabase/tests/domain_vehicles_containers_004.sql`: lines 360–398 | Assertion 17 cũ chạy `DELETE FROM app_vehicle_types WHERE code='CONT_LANH'` trước khi có lượt xe tham chiếu, có nguy cơ xóa mất dòng seed data và làm sai các test sau. **Khắc phục:** Tạo riêng fixture loại xe `TEST_RESTRICT_TYPE` cùng 1 lượt xe tham chiếu thực tế; assert khóa ngoại tồn tại; chạy `throws_ok` DELETE bắt đúng SQLSTATE `23503`; sau đó assert loại xe vẫn tồn tại nguyên vẹn. Tuyệt đối không xóa dòng `CONT_LANH`. | A20, A21, A22 | **FIXED** (Static Pass) |
| **M004-R3-02** | **HIGH / DATA LOSS** | `supabase/migrations/20261011000004`: lines 441–451 | `sc_manage_vehicle_type` kiểu upsert làm ghi đè các giá trị mặc định khi người dùng chỉ muốn đổi tên `p_display_name`. **Khắc phục:** Áp dụng **Patch Semantics** tường minh trong `UPDATE`: bảo toàn nguyên vẹn `allows_container`, `is_active`, `sort_order` và `description` bằng `COALESCE/CASE` nếu giá trị truyền vào là `NULL`. Bổ sung test regression: cập nhật tên `CONT_LANH` giữ nguyên giá 250k và cờ cont `true`. | A15 | **FIXED** (Static Pass) |
| **M004-R3-03** | **HIGH / AP10 FINANCIAL CONTROL** | `supabase/migrations/20261011000004`: lines 430–440; `supabase/tests`: lines 237–268 | Quản trị viên có thể tự đổi `default_ticket_amount` hoặc ấn định giá cho loại xe mới qua RPC danh mục xe, lách qua quy trình phê duyệt Four-Eyes AP10. **Khắc phục:** Phân tách quản lý danh mục xe và biểu phí: (1) Nếu loại xe đã tồn tại và truyền `default_ticket_amount` khác giá cũ -> RAISE EXCEPTION yêu cầu quy trình AP10 Four-Eyes; (2) Nếu loại xe mới tạo -> khởi tạo `default_ticket_amount = NULL`, từ chối gán giá trực tiếp qua danh mục. Bổ sung 2 test bắt lỗi AP10 Four-Eyes. | A13, A14 | **FIXED** (Static Pass) |
| **M004-R3-04** | **HIGH / RETRY SAFETY** | `supabase/migrations/20261011000004`: lines 91, 156, 203–206, 526–543, 581–597, 719–734 | Chưa có request-level idempotency key, double-click hoặc network retry có thể tạo trùng lượt xe hoặc lặp lại phí vé. **Khắc phục:** Thêm cột `idempotency_key text NULL` vào cả 2 bảng `app_vehicle_visits` và `app_container_visits` cùng Partial Unique Index `WHERE idempotency_key IS NOT NULL`. Trong RPCs: nếu gặp cùng key và cùng payload -> trả về đúng ID cũ (idempotent replay an toàn); nếu gặp cùng key nhưng khác payload -> ném ngoại lệ P0001; bọc bắt `unique_violation` khi có xung đột đồng thời. | A43–A48, A74 | **FIXED** (Static Pass) |
| **M004-R3-05** | **MEDIUM / FALSE GREEN STATIC AUDIT** | `scripts/audit_test_004.js`: lines 31–53 | Khi lệch plan count, script chỉ in lỗi mà không gán `process.exit(1)`, dẫn đến false-green trong CI/pipeline. **Khắc phục:** Thiết lập biến `hasError` và gọi `process.exit(1)` khi có bất kỳ sai lệch nào: lệch plan assertion, phát hiện `PERFORM ok/is`, phát hiện wildcard `%...%` trong `throws_ok`, hoặc có nhánh pass mặc định. Thoát mã 0 khi đạt toàn diện. | `audit_test_004.js` | **FIXED** (Exit Code 0) |
| **M004-R3-06** | **MEDIUM / CONCURRENCY EVIDENCE** | `supabase/tests/domain_vehicles_containers_004.sql`: lines 701–709 | Assertion 36 cũ kiểm tra trùng lặp tuần tự nhưng gán nhãn kiểm thử concurrency. **Khắc phục:** Đổi tên và mô tả assertion thành kiểm tra Database uniqueness invariant của Partial Unique Index `uq_container_visits_active_number_yard`; kiểm thử race condition 2 session đồng thời được phân định thực hiện trong môi trường runtime PostgreSQL biệt lập có barrier/lock. | A42 | **FIXED** (Static Pass) |
| **M004-R3-07** | **MEDIUM / DISABLED YARD** | `supabase/migrations/20261011000004`: lines 702–706; `supabase/tests`: lines 836–848 | RPC tạo lượt xe kiểm tra `app_yards.is_active` nhưng RPC tạo container chưa kiểm tra, có thể cho phép gắn container vào bãi đã vô hiệu hóa. **Khắc phục:** Bổ sung kiểm tra `app_yards.is_active` trong `sc_create_container_visit`, ném ngoại lệ nếu bãi không tồn tại hoặc bị vô hiệu hóa: `'Bãi không hợp lệ hoặc đang bị vô hiệu hóa: %'`. Thêm test assertion DENY tương ứng. | A49 | **FIXED** (Static Pass) |
| **M004-R3-08** | **MEDIUM / LIFECYCLE INTEGRITY** | `supabase/migrations/20261011000004`: lines 102–105, 166–169; `supabase/tests`: lines 421–428, 1118–1145 | DB check cho phép `CANCELLED` hoặc `IN_YARD` giữ lại exit timestamp; test cũ chuyển container đã EXITED sang CANCELLED là chuyển trạng thái không hợp lệ. **Khắc phục:** Gia cố CHECK constraint: (1) `ck_vehicle_status_exit` yêu cầu chỉ `EXITED` mới có timestamps/actor ra; (2) `ck_container_status_outbound` yêu cầu chỉ `EXITED` mới có `outbound_at`. Trong bài test, tạo fixture `CANCELLED` độc lập trực tiếp từ `IN_YARD`, không qua `EXITED`. Bổ sung test CHECK constraint. | A25, A69 | **FIXED** (Static Pass) |
| **M004-R3-09** | **LOW / MISLEADING CONFIGURATION** | `supabase/migrations/20261011000004`: lines 774–776; `supabase/tests`: lines 691–699 | Khi `allows_container` đã chuyển thành cấu hình động, thông báo lỗi vẫn hardcode danh sách xe `CONT_LANH` và `DAU_KEO`. **Khắc phục:** Đổi thông báo lỗi sang dạng cấu hình chung: `'Loại phương tiện % không được phép tiếp nhận container vào bãi theo cấu hình danh mục phương tiện.'`. Đồng bộ cả trong migration và test assertion. | A41 | **FIXED** (Static Pass) |

---

## II. MA TRẬN 75 ASSERTIONS PGTAP (PLAN 75)

Kế hoạch kiểm thử: **`SELECT plan(75);`** trong `supabase/tests/domain_vehicles_containers_004.sql`:

- **Suite 1: Schema Definitions, RLS & Privileges (Assertions 1–10):**
  - A1: Bảng `app_vehicle_types` tồn tại.
  - A2: Bảng `app_vehicle_visits` tồn tại.
  - A3: Bảng `app_container_visits` tồn tại.
  - A4: Bảng `app_container_number_changes` tồn tại.
  - A5: RLS enabled trên cả 4 bảng (`is(count, 4)`).
  - A6–A10: `anon` bị thu hồi quyền ghi và đọc trực tiếp trên các bảng (dùng `ok(NOT pg_catalog.has_table_privilege(...))`).
- **Suite 2: Danh mục Loại phương tiện Động & Bảo vệ AP10 (Assertions 11–18):**
  - A11: Khởi tạo đủ đúng 7 loại phương tiện chuẩn V5 có biểu phí.
  - A12: SYS_ADMIN tạo loại xe mới thành công với giá vé mặc định `NULL` chờ ban hành biểu phí AP10 (ALLOW).
  - A13: Tạo loại xe mới truyền giá vé bị từ chối theo kiểm soát tài chính AP10 Four-Eyes (DENY P0001 - M004-R3-03).
  - A14: Thay đổi giá vé xe hiện có bị từ chối theo kiểm soát tài chính AP10 Four-Eyes (DENY P0001 - M004-R3-03).
  - A15: Patch Semantics bảo toàn nguyên vẹn giá vé 250k và `allows_container = true` khi đổi tên `CONT_LANH` (ALLOW - M004-R3-02).
  - A16: An ninh thiếu quyền `admin.billing_settings.manage` bị từ chối gọi RPC quản lý danh mục (DENY P0001).
  - A17: Loại xe bị vô hiệu hóa (`is_active = false`) bị từ chối tiếp nhận vào bãi (DENY P0001).
  - A18: Loại xe chưa cấu hình giá (`default_ticket_amount IS NULL`) bị từ chối, không tự động miễn phí (DENY P0001).
- **Suite 3: Constraints & Ràng buộc Toàn vẹn DDL/FK/Lifecycle (Assertions 19–26):**
  - A19: FK từ chối mã loại xe không có trong danh mục (`XE_KHAC`) (DENY 23503).
  - A20: Fixture lượt xe tham chiếu `TEST_RESTRICT_TYPE` được tạo thành công làm điều kiện kiểm thử FK (M004-R3-01).
  - A21: `ON DELETE RESTRICT` chặn xóa loại xe đã phát sinh lịch sử lượt xe (DENY 23503 - M004-R3-01).
  - A22: Loại xe `TEST_RESTRICT_TYPE` vẫn tồn tại nguyên vẹn sau khi lệnh DELETE bị chặn bởi FK (M004-R3-01).
  - A23: CHECK `ck_container_visits_size` từ chối kích thước container không hợp lệ 50 (DENY 23514).
  - A24: CHECK `ck_container_outbound_after_inbound` chặn giờ ra trước giờ vào (DENY 23514).
  - A25: CHECK `ck_container_status_outbound` chặn container `IN_YARD` có `outbound_at` (DENY 23514 - M004-R3-08).
  - A26: Composite FK chặn đứng liên kết container và xe lệch bãi (DENY 23503).
- **Suite 4: Tạo Lượt xe & Biểu phí Tự tính Phía Server (Assertions 27–30):**
  - A27: An ninh Bãi 1 tạo lượt xe thành công tại Bãi 1 (ALLOW).
  - A28: Server tự tính giá vé 250.000đ cho `CONT_LANH` từ `app_vehicle_types`.
  - A29: An ninh Bãi 1 tạo xe tại Bãi 2 bị từ chối phạm vi bãi (DENY P0001).
  - A30: CCKB Bãi 1 gọi tạo xe bị từ chối do thiếu quyền (DENY P0001).
- **Suite 5: Tạo Lượt container & Vòng đời Độc lập (Assertions 31–37):**
  - A31: An ninh Bãi 1 tạo container visit thành công (ALLOW).
  - A32: Container và Xe có 2 UUID độc lập riêng biệt (`cont_1 <> veh_1`).
  - A33: Server luôn khởi tạo `cargo_status = 'CHUA_XAC_DINH'`.
  - A34: Server khởi tạo `is_legacy_import = false` trên bảng container.
  - A35: Điều phối viên gọi tạo container visit bị từ chối do thiếu quyền (DENY P0001).
  - A36: Xe 1 xuất bãi không làm thay đổi trạng thái `IN_YARD` của container 1.
  - A37: Container 1 có thể liên kết với Xe B khác đến nhận ra khỏi bãi.
- **Suite 6: Mô hình 1:N & Giới hạn Vận hành V1 (Assertions 38–42):**
  - A38: CSDL hỗ trợ quan hệ 1:N ở tầng cấu trúc DDL.
  - A39: RPC V1 từ chối cont thứ 2 trên cùng xe theo V1 baseline (DENY P0001).
  - A40: RPC từ chối tạo container có số đang tồn tại `IN_YARD` trong cùng bãi (DENY P0001).
  - A41: Chặn gắn container vào xe không cho phép chở cont với thông báo cấu hình chung (DENY P0001 - M004-R3-09).
  - A42: Database uniqueness invariant: Partial Unique Index chặn trùng số `IN_YARD` (DENY 23505 - M004-R3-06).
- **Suite 7: Retry Safety & Idempotency Key (Assertions 43–48 - M004-R3-04):**
  - A43: Tạo lượt xe với `idempotency_key` thành công lần đầu.
  - A44: Retry gọi `sc_create_vehicle_visit` trả về đúng visit ID cũ mà không tạo trùng (idempotent replay).
  - A45: `idempotency_key` lượt xe bị tái sử dụng với thông tin khác bị từ chối (DENY P0001).
  - A46: Tạo lượt container với `idempotency_key` thành công lần đầu.
  - A47: Retry gọi `sc_create_container_visit` trả về đúng container ID cũ (idempotent replay).
  - A48: `idempotency_key` container bị tái sử dụng với thông tin khác bị từ chối (DENY P0001).
- **Suite 8: Kiểm soát Bãi Vô hiệu hóa (Assertion 49 - M004-R3-07):**
  - A49: `sc_create_container_visit` từ chối tiếp nhận container vào bãi đang bị vô hiệu hóa (DENY P0001).
- **Suite 9: Sửa số Container & Lịch sử Bất biến (Assertions 50–59):**
  - A50: An ninh sửa số container thành công, sinh bản ghi lịch sử (ALLOW).
  - A51: Số container hiện hành được cập nhật sang số mới (`RIGHT123456`).
  - A52: UUID container trước và sau khi sửa số trùng khớp nhau 100%.
  - A53: Bản ghi audit log `container.number.correct` sinh thực tế trong `app_audit_events`.
  - A54: Sửa số container thiếu lý do bị từ chối (DENY P0001).
  - A55: Sửa số mới trùng số cũ bị từ chối fail-safe (DENY P0001).
  - A56: Sửa số mới trùng số container khác đang `IN_YARD` bị từ chối (DENY P0001).
  - A57: An ninh khác bãi gọi sửa số container bị từ chối (DENY P0001).
  - A58: Trigger chặn DELETE trên `app_container_number_changes` (DENY P0001).
  - A59: Trigger chặn sửa `evidence_url` (DENY P0001).
- **Suite 10: Đối soát Discrepancy & Phân quyền RLS (Assertions 60–65):**
  - A60: Trigger chặn xóa dấu `sec_ack_at` về NULL qua `IS DISTINCT FROM` (DENY P0001).
  - A61: CCKB đối soát sai lệch số container thành công (ALLOW).
  - A62: Trigger chặn xóa dấu `reconciled_at` về NULL qua `IS DISTINCT FROM` (DENY P0001).
  - A63: An ninh gọi đối soát CCKB bị từ chối do thiếu quyền (DENY P0001).
  - A64: CCKB nhìn thấy 2 bản ghi lịch sử sửa số qua RLS thật (`SET LOCAL ROLE authenticated`).
  - A65: Điều phối bị RLS chặn hoàn toàn không thấy bản ghi nào (`SET LOCAL ROLE authenticated`).
- **Suite 11: Quản lý HÀNG/RỖNG & Quy trình AP05 (Assertions 66–69):**
  - A66: Điều phối cập nhật HÀNG/RỖNG thành công khi cont `IN_YARD` (ALLOW).
  - A67: An ninh thử cập nhật HÀNG/RỖNG bị từ chối do thiếu quyền (DENY P0001).
  - A68: Sửa HÀNG/RỖNG khi cont `EXITED` bị từ chối theo AP05 (DENY P0001).
  - A69: Cập nhật HÀNG/RỖNG khi cont `CANCELLED` (fixture hủy hợp lệ từ IN_YARD) bị từ chối (DENY P0001 - M004-R3-08).
- **Suite 12: Ràng buộc Người dùng & An toàn Hàm RPC (Assertions 70–75):**
  - A70: Người dùng có vai trò đã hết hạn bị từ chối gọi RPC (DENY P0001).
  - A71: Người dùng có vai trò bị vô hiệu hóa bị từ chối gọi RPC (DENY P0001).
  - A72: Chưa có RPC public nào cho phép kết thúc xuất bãi tại Migration 004 (deferred to 007).
  - A73: `sc_manage_vehicle_type` không cấp quyền EXECUTE cho `anon`.
  - A74: `sc_create_vehicle_visit` không cấp quyền EXECUTE cho `anon` (chữ ký 8 tham số có idempotency_key).
  - A75: `sc_log_audit_event` bị thu hồi EXECUTE khỏi `authenticated`.

---

## III. KẾT QUẢ KIỂM TRA TĨNH TOÀN DIỆN

| Công cụ kiểm tra | Lệnh thực thi | Kết quả | Ghi chú |
| :--- | :--- | :---: | :--- |
| **TypeScript Compiler** | `pnpm exec tsc --noEmit` | **PASS (0 lỗi)** | 4 bảng và 8 RPC signatures có `idempotency_key` đồng bộ 100% |
| **RBAC Invariants** | `node scripts/verify_rbac_invariants.js` | **52 / 52 PASS** | Bảo toàn toàn vẹn ma trận RBAC V5 (8 roles, 67 perms, 206 grants) |
| **RBAC Source Audit** | `python scripts/audit_rbac_exact.py` | **100% PASS** | Khớp 100% Workbook RBAC V5 nguồn |
| **pgTAP TAP Audit** | `node scripts/audit_test_004.js` | **75 / 75 PASS (Exit Code 0)** | Khai báo `plan(75)` khớp 100% top-level SELECT assertions; strict exit |
| **PostgreSQL Runtime** | `supabase test db` / `Docker` | **NOT RUN** | **Chưa chạy runtime theo đúng quy tắc an toàn** |
| **Supabase Cloud DEV** | `supabase db push` | **NOT PUSHED** | **Không đẩy lên Cloud khi chưa có phê duyệt độc lập** |

---

## IV. DANH MỤC TỆP ĐÓNG GÓI VÒNG 4 (migration_004_code_bundle_R4.zip)

1. `supabase/migrations/20261011000004_domain_vehicles_containers.sql` (4 bảng, 8 RPCs, RLS, triggers, idempotency keys).
2. `supabase/tests/domain_vehicles_containers_004.sql` (75 assertions TAP, khắc phục triệt để 9 phát hiện R3).
3. `src/types/database.types.ts` (TypeScript types đồng bộ 4 bảng và 8 RPCs).
4. `scripts/audit_test_004.js` (Script kiểm toán độc lập số lượng assertions, cú pháp TAP và exit code nghiêm ngặt).
5. `ProjectContext/06_Kien_truc_va_kiem_thu/MIGRATION_004_CODE_REVIEW_REPORT.md` (Báo cáo nghiệm thu vòng 4).
