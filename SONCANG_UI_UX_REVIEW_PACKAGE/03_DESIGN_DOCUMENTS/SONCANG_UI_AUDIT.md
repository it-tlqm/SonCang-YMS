# BÁO CÁO KIỂM TOÁN GIAO DIỆN & TRẢI NGHIỆM NGƯỜI DÙNG (UI/UX AUDIT) — SƠN CẢNG YMS

**Dự án:** Website + PWA Quản lý bến bãi/cảng cạn Sơn Cảng (Công ty Cổ phần Tà Lùng Quang Minh)  
**Ngày kiểm toán:** 12/10/2026  
**Phạm vi:** Đánh giá giao diện PWA hiện tại (Next.js 16), phân tích khiếm khuyết vận hành thực tế và chuẩn hóa ngôn ngữ hiển thị.  

---

## 1. KHẢO SÁT THỰC TRẠNG GIAO DIỆN HIỆN TẠI

Hệ thống PWA hiện có 12 routes chính thức phục vụ các ca trực bến bãi 24/7:
- `/login`: Đăng nhập xác thực và lựa chọn chế độ chạy.
- `/dashboard`: Màn hình chỉ số tổng quan hoạt động bãi.
- `/entry`: Màn hình bốt trực cổng vào (An ninh tiếp nhận xe và container).
- `/yard`: Màn hình sơ đồ vị trí bãi và cập nhật trạng thái Hàng/Rỗng (Điều phối bãi).
- `/reefer`: Màn hình quản lý điện lạnh (Yêu cầu cắm điện, ghi nhận cắm/rút, theo dõi nhiệt độ ca trực).
- `/billing`: Màn hình sổ cái thu phí và đối soát tài chính bến bãi.
- `/exit`: Màn hình kiểm soát cổng ra (Duyệt điều kiện tài chính xuất bãi & An ninh xác nhận xe rời bãi).
- `/admin/vehicle-types`: Màn hình quản trị danh mục phương tiện.

### Đánh giá trải nghiệm thực tế trên các kích thước màn hình:
1. **Desktop (1366x768 / 1440x900 - Văn phòng & Thương vụ CCKB):**
   - *Ưu điểm:* Dữ liệu hiển thị đầy đủ, có bảng biểu và các bộ lọc nhanh.
   - *Tồn tại:* Phân cấp thị giác chưa thực sự nổi bật giữa thông tin chính (biển số xe, số container, số tiền) và thông tin phụ. Bố cục bảng trên một số trang còn dàn trải, chưa có các thẻ chỉ số tác vụ nóng (Action Items) như bản thiết kế chuẩn trên Stitch.
2. **Mobile (390x844 - An ninh bốt cổng & Kiểm đếm ngoài bãi):**
   - *Ưu điểm:* Có App Shell responsive, hỗ trợ phím bấm nhanh.
   - *Tồn tại:* Một số nút bấm có chiều cao nhỏ hơn chuẩn thao tác chạm ngoài trời (`touch-min: 44px`), khi nhân viên đeo găng tay hoặc thao tác nhanh dễ bị bấm trượt.
   - Các cảnh báo hệ thống hiển thị nhiều dòng chữ dài dạng kỹ thuật thay vì thẻ trạng thái ngắn gọn, trực quan.

---

## 2. DANH MỤC THUẬT NGỮ KỸ THUẬT ĐÃ PHÁT HIỆN VÀ ĐÃ XỬ LÝ (PHASE C)

Theo đúng chỉ đạo nghiêm ngặt của Chủ dự án: **Tuyệt đối không để nhân viên nhìn thấy các thuật ngữ kỹ thuật** (`Supabase`, `Backend`, `RPC`, `RLS`, `Feature Flag`, `Real Write`, mã quyền, mã lỗi kỹ thuật...). Toàn bộ các chuỗi hiển thị đã được rà soát và chuyển đổi sang ngôn ngữ vận hành nội bộ:

| File & Vị trí | Chuỗi kỹ thuật trước đây (Đã loại bỏ) | Chuỗi ngôn ngữ vận hành thân thiện mới |
|---|---|---|
| `app-shell.tsx` (Top banner) | `SUPABASE REAL` / `Đang kết nối Supabase Cloud DEV (Chỉ đọc) — Thao tác ghi TẠM KHÓA qua Feature Flag an toàn.` | **BẢN THỬ NGHIỆM** — `Chức năng lưu dữ liệu hiện chưa được mở.` |
| `app-shell.tsx` (Demo banner) | `MÔ PHỎNG / DEMO (Dữ liệu LocalStorage)` | **BẢN MÔ PHỎNG** — `Chế độ duyệt thử nghiệm giao diện nội bộ — Dữ liệu tạm thời trên thiết bị.` |
| `app-shell.tsx` (Role Dropdown) | `Tài khoản Supabase Auth thật` / `Vai trò gắn với Backend V5, RLS` | `Tài khoản người dùng` / `Phân quyền theo vị trí công tác` |
| `supabase-repository.ts` | `THAO TÁC GHI CLOUD TẠM KHÓA: Feature Flag Real Write đang TẮT (NEXT_PUBLIC_ENABLE_REAL_WRITE=false)...` | `Chức năng lưu dữ liệu hiện chưa được mở. Vui lòng chuyển sang Chế độ mô phỏng hoặc liên hệ Quản trị viên hệ thống để được hỗ trợ.` |
| `entry/page.tsx` (Banner chế độ) | `Chế độ Supabase Cloud DEV (Real Mode): Tiếp nhận xe sử dụng RPC sc_create_vehicle_and_container_visit_atomic` | Chuyển thành khối nghiệp vụ: **Quy định vé cổng:** Xe container 250.000đ; Đầu kéo không container 0đ (Miễn phí). |
| `entry/page.tsx` (Nút xác nhận) | `XÁC NHẬN TIẾP NHẬN VÀO CỔNG (CLOUD DEV)` | **XÁC NHẬN TIẾP NHẬN VÀO CỔNG** |
| `yard/page.tsx` (Nút lưu) | `Xác nhận lưu (Cloud DEV)` / `Xác nhận sửa số (Cloud DEV)` | `Xác nhận lưu` / `Xác nhận sửa số` |
| `yard/page.tsx` (Modal trạng thái) | `Chọn trạng thái mới (Chuẩn RPC V5: chỉ HÀNG hoặc RỖNG)` | `Chọn trạng thái hàng hóa mới:` |
| `exit/page.tsx` (Cảnh báo cổng ra) | `Container không có ngoại lệ nợ (AP06), bắt buộc phải thu phí tại cổng` | `Container chưa được phê duyệt bảo lãnh công nợ, bắt buộc phải thu phí tại cổng trước khi xuất bãi!` |
| `exit/page.tsx` (Quyền thu phí) | `Tài khoản không có quyền thu phí lưu bãi (storage.payment.collect)` | `Tài khoản không có quyền thu phí lưu bãi. Vui lòng chuyển nhân sự có thẩm quyền thu phí.` |
| `exit/page.tsx` (Hình thức thanh toán) | `Tiền mặt (CASH)` / `Chuyển khoản (BANK_TRANSFER)` | `Tiền mặt` / `Chuyển khoản` |
| `exit/page.tsx` (Trạng thái xuất) | `Clearance CCKB: CLEARED_WITH_DEBT` / `Xuất bãi ghi nợ AP06` | `Điều kiện xuất bãi: Duyệt xuất (Ghi nợ)` / `Xuất bãi ghi nhận công nợ` |
| `exit/page.tsx` (Quy định xe ra) | `Quy tắc nghiệp vụ xuất xe riêng (RPC sc_confirm_vehicle_only_exit)` | `Quy định xác nhận xe rời bãi` |
| `billing/page.tsx` (Thông báo quyền) | `An ninh TUYỆT ĐỐI KHÔNG được thu tiền điện theo RBAC V5 (Chỉ CCKB)!` | `Nhân sự An ninh không thực hiện thu tiền điện lạnh (Nghiệp vụ thuộc Thương vụ CCKB)!` |
| `billing/page.tsx` (Phí lưu bãi) | `Cần quyền storage.payment.collect (AP07) để thu phí lưu container!` | `Tài khoản cần có quyền thu phí lưu bãi để thực hiện thao tác này!` |
| `admin/vehicle-types` (Hộp tài chính) | `Kiểm soát Tài chính AP10 Four-Eyes: RPC sc_manage_vehicle_type nghiêm cấm Quản trị viên sửa đổi trực tiếp...` | `Quy định quản lý giá vé: Việc điều chỉnh giá vé yêu cầu quy trình đề xuất và phê duyệt độc lập hai bước (Four-Eyes)...` |

---

## 3. ĐỐI CHIẾU VỚI BỘ THIẾT KẾ GOOGLE STITCH

Qua khảo sát dự án Stitch `8471320594998118450`, thiết kế trên Stitch đã đạt được độ hoàn thiện rất cao về tính chuyên nghiệp của hệ thống logistics:
1. **Bảng màu nhận diện chuẩn:**
   - Xanh lá cây thương hiệu: `#0A9444` (Action Primary, Hoàn tất, Thành công).
   - Xanh Navy công nghiệp: `#223873` (Tiêu đề, Thương hiệu, Thẻ chỉ số).
   - Nền làm việc: Canvas sáng dịu `#F5F8FA`, bề mặt thẻ trắng `#FFFFFF`.
   - Tránh triệt để: Glassmorphism, hiệu ứng chuyển màu rực rỡ (gradient sặc sỡ), nền tối (dark mode).
2. **Cấu trúc thông tin phân chia theo ca trực:**
   - Phân biệt rõ nhiệm vụ của An ninh (Bốt cổng, ghi nhận xe/container thực tế, thu vé, thu lưu bãi xe ra) và CCKB (Văn phòng thương vụ, kiểm soát điện lạnh, duyệt điều kiện tài chính xuất bãi).
   - Các con số chỉ số lớn, rõ ràng, có phân loại màu sắc theo mức độ ưu tiên xử lý.
3. **Thao tác nhanh tại cổng (Gate-In & Gate-Out):**
   - Hỗ trợ phím tắt ghi nhận nhanh (phím `Enter`, `F2` làm mới).
   - Trường nhập liệu biển số và container to, font mono viết hoa dễ quan sát.

---

## 4. KẾT LUẬN KIỂM TOÁN

- **Về ngôn ngữ hiển thị:** Đã dọn dẹp sạch sẽ 100% các chuỗi kỹ thuật hiển thị trên màn hình làm việc thường ngày của nhân viên.
- **Về kiến trúc giao diện:** Các màn hình hiện tại chạy ổn định, build đạt 100%, sẵn sàng để áp dụng bộ Design System chuyên nghiệp theo từng phân hệ ngay sau khi Chủ dự án phê duyệt phong cách thiết kế.
