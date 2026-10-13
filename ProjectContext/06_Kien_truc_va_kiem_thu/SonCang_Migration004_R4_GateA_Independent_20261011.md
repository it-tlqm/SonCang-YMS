# SƠN CẢNG YMS — BÁO CÁO KIỂM TOÁN ĐỘC LẬP GATE A / MIGRATION 004 R4

**Ngày:** 11/10/2026  
**Dự án:** Website + PWA Phần mềm quản lý bến bãi/cảng cạn Sơn Cảng — Công ty Cổ phần Tà Lùng Quang Minh  
**Cloud DEV cần bảo vệ:** `son-cang-yms-dev`, Project Ref `euswzyespwaxyrjkfkrq`.

## Kết luận

**GATE A: ĐẠT CÓ ĐIỀU KIỆN — SẴN SÀNG CHUYỂN SANG KIỂM THỬ POSTGRESQL LOCAL BIỆT LẬP (GATE B).**

**KHÔNG phê duyệt `db push` lên Supabase Cloud DEV.** Đây là kết quả kiểm toán mã nguồn tĩnh có trọng tâm, không phải xác nhận đã chạy PostgreSQL thật.

## 1. Bằng chứng đã xác minh độc lập

Đã mở trực tiếp `migration_004_code_bundle_R4.zip` và đối chiếu với báo cáo Antigravity:

- SHA-256 của ZIP: `e010e17be9c0802ee684006709e7ea2cc831dba6d6ba63728101988b305a96d3` — **trùng khớp**.
- ZIP có 5 tệp: Migration 004 SQL, pgTAP SQL, TypeScript types, script kiểm tra tĩnh, báo cáo kỹ thuật.
- Migration chứa **4 bảng**: `app_vehicle_types`, `app_vehicle_visits`, `app_container_visits`, `app_container_number_changes`; có **8 RPC**.
- Bộ test khai báo `plan(75)` và script kiểm tra đếm được **75 lời gọi assertion cấp cao nhất**. Điều này **không có nghĩa 75 bài test đã PASS PostgreSQL**.
- Đã thực thi `node scripts/audit_test_004.js` trên nội dung ZIP: exit code **0**.
- Kiểm tra âm: cố ý đổi `plan(75)` thành `plan(74)` **chỉ trong một bản sao tạm**, chạy lại script và nhận exit code **1**. Lỗi “báo sai nhưng thoát mã 0” của vòng R3 đã được sửa.
- **Chưa chạy Migration 004 trên PostgreSQL**, chưa truy vấn trực tiếp Cloud DEV. Trạng thái Cloud giữ ở Migration 003 là thông tin do Antigravity báo cáo, chưa được xác minh từ xa trong vòng này.

## 2. Đối chiếu 9 phát hiện R3

| Mã | Kết quả đối chiếu trong mã nguồn R4 | Trạng thái |
|---|---|---|
| R3-01 — Sai thứ tự fixture kiểm tra FK | Tạo `TEST_RESTRICT_TYPE` và lượt xe tham chiếu rồi mới kiểm tra `DELETE` bị chặn (`tests` khoảng dòng 362–395). | **Đã sửa tĩnh; chờ runtime** |
| R3-02 — Đổi tên làm mất cấu hình loại xe | `sc_manage_vehicle_type` dùng cập nhật kiểu patch, giữ lại các trường không truyền (`migration` dòng 441–450). | **Đã sửa tĩnh; chờ runtime** |
| R3-03 — Thay giá bỏ qua AP10 | Chặn thay giá đã có và gán giá khi thêm xe mới qua RPC danh mục (`migration` dòng 430–439). | **Đã chặn đường vòng; AP10 phiên bản giá thuộc 006** |
| R3-04 — Tạo trùng khi retry | Hai unique index theo `idempotency_key`, RPC xử lý replay và `unique_violation` (`migration` dòng 113–116, 203–206, 526–597, 719–819). | **Đã bổ sung; cần thử đồng thời** |
| R3-05 — Script kiểm tra trả exit 0 sai | Đã tự kiểm tra âm: `plan(74)` cho exit 1. | **Đã xác minh độc lập** |
| R3-06 — Gọi test tuần tự là concurrency | Assertion 42 đổi nhãn thành kiểm tra tính duy nhất của Database; không nhận là bài thử hai kết nối. | **Đã sửa; concurrency chờ Gate B** |
| R3-07 — Không chặn bãi vô hiệu hóa | `sc_create_container_visit` kiểm tra `app_yards.is_active` (`migration` dòng 702–706). | **Đã sửa tĩnh; chờ runtime** |
| R3-08 — Trạng thái/giờ xuất bãi bất nhất | Thêm hai CHECK về timestamp và fixture hủy hợp lệ (`migration` dòng 92–95, 165–169; `tests` dòng 1118–1133). | **Đã sửa tĩnh; chờ runtime** |
| R3-09 — Thông báo cứng loại xe | Kiểm tra cờ `allows_container` và thông báo theo cấu hình (`migration` dòng 769–776). | **Đã sửa tĩnh** |

**Nhận định:** Trong phạm vi 9 phát hiện R3, chưa thấy bằng chứng về lỗi P0/P1 mới đủ để buộc mở thêm vòng sửa R5 *trước* khi chạy PostgreSQL. Nếu runtime phát hiện lỗi nghiêm trọng, chỉ sửa đúng lỗi và chạy lại test liên quan.

## 3. Các điểm cần kiểm tra tiếp, không chặn Gate B

### LG-01 — Idempotency mới so sánh một phần payload

- Lượt xe: kiểm tra key + `vehicle_type` + `license_plate`, chưa so sánh tên/lien hệ tài xế, mã vé và ghi chú (`migration` dòng 534–539, 588–593).
- Lượt container: kiểm tra key + số container + xe vào, chưa so sánh kích thước và loại container (`migration` dòng 727–732, 809–814).
- **Thử ở Gate B:** gửi lại cùng key và cùng biển/loại xe nhưng đổi tên tài xế; gửi lại key container nhưng đổi kích thước. Nếu RPC trả ID cũ như thể payload giống hệt, phải ghi nhận và đánh giá để sửa trước Cloud khi ảnh hưởng tính đúng đắn dữ liệu.

### LG-02 — Bổ sung kiểm tra quyền thực thi bằng PostgreSQL role `authenticated`

- Bộ pgTAP đã có hai assertion RLS chạy dưới `SET LOCAL ROLE authenticated`; nhiều test RPC ALLOW/DENY khác dùng JWT claims giả lập trong session có đặc quyền.
- Gate B phải kiểm tra cả quyền EXECUTE thực tế của `authenticated`, sự từ chối `anon`, role inactive/hết hạn, scope khác bãi và giao dịch sai quyền.

### LG-03 — Giới hạn AP10 trong Migration 004

Danh mục loại xe có thể được mở rộng nhưng loại xe mới **chưa có giá đã phê duyệt sẽ không được tiếp nhận**. RPC danh mục hiện chặn sửa giá; quy trình ban hành bảng giá có phiên bản và nguyên tắc Four-Eyes được triển khai ở Migration 006. Không được coi chức năng thay giá đã hoàn thiện.

## 4. Hướng dẫn Gate B — Chạy PostgreSQL thực tế nhưng KHÔNG đụng Cloud

**Chỉ thực hiện khi người dùng đồng ý cho chạy môi trường LOCAL.**

1. Xác nhận đúng workspace, CLI và danh sách migrations 001–004. Không chạy `db push --linked`, không sử dụng bất kỳ kết nối hay thao tác DDL trên Cloud DEV.
2. Nếu cần, bật Docker Desktop tạm thời để chạy **Supabase Local**; kiểm tra trạng thái local trước khi áp dụng migration. Không sử dụng `db reset` khi chưa có sự đồng ý riêng vì có thể xóa dữ liệu local hiện hữu.
3. Áp dụng 004 **chỉ trên Local**, chạy `npx supabase test db --local` sau khi xác nhận cách CLI áp dụng migration tương ứng. Không được nhận “test chạy” là đủ nếu 004 thực tế chưa tồn tại trên DB test.
4. Thu thập **exit code, TAP output, SQLSTATE và số assertion PASS/FAIL thực tế**. Kiểm tra cả bài RBAC 1B và test 004.
5. Chạy ít nhất hai tình huống **hai kết nối PostgreSQL đồng thời**: cùng idempotency key và cùng số container đang trong bãi. Kiểm tra không tạo trùng, không ghi phí/audit trùng, transaction an toàn.
6. Kiểm tra `authenticated` / `anon` cùng scope An ninh, CCKB, Điều phối; kiểm tra bãi khác, vai trò vô hiệu hóa và hết hạn.
7. Kiểm tra mismatch payload của idempotency key theo LG-01; ghi backlog theo mức độ thực tế. Nếu có P0/P1, sửa mã và chạy lại các test liên quan, không tạo thêm vòng kiểm toán tĩnh toàn diện nếu không cần.
8. Bài test dữ liệu phải chạy trong transaction/fixture biệt lập và rollback. Xuất ZIP kết quả runtime. Khi xong, tắt Supabase Local và thoát Docker để tiết kiệm RAM.
9. **Chỉ khi runtime đạt mới đề xuất Gate C:** xem lại migration và xin phê duyệt riêng để triển khai lên chính xác Cloud DEV `euswzyespwaxyrjkfkrq`.

## 5. Quyết định nghiệm thu

- **Gate A → Gate B:** ĐẠT CÓ ĐIỀU KIỆN, được đề xuất chạy test LOCAL sau khi người dùng cho phép.
- **Gate B → Gate C:** Chỉ khi có log PostgreSQL runtime thật, không còn P0/P1 và đã xử lý các sai lệch nghiêm trọng.
- **Cloud DEV:** CHƯA PHÊ DUYỆT PUSH. Tuyệt đối không xem Gate A PASS là quyền triển khai từ xa.

*Phạm vi của ChatGPT: thẩm định độc lập các file trong ZIP người dùng tải lên; không truy cập máy Windows và không kiểm tra trạng thái Cloud trực tiếp.*
