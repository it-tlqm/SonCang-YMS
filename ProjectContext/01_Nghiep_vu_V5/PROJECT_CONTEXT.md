# PROJECT_CONTEXT — WEBSITE + PWA QUẢN LÝ BÃI SƠN CẢNG

> **Phiên bản thiết kế:** V5 — 11/10/2026. **Mục đích:** tài liệu đầu vào cho Stitch/Antigravity để thiết kế và lập trình; **chưa phải mã nguồn đã chạy, chưa nghiệm thu UAT**.
> **Ưu tiên nguồn:** (1) quyết định trực tiếp mới nhất của người dùng; (2) workbook V5 và nội dung V4.1 chấp nhận; (3) 117 câu hỏi V3 đã trả lời; (4) đặc tả V4; (5) đề xuất kỹ thuật có gắn nhãn. Không tự suy ra quyết định còn mở.
> **Thuật ngữ:** gọi là “Phần mềm quản lý bến bãi/cảng cạn”, không dùng “BOS”. Bến bãi Sơn Cảng thuộc hệ thống logistics Tà Lùng Quang Minh. Công cụ chỉ mới là thiết kế, thay thế AppSheet sau dữ liệu chuyển đổi + pilot/UAT.

## 1. Phạm vi V1 và kiến trúc sản phẩm

V1 là Website + Progressive Web App (mobile-friendly) hỗ trợ quy trình xe vào/ra, quản lý container độc lập, vé vào, phí lưu cont, yêu cầu điện dự kiến, cắm/rút điện, thu tiền/công nợ, duyệt cho container ra, HÀNG/RỖNG, quản trị bảng giá và role-permission, báo cáo, nhật ký, đính kèm ảnh và chuyển dữ liệu lịch sử từ AppSheet. Phân quyền theo 3 bộ phận + Quản trị.

**Hạ tầng định hướng:** Next.js (TypeScript), PostgreSQL/Supabase (Auth/DB/Storage/RLS), Vercel cho website/PWA, tên miền phụ của công ty hoặc miền Vercel trong môi trường thử nghiệm. Tách môi trường staging và production. Mức miễn phí của nhà cung cấp không được mặc định là đủ cho vận hành dài hạn. Lưu ý PWA không được tự báo đã xuất bãi nếu offline.

**Không ép triển khai V1:** phát hành hóa đơn điện tử; sơ đồ khu/dãy/ô container; in vé/QR tự động; Zalo API hai chiều; quản lý miễn/giảm/hoàn tiền đầy đủ; giao ca tự động; role Kế toán hoạt động. Chuẩn bị dữ liệu và cờ tính năng, để kích hoạt giai đoạn sau.

**Thiết kế trực quan:** ưu tiên nền sáng; màu thương hiệu xanh lá #0A9444, xanh đậm #223873; giao diện máy tính và điện thoại. An ninh thao tác ít chạm, số container hiển thị lớn, xác minh lại trước khi ghi xuất/thu.

## 2. Quyết định nghiệp vụ không được hiểu sai

1. **Xe và container là hai lượt nghiệp vụ độc lập.** Xe đến có thể trả container và ra rỗng, hoặc đầu kéo rỗng vào nhận một container khác; một lượt xe V1 tối đa 1 container. Dùng `vehicle_visit_id` và `container_visit_id` tách rời, liên kết lượt xe mang container vào và lượt xe kéo ra. Không tự giả định cứ có số cont lúc vào là cont đã hạ; hạ hay không hạ **không quyết định phí lưu**.
2. **Phí lưu container chỉ chốt khi container thực tế ra bãi.** Lấy `GIO_CONT_VAO` và `GIO_CONT_RA` của cùng lượt container; đêm 22:00–06:00, miễn đêm đầu; 100.000 VNĐ/container/đêm hiện hành. Hiển thị SO_DEM_LUU tối thiểu 1 miễn phí với lượt chưa qua mốc, có thể lưu riêng `night_period_count` để kiểm toán. **CẤM khóa/bảo lưu tiền lưu chỉ vì CCKB đã duyệt hoặc khách rút điện trước 22h**; cách hiểu cũ của câu L04 đã bị đính chính. An ninh nhập giờ cont ra, thu phí lưu; nếu chưa thu phải để công nợ và xử lý ngoại lệ, không giả đã thu.
3. **Tiền điện chốt về thời lượng khi rút điện.** An ninh cắm/rút ngoài hiện trường, báo giờ qua Zalo/nhóm, có thể chụp ảnh/quay video có timestamp; CCKB ghi/sửa `GIO_CAM_THUC_TE` và `GIO_RUT_THUC_TE` (cho phép nhập bù/hồi tố). Mỗi phiên tính riêng, `billable_minutes = ceil(actual_seconds / (15*60))*15`, nếu thời lượng hợp lệ >0; giá hiện hành 100.000 VNĐ/giờ cho “Theo giờ” và “Cắm liên tục”, mã giá riêng. **Làm tròn 15 phút do backend tính mặc định**, CCKB có thể sửa giờ/thời lượng có lý do và nhật ký. Điện đã thu thì điều chỉnh chênh lệch qua đề nghị + TBP CCKB phê duyệt, giữ giao dịch thu ban đầu; đơn giá phiên lấy theo chính sách giá hiệu lực và lưu snapshot đã áp dụng.
4. **Tiền điện có thể thu lúc rút hoặc gộp khi container xuất bãi**. Phí điện và phí lưu không được gộp thành một phép tính thời gian. Có sổ thu, phân bổ khoản tiền cho các charge để không thu trùng.
5. **Yêu cầu điện dự kiến** được CCKB tiếp nhận trước khi xe/cont tới, mỗi container một phiếu, có thể nhiều phiên. Phiếu dự kiến KHÔNG tự tạo lượt container thực, không tính điện/lưu trước khi container vào/cắm. Khi An ninh nhập cont, hiển thị cảnh báo phiếu dự kiến, tìm đủ mã/7 số cuối/chuỗi gần giống và **bắt buộc xác nhận ghép thủ công**. Thông tin phiếu có thể sửa/hủy có audit; một số mã trùng thì cảnh báo và cho người dùng xác minh lượt.
6. **Số container có thể sai** do khách, CCKB hoặc hiện trường; An ninh được phép sửa số trên đúng lượt container, lưu số cũ/mới/ảnh video nếu có (không có thì ghi lý do), người sửa và thời điểm; thông báo nội bộ cho CCKB đối soát. Dù đã thu tiền hoặc đã được duyệt ra, thay số không được thay ID, mất phiên điện hoặc sửa/xóa tiền đã thu. Không tự gộp cont trùng.
7. **An ninh thu vé vào bãi và phí lưu cont khi cont ra**; CCKB quản lý/thực thu phí điện và xác nhận điều kiện tài chính cho cont xuất. Bộ phận Điều phối cập nhật HÀNG/RỖNG, được tạm để trống; không chặn lưu cont vì chưa xác định. Nhân viên và TBP của mỗi bộ phận có quyền khác nhau. CCKB có thể **xác nhận xuất khi còn nợ** có cảnh báo/lý do, nhưng không được coi khoản đó đã thanh toán. An ninh là người xác nhận thực tế đã ra và hệ thống phải tính lại phí lưu tại giờ cont ra.
8. **Đầu kéo không container** giá vé 0đ; khi đầu kéo vào 0đ và ra kéo cont đang lưu thì không tự cộng vé vào 250.000đ. Xe bo 3 bánh không yêu cầu biển số, nhưng bắt buộc có ID lượt/phiếu duy nhất. Loại xe có kéo container bắt buộc nhập số cont; xe bo không kéo cont ẩn trường này. Phạt mất liên vé giấy 250.000đ riêng.
9. **Nhà cân, hóa đơn**: Chức năng thu tiền theo quyết định cập nhật là An ninh/CCKB (không tự tạo role Nhà cân V1). Chỉ lưu cờ cần hóa đơn và các thông tin người mua để Kế toán triển khai sau; chưa phát hành hóa đơn trong V1.

## 3. Bảng giá hiện hành và quy tắc tính

| Mã nội bộ | Mô tả | Giá (VNĐ) | Đơn vị |
|---|---|---:|---|
| CONT_LANH | Xe container (mã cũ “Xe container lạnh”; giữ mã, có thể đổi nhãn hiển thị) | 250.000 | Lượt |
| DAU_KEO | Đầu kéo không container | 0 | Lượt |
| XE_BO_4_CHAN | Xe bo 4 chân | 200.000 | Lượt |
| XE_BO_3_CHAN | Xe bo 3 chân | 200.000 | Lượt |
| XE_BO_8_TAN_2_CHAN | Xe bo 8 tấn/2 chân | 100.000 | Lượt |
| XE_BO_3_BANH | Xe bo 3 bánh | 40.000 | Lượt |
| XE_SANG_TAI | Xe sang tải (tạp) | 0 | Lượt |
| LUU_CONTAINER | Phí lưu cont; miễn đêm đầu | 100.000 | Đêm |
| DIEN_CONT_GIO | Điện theo giờ | 100.000 | Giờ |
| DIEN_CONT_LIEN_TUC | Điện cắm liên tục | 100.000 | Giờ |
| PHAT_MAT_VE | Phạt mất liên vé giấy | 250.000 | Lần |

**Không hardcode giá:** `tariff_versions(code,amount,unit,effective_from,effective_to,status,created_by)` và bảng `billing_rules` lưu mốc đêm, số đêm miễn, cách làm tròn. Các charge đã chốt lưu đơn giá thực dùng + mã version, không tính lại lịch sử chỉ vì giá hiện tại thay đổi. Các tình huống giá thay đổi khi phiên chưa kết thúc là vấn đề UAT riêng, không suy diễn bừa.

## 4. Quy trình V1 (luồng thực tế)

- **Cổng vào:** An ninh nhập xe/loại xe/biển số theo điều kiện; thu vé. Nếu mang cont tạo lượt container hoặc ghép phù hợp; ghi `GIO_CONT_VAO`. Nếu có phiếu cắm dự kiến, hiện cảnh báo; tìm số đầy đủ, 7 số cuối/gợi ý gần giống và xác nhận chính xác.
- **Trong bãi:** Điều phối chọn HÀNG/RỖNG. CCKB nhận yêu cầu điện theo giờ hoặc liên tục, có thể đến trước khi cont vào. An ninh đi cắm/rút theo trao đổi hiện trường; CCKB nhập thời gian thực tế, có thể bù/sửa; hệ thống tính điện từng phiên; thu ngay hoặc để phải thu khi ra.
- **CCKB kiểm soát xuất:** xem toàn bộ phiên điện, khoản chưa thu, có thể ghi nhận đủ điều kiện hoặc ngoại lệ còn nợ với lý do. Đây là sự cho phép về tài chính, KHÔNG ghi `GIO_CONT_RA`, KHÔNG tính/khóa tiền lưu.
- **Cổng ra:** An ninh xác minh đúng xe/cont, cont đã rút điện thực tế, ghi giờ cont/xe ra. Backend tính số đêm/tiền lưu tại thời điểm ra; An ninh thu phí hoặc phối hợp CCKB xác nhận ngoại lệ nợ mới phát sinh, rồi chốt lượt ra. Đảm bảo dữ liệu xe-cont-charge-payment đồng bộ trong server transaction; đối soát chống bấm hai lần.
- **Xe rời đi không mang cont:** xác nhận xe ra riêng; cont còn bãi vẫn tiếp tục tính lưu. **Xe khác đến kéo cont ra:** link lượt xe ra vào đúng lượt container theo ID, không tìm bằng string rồi tự chọn nhầm.
- **Điện app “Đang cắm” nhưng đã rút ngoài hiện trường:** AN phải xác minh thực tế đã rút, CCKB cập nhật giờ rút hoặc ghi ngoại lệ có lý do; không cho cont thực tế đang kết nối điện rời bãi. Không tự giả giờ rút hoặc tự đổi tiền điện sang đã thu.

## 5. Phân quyền: KHÔNG CODE CỨNG ROLE

- **7 role hoạt động:** `SEC_STAFF`, `SEC_LEAD`, `PORT_STAFF`, `PORT_LEAD`, `DIS_STAFF`, `DIS_LEAD`, `SYS_ADMIN`. `ACCOUNTING_FUTURE` khai báo nhưng tắt.
- **RBAC theo action code**, ví dụ `reefer.session.actual_end.record`, `storage.payment.collect`, `container.number.correct`, `exit.clearance.debt_exception`, `exit.actual.confirm`. Không kiểm tra kiểu `role === 'An ninh'` cho từng API. Chức năng/chính sách được khai báo trong `permissions` một lần và cấp cho từng role qua `role_permissions`.
- **Scope dữ liệu** là `SELF`, `DEPARTMENT`, `YARD`, `ALL`; mỗi user có thể giữ hơn 1 role theo bãi/bộ phận với thời hạn hiệu lực. Quyền là hợp (union) các role còn hiệu lực; cùng người không được tự đề nghị và tự duyệt chênh tiền.
- **Nguồn cấu hình trong CSDL:** `departments`, `yards`, `app_roles`, `app_permissions`, `role_permissions`, `user_role_assignments`, `approval_policies`, `feature_flags`, `app_settings`, `audit_events`. Seed 67 quyền và 206 cấp quyền trong Excel V5. Việc đổi người/phòng/role/scope/quyền/phí/cờ tính năng không đòi sửa code **với các chức năng đã có**; thêm action/chức năng hoàn toàn mới vẫn đòi lập trình và test.
- **Quyền được kiểm tra tại backend và RLS**, không chỉ ẩn nút trên frontend. Không tin role do client tự gửi. Có màn Quản trị → Người dùng, Vai trò, Ma trận quyền, Phạm vi dữ liệu, Chính sách phê duyệt, Bảng giá, Nhật ký.
- **Nhân viên An ninh** thu vé, tạo/ra xe-cont, chỉnh mã cont có thông báo. **TBP An ninh** xem đối soát bộ phận và duyệt sửa giờ xe sau phát sinh tiền. **Nhân viên CCKB** tạo điện dự kiến, nhập/sửa giờ điện trước thu, yêu cầu chỉnh tiền sau thu, thu điện và cho ra ngoại lệ có lý do. **TBP CCKB** duyệt chỉnh điện/tiền đã thu, thu hồi clearance trước khi ra, báo cáo theo bộ phận. **Điều phối** cập nhật HÀNG/RỖNG; sửa sau ra cần TBP Điều phối duyệt. **Quản trị** cấu hình; quyền tác nghiệp nhạy cảm thay mặt phải ghi rõ và audit.
- Không gộp thao tác **An ninh thực cắm/rút ở hiện trường** với quyền **CCKB nhập thời gian lên PWA**. PWA chỉ ghi nhận thông tin và bằng chứng; không ép An ninh nhập giờ trực tiếp.
- Để hạn chế quyền quá rộng, **không cấp chế độ admin wildcard "*"**, không cho admin tự mở quyền bootstrap tối cao qua màn hình thường. Truy cập bốt An ninh dùng chung thiết bị cần xác định user thực tế bằng đăng nhập cá nhân hoặc quy trình xác minh người trực ca đủ để ràng buộc người thu/người cho xe ra.

### 5.1. Cách sinh menu, nút và bảo vệ nghiệp vụ

- Menu Hiển thị: `permission.read`/`feature_flag` và phạm vi bãi được cấp; danh sách quyền effective permissions được backend trả về theo đăng nhập.
- Mỗi request mutation: xác định actor từ session `auth.uid()`, mã quyền thao tác, bãi và bộ phận lấy từ bản ghi trên server, và các tiền điều kiện trạng thái.
- Quyền phê duyệt không chỉ là nút có quyền `approve`: phải có `approval_request`, người đề nghị ≠ người duyệt, lý do, snapshot dữ liệu trước/sau và nhật ký không thể sửa.
- Truy vấn danh sách luôn lọc theo sở hữu/bộ phận/bãi; tài khoản Điều phối không tự động thấy thu tiền của An ninh/CCKB. Phân quyền chặn cả API, thao tác hàng loạt, export.
- Khi thu tiền hoặc xác nhận cont ra: backend phải kiểm soát idempotency, khóa đồng thời, cập nhật nguyên tử và tính lại khoản phải thu; không tin số tiền gửi từ client.

## 6. CSDL nghiệp vụ đề xuất (sơ đồ quan hệ)

- `vehicle_visits`: ID, yard_id, license_plate nullable, vehicle_type, entry/exit timestamps, actor, ticket series, recorded cash collection.
- `container_visits`: ID, yard_id, container_no_current, original_no, linked inbound/outbound vehicle_visit IDs, GIO_CONT_VAO/RA, cargo_status nullable, flags for legacy.
- `reefer_requests`: ID, yard_id, customer, planned_no, mode, request_status, matched container_visit_id nullable; one request/cont; many sessions.
- `reefer_sessions`: request_id, container_visit_id, actual_start/end timestamp, entered_at/entered_by, actual_seconds, rounded minutes, billed minutes override nullable, tariff_version_id, charge_id.
- `container_number_changes`: visit_id, old_no, new_no, reason, evidence, actor, time, status notified/acknowledged CCKB.
- `tariff_versions`, `billing_rules`, `charges`, `payments`, `payment_allocations`, `financial_adjustments`, `payment_evidence`.
- `exit_clearances`: container_visit_id, checked_by, checked_at, status, outstanding snapshot, reason, invalidation/version; **không khóa tiền lưu**.
- `exit_events`: actor/security, entered_vs_effective_exit time, charge snapshot, payment status, invoice info reference if requested.
- `approval_requests`, `audit_events`, `alerts`, `files`, `legacy_imports`.
- `app_roles`, `app_permissions`, `role_permissions`, `user_role_assignments`, `approval_policies`, `feature_flags`, `app_settings`, `yards`, `departments`.

**Sổ thu:** `charges` được tạo theo lượt (vé/điện phiên/lưu cont/phạt), `payments` ghi tiền thực nhận, `payment_allocations` phân bổ đồng tiền cho charge(s), chỉ số dư còn phải thu mới được chuyển sang công nợ; không sửa tiền đã thu thành 0 khi điều chỉnh. Các dòng dữ liệu cũ chưa xác minh không được nhập như khoản phải thu mới.

## 7. Ràng buộc an toàn dữ liệu và tiền

1. Dùng `uuid` nội bộ cho từng visit/request/session/payment. Mã container chỉ là thuộc tính có lịch sử, không phải primary key; sửa mã giữ nguyên FK và audit.
2. Không cho hai phiên điện cùng container ở trạng thái **thực sự đang cắm** cùng thời điểm. Yêu cầu điện dự kiến chưa vào không tạo phiên đang cắm. Sửa hồi tố cần phát hiện trùng thời gian và giải trình.
3. `GIO_RUT_THUC_TE > GIO_CAM_THUC_TE` đối với phiên tính phí dương; 0 giây là dữ liệu cần xử lý, không âm thầm tính 15 phút; vấn đề chính sách giây lẻ cần kiểm thử.
4. Phép tính đêm phải kiểm thử đúng mốc 22:00 và 06:00 theo timezone Asia/Ho_Chi_Minh, không cộng dư một kỳ khi container vào đúng 06:00.
5. Trạng thái `Chưa thu/Đã thu` do sổ thu và phân bổ sinh ra; không cho UI tự đánh dấu đã thu mà không có payment, không tự gán miễn/giảm.
6. Cho cont ra khi còn nợ: CCKB có quyền làm thủ công với lý do; nếu lúc An ninh tính phí lưu thực tế mới phát sinh nghĩa vụ thì phải kiểm tra lại/ký nhận ngoại lệ cho khoản đó, không dùng duyệt cũ như cam kết tiền lưu đã chốt.
7. Đóng cont ra, gán xe ra, chốt charge lưu, ghi nhận payment, trạng thái xuất phải là một giao dịch nguyên tử; xử lý retry và bấm trùng không phát sinh hai lần tiền/phiếu.
8. Không có tín hiệu server thành công → không hiển thị “Đã ra bãi” nếu offline. Chỉ để dự thảo/đợi mạng và có quy trình giấy xử lý hiện trường.
9. Bảo quản ảnh chứng cứ bằng storage policy theo user/bãi/phạm vi, ghi URL riêng, tránh dùng bucket public chứa chứng từ; hạn chế dữ liệu cá nhân ở report.
10. Ghi `actor_user_id`, `actor_department`, `performed_at`, `actual_occurred_at` tách biệt; lịch sử sửa là append-only. Kiosk dùng chung thiết bị phải quy trách nhiệm đúng người.

## 8. Giao diện đề xuất (Next.js + PWA)

| Nhóm người dùng | Trang | Chức năng |
|---|---|---|
| An ninh | Cổng vào | Lượt xe vào, giá vé, xe 3 bánh không biển, container vào, báo điện dự kiến, thu vé, tìm cont 7 số cuối. |
| An ninh | Trong bãi / Cổng ra | Xe/cont đang ở; ghi cont ra, thu phí lưu; mất vé; sửa mã cont; cảnh báo tiền điện/CCKB. |
| CCKB | Điện dự kiến | Một phiếu/cont chưa vào, quản lý A/B/C, ghép/hủy/sửa khi khách báo lại. |
| CCKB | Cắm điện / Rút điện | Nhập giờ thực, điện 15 phút, sửa thời lượng trước thu, yêu cầu chỉnh sau thu, ghi người nhập. |
| CCKB | Thu điện / Điều kiện xuất | Thanh toán ngay/tổng hợp; còn nợ; xác nhận tài chính; ngoại lệ có lý do. |
| Điều phối | Container HÀNG/RỖNG | Thay đổi tình trạng hoặc để trống, sau xuất cần đề nghị/duyệt. |
| TBP | Điều hành bộ phận | Duyệt ngoại lệ theo vai trò; xem nhật ký, doanh thu thuộc bộ phận. |
| Quản trị | Cấu hình & Quản lý người dùng | Role matrix, gán role, scope, quyền, danh mục giá, tham số, nhật ký. |

## 9. Lộ trình triển khai và tiêu chí giao

- **Giai đoạn thiết kế:** dựng sitemap, mockup Stitch, RBAC catalogue/flows; review bằng các tình huống cổng và cắm điện thực tế; UX tối giản, ưu tiên sửa mã cont có ảnh/chú thích.
- **Giai đoạn CSDL/Backend:** migrations, RLS, roles/permissions/assignments, tests, tariff versions, charge/payment ledger, audit, upload attachments, transactions server, import legacy có báo cáo ngoại lệ.
- **Giai đoạn nghiệp vụ V1:** cổng vào/ra, container & electric requests/sessions, thu tiền, CCKB clearance, Điều phối HÀNG/RỖNG, admin role/billing config.
- **Giai đoạn UAT:** 44 tình huống trong tab V4 cộng kiểm thử bảo mật RBAC và đồng thời. Ưu tiên xe ra không cont, cont khác xe vào, phí lưu mốc đêm, điện 4h53, 2 phiên điện, điện dự kiến trước cont vào, sửa sai số cont sau thu, ra còn nợ, 2 người thao tác cùng cont, offline, mã cont trùng, nhập lịch sử.
- **Chuyển đổi:** từ `VEHICLE`, `CONTAINER`, `PRICE_LIST`, `USERS` (AppSheet/Sheets); import toàn bộ lịch sử có legacy_id để truy vết; rà những bản ghi thiếu giờ ra và tiền thu ghi chú không khớp trước khi đưa vào tính tiền thật; song song vận hành/backup giấy cho đến khi nghiệm thu pilot.

## 10. Thông số còn cần UAT/chính sách kỹ thuật (không tự bịa)

| Mã | Nội dung | Xử lý tạm trong thiết kế |
|---|---|---|
| RV01–02 | Có giây lẻ và phiên 0 phút | Ghi timestamp thật; hiển thị phút; 0 không tự tính tiền; test giây lẻ. |
| RV03–04 | Giá thay đổi giữa phiên điện/giữa đêm | Có price snapshot và chính sách cấu hình per service; chỉ áp dụng sau khi duyệt UAT. |
| RV05 | Trạng thái điện app còn “Đang cắm” khi hiện trường đã rút | Yêu cầu xác minh thực tế đã rút và CCKB ghi ngoại lệ/giờ thực. |
| RV06 | Phí lưu phát sinh khi An ninh chốt giờ ra nhưng chưa thu | CCKB xác nhận nợ mới phát sinh hoặc An ninh thu; server không che khoản phải thu. |
| RV07–08 | Xe cont thường và Kế toán | Giữ mã giá CONT_LANH, cho đổi nhãn UI; Kế toán tắt V1. |
| RV09 | Bốt An ninh / nhận diện cá nhân | Hạn chế shared account; cần định danh nhân viên thu và xác nhận ra. |
| RV10 | Legacy thiếu dữ liệu giờ ra/tiền không khớp | Vào vùng legacy_unverified, không tự sinh nợ V1. |
| RV11–12 | Chứng từ/Zalo/ca thu khác ca làm việc | Nhập thông tin thủ công và log; tách ca làm việc với mốc chốt báo cáo. |

## 11. Các tệp phụ trợ cần đọc

- `PWA_Son_Cang_V5_Phan_quyen_RBAC_DONG_HOAN_THIEN.xlsx` — giữ nguyên 117 câu trả lời V1; danh mục role, 67 permission_code, 206 quyền khởi tạo và điều kiện theo nghiệp vụ. **Tab 19–28** là phần V5 dùng cho triển khai; tab 04 và 17 lưu lịch sử đối chiếu.
- `HUONG_DAN_TRIEN_KHAI_RBAC_PWA_SON_CANG.md` — mô hình kiểm soát quyền phía server, hướng giao diện Quản trị, luồng phê duyệt và nguyên tắc import.
- `PWA_Son_Cang_V4_Dac_ta_nghiep_vu_BAN_RA_SOAT_20261011.md` — bản quy trình nền, chỉ dùng làm lịch sử và phải ưu tiên sửa đổi V5 ở các điểm có khác biệt.

**Quy tắc chung cho AI lập trình:** không tự coi các tham số còn UAT là đã được duyệt; không hardcode role names trong component/backend; không giả số giờ hoặc “Đã thu”, không khóa phí lưu theo giờ rút điện; không tự gộp cont chỉ từ mã gần giống; mọi thao tác nhạy cảm có actor và audit.


## 12. Danh mục quyền chuẩn hóa (seed để đội phát triển tham chiếu)

| Action permission code | Nhóm | Cấp role mặc định / phạm vi |
|---|---|---|
| `vehicle.visit.read` | Cổng xe | SEC_STAFF:YARD, SEC_LEAD:YARD, PORT_STAFF:YARD, PORT_LEAD:YARD, DIS_STAFF:YARD, DIS_LEAD:YARD, SYS_ADMIN:ALL |
| `vehicle.visit.create` | Cổng xe | SEC_STAFF:YARD, SEC_LEAD:YARD, SYS_ADMIN:ALL |
| `vehicle.visit.update_basic` | Cổng xe | SEC_STAFF:YARD, SEC_LEAD:YARD, SYS_ADMIN:ALL |
| `vehicle.visit.time_correction.request` | Cổng xe | SEC_STAFF:YARD, SEC_LEAD:YARD, SYS_ADMIN:ALL |
| `vehicle.visit.time_correction.approve` | Cổng xe | SEC_LEAD:DEPARTMENT, SYS_ADMIN:ALL |
| `ticket.payment.collect` | Vé vào | SEC_STAFF:YARD, SEC_LEAD:YARD, SYS_ADMIN:ALL |
| `ticket.lost_fee.collect` | Vé vào | SEC_STAFF:YARD, SEC_LEAD:YARD, SYS_ADMIN:ALL |
| `ticket.paper_number.adjust` | Vé vào | Chưa cấp / chưa bật V1 |
| `vehicle.visit.exit_confirm` | Cổng ra | SEC_STAFF:YARD, SEC_LEAD:YARD, SYS_ADMIN:ALL |
| `container.visit.read` | Container | SEC_STAFF:YARD, SEC_LEAD:YARD, PORT_STAFF:YARD, PORT_LEAD:YARD, DIS_STAFF:YARD, DIS_LEAD:YARD, SYS_ADMIN:ALL |
| `container.visit.create` | Container | SEC_STAFF:YARD, SEC_LEAD:YARD, SYS_ADMIN:ALL |
| `container.number.correct` | Container | SEC_STAFF:YARD, SEC_LEAD:YARD, SYS_ADMIN:ALL |
| `container.number.discrepancy.view` | Container | SEC_STAFF:YARD, SEC_LEAD:YARD, PORT_STAFF:YARD, PORT_LEAD:YARD, SYS_ADMIN:ALL |
| `container.number.discrepancy.sec_ack` | Container | SEC_STAFF:YARD, SEC_LEAD:YARD, SYS_ADMIN:ALL |
| `container.number.discrepancy.port_reconcile` | Container | PORT_STAFF:YARD, PORT_LEAD:YARD, SYS_ADMIN:ALL |
| `container.number.evidence.attach` | Chứng từ | SEC_STAFF:YARD, SEC_LEAD:YARD, PORT_STAFF:YARD, PORT_LEAD:YARD, SYS_ADMIN:ALL |
| `container.visit.link_request` | Container | SEC_STAFF:YARD, SEC_LEAD:YARD, PORT_STAFF:YARD, PORT_LEAD:YARD, SYS_ADMIN:ALL |
| `container.cargo.read` | Điều phối | SEC_STAFF:YARD, SEC_LEAD:YARD, PORT_STAFF:YARD, PORT_LEAD:YARD, DIS_STAFF:YARD, DIS_LEAD:YARD, SYS_ADMIN:ALL |
| `container.cargo.update` | Điều phối | DIS_STAFF:YARD, DIS_LEAD:YARD, SYS_ADMIN:ALL |
| `container.cargo.post_exit.request` | Điều phối | DIS_STAFF:YARD, DIS_LEAD:YARD, SYS_ADMIN:ALL |
| `container.cargo.post_exit.approve` | Điều phối | DIS_LEAD:DEPARTMENT, SYS_ADMIN:ALL |
| `container.handling.record` | Container | Chưa cấp / chưa bật V1 |
| `reefer.request.read` | Điện dự kiến | SEC_STAFF:YARD, SEC_LEAD:YARD, PORT_STAFF:YARD, PORT_LEAD:YARD, DIS_STAFF:YARD, DIS_LEAD:YARD, SYS_ADMIN:ALL |
| `reefer.request.create` | Điện dự kiến | PORT_STAFF:YARD, PORT_LEAD:YARD, SYS_ADMIN:ALL |
| `reefer.request.update` | Điện dự kiến | PORT_STAFF:YARD, PORT_LEAD:YARD, SYS_ADMIN:ALL |
| `reefer.request.cancel` | Điện dự kiến | PORT_STAFF:YARD, PORT_LEAD:YARD, SYS_ADMIN:ALL |
| `reefer.request.alert.view` | Điện dự kiến | SEC_STAFF:YARD, SEC_LEAD:YARD, PORT_STAFF:YARD, PORT_LEAD:YARD, SYS_ADMIN:ALL |
| `reefer.request.match_confirm` | Điện dự kiến | SEC_STAFF:YARD, SEC_LEAD:YARD, PORT_STAFF:YARD, PORT_LEAD:YARD, SYS_ADMIN:ALL |
| `reefer.field_work.note` | Cắm điện | SEC_STAFF:YARD, SEC_LEAD:YARD, PORT_STAFF:YARD, PORT_LEAD:YARD, SYS_ADMIN:ALL |
| `reefer.session.read` | Cắm điện | SEC_STAFF:YARD, SEC_LEAD:YARD, PORT_STAFF:YARD, PORT_LEAD:YARD, DIS_STAFF:YARD, DIS_LEAD:YARD, SYS_ADMIN:ALL |
| `reefer.session.actual_start.record` | Cắm điện | PORT_STAFF:YARD, PORT_LEAD:YARD, SYS_ADMIN:ALL |
| `reefer.session.actual_end.record` | Cắm điện | PORT_STAFF:YARD, PORT_LEAD:YARD, SYS_ADMIN:ALL |
| `reefer.session.time.edit_unpaid` | Cắm điện | PORT_STAFF:YARD, PORT_LEAD:YARD, SYS_ADMIN:ALL |
| `reefer.session.billable.override_unpaid` | Cắm điện | PORT_STAFF:YARD, PORT_LEAD:YARD, SYS_ADMIN:ALL |
| `reefer.session.amendment.request` | Cắm điện | PORT_STAFF:YARD, PORT_LEAD:YARD, SYS_ADMIN:ALL |
| `reefer.session.amendment.approve` | Cắm điện | PORT_LEAD:DEPARTMENT, SYS_ADMIN:ALL |
| `reefer.payment.collect` | Thanh toán | PORT_STAFF:YARD, PORT_LEAD:YARD, SYS_ADMIN:ALL |
| `reefer.payment.partial_collect` | Thanh toán | PORT_STAFF:YARD, PORT_LEAD:YARD, SYS_ADMIN:ALL |
| `storage.payment.collect` | Thanh toán | SEC_STAFF:YARD, SEC_LEAD:YARD, SYS_ADMIN:ALL |
| `payment.bank_evidence.attach` | Thanh toán | SEC_STAFF:YARD, SEC_LEAD:YARD, PORT_STAFF:YARD, PORT_LEAD:YARD, SYS_ADMIN:ALL |
| `payment.bank.reconcile` | Thanh toán | SEC_LEAD:DEPARTMENT, PORT_LEAD:DEPARTMENT, SYS_ADMIN:ALL |
| `payment.post_correction.request` | Thanh toán | PORT_STAFF:YARD, PORT_LEAD:YARD, SEC_LEAD:YARD, SYS_ADMIN:ALL |
| `payment.post_correction.approve` | Thanh toán | PORT_LEAD:DEPARTMENT, SYS_ADMIN:ALL |
| `charge.adjust.request` | Thanh toán | Chưa cấp / chưa bật V1 |
| `charge.adjust.approve` | Thanh toán | Chưa cấp / chưa bật V1 |
| `payment.refund.request` | Thanh toán | Chưa cấp / chưa bật V1 |
| `payment.refund.approve` | Thanh toán | Chưa cấp / chưa bật V1 |
| `exit.clearance.read` | Cổng ra | SEC_STAFF:YARD, SEC_LEAD:YARD, PORT_STAFF:YARD, PORT_LEAD:YARD, DIS_STAFF:YARD, DIS_LEAD:YARD, SYS_ADMIN:ALL |
| `exit.clearance.issue` | Cổng ra | PORT_STAFF:YARD, PORT_LEAD:YARD, SYS_ADMIN:ALL |
| `exit.clearance.debt_exception` | Cổng ra | PORT_STAFF:YARD, PORT_LEAD:YARD, SYS_ADMIN:ALL |
| `exit.clearance.revoke.request` | Cổng ra | PORT_STAFF:YARD, PORT_LEAD:YARD, SYS_ADMIN:ALL |
| `exit.clearance.revoke.approve` | Cổng ra | PORT_LEAD:DEPARTMENT, SYS_ADMIN:ALL |
| `exit.actual.confirm` | Cổng ra | SEC_STAFF:YARD, SEC_LEAD:YARD, SYS_ADMIN:ALL |
| `exit.reefer_state.exception` | Cổng ra | PORT_STAFF:YARD, PORT_LEAD:YARD, SYS_ADMIN:ALL |
| `report.revenue.read` | Báo cáo | SEC_STAFF:SELF, SEC_LEAD:DEPARTMENT, PORT_STAFF:SELF, PORT_LEAD:DEPARTMENT, SYS_ADMIN:ALL |
| `report.revenue.export` | Báo cáo | SEC_LEAD:DEPARTMENT, PORT_LEAD:DEPARTMENT, SYS_ADMIN:ALL |
| `audit.read` | Giám sát | SEC_LEAD:DEPARTMENT, PORT_LEAD:DEPARTMENT, DIS_LEAD:DEPARTMENT, SYS_ADMIN:ALL |
| `audit.export_all` | Giám sát | SYS_ADMIN:ALL |
| `tariff.read` | Bảng giá | SEC_STAFF:YARD, SEC_LEAD:YARD, PORT_STAFF:YARD, PORT_LEAD:YARD, DIS_STAFF:YARD, DIS_LEAD:YARD, SYS_ADMIN:ALL |
| `tariff.change.request` | Bảng giá | PORT_LEAD:DEPARTMENT, SYS_ADMIN:ALL |
| `tariff.change.publish` | Bảng giá | SYS_ADMIN:ALL |
| `admin.users.manage` | Quản trị | SYS_ADMIN:ALL |
| `admin.roles.manage` | Quản trị | SYS_ADMIN:ALL |
| `admin.role_permissions.manage` | Quản trị | SYS_ADMIN:ALL |
| `admin.billing_settings.manage` | Quản trị | SYS_ADMIN:ALL |
| `admin.legacy_correct` | Quản trị | SYS_ADMIN:ALL |
| `accounting.invoice.prepare` | Hóa đơn | Chưa cấp / chưa bật V1 |

**Nguyên tắc:** bảng trên là seed khởi tạo, chính sách quyết định theo quyền + phạm vi + trạng thái + phê duyệt server. `ACCOUNTING_FUTURE` không có grant khi chưa kích hoạt. Tên/mô tả tiếng Việt được dùng để hiển thị, không dùng làm khóa code.
