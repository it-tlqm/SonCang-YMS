# SƠN CẢNG — KIỂM TOÁN ĐỘC LẬP MIGRATION 004, VÒNG 2

**Ngày:** 11/10/2026  
**Đối tượng:** `migration_004_code_bundle(2).zip` (SHA-256 `44c722a2d363d6912753410d1b99e5295a42f6ea71e15f0c1bba50a3f6301117`)  
**Phạm vi:** Kiểm tra trực tiếp 5 file trong ZIP; đối chiếu mã 004 với RBAC V5 và Migration 001/003 đã bàn giao trong `rbac_v5_verification_bundle(5).zip` cùng ProjectContext V5.  
**Phương pháp:** Đọc SQL/TypeScript/test, đối chiếu định nghĩa hàm và cột, kiểm tra đếm assertion, tham khảo tài liệu pgTAP. **Không kết nối hay chạy PostgreSQL, không truy cập Cloud DEV, không khởi động Docker.**

## KẾT LUẬN

**CHƯA ĐẠT — KHÔNG PHÊ DUYỆT `db push` MIGRATION 004.** Bản sửa đã cải thiện logic RBAC/DDL; song bộ pgTAP còn lỗi cấu trúc và logic khiến kiểm thử khó hoặc không thể thực thi tin cậy. Có thêm bất nhất TypeScript và lỗ hổng tính toàn vẹn khi thao tác đồng thời. `49/49` được Antigravity báo cáo chỉ là **49 lời gọi assertion được đếm tĩnh**, **không phải kết quả 49 bài test PASS trên PostgreSQL**.

## A. 10 PHÁT HIỆN CẦN KHẮC PHỤC

| Mã | Mức độ | Vị trí trong ZIP | Phát hiện và yêu cầu sửa |
|---|---|---|---|
| **M004-R2-01** | **BLOCKER** | Test `domain_vehicles_containers_004.sql`: **160–169, 748–758** | Dùng `hasnt_table_privilege()` (4 lần), `hasnt_function_privilege()` (2 lần). Các tên này **không nằm trong API pgTAP chính thức**, và ZIP không định nghĩa helper bổ sung. Sửa thành assertion `ok(NOT pg_catalog.has_table_privilege(...), '...')` và `ok(NOT pg_catalog.has_function_privilege(...), '...')` hoặc helper có mã nguồn/kiểm thử rõ ràng. |
| **M004-R2-02** | **BLOCKER** | Test: **273–299, 423–453, 498–561, 611–619, 670–737**; SQL: **339–340, 529–530, 579–580, 602–603, 614–615, 682–687** | Dùng `throws_ok(sql, 'P0001', '^...regex...', desc)` nhưng pgTAP **`throws_ok()` so khớp chính xác `errmsg`**, không coi đối số 3 là regex; phần lớn thông báo kỳ vọng cũng khác thực tế SQL (tiếng Anh vs tiếng Việt, `01` vs `1`, mã quyền `.reconcile` vs `.port_reconcile`). Dùng `throws_ok` với đúng thông báo thực, hoặc tách kiểm tra SQLSTATE và nội dung bằng API phù hợp (`throws_matching` cho regex); bảo đảm luôn bắt được *đúng nguyên nhân* bị từ chối. |
| **M004-R2-03** | **BLOCKER** | Test: **32–77, 237–252, 350–374, 388–403, 623–640** | Helper `pg_temp.set_test_auth()` gọi `set_config('role', 'authenticated', true)`, **chuyển role thực tế và duy trì trong transaction**, trong khi các fixture tiếp theo trực tiếp `UPDATE/INSERT` những bảng đã `REVOKE` và helper `pg_temp.set_val` ghi bảng tạm do `postgres` tạo. Dự kiến lỗi `permission denied`, đồng thời làm mơ hồ mức quyền thực sự đang kiểm thử. Tách **JWT-claim mock** khỏi **SET ROLE**: fixture chạy dưới trusted test owner; những câu cần test quyền thật mới chuyển `SET LOCAL ROLE authenticated` rồi `RESET ROLE`, kiểm soát quyền truy cập bảng tạm. Chặn fixture lách test bằng quyền superuser và chặn assertion chạy sai user. |
| **M004-R2-04** | **BLOCKER** | Test **264–269** vs migration **16–65, 110–112** | Assertion A15 truy vấn `is_legacy_import` từ **`app_vehicle_visits`**, nhưng chỉ **`app_container_visits`** có cột này. Sẽ lỗi SQL `42703` (undefined_column); chuyển assertion sang bảng container với fixture container có thật. |
| **M004-R2-05** | **HIGH** | Types `database.types.ts`: **589–599** vs migration **459–465** | TypeScript khai báo RPC `sc_create_container_visit` có thêm `p_seal_no`, `p_note`; SQL **không có** 2 tham số đó. Cập nhật TypeScript đúng chữ ký SQL, kiểm tra cả 7 RPC signatures và bổ sung script so khớp. PASS `tsc` không chứng minh RPC gọi runtime đúng. |
| **M004-R2-06** | **HIGH** | Migration **489–498, 606–616** | Chống trùng `container_no_current` bằng `SELECT count(*)` rồi INSERT/UPDATE nhưng **không khóa theo (yard_id, normalized_container_no)** và không có partial unique index. Hai request trên **hai lượt xe khác nhau** có thể cùng qua bước kiểm tra và tạo số container trùng `IN_YARD`. Nếu V1 từ chối trùng: đề xuất partial unique index `(yard_id, upper(btrim(container_no_current))) WHERE status='IN_YARD'` (đảm bảo điều kiện UAT) và xử lý lỗi `23505`; hoặc khóa giao dịch tương đương trên cùng key. Test hai phiên thực sự đồng thời. |
| **M004-R2-07** | **HIGH / NGHIỆP VỤ** | Migration **500–543** | RPC gắn container với lượt xe chỉ kiểm tra cùng bãi, trạng thái và số lượng; **không kiểm tra `vehicle_type` có được phép mang container**. `PROJECT_CONTEXT.md` V5 phân biệt xe bo không kéo container và nhóm xe có kéo container. Yêu cầu đối chiếu chính xác các mã xe được phép theo V5, chặn tổ hợp không hợp lệ tại server hoặc ghi rõ UAT còn mở; không chỉ ẩn input trên UI. |
| **M004-R2-08** | **MEDIUM / BẤT BIẾN** | Migration **223–230** | Trigger so sánh `NEW.sec_ack_at <> OLD.sec_ack_at` / `NEW.reconciled_at <> OLD.reconciled_at`; với NULL, kết quả là NULL nên có thể **xóa dấu xác nhận bằng cách gán NULL** mà không kích hoạt điều kiện như mong muốn. Sửa tất cả trường nullable cần bất biến bằng `IS DISTINCT FROM`, ràng buộc cặp `*_at`/`*_by`, và test overwrite sang NULL. Dù authenticated bị REVOKE direct UPDATE, trigger phải có tính đúng độc lập. |
| **M004-R2-09** | **MEDIUM / TEST COVERAGE** | Test **481–495, 718–759**; spec: M004-T14/T16/T22 | Assertion 27 chỉ kiểm tra `change_id` không NULL rồi ghi nhãn "sinh audit", **không kiểm tra bản ghi audit**. Assertion 29 chỉ kiểm tra 1 row có số mới, **không đối chiếu UUID trước–sau**. Chưa có kiểm thử đồng thời `create/correct`, stale writes, rollback nguyên tử khi audit fail và việc sửa số *sau* xuất bãi. Thêm assertion thực chất, cập nhật `plan()` theo kết quả. |
| **M004-R2-10** | **MEDIUM / THIẾT KẾ TƯƠNG LAI** | Migration **357–372** | Giá vé được hardcode bằng `CASE` theo 7 mã V5 trong RPC; đúng bảng giá hiện hành được đối chiếu, nhưng từ Migration 006 sẽ có bảng giá versioned. Ghi rõ phương án chuyển sang tariff snapshot/lookup có hiệu lực, tránh việc đổi bảng giá nhưng RPC 004 vẫn áp giá cũ. Không tự ý xây bảng 006 trong 004. |

## B. NHỮNG GÌ ĐÃ CẢI THIỆN SO VỚI VÒNG 1

- DDL ba bảng (`app_vehicle_visits`, `app_container_visits`, `app_container_number_changes`) đã có; UUID xe và container độc lập.
- Quan hệ 1 xe–N container ở schema **không bị khóa `UNIQUE` 1:1**; V1 giữ giới hạn 1 cont/lượt ở RPC. Khả năng xe 2×20 feet **vẫn UAT OPEN**, chưa được tự coi đã chốt.
- `sc_create_container_visit` không còn nhận `p_cargo_status`, server gán `CHUA_XAC_DINH`; chức năng cập nhật HÀNG/RỖNG do Điều phối kiểm soát.
- RLS lịch sử sửa số dựa riêng vào `container.number.discrepancy.view`; không còn nhánh quyền đọc container thông thường.
- RPC không nhận `p_ticket_amount` hay cờ legacy do client tự khẳng định; server tính giá theo V5 hiện hành.
- Inbound vehicle FK nullable trong schema, bắt buộc qua RPC tạo mới thông thường; composite FK chống nối khác bãi.
- Gói ZIP có đúng 5 tệp, **SHA256 khớp** checksum Antigravity công bố; tuy nhiên checksum đúng chỉ chứng minh trùng bytes, **không chứng minh mã đúng**.
- Kiểm tra tĩnh đếm chính xác **49** câu gọi các hàm *được coi* là assertion, `plan(49)`. Nhưng trong đó 6 câu đang gọi tên hàm chưa được cung cấp; **0/49 được kiểm chứng runtime trong vòng này**.

## C. TIÊU CHÍ ĐẦU RA CHO VÒNG SỬA TIẾP

1. Sửa **4 BLOCKER trước**, đối chiếu API pgTAP theo tài liệu chính thức <https://pgtap.org/documentation.html>. Đặc biệt, `throws_ok` kiểm tra SQLSTATE và thông báo **chính xác**; regex dùng `throws_matching()` hoặc cơ chế kiểm tra nguyên nhân tương đương không bỏ qua SQLSTATE.
2. Sửa bất nhất giữa TypeScript và SQL; bảo vệ trùng số khi concurrency; rà soát đối tượng xe hợp lệ mang container; null-safe immutability.
3. Tổ chức pgTAP fixture rõ role hiện hành theo từng khối; tuyệt đối không đọc/ghi fixture bằng role vừa bị REVOKE. Bổ sung test thật sự xác minh audit, UUID và hành vi rollback.
4. **Không cần kéo dài số lượng assertion chỉ để đạt số đẹp.** Mỗi assertion có kỳ vọng gắn với kết quả thực, đếm plan chính xác; nếu chưa chạy thì ghi `NOT RUN`.
5. Không `db push` trên Cloud DEV. Không sửa migrations 001–003. Không tự thay đổi V5/UAT. Không khởi động Docker nếu chưa xin phép. Bàn giao ZIP mới và báo cáo `M004-R2-01…10` với chứng cứ file/dòng/kết quả.
6. Sau khi kiểm toán tĩnh đạt mới xin phép chạy các bài test trên **PostgreSQL test database tách biệt**, không chạy fixture `INSERT auth.users`/các lệnh có ghi dữ liệu trực tiếp trên Cloud DEV đang làm việc.

## D. KẾT LUẬN NGHIỆM THU

- **Phase 1B / Supabase Cloud DEV migration 001–003:** Không bị tác động bởi kiểm toán mã 004 trong vòng này.
- **Migration 004:** Code draft; **chưa nghiệm thu về cấu trúc test, chưa kiểm thử PostgreSQL, chưa được phê duyệt triển khai Cloud**.
- **Đề xuất:** Giao Antigravity sửa trực tiếp 10 phát hiện và gửi ZIP vòng 3; không lặp lại rà soát kiến trúc Phase 1C-A.
