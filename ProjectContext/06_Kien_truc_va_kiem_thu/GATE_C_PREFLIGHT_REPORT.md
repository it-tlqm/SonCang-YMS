# BÁO CÁO KIỂM SOÁT PHIÊN BẢN & TIỀN TRIỂN KHAI GATE C (PREFLIGHT REPORT)
## DỰ ÁN: PHẦN MỀM QUẢN LÝ BẾN BÃI/CẢNG CẠN SƠN CẢNG
### Công ty Cổ phần Tà Lùng Quang Minh

- **Ngày thực hiện:** 11/10/2026
- **Mục tiêu:** Chốt phiên bản mã nguồn Migration 004 đã kiểm thử thành công tại Gate B; kiểm tra chỉ đọc tiền triển khai trên Supabase Cloud DEV (`son-cang-yms-dev`, Project Ref: `euswzyespwaxyrjkfkrq`).
- **Gói bàn giao phát hành cuối cùng:** `migration_004_gateb_verified_final.zip` (SHA-256: `fb89266a01244307478e4474150b1cfa858c42d4dda54edfd49b117e28bbfb95`).
- **Trạng thái Preflight:** **`GATE_C_PREFLIGHT_READY` (ĐẠT CHUẨN 100%)** — Sẵn sàng cho lệnh triển khai Cloud DEV khi được Chủ dự án phê duyệt riêng.

---

## 1. KẾT QUẢ KIỂM TRA CHỈ ĐỌC TRÊN SUPABASE CLOUD DEV

Đã thực hiện kiểm tra kết nối và tính toàn vẹn trạng thái migrations từ xa trên project ref **`euswzyespwaxyrjkfkrq`** (Cloud DEV Free, hoàn toàn không có lệnh ghi hay thay đổi dữ liệu):

### 1.1. Kết quả `npx supabase migration list --linked`
- **Exit Code:** `0`
- **Output JSON trích xuất từ Supabase CLI:**
  ```json
  {
    "migrations": [
      {"local": "20261011000001", "remote": "20261011000001", "time": "2026-10-11 00:00:01"},
      {"local": "20261011000002", "remote": "20261011000002", "time": "2026-10-11 00:00:02"},
      {"local": "20261011000003", "remote": "20261011000003", "time": "2026-10-11 00:00:03"},
      {"local": "20261011000004", "remote": "", "time": "2026-10-11 00:00:04"}
    ],
    "message": "Migrations listed"
  }
  ```
- **Đánh giá:**
  * Ba migrations nền tảng `001_foundation_rbac`, `002_seed_rbac_v5`, `003_rbac_security_functions_rls` đã được áp dụng an toàn và đầy đủ trên Remote Cloud DEV.
  * Migration `004_domain_vehicles_containers` hiện đang có trạng thái `remote = ""` (Pending). Không có migration lạ, không có migration ngoài phạm vi.

### 1.2. Kết quả `npx supabase db push --dry-run --linked`
- **Exit Code:** `0`
- **Output nguyên bản:**
  ```text
  Initialising login role...
  DRY RUN: migrations will *not* be pushed to the database.
  Connecting to remote database...
  Would push these migrations:
   • 20261011000004_domain_vehicles_containers.sql
  {"upToDate":false,"dryRun":true,"migrations":["20261011000004_domain_vehicles_containers.sql"],"seeds":[],"roles":[],"message":"Finished supabase db push."}
  ```
- **Đánh giá:**
  * CLI xác nhận chỉ duy nhất file `20261011000004_domain_vehicles_containers.sql` nằm trong danh sách chờ đẩy.
  * Cờ `--dry-run` bảo vệ tuyệt đối: CSDL Cloud DEV không bị thay đổi bất kỳ byte nào.

---

## 2. XÁC MINH CÔ LẬP SCHEMA (SCHEMA ISOLATION & NO LEAKS)

Thực hiện truy vấn thực nghiệm trực tiếp trên engine PostgreSQL Local nhằm đối soát xem các cấu trúc hỗ trợ test (`public.test_vars_004`, `_004` helper functions) có bị rò rỉ vào schema `public` sau khi hoàn tất kiểm thử hay không:

### Kết quả truy vấn Catalog:
```sql
SELECT to_regclass('public.test_vars_004') AS test_vars_table;
-- Kết quả: NULL (1 row) -> Bảng test_vars_004 KHÔNG TỒN TẠI.

SELECT proname, pronamespace::regnamespace FROM pg_proc WHERE proname LIKE '%_004';
-- Kết quả: 4 hàm hệ thống của PostgreSQL trong schema 'pg_catalog' (euc_jis_2004, utf8_to_shift_jis_2004,...),
-- KHÔNG CÓ BẤT KỲ HÀM NÀO TRONG SCHEMA 'public'.

SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%_004';
-- Kết quả: 0 rows.
```

- **Kết luận:** File kiểm thử pgTAP `supabase/tests/domain_vehicles_containers_004.sql` được thiết kế chặt chẽ trong khối giao dịch `BEGIN; ... SELECT finish(); ROLLBACK;`. Toàn bộ cấu trúc tạm thời và hàm test helpers tự động hủy sạch sẽ khi kết thúc phiên kiểm thử, bảo đảm catalog sạch 100%.

---

## 3. THÔNG SỐ GÓI PHÁT HÀNH CUỐI CÙNG (RELEASE BUNDLE)

File bàn giao: **`migration_004_gateb_verified_final.zip`**  
Kích thước: **56.040 bytes**  
Mã băm SHA-256 toàn file: **`fb89266a01244307478e4474150b1cfa858c42d4dda54edfd49b117e28bbfb95`**

### Bảng kê Manifest SHA-256 chi tiết từng thành phần:

| Mã băm SHA-256 | Tên file trong gói | Mô tả nội dung |
| :--- | :--- | :--- |
| `f364d0535c797abef9382e9f22bef6a3b3ac5790381c013425a091856dab20d0` | `20261011000004_domain_vehicles_containers.sql` | SQL Migration 004 bản chính thức đã pass runtime |
| `7c66df6860a4bcbea7f732920685fcc8c3be5f9b59fb6ce1e7eb82a1d6db548f` | `domain_vehicles_containers_004.sql` | Bộ kiểm thử pgTAP 75 assertions chuẩn TAP |
| `a1f92895529a2e48493d7f126bb141fcfb4dd42080698f6871b014c4949ba8b1` | `database.types.ts` | TypeScript types đồng bộ chữ ký SQL |
| `e5f646e1de6c9b640c50b4a199afb2b7952c7ed24603ae7dbb51407c2a214c87` | `run_gate_b_runtime_tests.py` | Script Python kiểm thử concurrency & RLS (17 tests) |
| `6bf6caeb25c4a1a5e72f771c21b8b65d4cb3d1b86d952d28677c4cb7cf5d903d` | `audit_test_004.js` | Script kiểm toán tĩnh cấu trúc test pgTAP |
| `bbc7f9b42c599ce1f1c4d8e3c659506ad65b6750f50926b6a38e662d093f0541` | `verify_rbac_invariants.js` | Script kiểm toán 52 quy tắc RBAC V5 bất biến |
| `b0384a6bb17f0573fb583bffd85dd8d75cec351449314c0e5b6a000e834e9d4e` | `MIGRATION_004_RUNTIME_VERIFICATION.md` | Báo cáo nghiệm thu kỹ thuật Gate B chi tiết |
| `a595f94d1fb00353e46fb92e641457ac158f86438a6b18aa5907677491830a19` | `diff_vs_r4_bundle.diff` | Diff chi tiết so với bản nháp ZIP R4 ban đầu |
| `98d9f5695bb439a1b8c87bb01aaae864f4ccbdce73a2670636609e726367e5e5` | `git_status.txt` | Trạng thái working tree Git tại thời điểm đóng gói |
| `98abb797b1b740adbb4a8ba023c6e956719d47c68dadefca81af47a5152166f1` | `evidence_logs/pgtap_004_output.txt` | Log thực tế 75/75 tests pgTAP 004 PASS |
| `bde46e9637253e0adbf02e5174c12b15a55a6ba2c55851d3c16e6214304663de` | `evidence_logs/pgtap_rbac_output.txt` | Log thực tế 49/49 tests pgTAP RBAC PASS |
| `caa4f6fbeda37c3c11620bd76d59a7d54a1f8119fcba52d8d830093cf509160b` | `evidence_logs/gate_b_runtime_output.txt` | Log chi tiết thực thi 17 tests runtime engine PASS |
| `751c03038b239da04c41e62123355e6fd45b4d8fbd77e6e32fe04fc05b55af0a` | `evidence_logs/gate_b_runtime_results.json` | Kết quả có cấu trúc JSON 17/17 tests PASS |
| `412bfb1973d67a3ace299c5678be1ef7bd5953ab290ce350acad7efa48b89b68` | `evidence_logs/audit_test_004_output.txt` | Log kiểm toán tĩnh pgTAP 004 |
| `9a317d1ba8ae0c1cbfbee1a24902b7b2707dabbfa6f4165110bb57ddeac29b77` | `evidence_logs/rbac_invariants_output.txt` | Log kiểm toán 52 quy tắc bất biến RBAC |

---

## 4. GIẢI TRÌNH CÁC ĐIỂM KHÁC BIỆT SO VỚI ZIP R4 CŨ

Như đã nêu trong báo cáo độc lập của Chủ dự án, mã nguồn thực tế đã được gia cố trong quá trình chạy kiểm thử Gate B:
1. **Gia cố logic so sánh Idempotency (LG-01):**
   - Bản R4 cũ chỉ so sánh `vehicle_type` và `license_plate` (xe), `container_no_current` và `inbound_vehicle_visit_id` (container).
   - Bản Gate B Final đối chiếu 100% các trường payload (`driver_name`, `driver_phone`, `ticket_code`, `note`, `container_size`, `container_type`) bằng `IS DISTINCT FROM`, ném ngoại lệ P0001 nếu phát hiện sai lệch payload.
2. **Khắc phục quyền schema pg_temp trên PostgreSQL 17:**
   - Bản R4 cũ dùng `GRANT USAGE ON SCHEMA pg_temp TO authenticated;` (bị PostgreSQL 17 từ chối cấp quyền trên schema hệ thống).
   - Bản Gate B Final sử dụng bảng tạm `public.test_vars_004` trong transaction tự rollback, an toàn tuyệt đối và chạy thành công 75/75 assertions.

---

## 5. KẾT LUẬN & DỪNG BẮT BUỘC CHỜ PHÊ DUYỆT TRIỂN KHAI

- **Trạng thái:** **`GATE_C_PREFLIGHT_READY`**.
- **Môi trường:**
  * Supabase Local đã dừng hoàn toàn (`npx supabase stop`).
  * Supabase Cloud DEV (`son-cang-yms-dev`, ref: `euswzyespwaxyrjkfkrq`) giữ nguyên vẹn ở Migration 003, chưa có bất kỳ thay đổi nào.
- **Cam kết an toàn tuyệt đối:**
  * Không chạy `db push --linked`.
  * Không chạy `db reset` hoặc `migration repair`.
  * Không thực thi câu lệnh SQL ghi trên Cloud.
  * Không thay đổi các migrations 001–003.
- **Hành động tiếp theo:** **DỪNG BẮT BUỘC**, kính trình Chủ dự án phê duyệt áp dụng chính thức Migration 004 lên Supabase Cloud DEV!
