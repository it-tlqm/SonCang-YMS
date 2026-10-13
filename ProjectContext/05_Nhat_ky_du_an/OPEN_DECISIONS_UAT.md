# OPEN DECISIONS / UAT — KHÔNG TỰ CHỐT

Nguồn: mục 10 `../01_Nghiep_vu_V5/PROJECT_CONTEXT.md`; workbook V5 tab `27_V5_RUI_RO_UAT`, tab `24_V5_THAM_SO`; đặc tả UAT V4 chỉ hỗ trợ đối chiếu. Bảng dưới đây **tóm tắt vấn đề cần xác minh**, không phải thay thế bảng gốc.

| Mã | Chủ đề cần kiểm chứng / điều kiện an toàn | Trạng thái |
|---|---|---|
| **SC-1C-A-01** | Một lượt xe có chở 2 container 20 feet (2x20ft) hoặc nhiều cont không | **CHỜ CHỐT / UAT CÒN MỞ** |
| RV01 | Giây lẻ khi ghi thời gian cắm/rút; quy tắc áp dụng tại ranh giới | CHỜ UAT |
| RV02 | Phiên 0 phút / thời điểm bất thường: không tự thu 15 phút khi chưa xác minh; không tự động miễn tiền ngầm | **CHỜ CHỐT / UAT CÒN MỞ** |
| RV03 | Giá điện thay đổi giữa phiên: snapshot đơn giá tại thời điểm bắt đầu cắm điện (đã có cơ sở V5) | ĐÃ CÓ CƠ SỞ V5 / CHỜ UAT |
| RV04 | Giá phí lưu thay đổi trong kỳ lưu: định giá theo từng đêm (mốc 22h) hay theo lúc vào bãi | **CHỜ CHỐT / UAT CÒN MỞ** |
| RV05 | App hiển thị đang cắm nhưng hiện trường đã rút: ai xác minh, CCKB sửa/ghi ngoại lệ; **không xuất khi còn cắm vật lý** | CHỜ UAT |
| RV06 | Tiền lưu mới phát sinh ở cổng ra sau khi CCKB đã duyệt tài chính: An ninh thu qua `storage.payment.collect` hoặc CCKB duyệt ngoại lệ nợ AP07 | **CHỜ CHỐT / UAT CÒN MỞ** |
| RV07 | Mã loại xe `CONT_LANH` nhưng áp dụng xe container có hàng khô/lạnh; cách hiển thị & mapping | CHỜ UAT / xem quyết định V5 đã chốt |
| RV08 | Vai trò Kế toán dự phòng, chưa hoạt động trong V1 | CHỜ UAT cho giai đoạn tương lai; V1 tắt |
| RV09 | Định danh người thao tác khi dùng chung máy/bốt; trách nhiệm thu và xác nhận | **CHỜ CHỐT / UAT CÒN MỞ** |
| RV10 | Dữ liệu AppSheet cũ thiếu giờ ra/thu tiền: đánh dấu legacy_unverified, không tạo công nợ giả | CHỜ UAT |
| RV11 | Chứng từ và trao đổi qua Zalo thủ công; chưa có tích hợp API tự động V1 | CHỜ UAT cho chứng từ chi tiết |
| RV12 | Mốc chốt ca báo cáo thu khác ca trực; cách phân loại thống kê | CHỜ UAT |

## Cách cập nhật

Mỗi quyết định cần: **ngày, người chốt/chứng cứ, phương án, ví dụ biên, ảnh hưởng DB/API/UI/test, trạng thái (OPEN/DECIDED)**. Sau khi được phê duyệt, thêm vào `DECISION_LOG.md`; sửa bảng này thành `DECIDED` và tạo test tương ứng. Không lấy giải pháp tạm trong bảng V5 làm quyết định cuối. Tuyệt đối không tự ý gán trạng thái CHỐT cho các mục còn mở.

---

### Ghi chú Rà soát Phase 1C-A (11/10/2026) — Danh sách 5 Quyết định Nghiệp vụ Chờ Chủ Dự án Phê duyệt:

1. **Quyết định 1 (SC-1C-A-01) — Xe chở 2 container 20 feet (2x20ft) trong cùng lượt xe:**
   - **Bối cảnh:** Xe đầu kéo logistics cửa khẩu có thể cõng mooc chở 2 container 20 feet cùng lúc lúc vào cổng hoặc ra cổng.
   - **Phương án A (Khuyến nghị):** CSDL giữ quan hệ 1 Xe - Nhiều Cont (`inbound_vehicle_visit_id` và `outbound_vehicle_visit_id` là Foreign Keys, không đặt Unique constraint cứng). Kiểm soát quy tắc tối đa 2 cont 20ft hoặc 1 cont 40ft/45ft ở application layer.
   - **Phương án B:** Khóa cứng trong CSDL bằng Unique Index chỉ cho phép 1 xe cõng tối đa 1 container.
   - **Trạng thái:** `[CHỜ CHỐT / UAT CÒN MỞ - KHÔNG TỰ CHỐT]`.

2. **Quyết định 2 (SC-1C-A-03 / RV02) — Kiểm soát phiên điện 0 giây:**
   - **Bối cảnh:** Xe cắm điện thử vài giây rồi rút ra do hỏng máy lạnh hoặc đổi vị trí; hoặc nhân viên nhập nhầm giờ cắm và rút trùng nhau.
   - **Phương án A (Khuyến nghị - Đúng nguyên tắc V5):** Không tự động miễn tiền ngầm. Chuyển phiên sang trạng thái `ZERO_DURATION_REVIEW`. Bắt buộc nhân viên CCKB nhập lý do và có sự xác nhận của Trưởng bộ phận CCKB chứng minh không có kết nối điện thực tế thì mới được chốt 0đ (`CANCELLED_NO_CONNECTION`).
   - **Phương án B:** Tự động hủy và miễn phí tiền điện ngay khi `actual_seconds <= 0` mà không cần duyệt.
   - **Trạng thái:** `[CHỜ CHỐT / UAT CÒN MỞ - KHÔNG TỰ CHỐT]`.

3. **Quyết định 3 (SC-1C-A-05 / RV06) — Thu phí lưu bãi phát sinh tại cổng ra theo AP07:**
   - **Bối cảnh:** CCKB duyệt tài chính lúc 16:00 (chưa qua đêm thứ 2, phí lưu = 0đ), nhưng xe nằm lại qua đêm đến 08:00 sáng hôm sau mới ra cổng, phát sinh phí lưu đêm thứ 2 (100.000đ).
   - **Phương án A (Khuyến nghị - Đúng chuẩn V5):** Tuân thủ chính sách AP07: An ninh thu tiền mặt khoản phát sinh ngay tại cổng ra qua quyền `storage.payment.collect`. Nếu khách xin nợ, CCKB xác nhận ngoại lệ công nợ phát sinh mới qua quyền `exit.clearance.debt_exception` trên PWA; không hủy clearance cũ của CCKB để chống ách tắc xe.
   - **Phương án B:** Hủy bỏ clearance cũ của CCKB, bắt lái xe quay lại phòng CCKB để làm lại thủ tục tài chính từ đầu.
   - **Trạng thái:** `[CHỜ CHỐT / UAT CÒN MỞ - KHÔNG TỰ CHỐT]`.

4. **Quyết định 4 (SC-1C-A-04 / RV04) — Định giá lưu bãi khi thay đổi bảng giá giữa kỳ lưu:**
   - **Bối cảnh:** Bảng giá mới ban hành lúc 00:00 ngày $X$, trong khi container đã vào bãi từ ngày $X-3$ và lưu qua nhiều đêm.
   - **Phương án A (Khuyến nghị):** Mỗi đêm lưu bãi được định giá theo bảng giá có hiệu lực tại mốc 22:00 của đêm phát sinh đó (đêm nào tính theo giá đêm đó).
   - **Phương án B:** Áp dụng cố định đơn giá lưu bãi của thời điểm container bắt đầu vào cổng cho toàn bộ kỳ lưu trú của container đó.
   - **Trạng thái:** `[CHỜ CHỐT / UAT CÒN MỞ - KHÔNG TỰ CHỐT]`.

5. **Quyết định 5 (AP12 / RV09) — Cơ chế nhận diện nhân viên trực bốt dùng chung thiết bị:**
   - **Bối cảnh:** Máy tính bảng / PC tại bốt An ninh cổng và bàn CCKB thường được dùng chung giữa các nhân viên trong ca trực.
   - **Phương án A (Khuyến nghị):** Bắt buộc mỗi nhân viên đăng nhập tài khoản cá nhân riêng trên trình duyệt PWA; khi giao ca thì người cũ đăng xuất và người mới đăng nhập để bảo đảm trách nhiệm cá nhân đối với từng khoản thu tiền mặt và lệnh cho xe xuất bãi.
   - **Phương án B:** Cho phép dùng tài khoản bốt chung, nhưng mỗi thao tác nhạy cảm (thu tiền, cho xe ra) yêu cầu nhập mã PIN cá nhân 4-6 số.
   - **Trạng thái:** `[CHỜ CHỐT / UAT CÒN MỞ - KHÔNG TỰ CHỐT]`.

6. **Quyết định 6 (SC-1C-B-02 / RV07) — Danh mục loại phương tiện động (`app_vehicle_types`):**
   - **Bối cảnh:** Loại bỏ thiết kế khóa cứng 7 loại xe trong CHECK constraint; chuyển sang bảng danh mục động `app_vehicle_types` khởi tạo bằng 7 mã V5.
   - **Trạng thái:** `[DECIDED — ĐÃ TRIỂN KHAI THÀNH CÔNG TẠI GATE C MIGRATION 004 TRÊN CLOUD DEV]`.

7. **Quyết định 7 (SC-1D-01-P1) — Rủi ro P1 Backend Guard: Chặn tạo lượt xe đầu kéo (DAU_KEO 0đ) chở container:**
   - **Bối cảnh:** Migration 004 đã triển khai lên Cloud DEV có bảng giá `DAU_KEO = 0đ` và `CONT_LANH = 250.000đ`. Tuy nhiên, RPC `sc_create_vehicle_visit` chưa có kiểm tra chặn trường hợp client gửi mã xe `DAU_KEO` nhưng thực tế có chở container (nguy cơ thất thoát 250.000đ tiền vé cổng nếu người dùng lách luật hoặc gọi API trực tiếp).
   - **Thực tế Phase 1D-01:** Giao diện Client đã chủ động thực thi chặn chọn `DAU_KEO` khi mang container (bật toggle "CÓ mang cont" thì tự động áp vé 250.000đ và disabled nút `DAU_KEO`).
   - **Phương án đề xuất:** Cần một bản vá Backend (Hotfix RPC Migration 004.1 hoặc Migration 005) bổ sung guard check: nếu tạo lượt xe hoặc lượt cont mà xe là `DAU_KEO` nhưng chở cont thì ném ngoại lệ `SC_INVALID_TICKET_VEHICLE_TYPE`.
   - **Trạng thái:** `[CHỜ CHỐT / UAT CÒN MỞ — ĐÃ THỰC THI VALIDATION PHÍA CLIENT PWA]`.



