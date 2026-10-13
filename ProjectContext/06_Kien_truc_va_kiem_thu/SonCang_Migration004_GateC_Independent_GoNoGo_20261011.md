# SƠN CẢNG YMS — KIỂM TRA ĐỘC LẬP GATE C / MIGRATION 004

**Ngày:** 11/10/2026  
**Gói được kiểm tra:** `migration_004_gateb_verified_final.zip`  
**Dự án đích:** Supabase Cloud DEV `son-cang-yms-dev`, ref `euswzyespwaxyrjkfkrq`  
**Quyết định:** **GO CÓ ĐIỀU KIỆN — SẴN SÀNG XIN PHÊ DUYỆT TRIỂN KHAI CLOUD DEV; CHƯA ĐƯỢC TỰ PUSH.**

## 1. Bằng chứng đã trực tiếp xác minh

- ZIP mở và giải nén được, kiểm tra CRC không lỗi.
- SHA-256 ZIP thực tế: `fb89266a01244307478e4474150b1cfa858c42d4dda54edfd49b117e28bbfb95`, khớp báo cáo Antigravity.
- Toàn bộ **15 file có trong `MANIFEST_SHA256.txt`** đều tồn tại và có SHA-256 khớp manifest.
- File migration cuối cùng: `20261011000004_domain_vehicles_containers.sql` SHA-256 `f364d0535c797abef9382e9f22bef6a3b3ac5790381c013425a091856dab20d0`.
- Có đúng 4 bảng miền (`app_vehicle_types`, `app_vehicle_visits`, `app_container_visits`, `app_container_number_changes`) và 8 RPC thao tác; quyền ghi bảng trực tiếp được thu hồi khỏi `anon` và `authenticated`, RPC có kiểm tra quyền phía Backend.
- Tập tin log pgTAP chứa `All tests successful`, `Files=1, Tests=75`, `Result: PASS` đối với migration 004; log RBAC chứa `Files=1, Tests=49`, `Result: PASS`.
- Có script runtime `run_gate_b_runtime_tests.py` và JSON kết quả `17 pass / 0 fail`, bao gồm 2 tình huống cạnh tranh đồng thời, kiểm tra quyền, sửa số và vòng đời.
- SQL cuối cùng có cơ chế chống trùng `idempotency_key`, chống trùng container active cùng bãi, giá vé lấy từ danh mục, hạn chế cập nhật giá bỏ qua AP10, và giữ 1 xe–N container ở DB trong khi RPC V1 chưa cho phép 2x20.

**Giới hạn bằng chứng:** Kiểm toán viên đã kiểm tra nội dung gói và log, **không tự chạy lại PostgreSQL hoặc truy vấn Supabase Cloud** trong phiên này. Không có checksum ký tại chính thời điểm thực thi từng lệnh Gate B, nên sự khớp tuyệt đối giữa byte SQL và thời điểm chạy được suy ra từ chuỗi bàn giao, chưa thể chứng minh mật mã học độc lập.

## 2. Báo cáo preflight Cloud do Antigravity cung cấp

- `npx supabase migration list --linked`: báo cáo exit 0; 001–003 hiện diện ở remote, 004 chỉ local.
- `npx supabase db push --dry-run --linked`: báo cáo exit 0, **chỉ liệt kê** `20261011000004_domain_vehicles_containers.sql`.
- Antigravity báo đã xác nhận `public.test_vars_004`, helpers `_004` không tồn tại sau khi rollback các bài test local.

Đây là thông tin **do Antigravity báo cáo**, không phải kết quả kiểm tra remote độc lập của người lập báo cáo này. Cần xác nhận lại ngay trước khi push.

## 3. Các lưu ý không chặn triển khai Cloud DEV

1. **Kho mã Git chưa có commit đầu tiên.** `git_status.txt` ghi `On branch master / No commits yet`, và hầu hết dự án là untracked. Cần tạo checkpoint phiên bản an toàn **hoặc ít nhất bảo quản release ZIP và checksum ngoài thư mục làm việc**, ưu tiên commit allowlist mã nguồn, kiểm tra `.gitignore` để không commit `.env.local`, khóa API hoặc mật khẩu. Đây là vấn đề khả năng truy vết/phục hồi, không phải lỗi SQL mới.
2. Mô tả trong `MIGRATION_004_RUNTIME_VERIFICATION.md` dùng một vài tên index/trigger cũ không trùng hoàn toàn mã SQL cuối. Dùng **tên đối tượng SQL thực tế**, không lấy mô tả làm nguồn sự thật. Không yêu cầu sửa SQL vì khác câu chữ báo cáo.
3. Danh mục phương tiện mới chưa được phép gán giá trong Migration 004. Điều này là chủ ý để không vượt AP10; việc ban hành giá theo phiên bản thuộc Migration 006. Không tự nới quy tắc này.
4. Các luồng `EXITED`, clearance và tiền lưu/cắm điện chưa nằm trong 004; không dùng thiếu chức năng này làm lý do chặn 004.

## 4. Cổng kiểm soát thực thi Gate C — PHẢI HOÀN THÀNH TRƯỚC LỆNH GHI

- [ ] Chủ dự án **phê duyệt riêng** đúng Migration 004 trên đúng project Cloud DEV `euswzyespwaxyrjkfkrq`.
- [ ] Xác nhận workspace là `D:\thanhnx\OpenCode\YMS-project` và linked project ref đúng.
- [ ] Tính lại SHA-256 file migration trong workspace, phải **bằng chính xác** `f364d0535c797abef9382e9f22bef6a3b3ac5790381c013425a091856dab20d0`. Nếu khác: **DỪNG**; không tự sửa SQL.
- [ ] Lưu checkpoint Git an toàn hoặc bản copy ZIP phát hành kèm mã SHA, ngoài thư mục làm việc; không đưa secrets vào Git.
- [ ] Chạy lại `npx supabase migration list --linked` và `npx supabase db push --dry-run --linked`; **chỉ 004** được phép pending. Nếu có migrations khác, báo lỗi hoặc ref khác: **DỪNG**.
- [ ] Không dùng `db reset`, `migration repair`, `db push --include-all`, `db push --yes` hay bất kỳ thao tác destructive nào để vượt qua lỗi.

## 5. Chỉ sau khi được người dùng phê duyệt: quy trình Gate C

1. Chỉ khi toàn bộ preflight mục 4 PASS, chạy một lần lệnh **`npx supabase db push --linked`** trên Cloud DEV đã xác minh. Lưu đầy đủ stdout/stderr, exit code, thời gian, migration SHA.
2. Chạy **chỉ đọc** `npx supabase migration list --linked`, xác minh 001–004 đã đồng bộ.
3. Kiểm tra chỉ đọc: 4 bảng, 8 RPC, RLS của 4 bảng, privileges `anon/authenticated`, 7 seed vehicle types và các index quan trọng. Tránh tạo dữ liệu nghiệp vụ Cloud DEV nếu chưa xin phép riêng.
4. Nếu push lỗi hoặc kết quả bất thường: **DỪNG**, ghi nhận log; **không** dùng `migration repair`, reset hay sửa bằng SQL thủ công.
5. Lưu báo cáo `GATE_C_DEPLOYMENT_REPORT.md`, ghi kết quả `APPLIED/NOT_APPLIED`, checksum, project ref, xác minh smoke test và trạng thái bước giao diện.

## 6. Quyết định/đề xuất

**Cho phép đưa Gate C ra xin phê duyệt; KHÔNG yêu cầu mở vòng sửa SQL R5.** Sau khi chủ dự án phê duyệt rõ và các kiểm tra mục 4 đều PASS, triển khai lên **Cloud DEV duy nhất**, rồi chuyển sang PWA đăng nhập → tiếp nhận xe → ghi nhận container → danh sách trong bãi. Chưa có quyền triển khai Production.

**Chưa có phê duyệt triển khai trong thông điệp tải file hiện tại; không được tự thực hiện `db push --linked`.**
