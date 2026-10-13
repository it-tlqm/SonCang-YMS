# ANTIGRAVITY — SƠN CẢNG: CHUYỂN SANG UAT THỰC TẾ

**Dự án:** Phần mềm quản lý bến bãi/cảng cạn Sơn Cảng — Công ty Cổ phần Tà Lùng Quang Minh  
**Ngày giao việc:** 12/10/2026  
**Môi trường:** Supabase Cloud DEV `son-cang-yms-dev` (ref: `euswzyespwaxyrjkfkrq`)  
**Trạng thái:** Chuẩn bị UAT; **chưa phê duyệt triển khai migrations 005–008 và chưa bật Real Write**.

## 1. Bối cảnh và mục tiêu

Đã nhận kết quả từ nhiệm vụ Cloud UAT Final Readiness:

- Gate PostgreSQL Local: 181/181 pgTAP PASS, 11 nhóm kiểm thử E2E; migrations 005–008 đã được kiểm thử trên Local.
- Cloud DEV Preflight: AG báo READY; môi trường Cloud mới áp dụng migrations 001–004.
- AG báo đã tạo 7 tài khoản UAT trên Supabase Auth Cloud DEV, đăng nhập và kiểm tra quyền qua `sc_my_permissions()` thành công.
- Real Write của PWA đã được chuẩn bị nhưng `NEXT_PUBLIC_ENABLE_REAL_WRITE=false`.

**Mục tiêu:** Đưa hệ thống đến trạng thái chủ dự án có thể mở PWA, đăng nhập thử bằng từng vai trò; đồng thời đóng hai lỗi tích hợp còn lại và chuẩn bị triển khai Cloud DEV có kiểm soát. **Không mở thêm vòng kiểm toán Backend tổng thể, không phát triển thêm phân hệ.**

## 2. Bàn giao an toàn 7 tài khoản UAT

Các tài khoản AG báo đã tạo:

| Vai trò V5 | Email UAT |
|---|---|
| `SYS_ADMIN` | `sys_admin_uat@example.com` |
| `SEC_STAFF` | `sec_staff_uat@example.com` |
| `SEC_LEAD` | `sec_lead_uat@example.com` |
| `PORT_STAFF` | `cckb_staff_uat@example.com` |
| `PORT_LEAD` | `cckb_lead_uat@example.com` |
| `DIS_STAFF` | `dis_staff_uat@example.com` |
| `DIS_LEAD` | `dis_lead_uat@example.com` |

- **Giữ nguyên tài khoản và mật khẩu hiện có. Không chạy lại script tạo tài khoản**, vì việc đó có thể đặt lại mật khẩu tài khoản đã tồn tại.
- Xác nhận an toàn sự tồn tại và vai trò, phạm vi bãi của từng tài khoản, không thay đổi gán quyền nếu chưa cần thiết.
- Mật khẩu đang được AG báo cáo lưu ngoài repository tại `uat_credentials_safe.json`. Hướng dẫn Chủ dự án truy cập và **chuyển thông tin đăng nhập sang kho mật khẩu an toàn do Chủ dự án quản lý**; không dựa lâu dài vào thư mục scratch có thể bị dọn.
- **Không in mật khẩu, JWT, service role key hoặc secret** trong chat, báo cáo, log, Git hay ZIP. Nếu cần bàn giao, chỉ dùng phương thức bí mật trực tiếp do Chủ dự án kiểm soát.
- Không tạo thêm tài khoản, không reset mật khẩu và không chỉnh sửa `auth.users` trong nhiệm vụ này.

## 3. Sửa smoke test tiếp nhận xe/container nguyên tử

Rà soát `scripts/smoke_test_atomic_entry.mjs` và các lệnh SQL được script gọi:

1. Dùng **đúng tên và kiểu tham số** của RPC `sc_create_vehicle_and_container_visit_atomic` theo migration 005 **hiện hành**, không dùng signature cũ (`p_vehicle_type_code`, `p_operator_id`...).
2. Chạy PostgreSQL với `psql -v ON_ERROR_STOP=1`; đảm bảo bất kỳ SQL exception nào cũng khiến test FAIL và có exit code khác 0.
3. Assert kết quả thực tế: tạo được xe + container cùng transaction, thông tin liên kết đúng, vé phù hợp và không tạo bản ghi trùng khi replay.
4. Chạy trên **PostgreSQL Local**, sử dụng transaction `ROLLBACK` hoặc dữ liệu test an toàn; tuyệt đối không ghi Cloud DEV để thử smoke test này.
5. Ghi lệnh chạy, exit code, kết quả PASS/FAIL vào báo cáo ngắn; không tuyên bố PASS chỉ nhờ process kết thúc thành công.

## 4. Hoàn thiện thao tác xe ra không mang container tại `/exit`

Backend đã có RPC `sc_confirm_vehicle_only_exit`, Repository đã kết nối, nhưng cần bổ sung thao tác thực sự sử dụng nó trong UI:

- Khi xe A đã hạ container ở bãi và cần rời bãi một mình, An ninh có thể chọn đúng lượt xe và xác nhận xe ra.
- Chỉ hiện/bật thao tác cho quyền phù hợp theo RBAC V5; Server RPC tiếp tục là nơi quyết định quyền cuối cùng.
- Kiểm tra trạng thái xe, điều kiện thanh toán tiền vé và thông tin xác nhận; không cho xác nhận trùng.
- Giữ nguyên trạng thái container đang ở bãi sau khi xe A ra; xe B đến nhận container là giao dịch riêng.
- Nếu `NEXT_PUBLIC_ENABLE_REAL_WRITE=false`, hiển thị thông báo khóa ghi rõ ràng, **không gửi yêu cầu ghi Cloud**.
- Kiểm thử UI/Repository trên môi trường thử nghiệm và chạy TypeScript, ESLint, production build.

## 5. Khởi chạy PWA cho Chủ dự án trải nghiệm

- Chạy đúng phiên bản PWA mới nhất và cung cấp **địa chỉ URL có thể mở thực sự** từ máy Chủ dự án (Local/LAN hoặc môi trường thử nghiệm phù hợp). Không bịa địa chỉ triển khai.
- Kiểm tra login bằng tài khoản UAT thật (hoặc cung cấp hướng dẫn để Chủ dự án tự đăng nhập mà không tiết lộ mật khẩu vào log).
- Xác minh vai trò An ninh, CCKB, Điều phối và SYS_ADMIN nhìn thấy đúng các trang/quyền; nêu rõ kết quả nào mới là kiểm tra mã nguồn và kết quả nào đã test trên trình duyệt.
- Giữ `NEXT_PUBLIC_ENABLE_REAL_WRITE=false` ở bản chạy thử chưa được phê duyệt ghi. Lưu ý biến `NEXT_PUBLIC_*` được nhúng khi build Next.js: sau thay đổi phải build/redeploy lại đúng môi trường.
- Nếu chưa có địa chỉ truy cập ổn định, cung cấp rõ một lệnh khởi chạy và điều kiện để mở trên thiết bị khác, không báo rằng PWA đã triển khai hosting.

## 6. Chuẩn bị triển khai Cloud DEV — chỉ preflight, chưa thực hiện

Đọc kết quả Cloud Preflight trước đó; rà soát đúng ref `euswzyespwaxyrjkfkrq`, migration list, backups/restore plan và kế hoạch smoke tests sau khi triển khai.

**Giữ hai phê duyệt độc lập:**

- **A.** Triển khai migration 005–008 lên **Supabase Cloud DEV** (chỉ khi Chủ dự án chấp thuận rõ ràng).
- **B.** Bật `NEXT_PUBLIC_ENABLE_REAL_WRITE=true` trên **bản PWA UAT**, sau khi schema Cloud đã sẵn sàng và Chủ dự án chấp thuận riêng.

Việc AG đã tạo tài khoản UAT **không đồng nghĩa** với việc được phép tự triển khai migration hay tự bật ghi dữ liệu Cloud.

**Cấm:** Cloud reset/repair; thay đổi Production; sửa các migrations 001–004 đã triển khai; ghi dữ liệu UAT tài chính thật; tự động bật Real Write; tự ý push 005–008.

## 7. Hồ sơ bàn giao

Tạo `SONCANG_UAT_HANDOFF_REPORT.md` gồm:

1. Tình trạng 7 tài khoản UAT, hướng dẫn nhận thông tin đăng nhập an toàn, không lộ mật khẩu.
2. Địa chỉ truy cập PWA hoặc hướng dẫn khởi chạy chính xác.
3. Kết quả sửa smoke test và thao tác xe ra riêng: mã nguồn thay đổi, lệnh test, exit code.
4. TypeScript, ESLint, Next.js build và kết quả kiểm tra UI thực tế.
5. Trạng thái migrations Cloud DEV và Real Write (phải vẫn OFF nếu chưa có phê duyệt).
6. Hai hành động chờ Chủ dự án phê duyệt và kế hoạch chạy UAT từng vai trò sau khi được duyệt.

**Kết thúc nhiệm vụ: DỪNG tại điểm chờ phê duyệt Cloud DEV.** Ưu tiên cho Chủ dự án sớm đăng nhập trải nghiệm PWA; không kéo dài thêm các vòng kiểm toán không cần thiết.
