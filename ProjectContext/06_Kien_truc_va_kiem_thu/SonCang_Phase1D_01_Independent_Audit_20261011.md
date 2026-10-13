# SƠN CẢNG — KIỂM TOÁN ĐỘC LẬP PHASE 1D-01 (PWA FIRST VERTICAL SLICE)

**Ngày:** 11/10/2026  
**Phạm vi:** Mã nguồn từ `phase1d_01_pwa_bundle.zip` và báo cáo Antigravity `Pasted text(20261011-162850).txt`, đối chiếu đặc tả `SonCang_Phase1D_01_PWA_First_Vertical_Slice_V5_20261011.md` và các quyết định V5 đã chốt.  
**SHA-256 bundle:** `fac4d6d9ac8d0ea8f208876191ce20dde69c6d6789146edc54da26aa5e63a743`  
**Phương pháp:** Giải nén trực tiếp 32 entry ZIP, đọc TS/TSX, so các mã nghiệp vụ, rà soát call-site, quyền truy cập, trạng thái tài chính, giới hạn demo. **Không chạy lại `pnpm build` hoặc trình duyệt** vì bundle không có dependencies/runtime environment; kết quả build/HTTP 200 là thông tin Antigravity báo cáo, chưa được kiểm chứng độc lập bằng thực thi.

## I. Kết luận chất lượng — phương án B

- **ĐẠT CÓ ĐIỀU KIỆN đối với UI PROTOTYPE/DEMO chỉ chạy localhost:** Đã có `/login`, `/entry`, `/yard`, `/admin/vehicle-types`, bố cục responsive bằng Tailwind, màu DS-01, phân nhánh có/không container, màn hình đổi HÀNG/RỖNG giả lập. Dữ liệu mẫu trong `localStorage` tách khỏi Cloud, không thấy code gọi RPC ghi Cloud.
- **CHƯA ĐẠT nếu gọi là PWA đã kết nối Backend/RBAC thật hoặc đủ điều kiện vận hành:** Có các lỗi thực chất bên dưới. Ở hiện trạng này, chỉ dùng để **nghiệm thu trải nghiệm giao diện**, tuyệt đối không nghiệm thu an toàn xác thực, phân quyền, thu tiền hoặc cập nhật dữ liệu nhiều thiết bị.
- Không mở vòng sửa tổng thể UI. Giữ thành quả giao diện, khắc phục nhóm lỗi ngăn đưa vào tích hợp thật ở một lượt công việc có trọng tâm; phần tính tiền phía Backend chờ bản vá migration tương lai được phê duyệt riêng.

## II. Điểm làm được / giữ nguyên

1. Next.js 16 App Router; `src/proxy.ts` có luồng làm mới token khi cấu hình Supabase hợp lệ; không thấy `service_role` trong code client của ZIP.
2. Trang `/entry` có câu hỏi **container đi cùng lúc vào cổng**; UI ngăn chọn `DAU_KEO` (0đ) khi câu trả lời là CÓ, đồng thời có cảnh báo rằng Backend chưa chặn (entry/page.tsx:68–78, 92–96, 192–203).
3. Trang `/yard` đã dựng giao diện lọc xe/cont, thống kê, modal HÀNG/RỖNG cho demo (yard/page.tsx:18–94, 140–166, 366–439).
4. Màu `#0A9444`, `#223873`, `#087C3C` và font Be Vietnam Pro được khai báo trong `globals.css`/`layout.tsx`.
5. Gói ZIP không có `.env.local` hoặc service-role secret; demo dữ liệu nằm trong browser (theo mã nguồn).

## III. Phát hiện phải xử lý TRƯỚC khi kết nối dữ liệu thật / phát hành

| Mã | Ưu tiên | Bằng chứng mã nguồn | Rủi ro / yêu cầu sửa |
|---|---|---|---|
| `SC-1D-01` | **P0 nếu phát hành công khai; P1 ở demo localhost** | `src/contexts/auth-context.tsx:27–57,85–118`; `src/app/login/page.tsx:65–99`; `src/components/layout/app-shell.tsx:103–148` | Context mặc định là An ninh demo; khi Auth lỗi, chỉ cần email trùng tài khoản demo thì **mật khẩu bất kỳ cũng được chấp nhận**; nút chuyển vai trò cho phép tự chọn `SYS_ADMIN`. Demo được phép **chỉ khi cách ly rõ**, không được fallback đăng nhập demo từ form Auth. Tắt hoàn toàn role switcher và tài khoản demo ở môi trường không phải demo, không coi role do client chọn là quyền thật. |
| `SC-1D-02` | **P1** | `src/lib/rbac-rules.ts:4–61`; `src/app/entry/page.tsx:21`; `src/app/yard/page.tsx:38`; `src/app/admin/vehicle-types/page.tsx:11` | Frontend viết ma trận quyền thủ công với mã `gate.inbound.record`, `cargo_status.update`, `admin.pricing.manage`... không đồng nhất với permission codes backend V5 (ví dụ `vehicle.visit.create`, `container.cargo.update`, `admin.billing_settings.manage`). Không lấy `sc_my_permissions`/scope và assignment thực; Auth Cloud đăng nhập xong cũng tự gán `SEC_STAFF`. Phải đọc grant + scope thật và để RPC/RLS làm lớp phán quyết. |
| `SC-1D-03` | **P1** | `src/lib/services/yard-service.ts:170–214,221–376`; rà soát toàn bộ `src` tìm `.rpc(` và `.from(`: **0 lời gọi** | Xe/container/HÀNG-RỖNG chỉ thao tác trên singleton array + `localStorage`; danh mục không lấy từ Cloud. `src/lib/supabase/client.ts` chỉ được dùng cho `auth.signInWithPassword`. Do đó chưa có luồng Supabase thật, chưa đa thiết bị, không thể nghiệm thu Integration/RBAC. Tạo adapter riêng `Demo` và `Supabase`, chỉ bật Supabase khi có tài khoản test được phép và các guard đã đạt. |
| `SC-1D-04` | **P1** | `src/lib/services/yard-service.ts:4–66`; `src/types/domain.types.ts:1–8`; `src/app/admin/vehicle-types/page.tsx:5,69–100` | Seed giả `XE_TAI`, `XE_BEN`, `SO_MI_RO_MOOC`, `XE_CON`, `XE_MAY` **không trùng** danh sách 7 mã V5 đã chốt (`CONT_LANH`, `DAU_KEO`, `XE_BO_4_CHAN`, `XE_BO_3_CHAN`, `XE_BO_8_TAN_2_CHAN`, `XE_BO_3_BANH`, `XE_SANG_TAI`). Các mức 150k/120k/50k/10k cũng không phải giá V5. Danh mục động bị biến thành static seed; cần lấy dữ liệu thật từ `app_vehicle_types` khi có auth, sửa demo theo đúng V5 và phân biệt `NULL` giá chưa cấu hình với **giá 0đ hợp lệ**. |
| `SC-1D-05` | **P1 tài chính trước UAT ghi thật** | `src/lib/services/yard-service.ts:246–253,275–279`; `src/app/entry/page.tsx:61–66,305–332`; `src/app/admin/vehicle-types/page.tsx:90–92` | UI/service ép tiền 250k cho mọi loại xe khi `hasContainer=true`, kể cả mã xe không được phép; dùng `default_ticket_amount || 0` làm `NULL -> 0`; đặc biệt tự gán `ticket_payment_status='PAID'` với mọi vé có tiền dù **không có bước thu tiền**. Không cho client xác nhận đã thu; chỉ hiển thị số tiền/trạng thái do server trả và áp dụng biểu phí chuẩn. |
| `SC-1D-06` | **P1 dữ liệu trước UAT ghi thật** | `src/app/entry/page.tsx:104–146`; `src/lib/services/yard-service.ts:299–346` | Tạo xe trước rồi tạo container sau; khi cont lỗi, xe đã được lưu, không có transaction/compensation; method tạo container bỏ qua `idempotencyKey` truyền vào. Khi live cần RPC/transaction được duyệt hoặc luồng khắc phục rõ ràng, không báo “thành công” nếu một nửa nghiệp vụ thất bại. Mặt khác, Backend Migration 004 còn **P1 chưa khóa đầu kéo vào có cont nhưng vé 0đ**: frontend guard không thể thay thế backend guard. |
| `SC-1D-07` | **P1 chức năng khi nối Backend** | `src/app/yard/page.tsx:395–416`; `src/lib/services/yard-service.ts:351–366`; `src/types/database.types.ts:663–668` | UI cho chọn `CHUA_XAC_DINH` trong modal và demo cho update mọi trạng thái, trong khi `sc_update_container_cargo` chỉ chấp nhận `HANG`/`RONG` và chỉ khi cont `IN_YARD`. UI phải tuân thủ đúng RPC; không để chọn trạng thái unsupported. |

**Lưu ý mức độ:** Vì các chức năng nghiệp vụ hiện không gọi DB, các lỗi trên chưa chứng minh có giao dịch Cloud sai. Chúng là **điều kiện chặn trước khi chuyển từ mock demo sang dữ liệu thật**. Không phát sinh thay đổi migration/Cloud chỉ để sửa demo.

## IV. Các tồn đọng không chặn demo (P2/P3 backlog)

1. `src/proxy.ts:17–19` chỉ refresh token; không redirect bảo vệ route. Ở demo page được render 200 dù chưa đăng nhập; khi chuyển thật phải thêm xác thực route/server guard, ngoài RLS.
2. `src/app/yard/page.tsx:22–27` khởi tạo dữ liệu một lần theo yard demo; không nạp lại khi vai trò/bãi thay đổi, không có loading/network/error states hay pagination thật.
3. `src/lib/services/yard-service.ts:265,323` tự tạo chuỗi ID bằng `Math.random` và `Date.now`, không bảo đảm UUID đúng chuẩn; chỉ chấp nhận trong local mock, tuyệt đối không đưa vào DB thật.
4. Bundle không chứa web app manifest, service worker, icon cài đặt đặc thù; chưa đủ bằng chứng xác nhận **PWA cài đặt/offline**. Xếp bước tối ưu PWA vào backlog sau luồng nghiệp vụ thật.
5. Bundle không có 9 file thiết kế Stitch, ảnh chụp ba kích thước hoặc bảng đối chiếu Stitch→route; không thể kết luận đã đúng thiết kế Stitch 01–09 chỉ từ mã nguồn. Yêu cầu screenshots thực tế khi nghiệm thu UI; chưa coi đây là lỗi bảo mật.
6. HTTP 200 và `pnpm build` PASS (theo báo cáo Antigravity) là dấu hiệu app dựng/chạy, **không phải bằng chứng** login Supabase/RBAC/CRUD đã hoạt động.

## V. Quyết định Gate và kế hoạch hành động — không vòng kiểm toán vô hạn

### Gate UI prototype

**PASS CÓ ĐIỀU KIỆN để người dùng trải nghiệm giao diện trên localhost, với banner DEMO và dữ liệu giả; chưa nghiệm thu các yêu cầu Integration.** Không cần làm lại Stitch/UI từ đầu.

### Bước kế tiếp nên giao Antigravity: Phase 1D-02 — từ demo sang tích hợp có kiểm soát

**Đợt 1 (được viết code, chưa ghi Cloud):**
- Cách ly Demo Mode bằng flag DEV rõ ràng, bỏ fallback đăng nhập không kiểm mật khẩu; route protection thật.
- Đồng bộ đúng 7 loại xe V5, giá demo chuẩn; loại bỏ 5 mã giả; không đánh dấu PAID khi chưa thu; hiển thị `NULL = chưa có giá`.
- Tải session thực qua Supabase Auth, map `sc_my_permissions` và scope; không tự gán SEC_STAFF/yard cứng.
- Viết Supabase repository typed để đọc `app_vehicle_types`, `app_vehicle_visits`, `app_container_visits` theo RLS; ghi nhận quyền và các trang read-only. Không tự ghi DB hoặc tạo tài khoản test Cloud.
- Giữ mock riêng để người dùng tiếp tục duyệt giao diện.

**Đợt 2 (BLOCKED chờ phê duyệt backend guard riêng):**
- Tạo lượt xe/container thật bằng RPC; cập nhật HÀNG/RỖNG bằng RPC; ngăn vé 0đ sai khi xe vào có cont; giải quyết thao tác xe/cont một phần thất bại. Không tự ban hành migration kế tiếp, không sửa 004 đã APPLIED.

### Điều kiện nghiệm thu Phase 1D-02

- Client không có cửa vào demo tùy ý ở non-demo; session thực reload/đăng xuất đúng.
- Role/scope lấy từ backend; sai vai trò/sai bãi bị từ chối từ RPC/RLS.
- Danh mục Cloud hiển thị đúng 7 mã; các thao tác read-only theo user được phép và không cần viết cloud fixture.
- Không có “đã thu tiền” chỉ vì số tiền lớn hơn 0.
- Khi chưa có guard P1, các nút GHI NGHIỆP VỤ THẬT bị khóa kèm giải thích; không có lệnh ghi Cloud.
- Build/TS/lint check thực; chụp 4 kích thước viewport (mobile ~390, tablet dọc, tablet ngang, desktop) và mapping Stitch.
- Bàn giao ZIP không secrets, báo cáo ngắn DONE/DEMO/BLOCKED; dừng để user nghiệm thu.

## VI. Các điều không được làm trong lượt sửa tới

- Không sửa ngược migrations 001–004; không `db push`, `db reset`, `migration repair`.
- Không chỉnh lại RBAC 8/67/206 hay tự tạo permission code mới.
- Không tạo users/roles/grants/biểu phí/giao dịch trên Cloud DEV.
- Không bật một đường vào demo công khai ở bản deploy.
- Không sửa rộng giao diện đã có chỉ để đổi style; giữ DS-01/Stitch.
- Không tuyên bố runtime Auth/RPC đã PASS khi chưa có tài khoản và kiểm thử thật.

**Tuyên bố kiểm toán:** Kết luận dựa trên mã nguồn ZIP đã giải nén và tài liệu giao. Không kết luận về trực quan pixel-perfect, tình trạng localhost trên máy người dùng hay hoạt động Cloud hiện tại mà không có chứng cứ thêm.
