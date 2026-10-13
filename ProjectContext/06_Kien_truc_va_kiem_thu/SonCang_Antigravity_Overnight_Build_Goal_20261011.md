# SƠN CẢNG — ANTIGRAVITY OVERNIGHT BUILD GOAL

**Ngày phát hành:** 11/10/2026  
**Dự án:** PWA Quản lý bến bãi/cảng cạn Sơn Cảng — Công ty Cổ phần Tà Lùng Quang Minh  
**Workspace:** `D:\thanhnx\OpenCode\YMS-project`  
**Chiến lược:** Phương án B — cân bằng tiến độ và chất lượng  
**Chế độ:** AUTONOMOUS OVERNIGHT / CODE-ONLY / LOCAL-FIRST / NO-CLOUD-WRITES

## 0. Mệnh lệnh điều phối

Đây là **goal nối tiếp** prompt `PHASE 1D-02` đã gửi. Nếu nhiệm vụ 1D-02 còn đang chạy, **hoàn tất 1D-02 trước**, sau đó **tự động tiếp tục các milestone bên dưới trong cùng phiên làm việc**, không chờ chủ dự án nhắc từng bước. Không tạo một dự án mới, không phá giao diện đã có, không lặp lại kiểm toán thiết kế từ đầu.

Làm việc theo vòng lặp: **đọc code và ProjectContext → chọn một vertical slice nhỏ → code → kiểm tra → sửa → lưu checkpoint → tiếp tục**. Khi vướng một quyết định chưa được phê duyệt, **khóa tính năng đó lại, ghi OPEN/UAT, rồi tiếp tục phần độc lập**. Không dừng toàn bộ goal chỉ vì thiếu một quyết định nhỏ.

**Ưu tiên sản phẩm chạy được > báo cáo dài.** Tuy nhiên tuyệt đối không vượt ranh giới tài chính, bảo mật, toàn vẹn dữ liệu.

## 1. Sự thật dự án phải được bảo toàn

1. Supabase Cloud DEV `son-cang-yms-dev`, project ref `euswzyespwaxyrjkfkrq`. Migration **001–004 đã APPLIED** theo báo cáo Gate C. **Không sửa lại 001–004**, không tự push migration mới lên Cloud.
2. RBAC Workbook V5 là chuẩn duy nhất: **8 roles, 67 permissions, 206 grants**, scope `SELF/DEPARTMENT/YARD/ALL`. Không bịa mã quyền, vai trò, grants hoặc phân quyền frontend.
3. Dữ liệu xe và container có UUID/vòng đời độc lập. Container có thể ở lại sau khi xe mang vào đã rời bãi; xe khác đến nhận. Cấu trúc DB 1 lượt xe : N lượt container, nhưng **nghiệp vụ 2×20 feet chưa phê duyệt**.
4. **Sơn Cảng thu vé cổng chủ yếu theo loại xe**, không theo dịch vụ như Phú Anh. Xe đầu kéo **vào không có container: 0đ**; xe đầu kéo **mang container vào: vé 250.000đ** theo quyết định hiện hành. Xe đầu kéo vào rỗng rồi nhận container để ra: **chưa thu thêm, mặc định OFF**, cấu hình ON/OFF tương lai chưa phê duyệt và phải có phê duyệt giá + audit. Không dùng `allows_container=false` để cấm đầu kéo đến nhận container ra.
5. **Phải phân biệt container đi cùng xe lúc vào và container gắn xe để đi ra.** Không tin field client tự khai để miễn vé; backend guard là bắt buộc trước khi mở REAL WRITE.
6. Điện cont: An ninh thực địa cắm/rút, báo; CCKB nhập thời gian thực tế và thu tiền điện. Mỗi phiên điện có tariff snapshot, làm tròn 15 phút, 100.000đ/giờ theo baseline; các ca 0 giây chờ RV02 không tự miễn.
7. Lưu bãi: 100.000đ/đêm chịu phí, qua mốc 22:00–06:00 Asia/Ho_Chi_Minh, đêm đầu miễn, FINAL lúc An ninh xác nhận cont ra vật lý. Quy tắc thay bảng giá giữa kỳ RV04 chưa chốt; không mặc định một lựa chọn mới.
8. Cổng ra: AP07 cho phép An ninh thu phí lưu phát sinh theo quyền `storage.payment.collect`; ngoại lệ nợ do CCKB duyệt; không cho An ninh thu tiền điện. Chưa có 007 thì không tạo trạng thái xuất bãi final.
9. AP10 là Four-Eyes cho thay đổi giá; không đổi giá trực tiếp từ danh mục phương tiện. AP11 hoàn/miễn giảm FUTURE chưa bật. Trạng thái UAT OPEN giữ nguyên theo tài liệu.
10. Thiết kế DS-01 Light, font Be Vietnam Pro (nếu sẵn có/hợp pháp), nền sáng `#F5F8FA`, navy `#223873`, xanh `#0A9444`, CTA `#087C3C`; tận dụng 9 màn hình Google Stitch trong ProjectContext, responsive thật.

## 2. Quy tắc an toàn tuyệt đối cho goal chạy xuyên đêm

### Được phép

- Đọc/viết/refactor mã nguồn **trong workspace local**; viết tests, trang UI, service/repository, RPC, migration **mới ở mức file code-only** và tài liệu ngắn.
- Chạy TypeScript, ESLint, production build, unit/integration tests, HTTP smoke test, thử responsive bằng công cụ có sẵn.
- Chạy Supabase **LOCAL** nếu Docker đã sẵn và môi trường an toàn, không phá dữ liệu; nếu local DB không sẵn thì ghi `NOT RUN`, kiểm tra tĩnh rồi chuyển task khác. Giải phóng container khi xong.
- Tạo Git checkpoint **local** nếu chắc chắn không chứa khóa bí mật; kiểm tra `.gitignore` trước, không force push hay thay đổi remote. Nếu không có Git history, tạo bản lưu ZIP checkpoint và báo cáo rõ.
- Dùng mock dữ liệu/demo độc lập, có nhãn rõ `DEMO`, để tiếp tục làm UI khi chưa có tài khoản Auth thực.

### Không được phép

- Không `supabase db push --linked`, `db reset`, `migration repair`, chạy SQL ghi dữ liệu lên Cloud DEV/Production, deploy Vercel/Production.
- Không sửa migrations 001–004 đã áp dụng; không chỉnh lại các seed RBAC; không tạo tài khoản thật, mật khẩu, user-role assignments trên Cloud.
- Không đưa service-role/secret keys, `.env.local`, access token, mật khẩu, cookies vào browser, ZIP, log, Git hoặc báo cáo.
- Không tạo đường đăng nhập giả/fallback bằng email demo; không cho role switcher DEMO can thiệp REAL MODE.
- Không dùng client-side validation/hidden buttons thay cho RPC/RLS. Không tự `PAID`, `EXEMPT`, `EXITED` khi chưa có chứng cứ hoặc quy trình thật.
- Không tự phê duyệt chính sách UAT đang mở; không tự mở refund/waiver, xóa ledger, bỏ qua Four-Eyes.
- Không tuyên bố PASS runtime nếu chưa thật sự chạy; không tuyên bố có kết nối backend nếu mới dùng `localStorage`.

**Chỉ dừng ngay** nếu hành động tiếp theo đòi ghi Cloud, xóa dữ liệu không thể khôi phục, mở rộng quyền thật, lộ secret hoặc quyết định nghiệp vụ tài chính chưa duyệt **và không còn công việc độc lập khác**. Nếu còn việc khác, ghi blocker và tiếp tục.

## 3. Lộ trình thực hiện liên tục, theo thứ tự ưu tiên

### Milestone 1 — Hoàn tất Phase 1D-02: Auth / RBAC / REAL vs DEMO

- Đọc `SonCang_Phase1D_01_Independent_Audit_20261011.md` và prompt 1D-02 đã nhận trước đó. Đóng P0/P1, không làm lại UI.
- Tách hai mode ở tầng service/context/router. **REAL MODE**: Supabase Auth chuẩn, session hợp lệ, lấy role, scope, permission và yard assignments từ chính schema/RPC V5 thực tế (tìm tên bảng/hàm trong migrations). Không tự gán `SEC_STAFF` khi login, không có demo fallback hay role switch tùy tiện.
- **DEMO MODE**: mock data riêng, role switch chỉ trong dev, banner DEMO rõ, không gửi ghi DB remote, không được nhận dạng thành quyền thực.
- Chặn truy cập `/entry`, `/yard`, `/admin/vehicle-types` trong REAL MODE nếu chưa xác thực; fail closed khi không tải được quyền.
- Dùng đúng 7 mã loại xe V5 từ Backend ở REAL MODE; mảng demo khớp chính xác V5; NULL giá khác hẳn 0đ miễn phí.
- Dùng permission codes thực trong migration/Workbook, bỏ các mã sai như `gate.inbound.record` và `cargo_status.update` nếu không tồn tại.
- Build repository typed và adapter đọc danh sách xe/container qua RLS, phân trang, loading/empty/error states, không dùng query của service-role.
- Hoàn thiện giao diện `entry`, `yard`, `admin/vehicle-types`, session navigation, mobile/tablet/desktop và test quyền UI. Chức năng ghi REAL phải bị feature-gate tới khi có Backend guard.

### Milestone 2 — Bản vá Backend guard cho vé vào cổng (CODE-ONLY)

- Phân tích chính xác RPC và trạng thái đã có trong Migration 004, đặc biệt `sc_create_vehicle_visit`, `sc_create_container_visit`, `DAU_KEO`, `CONT_LANH`, `allows_container` và giá.
- Soạn **migration mới kế tiếp sau 004**, không đè số hoặc tên của migration đã có/đang lên kế hoạch, sửa tối thiểu để **không thể khai DAU_KEO 0đ rồi gắn container *đi vào cùng xe***. Không cấm đầu kéo vào không cont rồi nhận cont để xuất.
- Thiết kế và code đường nhập xe + cont **nguyên tử** (all-or-nothing) hoặc cơ chế kiểm soát lỗi giao dịch đảm bảo không sinh vé/xe nửa vời; giữ idempotency, chống concurrent retry, RLS/Four-Eyes/audit. Không tự thay đổi các mức giá V5.
- Cấu hình `empty_in_loaded_out_surcharge` là **OFF mặc định và chưa kích hoạt**; các tác vụ thực thi đổi phí là FUTURE, có version/effective dates/audit và phê duyệt chính sách. Không hardcode thu 250k tại cửa ra.
- Viết pgTAP cho vé 0/250k, trường hợp đi vào/đi ra, giả mạo payload, race/retry, sai yard, sai role. Nếu thiếu tiền đề nghiệp vụ, ghi `UAT OPEN` và chỉ implement safe branch.
- **Chỉ viết file SQL và tests local**, không push Cloud. REAL WRITE giữ OFF đến khi được duyệt và triển khai patch.

### Milestone 3 — Luồng PWA xe/container end-to-end (DEMO + REAL READ)

- Gắn forms với repository, payload typed, stable idempotency key trong một lần nhập, thông báo lỗi rõ; không ghi trùng khi bấm nhiều lần.
- Mobile An ninh: loại xe, biển số, có/không có cont khi vào, preview giá server-side sau khi hợp lệ, lưu dữ liệu theo quyền.
- CCKB: xem được dữ liệu hợp lệ theo scope, đối soát sai số container nếu có quyền thật.
- Điều phối: cập nhật HÀNG/RỖNG theo RPC thực, chỉ khi `IN_YARD` và code trạng thái chuẩn. Trong REAL MODE, nếu chưa có test user hoặc chưa duyệt write, giữ nút disabled/feature flag và demo thao tác vẫn chạy.
- Giữ UX đúng Stitch DS-01; giảm click, focus tự động hợp lý, phản hồi loading / retry, responsive. Không giả mạo thành công cloud.

### Milestone 4 — Xây tiếp mã nguồn các phân hệ còn lại, chỉ khi 1–3 ổn định

Theo đúng Domain Schema Design V5 và các quyết định đã chốt, phát triển **code-only ở local** theo các tầng phụ thuộc, không lấn chính sách UAT:

1. **Cắm điện container / reefer:** yêu cầu cắm, phiên cắm/rút vật lý, An ninh báo – CCKB nhập, chống hai phiên ACTIVE đồng thời, snapshot tariff, đồng hồ & làm tròn 15 phút, kiểm thử tình huống 0 giây ở trạng thái chờ xử lý, UI tương ứng.
2. **Tài chính / sổ thu:** versioned tariffs, AP10 Four-Eyes, immutable charge/payment ledger, không auto PAID, phân quyền thu điện vs lưu bãi, chống charge/retry trùng, tính phí lưu bãi và điều chỉnh có kiểm toán; RV04 chưa chốt phải gắn cờ/khóa nhánh bị ảnh hưởng.
3. **Clearance / xuất bãi:** phân biệt CCKB clearance và An ninh xác nhận container ra vật lý, AP07 khoản lưu bãi phát sinh, ngoại lệ nợ đúng quyền, không ghi EXITED khi chưa đủ điều kiện; giao dịch atomic/idempotent.

Cho mỗi phân hệ: schema/RPC/RLS, TypeScript types, pgTAP, service và màn hình Stitch phù hợp, kiểm tra tĩnh/bản demo. Nếu thời gian không đủ, **ưu tiên một slice chạy được**, lưu checkpoint, tiếp tục milestone kế tiếp khi có điều kiện; không làm nửa vời và tuyên bố xong.

**Quan trọng:** kiểm tra các filename migration hiện có trước khi đặt số, tránh xung đột với roadmap M005–M007; cập nhật kế hoạch migration nếu cần nhưng không sửa lịch sử đã APPLIED. Bất kỳ phần phải thay đổi schema trên Cloud đều là `CODE_READY / DEPLOY_PENDING`.

### Milestone 5 — UX / Test / Đóng gói bàn giao sáng mai

- Kiểm tra `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build`; ghi exit code thật. Thêm unit/integration tests và, khi có, UI E2E/Playwright với demo mode; nếu browser không có thì ghi `NOT RUN`, không làm giả screenshot.
- Smoke test các trang thật bằng nhiều trạng thái session; HTTP 200 **không thay cho test Auth**. Kiểm tra mobile 390 px, tablet 768 px, desktop 1440 px; chống tràn layout, font tiếng Việt, form dễ dùng.
- Rà soát phần an toàn, lộ secrets, quyền client/DB, đặc biệt các đường submit.
- Chỉ tập trung P0/P1; P2/P3 đưa backlog có mô tả và ưu tiên. Không tự tạo vòng audit thiết kế mới.
- Xuất `OVERNIGHT_BUILD_REPORT.md`, `OVERNIGHT_FILE_CHANGELOG.md`, `OVERNIGHT_TEST_RESULTS.md` và `soncang_overnight_code_bundle.zip` (KHÔNG chứa `.env*`, credentials, `.next`, `node_modules`, secrets). Nếu thiếu thời gian, báo cáo số liệu thật và những việc chưa xong.

## 4. Quy tắc tự tiếp tục để tránh ngắt quãng

1. Sau mỗi milestone: code thực tế → test tối thiểu → checkpoint an toàn → ghi 3 dòng tiến độ → **chuyển ngay milestone kế**, không chờ người dùng phản hồi.
2. Khi một test lỗi: sửa tối đa trong phạm vi module, chạy lại; nếu lỗi cần quyết định UAT hoặc hành động bị cấm, ghi blocker, khóa nhánh đó và tiếp tục module khác.
3. Khi thiếu tài khoản Supabase thật: tiếp tục xây REAL READ adapter và test/mock đúng hợp đồng, không tự tạo account và không tự mở bypass.
4. Khi Docker tốn RAM hoặc không lên: bỏ qua runtime local, ghi NOT RUN, tiếp tục TypeScript + UI + tests code-only. Không reset DB.
5. Khi agent/tool gặp giới hạn thời gian, token, terminal hoặc cơ chế pause: **lưu tất cả thay đổi, checkpoint + kế hoạch resume cụ thể**. Không tuyên bố công việc hoàn tất nếu thực tế bị dừng.
6. Không sử dụng các tool ngoài phạm vi đã có nếu chúng yêu cầu người dùng đăng nhập/quyền mới; tiếp tục những phần còn làm được.

## 5. Định nghĩa hoàn thành & báo cáo sáng mai

**Mốc ưu tiên bắt buộc:**
- [ ] DEMO MODE và REAL MODE tách an toàn; không login fallback bằng email demo.
- [ ] Quyền/scope tra từ RBAC V5 thực, không tự gán role.
- [ ] 7 loại xe V5 chính xác trong DEMO và REAL read.
- [ ] Trang đăng nhập, cổng vào, bãi, quản trị danh mục chạy được trên localhost.
- [ ] REAL WRITE cho tiếp nhận xe/container **đã bị khóa tới khi backend guard được áp dụng**, không đánh dấu PAID giả.
- [ ] SQL migration patch + pgTAP code-only cho quy tắc vé 0đ/250k và giao dịch atomic.
- [ ] Typecheck/lint/build đạt, hoặc ghi lỗi thật cùng file/dòng.
- [ ] Có ZIP code + báo cáo thực tế, Git/local checkpoint, backlog P0/P1/P2/P3.

**Mốc mở rộng nếu còn năng lực:** migration / UI reefer → ledger/tariffs → exit clearance với tests và feature flags. Mỗi hạng mục phải đánh dấu riêng `DONE-TESTED`, `DONE-NOT-RUN`, `IN-PROGRESS`, `BLOCKED` hoặc `BACKLOG`.

Bảng báo cáo sáng mai bắt buộc có:

| Milestone | Trạng thái thực | File đã viết | Kết quả lệnh/test | Còn vướng gì | Next action |
|---|---|---|---|---|---|
| Auth/RBAC | | | | | |
| UI xe/container | | | | | |
| Backend guard patch | | | | | |
| Reefer | | | | | |
| Tariffs/ledger | | | | | |
| Clearance/exit | | | | | |

**ĐIỀU KIỆN DỪNG CUỐI:** Chỉ khi hết nhiệm vụ code hợp lệ, chạm giới hạn công cụ hoặc không còn hạng mục nào an toàn để tự làm. Không xin phê duyệt từng milestone; không được vượt ranh giới Cloud/Production/secret/UAT. Khi dừng, xuất báo cáo và đường dẫn chính xác tới file bàn giao để chủ dự án rà soát vào sáng mai.
