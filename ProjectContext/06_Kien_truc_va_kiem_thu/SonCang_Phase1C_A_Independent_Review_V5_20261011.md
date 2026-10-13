# SƠN CẢNG — RÀ SOÁT ĐỘC LẬP THIẾT KẾ DOMAIN SCHEMA PHASE 1C-A

**Ngày:** 11/10/2026  
**Dự án:** Phần mềm quản lý bến bãi/cảng cạn Sơn Cảng — Công ty Cổ phần Tà Lùng Quang Minh  
**Môi trường:** Supabase Cloud DEV `son-cang-yms-dev` (`euswzyespwaxyrjkfkrq`)  
**Trạng thái:** **CHƯA PHÊ DUYỆT MIGRATION 004; CHỈ RÀ SOÁT TÀI LIỆU.**

## 1. Cơ sở và giới hạn thẩm định

- Đã đọc bản báo cáo Phase 1C-A do người dùng chuyển từ Antigravity.
- Đối chiếu điểm phân quyền quan trọng với nội dung Workbook RBAC V5 được lưu trong Project: `PWA_Son_Cang_V5_Phan_quyen_RBAC_DONG_HOAN_THIEN.xlsx` (đặc biệt grants, workflow và AP07/AP12).
- Đây là đánh giá **nội dung báo cáo và dữ liệu nguồn được truy xuất**, chưa phải khẳng định đã mở hoặc nghiệm thu toàn bộ bản `DOMAIN_SCHEMA_DESIGN_V5.md` mới trong workspace Windows.
- Độ ưu tiên nguồn: quyết định đã chốt và Workbook V5 > UAT chưa chốt (không suy diễn) > phương án kỹ thuật do Antigravity đề xuất.
- Không thay đổi migrations 001–003 và không thực hiện tác vụ ghi lên Supabase Cloud DEV.

## 2. Các điểm thiết kế phù hợp — có thể giữ nguyên

1. `app_vehicle_visits` và `app_container_visits` có UUID và vòng đời độc lập; xe đưa container vào có thể khác xe kéo container ra.
2. Container nằm trên xe hoặc đã hạ đều tính thời gian lưu theo mốc vào/ra thực tế; miễn đêm đầu, khung 22:00–06:00, giá hiện hành 100.000 đồng/đêm.
3. Yêu cầu cắm điện dự kiến tách với từng phiên cắm/rút thực tế; đơn giá điện snapshot khi bắt đầu phiên; 15 phút làm tròn lên.
4. Phân nhiệm phải tuân thủ luồng V5: An ninh làm công việc cắm/rút thực địa, báo lại; CCKB nhập thời gian và quản lý tiền điện trên PWA.
5. Thu tiền điện thuộc CCKB; tại cổng, quyền `storage.payment.collect` được cấp theo Workbook V5 cho `SEC_STAFF` và `SEC_LEAD` trong phạm vi YARD. AP07 mô tả phí lưu phát sinh ngay cửa ra: An ninh thu; nếu không thu, CCKB xác nhận ngoại lệ nợ. Không được lẫn thu phí lưu và thu tiền điện.
6. Tách clearance tài chính CCKB với sự kiện vật lý rời cổng do An ninh; phí lưu chỉ FINAL theo thời điểm container ra thực tế.
7. Bảng giá có phiên bản, audit và phân nhiệm Four-Eyes; ledger giữ các bút toán thu thay vì sửa xóa tiền đã thu.

## 3. Các phát hiện cần sửa hoặc làm rõ trước khi chốt thiết kế

### SC-1C-A-01 — HIGH: Partial Unique “1 lượt xe tối đa 1 container” chưa có căn cứ đủ chặt

Hai index `uq_vehicle_inbound_single_container`, `uq_vehicle_outbound_single_container` không chỉ bảo đảm “một container ở trên xe tại một thời điểm”; chúng giới hạn **toàn bộ lượt xe** còn tối đa một quan hệ inbound và một quan hệ outbound, kể cả các lần vận chuyển khác nhau trong một lượt.

- Phải xác minh Sơn Cảng có tiếp nhận xe chở **2 container 20 feet** hoặc tình huống một lượt xe có nhiều thao tác nâng/hạ không.
- Nếu V1 chỉ cho phép một container mỗi chiều trong một lượt xe, mô tả rõ đây là **quy tắc nghiệp vụ đã được xác nhận**, không viện dẫn suy luận kỹ thuật.
- Nếu không chắc, tránh ràng buộc Unique không thể đảo ngược dễ dàng; cân nhắc bảng `app_vehicle_container_movements`/quan hệ chuyến xe–container để ghi nhiều lần xếp/dỡ và kiểm soát tính đồng thời.
- Không tự ý phá thiết kế UUID độc lập vốn đã đúng.

### SC-1C-A-02 — HIGH: Một bộ trường `field_operator_*` không đủ ghi nhận cả cắm và rút

Hai thao tác cắm và rút có thể do hai nhân viên An ninh khác nhau thực hiện, ở hai ca trực khác nhau; CCKB lại là người nhập liệu hệ thống.

Cần tách rõ:
- Người cắm thực tế, giờ cắm thực tế, người/bộ phận báo giờ, giờ nhận thông tin, người CCKB nhập và giờ ghi lên PWA.
- Người rút thực tế, giờ rút thực tế, người/bộ phận báo giờ, giờ nhận thông tin, người CCKB nhập và giờ ghi lên PWA.
- Nguồn thông tin (Zalo/điện thoại/biên bản), ghi chú và audit khi sửa thời gian.
- Có thể dùng bảng sự kiện `app_reefer_field_events` kiểu PLUG_IN/PLUG_OUT; hoặc cặp cột được đặt tên minh bạch, tránh một `field_operator_id` dùng cho cả phiên.
- Không buộc An ninh thao tác trên PWA ngay lúc cắm/rút nếu workflow V5 không yêu cầu.

### SC-1C-A-03 — HIGH: Không tự động miễn tiền phiên điện 0 giây

Antigravity đề xuất tự động bỏ charge khi `duration=0`. Đây là một **chính sách tiền** chứ không đơn thuần là xử lý dữ liệu.

- Không tạo tiền âm, hoàn tiền hoặc miễn giảm ngầm; AP11 (hoàn tiền/miễn giảm) là chính sách tương lai chưa kích hoạt theo V5.
- Ghi nhận `ZERO_DURATION_REVIEW` hoặc `CANCELLED_NO_PHYSICAL_CONNECTION` kèm lý do, bằng chứng, người ghi nhận/duyệt và audit tùy trường hợp.
- Chỉ xác nhận 0 đồng khi chứng minh **không có phiên sử dụng điện thực tế**, không phải người dùng tự chỉnh giờ cắm/rút trùng nhau.
- Chốt phương án RV02 với người dùng trước khi viết logic tính phí.

### SC-1C-A-04 — HIGH: Phân biệt biểu phí điện và giá lưu bãi khi thay đổi giá

- Quy tắc điện đã có cơ sở: snapshot giá tại thời điểm bắt đầu từng phiên cắm điện, không sửa tiền đã thu.
- Giá lưu bãi khi thay đổi giữa nhiều đêm vẫn cần quyết định riêng: giá theo **từng đêm phát sinh** hay giá tại **thời điểm container vào**.
- Nếu tính giá mỗi đêm, cần xác định thời điểm của đêm được dùng chọn bảng giá (ví dụ 22:00 địa phương) và kiểm thử ca thay đổi hiệu lực giữa đêm.
- Index `uq_active_tariff_plan` chỉ ngăn nhiều hàng ACTIVE cùng `plan_code`, **không đủ** chứng minh các `valid_from/valid_to` không trùng nhau và không xử lý đầy đủ bảng giá lên lịch tương lai.
- Luôn phân biệt số tiền chốt trong sổ thu với số tiền dự kiến khi container chưa ra.

### SC-1C-A-05 — HIGH: Quy trình thanh toán phát sinh tại cửa ra phải nhất quán

Workbook RBAC V5 có:
- `SEC_STAFF` / `SEC_LEAD`: `storage.payment.collect` phạm vi YARD.
- AP07: Khi phát sinh phí lưu tại cổng, An ninh thu; trường hợp không thu, CCKB xác nhận ngoại lệ nợ.
- Tiền điện do CCKB quản lý; không cấp nhầm quyền thu điện cho An ninh.

Thiết kế cần yêu cầu:
1. Tính phí lưu tạm tính tại mốc thực tế xuất bãi; kiểm tra lại ngay trước khi xác nhận cuối.
2. Nếu có số dư chưa xử lý, chỉ cho phép thu đúng quyền hoặc chờ ngoại lệ nợ hợp lệ; không tự đánh dấu `EXITED`.
3. Ghi khoản phải thu, thanh toán / ngoại lệ nợ, đối soát quyền và sự kiện ra bãi theo giao dịch nguyên tử, chống bấm đôi và race condition.
4. Lưu actor, bãi, khoản thu, lý do, thời gian, audit; idempotency key cho thao tác nhạy cảm.
5. Không hủy clearance cũ chỉ vì phát sinh bổ sung, nhưng phải xác nhận bổ sung mới trước khi xe/container ra; không coi clearance cũ là ủy quyền vô thời hạn.

### SC-1C-A-06 — MEDIUM: Các ràng buộc Unique chống trùng tiền cần xét theo nghiệp vụ

Phải thể hiện rõ UNIQUE theo `charge_type`, phiên dịch vụ hoặc nguồn phát sinh cùng quy ước xử lý hiệu chỉnh và giao dịch bổ sung. Nếu chỉ UNIQUE một cột `container_visit_id` sẽ sai với nhiều phiên điện hoặc nhiều lần phát sinh phí. Phân biệt `idempotency_key` và UNIQUE nghiệp vụ.

### SC-1C-A-07 — MEDIUM: Tránh kéo logic Phase 005–007 vào Migration 004

Migration 004 chỉ nên tạo các bảng xe/container và lịch sử sửa số, RLS/action cần cho chúng, không có FK tham chiếu tới các bảng `app_reefer_sessions`, `app_charges`, `app_exit_clearances` chưa tồn tại. Tách kiểm thử 004 độc lập và kiểm thử tích hợp sau.

## 4. Đánh giá 5 quyết định Antigravity trình

| Quyết định | Đề xuất rà soát độc lập | Trạng thái |
| --- | --- | --- |
| 1. Phiên điện 0 giây, RV02 | Ưu tiên **A có kiểm soát**: không charge chỉ khi xác nhận không sử dụng điện thực tế; không auto miễn chỉ vì hai timestamp bằng nhau | CHỜ CHỐT |
| 2. Phí lưu phát sinh sau clearance, RV06 | **A**, phù hợp AP07 và `storage.payment.collect` của An ninh; CCKB chỉ xử lý ngoại lệ nợ, không hủy clearance cũ vô ích | Có căn cứ V5; cần xác nhận vận hành |
| 3. Giá thay đổi, RV03/RV04 | **Tách thành 2 quyết định**: điện cố định theo giá lúc bắt đầu phiên; cách chọn giá từng đêm lưu vẫn mở | CHỜ CHỐT |
| 4. Thiết bị bốt chung, RV09/AP12 | **A**, tài khoản cá nhân; đăng xuất/đổi ca; nếu dùng kiosk chung cần giải pháp xác minh actor riêng | Khuyến nghị chốt |
| 5. Phạm vi migration 004 | Chỉ 3 bảng xe/container/lịch sử đổi số, **sau khi xác nhận số container có thể đi cùng một lượt xe** | CHỜ PHÊ DUYỆT |

## 5. Câu hỏi nghiệp vụ trọng yếu cho người phụ trách Sơn Cảng

**Một lượt xe có thể chở hai container 20 feet hoặc vận chuyển nhiều container trong cùng một lượt vào/ra bãi không?**

- Nếu **KHÔNG**, có thể giữ FK inbound/outbound và ràng buộc tối đa một container mỗi chiều với đặc tả V1 rõ ràng.
- Nếu **CÓ**, yêu cầu thiết kế quan hệ/nhật ký vận chuyển nhiều container trước khi Migration 004.
- Nếu **CHƯA RÕ**, không tạo hai partial unique indexes này cho đến khi được xác nhận.

## 6. Yêu cầu tiếp theo đối với Antigravity

1. Đọc file báo cáo độc lập này và đối chiếu lại các tài liệu gốc đã chốt.
2. Chỉnh `DOMAIN_SCHEMA_DESIGN_V5.md`, `PHASE1C_A_DESIGN_REVIEW_REPORT.md`, `OPEN_DECISIONS_UAT.md` để không biến giả định thành quyết định.
3. Tách người thao tác thực địa với người báo giờ và người nhập CCKB cho **hai sự kiện cắm/rút**.
4. Ghi nhận chính xác AP07/`storage.payment.collect`; tuyệt đối không chuyển quyền thu điện sang An ninh.
5. Bổ sung quyết định riêng về cách định giá đêm khi thay đổi bảng giá.
6. Chỉ rõ mọi lựa chọn cần chủ dự án xác nhận; không tự đánh dấu RESOLVED.
7. Báo cáo tác động kỹ thuật tới migration 004, có test cases đúng cho `2x20ft` nếu được phép.
8. DỪNG trước khi tạo/chạy migration 004 và trước khi ghi lên Supabase Cloud DEV.

## 7. Tiêu chí phê duyệt Migration 004

Chỉ đủ điều kiện trình duyệt khi:
- Sơ đồ quan hệ xe–container phù hợp trường hợp 1 hay nhiều container/lượt xe.
- Vai trò được gán theo chính xác action/scope trong V5.
- Có data constraints, RLS, audit, kiểm thử đóng/mở lượt độc lập, sửa số container, nhiều người thao tác đồng thời.
- Kế hoạch migration chạy riêng trên DEV, không sửa migrations 001–003 và có bước kiểm tra trước `db push`.
- Không suy diễn sang chính sách tính tiền mới.

**Kết luận:** Rà soát thiết kế đã có tiến triển; chưa nên nghiệm thu đầy đủ Phase 1C-A hoặc phê duyệt Migration 004 trước khi đóng các điểm trên. 
