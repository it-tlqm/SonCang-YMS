# SƠN CẢNG — BÁO CÁO KIỂM TOÁN ĐỘC LẬP MIGRATION 004

**Dự án:** PWA Quản lý bến bãi/cảng cạn Sơn Cảng — Công ty Cổ phần Tà Lùng Quang Minh  
**Ngày rà soát:** 11/10/2026  
**Đầu vào:** `migration_004_code_bundle(1).zip` (05 file), đối chiếu nền tảng RBAC migrations 001–003 và `verified_grants.json` đã bàn giao.  
**Phương pháp:** Mở trực tiếp mã SQL, pgTAP và đặc tả; đếm assertion bằng script; đối chiếu bảng cấp quyền; **không thực thi PostgreSQL, Docker hoặc bất kỳ tác vụ nào trên Supabase Cloud**.

**Kết luận nghiệm thu: CHƯA ĐẠT — CHƯA ĐƯỢC PHÉP PUSH MIGRATION 004 LÊN CLOUD DEV.**

## I. Những phần đã đạt ở cấp mã nguồn

- Đã viết đúng ba bảng: `app_vehicle_visits`, `app_container_visits`, `app_container_number_changes`.
- Sử dụng UUID độc lập cho lượt xe và lượt container; số container không phải khóa chính.
- Giữ quan hệ **01 lượt xe – nhiều lượt container** ở tầng Database, không đặt `UNIQUE` 1:1; **chưa coi nghiệp vụ 2×20 feet là đã phê duyệt**.
- Khóa ngoại kết hợp `(vehicle_visit_id, yard_id)` nhằm ngăn liên kết xe và container thuộc hai bãi khác nhau.
- Đã có 07 RPC, sử dụng `auth.uid()` và `sc_can()`; đã thu hồi quyền ghi trực tiếp của `anon` và `authenticated`.
- Chưa có RPC chốt xuất bãi hoặc chốt khoản thu cuối cùng; 005–007 vẫn nằm ngoài phạm vi.
- Antigravity báo cáo đúng tình trạng: **pgTAP mới được soạn, chưa chạy trên PostgreSQL**.

## II. Các lỗi nghiêm trọng cần sửa trước khi triển khai

| Mã | Mức độ | File/dòng | Phát hiện và cách khắc phục |
|---|---|---|---|
| **M004-R1-01** | **BLOCKER** | `tests/domain_vehicles_containers_004.sql`: 14–15, 133–155, 207–233 và nhiều khối `DO` | Khai báo `plan(35)`, nhưng kiểm đếm mã nguồn cho thấy **14** lệnh `SELECT` xuất assertion TAP ở cấp cao nhất và **37** lời gọi `PERFORM ok()/is()` nằm trong các khối `DO`. `PERFORM` không xuất TAP cho `pg_prove`, nên bộ test chưa hợp lệ. Chuyển assertion sang `SELECT` hoặc hàm trả về `SETOF text` rồi `SELECT * FROM ...`; kiểm đếm lại kết quả thực sự hiển thị. |
| **M004-R1-02** | **BLOCKER** | Test 115–126; migration 280–289 | Test chuyển sang `anon` rồi `SELECT count(*)` từ bảng đã **REVOKE SELECT** với `anon`. PostgreSQL sẽ báo `permission denied` (`42501`), không trả về `0` như test giả định. Hãy test đúng `GRANT` bằng `hasnt_table_privilege`/`throws_ok(42501)`; kiểm thử RLS bằng phiên `authenticated` được cấp SELECT. |
| **M004-R1-03** | **HIGH** | Test 157–200, 702–721 | `throws_ok(..., 'P0001', '%Permission Denied%', ...)` dùng `%...%` như ký tự đại diện, nhưng `throws_ok` kiểm tra **thông điệp chính xác**. Dùng thông điệp chính xác hoặc `throws_like`/`throws_matching` cho mẫu; phải kiểm tra đúng nguyên nhân DENY. |
| **M004-R1-04** | **HIGH — phân nhiệm** | Migration 421–430, 483–490 | RPC `sc_create_container_visit` cho **An ninh** tự truyền `p_cargo_status='HANG'/'RONG'`, đi vòng qua quyền `container.cargo.update` của **Điều phối**. Bỏ tham số này khỏi RPC tạo thông thường, khởi tạo `CHUA_XAC_DINH` phía server; chỉ Điều phối được thay đổi qua RPC có kiểm tra quyền. |
| **M004-R1-05** | **HIGH — lộ phạm vi dữ liệu** | Migration 271–278 | RLS lịch sử sửa số dùng `container.number.discrepancy.view OR container.visit.read`. Ma trận V5 cấp `container.visit.read` cho **DIS_STAFF/DIS_LEAD** nhưng không cấp `container.number.discrepancy.view`; vì vậy Điều phối vẫn xem được lịch sử sửa số qua nhánh OR. Sửa policy theo đúng quyền xem sai lệch; bổ sung test DENY của Điều phối. |
| **M004-R1-06** | **HIGH — dữ liệu tin cậy** | Migration 297–305, 336–346 và 421–430, 483–490 | RPC nhận trực tiếp **`p_ticket_amount`** và **`p_is_legacy_import`** từ client. Nhân viên có quyền tạo xe/container có thể tự chọn giá vé hoặc đánh dấu giả là dữ liệu chuyển đổi. Không để giá trị tài chính có hiệu lực phát sinh từ client; tính qua biểu phí do server xác minh ở giai đoạn phù hợp. Chỉ tiến trình nhập liệu lịch sử được ủy quyền mới được đặt cờ legacy. |
| **M004-R1-07** | **HIGH — khác đặc tả** | Migration 94–99; đặc tả Code-Only mục 3.2, dòng 58–67 | Đặc tả yêu cầu **hai FK xe vào/xe ra độc lập, nullable**, nhưng DDL đặt `inbound_vehicle_visit_id NOT NULL`. Cần làm rõ hỗ trợ hồ sơ chuyển đổi/chưa xác định xe vào; có thể giữ FK nullable trong schema và yêu cầu xe vào khi tạo lượt bình thường bằng RPC. Nếu muốn `NOT NULL` phải xin chốt lại thiết kế. |

## III. Những điểm cần hoàn thiện để tránh lỗi nghiệp vụ

| Mã | Mức độ | File/dòng | Vấn đề cần giải quyết |
|---|---|---|---|
| M004-R1-08 | MEDIUM | Migration 200–220, 638–723 | Trigger mang tên “append-only” nhưng không bảo vệ `evidence_url`/`notified_cckb`; có thể ghi đè thông tin xác nhận `sec_ack_*`, `reconciled_*`. Cần bảo toàn chứng cứ, chỉ cho trạng thái chuyển hợp lệ một lần hoặc lưu từng sự kiện xác nhận riêng. |
| M004-R1-09 | MEDIUM / UAT | Migration 471–481 | RPC chỉ đếm container có `status='IN_YARD'` để giới hạn “một cont trên một lượt xe”. Điều này không tương đương “một cont trong toàn bộ lượt xe”, và khái niệm giới hạn V1 chưa được chốt rõ. Giữ fail-closed, ghi câu hỏi UAT, không tự suy ra quyền 2×20 feet. |
| M004-R1-10 | MEDIUM | Migration 24–35 | Thêm loại xe `XE_KHAC` ngoài **07 mã phương tiện** có biểu phí trong `PROJECT_CONTEXT.md` V5. Không thêm mã nghiệp vụ có hệ quả tài chính khi chưa được chấp thuận. |
| M004-R1-11 | MEDIUM | Migration 82–120, 421–502 | Thiếu cơ chế phát hiện/cảnh báo **hai lượt container IN_YARD có cùng số hiện hành**. V5 không cho tự gộp cont trùng; cần thiết kế cảnh báo/giữ trạng thái nghi vấn theo UAT. |
| M004-R1-12 | MEDIUM | Migration 584–634 | RPC cập nhật HÀNG/RỖNG chỉ chặn `EXITED`, chưa chặn `CANCELLED`; nên chỉ cho cập nhật khi `status='IN_YARD'`. |
| M004-R1-13 | MEDIUM / TEST | Tests 133–739 | Hầu hết các kịch bản dùng `DO` và JWT giả lập dưới phiên PostgreSQL đặc quyền. Cần kiểm thử `EXECUTE` và SELECT/RLS dưới database role `authenticated` thật với dữ liệu đúng/sai bãi, không chỉ kiểm tra `sc_can()`. |
| M004-R1-14 | MEDIUM / TEST | Test 516–589 | Các nhánh “không có fixture ⇒ PASS mặc định” có thể tạo **false positive**. Phải tạo dữ liệu đầu vào rõ ràng, thiếu dữ liệu thì FAIL; test đúng bản ghi và trạng thái trước/sau. |

## IV. Thứ tự khắc phục đề xuất

**Đợt 1 — An toàn nghiệp vụ/phân quyền:** R1-04, R1-05, R1-06, R1-07. Không thêm role hay permission mới; không sửa migrations 001–003.

**Đợt 2 — Toàn vẹn dữ liệu và UAT:** R1-08 đến R1-12. Giữ cấu trúc 1:N; không coi 2×20 feet đã được phép vận hành; không phát triển Migration 005–007.

**Đợt 3 — Làm lại chất lượng test:** R1-01, R1-02, R1-03, R1-13, R1-14. Mọi pgTAP assertion phải phát ra TAP thực sự, không dùng `PERFORM` trong `DO` để tính vào plan; sửa mẫu thông điệp lỗi và đối chiếu với PostgreSQL role thực.

## V. Điều kiện bàn giao lại

1. Nộp bản SQL 004 và pgTAP 004 đã sửa cùng TypeScript types nhất quán.
2. Báo cáo **14 phát hiện → cách khắc phục → file/dòng → test tương ứng**. Những điểm chưa chốt nghiệp vụ phải ghi `UAT OPEN`.
3. Duy trì `CODE DRAFT / NOT EXECUTED` nếu chưa chạy PostgreSQL thật; không tuyên bố test PASS dựa vào việc `tsc`/ESLint chạy thành công.
4. ZIP đầy đủ mã nguồn, test, đặc tả và báo cáo; nêu chính xác số file và checksum nếu có.
5. **Không `supabase db push`, không thực thi SQL trên Cloud DEV, không sửa migrations 001–003, không khởi động Docker nếu chưa được phép.**
6. Sau khi khắc phục, **dừng để kiểm toán độc lập lần nữa** trước khi xin phê duyệt chạy Migration 004.

## VI. Kết luận

Migration 004 đã đạt **mức có bản nháp kỹ thuật để thẩm định**, nhưng **chưa đạt nghiệm thu an toàn hoặc kiểm thử runtime**. Hai vấn đề đặc biệt cần xử lý là đường vòng quyền HÀNG/RỖNG của An ninh và lộ quyền đọc lịch sử sửa số cho Điều phối. Không cần viết lại toàn bộ Phase 1C-A; chỉ sửa có mục tiêu theo danh sách trên.
