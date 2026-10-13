# SƠN CẢNG — PHASE 1C-A
## YÊU CẦU RÀ SOÁT VÀ HOÀN THIỆN THIẾT KẾ DOMAIN SCHEMA V5

**Dự án:** PWA Quản lý bến bãi/cảng cạn Sơn Cảng — Công ty Cổ phần Tà Lùng Quang Minh  
**Ngày:** 11/10/2026  
**Mức tài liệu:** Chỉ dẫn kỹ thuật để Antigravity thực hiện rà soát thiết kế; **KHÔNG PHẢI quyết định phê duyệt nghiệp vụ**  
**Giai đoạn:** Phase 1C-A — Design Review Only  
**Workspace dự kiến:** `D:\thanhnx\OpenCode\YMS-project`  
**Supabase Cloud DEV:** `son-cang-yms-dev`, project ref `euswzyespwaxyrjkfkrq`  
**Định hướng tài nguyên:** Ưu tiên Cloud DEV để giảm RAM; không tự khởi động Docker/Supabase Local.

---

## 1. Mục tiêu, phạm vi và điều kiện dừng

1. Đánh giá độc lập tài liệu `DOMAIN_SCHEMA_DESIGN_V5.md` hiện có trước khi viết migration 004; tìm sai lệch so với tài liệu nguồn, các rủi ro dữ liệu, tài chính, RLS và race condition.
2. Đề xuất cấu trúc dữ liệu có thể lập trình và kiểm thử sau khi người dùng phê duyệt, nhưng **chỉ sửa tài liệu** trong vòng này.
3. Lập danh sách vấn đề chưa chốt dưới dạng câu hỏi/đề xuất có phương án A/B và tác động; **không tự kết luận UAT còn mở**.
4. **Không** chạy SQL DDL/DML trên Cloud, không viết/chạy migration 004–007, không thực thi `db push`, `db reset`, `migration repair`, không tạo dữ liệu thử nghiệm, không viết Frontend hay tự chuyển Phase 1C-B.
5. Không thay đổi migrations nền tảng 001–003, bảng/grants/policies RBAC đã được kiểm tra, trừ khi phát hiện rủi ro và lập đề xuất riêng để phê duyệt.
6. Khi xong phải dừng, báo cáo để người dùng quyết định trước khi lập trình.

## 2. Căn cứ cần đọc trước khi đưa kết luận

Antigravity phải tìm, mở, đọc bản thực tế trong workspace (không suy đoán nội dung theo tên tệp):

- `AGENTS.md`, `ProjectContext/00_START_HERE.md` (nếu có) và `PROJECT_CONTEXT.md`/bản V5 chính thức trong `ProjectContext`.
- `ProjectContext/02_RBAC_V5/PWA_Son_Cang_V5_Phan_quyen_RBAC_DONG_HOAN_THIEN.xlsx`, nhất là các tab Role, Permission, Grant, quy trình phê duyệt và nghiệp vụ liên quan.
- `DOMAIN_SCHEMA_DESIGN_V5.md` — bản thiết kế hiện tại, xác định chính xác đường dẫn trong workspace.
- `OPEN_DECISIONS_UAT.md`, `DECISION_LOG.md`, `ROADMAP_BACKEND.md`.
- `CURRENT_STATUS.md`, `WORK_LOG.md`, `TECHNICAL_VERIFICATION_PHASE1.md`.
- Quy trình nghiệp vụ V5 và tài liệu Google Stitch được đưa vào ProjectContext, nếu chúng có liên quan đến mô hình dữ liệu.
- Migrations 001–003 **để đọc và đối chiếu**; tuyệt đối không chỉnh sửa trong nhiệm vụ này.

**Thứ tự ưu tiên:** tài liệu V5 đã được phê duyệt và quyết định đã chốt > workbook RBAC V5 > quyết định/biên bản UAT được xác nhận > tài liệu thiết kế đề xuất của Antigravity > suy luận của AI. Nếu nguồn mâu thuẫn, ghi nhận và hỏi; không âm thầm hợp thức hóa một phương án.

Với mỗi kết luận quan trọng, ghi **tệp nguồn, tiêu đề/mục (hoặc dòng nếu xác định được), trạng thái: ĐÃ CHỐT / ĐỀ XUẤT / CHƯA RÕ / XUNG ĐỘT**.

## 3. Những bất biến bắt buộc giữ đúng

### 3.1. Xe và container là hai vòng đời độc lập

- `vehicle_visit_id` và `container_visit_id` là các khóa UUID độc lập, không lấy biển số xe/số container làm khóa chính.
- Xe A có thể đưa container vào, rời bãi một mình; nhiều ngày sau xe B vào nhận container. Không tự đóng vòng đời container khi xe A rời bãi.
- Ghi nhận và sửa thông tin định danh phải có audit, lý do, dấu vết trước/sau; không thay khóa UUID hoặc tự động ghép theo 7 số cuối.
- Phân biệt lượt xe, container vật lý, lượt lưu bãi và sự kiện gắn/tháo/ra cổng; rà cardinality và dữ liệu lịch sử.

### 3.2. Điện container lạnh

- Phân biệt **yêu cầu điện dự kiến** và **phiên cắm điện vật lý thực tế**. Yêu cầu dự kiến không phát sinh phí nếu chưa cắm thật.
- Hai hình thức `DIEN_CONT_GIO` và `DIEN_CONT_LIEN_TUC` đều phải có mô hình rõ ràng. Đơn giá gốc V5 là **100.000 đồng/giờ** cho từng hình thức, trừ khi có phiên bản bảng giá đã được phê duyệt thay thế.
- Tính phí theo **từng phiên cắm điện vật lý độc lập**, làm tròn lên theo chu kỳ 15 phút, lấy mốc và giá có hiệu lực theo quy tắc V5; snapshot không được thay đổi hồi tố tùy tiện.
- Không cho phép một lượt container có hai phiên `PLUGGED` chồng lấn. Xem xét partial unique index, transaction lock và cách đóng phiên.
- **Chỉ An ninh xác nhận cắm/rút thực tế**; CCKB thực hiện thu và xác nhận tài chính đúng phạm vi.
- Phiên 0 giây, mất điện, điều chỉnh giờ và đảo giao dịch: nếu tài liệu V5/UAT không xác định, ghi mục cần quyết định, tuyệt đối không tự mặc định miễn phí/hủy.
- Không tự đưa vào V1 IoT, QR, OCR, barrier, xác nhận tự động hoặc tính cước ngoài phạm vi.

### 3.3. Phí bãi, phí vào cổng, thanh toán và xuất bãi

- Phí lưu container xét khung đêm **22:00–06:00**, **miễn đêm đầu tiên** theo V5, phí gốc **100.000 đồng/đêm**; yêu cầu đặc tả cụ thể thuật toán ranh giới thời gian, múi giờ `Asia/Ho_Chi_Minh`, các ca đến/đi tại 22:00 và 06:00, nhiều ngày, đổi bãi, sửa giờ.
- **Phí lưu chỉ được tính/chốt FINAL tại thời điểm An ninh ghi nhận container thực tế xuất bãi**, không chốt khi CCKB xác nhận tài chính hoặc khi ngắt điện.
- CCKB xác nhận đã thu/ngoại lệ tài chính; An ninh ghi nhận sự kiện xuất bãi thực tế. Xem lại tình huống phát sinh khoản phí mới sau khi đã xác nhận trước đó — không tự cho xe ra khi còn thiếu điều kiện.
- Bảng giá có phiên bản, ngày hiệu lực, người đề nghị/phê duyệt và snapshot; tiền thu, phân bổ và bút toán điều chỉnh phải truy vết và chống ghi đè lịch sử.
- Rà đủ các loại phương tiện/biểu phí vào cổng và phạt theo V5; không suy ra đơn giá từ thiết kế dự thảo nếu không có nguồn được duyệt.
- Không tự bổ sung xuất hóa đơn VAT, tự động ngân hàng, hoàn tiền hoặc nghiệp vụ kế toán V1 chưa được cho phép.

### 3.4. RBAC, approval, audit và tính nguyên tử

- Giữ đúng **8 roles (7 active + 1 future inactive), 67 permissions (60 CORE active + 7 future inactive), 206 grants** với các scopes `SELF`, `DEPARTMENT`, `YARD`, `ALL` của workbook V5.
- Xác minh từ bảng nghiệp vụ thật mọi `target_id`, `yard_id`, department và owner; client không được tự quyết định scope. Không tạo RPC `SECURITY DEFINER` cho phép vượt quyền vì thiếu ràng buộc target.
- Quy trình AP01–AP12 phải theo workbook V5, bao gồm Four-Eyes, đặc biệt **AP10 phê duyệt thay đổi bảng giá**; không mặc định mọi mã AP là cùng một quy trình.
- Phiếu phê duyệt, cập nhật trạng thái nghiệp vụ và audit thực hiện trong một transaction tin cậy hoặc có thiết kế nhất quán tương đương; lỗi phải rollback nguyên tử.
- Nhân viên không thể INSERT trực tiếp bản ghi approval đã được phê duyệt, audit giả hoặc thanh toán sai quyền. Cần xem đồng thời GRANT/REVOKE, RLS policies, EXECUTE và `SECURITY DEFINER`/`search_path`.
- Không chốt tài chính/xuất bãi offline; chỉ đề xuất hành vi offline cho thao tác không có tính quyết toán và cần đồng bộ an toàn nếu V5 cho phép.

## 4. Nội dung rà soát bắt buộc cho từng bảng

Đối chiếu sơ đồ hiện có (các tên sau là **đề xuất**, không phải bảng đã được phê duyệt để lập trình):

| Nhóm | Bảng đề xuất | Câu hỏi kiểm soát |
|---|---|---|
| Xe & container | `app_vehicle_visits`, `app_container_visits`, `app_container_number_changes` | PK/FK, vòng đời độc lập, cardinality, thay đổi xe kéo, nhập/sửa số cont, ngăn xuất trùng |
| Điện | `app_reefer_requests`, `app_reefer_sessions` | Khi nào bắt đầu tính, ai cắm/rút, chống cắm trùng, sai giờ, snapshot giá, nhiều phiên |
| Bảng giá | `app_tariff_plans`, `app_tariff_rates` | Phiên bản, lịch hiệu lực, AP10, ngăn hai bảng giá cùng hiệu lực trái quy tắc |
| Công nợ/thu | `app_charges`, `app_payments`, `app_payment_allocations`, `app_financial_adjustments` | Bất biến ledger, allocation, thanh toán nhiều khoản/nhiều lần, tránh double charge/pay, xử lý điều chỉnh |
| Xuất bãi | `app_exit_clearances`, `app_container_exit_events` | Phân nhiệm CCKB/An ninh, giá lưu chốt tại cổng, thay đổi sau clearance, atomic exit |
| Phê duyệt nền tảng | `app_approval_requests` cùng các bảng AP hiện có | Domain target validated, snapshots, approvals hợp lệ/sai scope, immutable audit |

Cho **từng bảng**, trình bày ngắn gọn: mục đích; thuộc tính chính (tên/kiểu/null/default); PK, FK, UNIQUE/CHECK/INDEX; trạng thái; người có quyền đọc/ghi; các RPC/server transaction hợp lệ; nhật ký cần ghi; tình huống biên; các điểm còn mở.

Kiểm tra thêm:

1. Dữ liệu nhập thời gian là `timestamptz`, tính toán dùng thời gian chuẩn và quy đổi đúng `Asia/Ho_Chi_Minh` khi xét khung đêm.
2. Tiền VND dùng loại số chính xác (`numeric`/bigint đồng), không dùng float cho tiền và không để client tự quyết toán.
3. Các quan hệ một-nhiều/nhiều-nhiều có bảng trung gian khi cần; tránh lưu một liên kết duy nhất nếu nghiệp vụ có thể chuyển cont nhiều lần.
4. Trạng thái và chuyển trạng thái có tiền điều kiện; tránh có hai sự kiện `EXITED` hay hai thanh toán đồng thời.
5. Index xét theo hoạt động thực tế và RLS; tránh thiết kế quá mức không cần thiết cho Phase 1C-B.
6. Chỉ lưu hình ảnh và chứng cứ dưới dạng liên kết an toàn; có giải pháp phân quyền Storage, không làm lộ file qua public URL.
7. Tách chính sách định danh user, xử lý thiết bị dùng chung và audit đúng người thao tác; không tự giải quyết các câu UAT còn mở.

## 5. Bắt buộc phân tích ít nhất 12 tình huống (UAT/Edge Cases)

| ID | Tình huống | Điều kiện cần chứng minh hoặc ghi mở |
|---|---|---|
| EC-01 | Xe A mang container vào; xe A ra không container; xe B đến nhận sau | Lượt xe/cont độc lập; phí lưu không bị chốt sớm |
| EC-02 | Xe đầu kéo không tải vào nhận container | Chỉ tính đúng biểu phí thực tế, không sinh vé container giả |
| EC-03 | Cắm 14:59 và 15:01 phút | Làm tròn 15 và 30 phút theo từng phiên |
| EC-04 | Phiên cắm 0 giây hoặc sai giờ | Quyết định mở nếu V5/UAT chưa chốt; tránh miễn phí tự động |
| EC-05 | CCKB đã clearance rồi container qua đêm tiếp | Phí lưu mới tại cổng; cần xử lý lại điều kiện tài chính |
| EC-06 | Hai nhân viên cùng xác nhận cắm/rút hoặc xuất bãi | Chỉ một giao dịch thành công, không double charge |
| EC-07 | Hai phiên điện chồng lấn trên cùng lượt container | Cơ sở dữ liệu tự ngăn kể cả qua RPC đồng thời |
| EC-08 | Sửa số container sau khi đã có điện/thu phí | UUID/FK/ledger/audit vẫn toàn vẹn; có lý do và quyền |
| EC-09 | Sửa giờ cắm/rút đã phát sinh thu tiền | Phê duyệt, điều chỉnh chênh lệch; không sửa đè lịch sử |
| EC-10 | Vai trò An ninh thử xác nhận thu tiền / CCKB thử ghi giờ ra | DENY qua GRANT/RLS/RPC ở cấp backend |
| EC-11 | Người đề nghị tự duyệt; duyệt sai bãi/bộ phận | Four-Eyes và scope fail-closed; rollback nguyên tử |
| EC-12 | Thay đổi bảng giá giữa hai phiên cắm | Mỗi phiên giữ snapshot theo bản giá đúng hiệu lực |

**Không tự lấy “ví dụ” hay “dự kiến” trong tài liệu cũ làm quy định mới nếu chưa có quyết định chính thức.**

## 6. Yêu cầu sản phẩm bàn giao

Để hạn chế tạo vòng lặp kiểm toán không cần thiết, chỉ tạo/sửa các tài liệu cần thiết (không dựng lại toàn bộ ProjectContext):

1. **Cập nhật** tài liệu `DOMAIN_SCHEMA_DESIGN_V5.md` hiện hành; đánh dấu chỗ thay đổi, giữ nguyên nội dung đã chốt. Tệp gốc nằm ở đâu phải được xác định từ workspace, không tạo bản trùng rời rạc.
2. **Tạo** `PHASE1C_A_DESIGN_REVIEW_REPORT.md` cùng thư mục thiết kế, gồm:
   - Tóm tắt ĐẠT / CẦN SỬA / CẦN QUYẾT ĐỊNH;
   - Bảng phát hiện `[ID, mức độ, nguồn, mô tả, rủi ro, phương án, trạng thái]`;
   - Ma trận đối chiếu nghiệp vụ V5 ↔ thiết kế ↔ UAT;
   - ERD sau rà soát (Mermaid), bảng dữ liệu, các constraints/index và luồng RPC/transactions;
   - Kế hoạch migrations 004–007 **chỉ ở mức đề xuất**;
   - Kế hoạch kiểm thử sau khi được phê duyệt (test PostgreSQL/RLS, test fail-closed, test concurrent, test tài chính, test security role thực);
   - Danh sách quyết định cần chủ dự án xác nhận (có lựa chọn A/B và hệ quả).
3. **Cập nhật** `OPEN_DECISIONS_UAT.md` nếu có câu hỏi mới; giữ nguyên mã RV01–RV12 và trạng thái thật của các câu chưa chốt.
4. **Cập nhật** `CURRENT_STATUS.md`, `WORK_LOG.md`: chỉ ghi công việc đã làm thực tế; không tuyên bố migration 004 hoặc test database đã chạy.
5. Bảng **Change Impact**: mỗi thay đổi trong thiết kế ảnh hưởng chức năng/permission/AP/UX nào, và có cần phê duyệt không.

## 7. Điều kiện nghiệm thu vòng thiết kế (không phải nghiệm thu phần mềm)

- [ ] Đọc, dẫn nguồn và phân loại rõ các yêu cầu V5 đã chốt so với đề xuất.
- [ ] Không có mâu thuẫn chưa khai báo giữa ERD, danh mục bảng, trạng thái và vòng đời.
- [ ] Có mô hình độc lập của vehicle/container, tách yêu cầu điện và phiên điện thật, tách clearance tài chính và xuất bãi thật.
- [ ] Có quy tắc kỹ thuật rõ cho phí điện từng phiên, chốt phí lưu khi ra thực tế, ledger bất biến; các ngoại lệ chưa chốt được đưa vào danh sách câu hỏi.
- [ ] Có phương án đáng tin cậy chống ghi trùng, race condition, SQL/RLS privilege escalation, phê duyệt sai đối tượng.
- [ ] Có phương án kiểm thử theo hành vi thật (ALLOW/DENY đúng lý do) sau này; chưa giả lập rằng test đã chạy.
- [ ] Có danh sách quyết định còn mở, không ngầm chuyển thành yêu cầu đã duyệt.
- [ ] Không sửa migrations 001–003; không tạo/chạy 004; không có thay đổi Cloud DEV; không tự khởi động Docker.
- [ ] Có kết luận rõ “SẴN SÀNG TRÌNH PHÊ DUYỆT PHASE 1C-B” hoặc “CHƯA SẴN SÀNG”, kèm lý do.

## 8. Cách báo cáo cuối cùng cho người dùng

Giới hạn báo cáo ở các thông tin hữu ích, không lặp nguyên văn tài liệu:

1. Những phần thiết kế đúng và có thể giữ nguyên.
2. Các vấn đề nghiêm trọng/khả năng làm sai tiền, xuất bãi, kiểm soát xe/container hoặc lộ dữ liệu.
3. Những vấn đề cần xác nhận (mỗi câu hỏi có A/B, khuyến nghị và tác động, không tự chọn thay người dùng).
4. Danh mục file đã sửa/tạo và đường dẫn trong workspace.
5. Đề xuất phạm vi Migration 004 và tiêu chí kiểm thử để người dùng phê duyệt sau.
6. Dòng trạng thái kết thúc: **“Chỉ hoàn thành rà soát thiết kế Phase 1C-A; CHƯA viết/chạy migration 004; CHƯA thay đổi Cloud DEV.”**

---

**LƯU Ý:** Tài liệu này là *checklist kiểm toán thiết kế*. Nó không thay thế workbook RBAC V5, ProjectContext, quy trình hoặc kết quả UAT. Nếu có khác biệt với nguồn chính thức, nguồn chính thức được ưu tiên; vấn đề chưa rõ phải xin ý kiến.
