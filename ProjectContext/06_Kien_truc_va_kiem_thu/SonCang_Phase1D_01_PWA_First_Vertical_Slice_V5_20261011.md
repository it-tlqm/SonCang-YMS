# SƠN CẢNG — PHASE 1D-01: PWA FIRST VERTICAL SLICE

**Dự án:** PWA Quản lý bến bãi/cảng cạn Sơn Cảng — Công ty Cổ phần Tà Lùng Quang Minh  
**Quyết định điều hành:** Phương án B — cân bằng tiến độ/chất lượng, làm chức năng chạy thử sớm, không mở kiểm toán vô hạn.  
**Tình trạng đầu vào:** Theo báo cáo Antigravity, Supabase Cloud DEV `son-cang-yms-dev` (`euswzyespwaxyrjkfkrq`) đã APPLIED Migration 004.  
**Phạm vi giao:** Code-only PWA/frontend + integration các RPC có sẵn. Không có phê duyệt migration hay giao dịch ghi vào Cloud.  
**Gate:** Phase 1D-01, hoàn thành thì DỪNG để nghiệm thu bản demo.

## 1. Mục tiêu đầu ra

Tạo được bản PWA **thao tác thử trên máy phát triển** với luồng: đăng nhập → phân quyền → An ninh tiếp nhận xe → tiếp nhận container khi có → danh sách xe/container đang trong bãi → Điều phối cập nhật HÀNG/RỖNG theo quyền → CCKB tra cứu.

- Dùng Next.js 16, TypeScript, Supabase Auth + existing RPC/RLS, thiết kế Stitch 01–09.
- RESPONSIVE có luồng riêng hợp lý cho mobile (An ninh), tablet dọc/ngang, desktop (CCKB/Điều phối); không chỉ ép kích thước.
- Chỉ đưa lên UI những hành vi đã có API an toàn. Các nghiệp vụ chưa có API phải hiển thị trạng thái chưa hỗ trợ hoặc ẩn, không tự tạo cách ghi DB.

## 2. Tài liệu nguồn bắt buộc đọc

1. `ProjectContext/01_Nghiep_vu_V5/PROJECT_CONTEXT.md`, tài liệu nghiệp vụ V5 và các quyết định đã chốt.
2. Workbook RBAC V5 trong `ProjectContext/02_RBAC_V5/`; ma trận 8 roles, 67 permissions, 206 grants; permission và scope là nguồn sự thật.
3. `ProjectContext/06_Kien_truc_va_kiem_thu/DOMAIN_SCHEMA_DESIGN_V5.md`.
4. `ProjectContext/06_Kien_truc_va_kiem_thu/GATE_C_DEPLOYMENT_REPORT.md` và `MIGRATION_004_RUNTIME_VERIFICATION.md`.
5. Toàn bộ 9 thiết kế Stitch + `ProjectContext` về giao diện, DS-01, tài liệu UAT, open decisions, current status, work log.
6. SQL Migration 004 **đã áp dụng** và `src/types/database.types.ts`; đọc trước khi gọi RPC. Không sửa lại Migration 004.

## 3. Nghiệp vụ vé cổng đã xác nhận

- An ninh Sơn Cảng phân loại **chủ yếu theo loại xe lúc vào cổng**, không theo nhóm dịch vụ như tại Phú Anh.
- **Đầu kéo vào không có container:** loại `DAU_KEO`, vé cổng 0 đồng theo danh mục hiện hành.
- **Xe vào có container phía sau:** vé cổng 250.000 đồng theo quy tắc chủ dự án xác nhận, tuyệt đối không cho chọn `DAU_KEO` miễn phí cho trường hợp có container lúc vào.
- **Đầu kéo vào không có container, sau đó nhận container trong bãi rồi đi ra:** mặc định chưa thu thêm khoản 250.000 đồng. Chủ dự án chưa xác nhận chắc chắn quy định nên ghi **UAT OPEN** và yêu cầu thiết kế cờ bật/tắt ở phân hệ cấu hình chính sách thu phí về sau (Migration tài chính / xuất bãi), mặc định OFF, có phê duyệt, thời điểm hiệu lực và audit.
- Phải **phân biệt 'mang container cùng lúc vào' với 'vào không container rồi nhận container để đi ra'**. Không đồng nhất với cờ `allows_container` của bảng danh mục; cờ này thể hiện khả năng liên kết, không thay thế chính sách tính tiền theo thời điểm.
- Mọi tiền hiển thị lấy dữ liệu server/bảng giá đã phê duyệt, không hardcode để ghi vào DB và không cho client tùy ý nhập/tính tiền thay RPC.

**RỦI RO P1 CẦN NÊU RÕ:** Migration 004 hiện có thể cho RPC tạo xe `DAU_KEO` 0 đồng và liên kết container vào cùng lượt, chưa chứng minh backend phân biệt container đến cùng lúc. Kiểm tra chi tiết trên code hiện tại. KHÔNG chỉ dùng frontend validation để tự tuyên bố sửa xong. Không cho demo ghi dữ liệu thật hoặc đóng chức năng thu vé production tới khi có backend guard được review/phê duyệt riêng. **Không tự tạo migration hoặc sửa Cloud trong nhiệm vụ này.** Đề xuất patch migration kế tiếp trong backlog, không tự ấn định số migration vì 005–007 đã có lộ trình được quy hoạch.

## 4. Phân hệ cần triển khai, theo ưu tiên

### A. Authentication, shell, RBAC

- Supabase Auth qua pattern SSR/cookie an toàn của thư viện hiện hữu; session refresh, logout, trạng thái lỗi mạng/hết phiên; bảo vệ các route không công khai.
- Không dùng service_role/secret ở client; không commit `.env.local`; không mở trang nội bộ cho anon.
- RBAC V5 chỉ lấy từ server/backend; UI ẩn hoặc disable thao tác không có quyền, nhưng **RPC/RLS vẫn là lớp bảo vệ cuối cùng**.
- Các vai trò hiện hành Security/CCKB/Điều phối/SYS_ADMIN chỉ hiển thị đúng màn hình/quyền được cấp; vai trò tương lai không kích hoạt.
- Nếu Cloud chưa có tài khoản test được cấp quyền hợp lệ, làm demo bằng mock và báo rõ, **không tự tạo auth user trên Cloud**.

### B. An ninh — mobile-first (ưu tiên triển khai đầu tiên)

- Form tiếp nhận tối giản: loại xe từ `app_vehicle_types` (lọc active), biển số (đối với loại xe yêu cầu), người lái/thông tin tối thiểu theo SQL RPC, bãi đã được phân công; nút thao tác lớn, trạng thái phản hồi rõ.
- Câu hỏi thực địa **'Lúc vào cổng có container đi kèm không?'**: có/không. Giao diện ngăn người dùng chọn vé `DAU_KEO` 0 đồng cho câu trả lời 'có' và hiển thị cảnh báo rủi ro backend chưa khóa; việc ngăn UI **không phải bằng chứng P1 đã được xử lý**.
- Nếu có cont, hiển thị bước nhập số cont/kích thước/thông tin đã có trong SQL, liên kết đúng `inbound_vehicle_visit_id`. Không nhầm với nghiệp vụ cont được xe nhận sau này.
- Sử dụng RPC `sc_create_vehicle_visit`, `sc_create_container_visit` theo đúng SQL signature, cung cấp request idempotency key ổn định cho retry, reset key cho hành động mới, thông báo lỗi dễ hiểu và không double-submit.
- Không mở chức năng thu tiền, xác nhận xuất bãi cuối cùng, hoặc sửa số cont ngoài quyền V5.

### C. Danh sách đang trong bãi + thao tác theo bộ phận

- Danh sách xe/container theo bãi và scope thật; tìm kiếm biển số, số cont, trạng thái; phân trang/lazy loading và empty/error/loading states.
- CCKB/Điều phối ưu tiên bảng có lọc trên tablet và desktop; mobile bố cục thẻ không tràn ngang.
- Điều phối được thao tác HÀNG/RỖNG **chỉ qua RPC** `sc_update_container_cargo`, đúng quyền và trạng thái IN_YARD; An ninh/CCKB không được tự thực hiện nếu không có quyền.
- Phần lịch sử sửa số container chỉ hiện cho vai trò có permission tương ứng, theo RLS; không tạo direct mutations.

## 5. Thiết kế UI

- Tái sử dụng Stitch 01–09, đối chiếu màn hình nào đã có và chưa có; nếu thiếu một phần, mở rộng **cùng design system**, không tự làm giao diện khác hoàn toàn.
- DS-01: nền sáng `#F5F8FA`, navy `#223873`, xanh lá `#0A9444`, CTA `#087C3C`, Be Vietnam Pro nếu sẵn hợp pháp qua gói web/font hiện có; không nhúng font nhị phân vào đầu ra.
- Mobile-first cho Security; tablet portrait/landscape cho CCKB/Điều phối; desktop cho bảng lớn, sidebar/hierarchy hợp lý; touch target lớn, confirm dialog cho thao tác nhạy cảm, không làm hiệu ứng nặng ảnh hưởng công việc ngoài cổng.
- Loading, form validation, permission denied, timeout/network retry, no data; tiêu chí accessibility cơ bản.

## 6. Giới hạn an toàn

- **KHÔNG** chạy `supabase db push`, `db reset`, `migration repair` hay SQL ghi Cloud.
- **KHÔNG** sửa các migrations 001–004 đã áp dụng; không tự triển khai migrations 005–007.
- **KHÔNG** tự tạo hoặc thay đổi user, role, assignment, giá vé hoặc dữ liệu giao dịch trên Cloud.
- **KHÔNG** tự xem UAT 2x20 feet hay phụ phí đầu kéo ra có cont là đã chốt.
- Chỉ code frontend/integration trên workspace; khi cần dữ liệu dùng mock/fixtures local hoặc tài khoản test **đã được cho phép**; không giả lập PASS runtime nếu không chạy.
- Nếu giao diện đụng rào cản P1 backend về vé cổng, ghi `BLOCKED_PENDING_BACKEND_GUARD` cho chức năng ghi giao dịch nhạy cảm nhưng vẫn tiếp tục các phần login, layout, read-only, navigation được phép. Không tự sửa SQL để 'cho chạy'.
- Nếu không có mapping giữa thiết kế Stitch và repo, lập bảng mapping một lần trong báo cáo và triển khai, không dừng chỉ để viết nghiên cứu kéo dài.

## 7. Quality Gate và tiêu chí hoàn thành

- `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build` (ghi exit code thật) và kiểm tra không lộ secret.
- Demo localhost với đường dẫn rõ ràng; kiểm tra ít nhất điện thoại hẹp, tablet dọc/ngang và desktop (kích thước thực tế mô tả trong báo cáo). Nêu cái nào đã xem trực tiếp/cái nào chỉ kiểm tra tĩnh.
- Kiểm thử các vai trò với mock hoặc tài khoản test được phép, gồm DENY ngoài quyền; nhấn 2 lần, retry mạng và các trạng thái lỗi.
- Demo tối thiểu: /login → Security view → xe vào → bước container (ở chế độ demo an toàn) → danh sách trong bãi; CCKB/Điều phối có view đúng quyền.
- Lỗi P0/P1 chặn luồng tài chính/dữ liệu thật; lỗi P2/P3 ghi backlog và không kéo dài kiểm toán.
- Không tự triển khai Vercel hoặc ghi dữ liệu Cloud. Sau khi báo cáo và chụp màn hình/video demo nếu có, **DỪNG CHỜ NGHIỆM THU UI**.

## 8. Bàn giao bắt buộc

1. Code trong workspace, danh sách file mới/sửa.
2. `ProjectContext/06_Kien_truc_va_kiem_thu/PHASE1D_01_PWA_DEMO_REPORT.md`: mapping Stitch → route/component, RPC được dùng, vai trò, kết quả kiểm tra, rủi ro còn mở.
3. Ảnh chụp desktop/tablet/mobile hoặc link chạy localhost nếu có; không nói đã test nếu chưa thật sự chạy.
4. Một ZIP gói mã nguồn/chứng cứ đủ để rà soát (không có `.env.local`, secrets, `node_modules`, build/cache).
5. Cập nhật `CURRENT_STATUS.md`, `WORK_LOG.md`, `OPEN_DECISIONS_UAT.md` về tình huống đầu kéo và cấu hình phụ phí (mặc định OFF / UAT OPEN).
6. Danh sách P0/P1 và yêu cầu backend patch **để phê duyệt riêng** trước khi đưa chức năng thu vé thành nghiệp vụ sử dụng thật.

**STOP:** Kết thúc Phase 1D-01 khi có demo tương tác trong môi trường an toàn và báo cáo gọn; không tự bắt đầu Phase 1D-02 hoặc migrations tiếp theo.
