# PROJECTCONTEXT — ĐỌC TRƯỚC KHI BẮT ĐẦU (SƠN CẢNG)

**Đơn vị:** Công ty Cổ phần Tà Lùng Quang Minh  
**Sản phẩm:** Website + PWA quản lý bến bãi Sơn Cảng  
**Baseline ban đầu:** V5 (11/10/2026)  
**Trạng thái:** hồ sơ đầu vào Antigravity; chưa phải kết quả UAT/production.  
**Vai trò của thư mục:** bộ nhớ bền vững theo file cho mọi phiên làm việc, tránh phụ thuộc vào lịch sử chat.

## 1. Thứ tự ưu tiên khi có thông tin khác nhau

1. **Quyết định mới nhất được người dùng trực tiếp xác nhận**, đã lưu có ngày vào `05_Nhat_ky_du_an/DECISION_LOG.md`.
2. `01_Nghiep_vu_V5/PROJECT_CONTEXT.md` và các sheet V5 trong workbook `02_RBAC_V5/PWA_Son_Cang_V5_Phan_quyen_RBAC_DONG_HOAN_THIEN.xlsx`.
3. Workbook V3 tổng hợp 117 câu trả lời đã ghi nhận.
4. V4 bản rà soát nghiệp vụ và UAT (chỉ tham khảo khi V5 chưa quy định, không được ghi đè V5).
5. UI/HTML/JS Stitch (mẫu tham khảo có lỗi được phát hiện); suy đoán kỹ thuật bắt buộc gắn nhãn **ĐỀ XUẤT/CHỜ XÁC NHẬN**.

Nếu nội dung mới xung đột V5, **không tự ý sửa tài liệu gốc**. Ghi rõ xung đột, xin xác nhận, cập nhật nhật ký quyết định và sau đó mới lập phiên bản mới được phê duyệt.

## 2. Bộ hồ sơ bắt buộc

| Đường dẫn | Vai trò |
|---|---|
| `01_Nghiep_vu_V5/PROJECT_CONTEXT.md` | Nguồn nghiệp vụ V5 ưu tiên, ràng buộc tiền/điện/ra-vào |
| `01_Nghiep_vu_V5/PWA_Son_Cang_V3_Tong_hop_V1_da_tra_loi_20261011.xlsx` | 117 trả lời, tình huống và lịch sử quyết định |
| `02_RBAC_V5/PWA_Son_Cang_V5_Phan_quyen_RBAC_DONG_HOAN_THIEN.xlsx` | 7 role V1; 67 permissions; 206 grants; ma trận & UAT |
| `02_RBAC_V5/HUONG_DAN_TRIEN_KHAI_RBAC_PWA_SON_CANG.md` | Hướng dẫn Supabase/RLS, kiểm tra quyền ở server |
| `02_RBAC_V5/RBAC_SON_CANG_SUPABASE_SCHEMA_SEED_DRAFT.sql` | **BẢN NHÁP THAM KHẢO**, phải review trước migration, không chạy production nguyên trạng |
| `03_UAT_Tai_lieu_lich_su/` | Quy tắc V4 & tình huống UAT, đã bị V5 ghi đè ở một số điểm |
| `04_UI_Stitch_tham_khao/` | Design System/UI hướng dẫn; không copy logic JS |
| `05_Nhat_ky_du_an/` | Trạng thái công việc, quyết định, vấn đề còn mở; cần cập nhật thường xuyên |
| `06_Kien_truc_va_kiem_thu/` | Kiến trúc kế hoạch và các cổng kiểm thử |

**Đối với RBAC:** đọc workbook thật (không suy từ UI). Tab `19_V5_VAI_TRO`, `20_V5_DANH_MUC_QUYEN`, `21_V5_CAP_QUYEN_SEED`, `22_V5_MA_TRAN_RBAC`, `23_V5_PHÊ_DUYỆT`, `24_V5_THAM_SO`, `25_V5_MAPPING_Q01_Q39`, `26_V5_LUONG_THAO_TAC`, `27_V5_RUI_RO_UAT`, `28_V5_CHANGELOG` là khu V5. Tab 04/17 lịch sử **không** dùng làm seed runtime.

## 3. Sáu nguyên tắc không được phá vỡ

1. **Xe ≠ container**: lượt xe và lượt container có ID bất biến độc lập; cho phép xe rời bãi không cont và xe khác kéo cont ra.
2. **Đúng trách nhiệm:** An ninh thao tác điện thực tế tại hiện trường, kiểm soát xe, thu vé/phí lưu; CCKB nhập/sửa giờ điện, thu điện, xác nhận tài chính; Điều phối quản lý HÀNG/RỖNG.
3. **Tiền điện ≠ tiền lưu:** phiên điện làm tròn lên từng 15 phút; phí lưu tính theo đêm và chỉ chốt tại giờ container ra thực tế. Giá lấy từ phiên bản cấu hình.
4. **Dữ liệu tiền có sổ sách:** charges, payments, allocations, debt, audit, amendment; không đánh dấu đã thu giả; tài chính/ra bãi trong transaction có idempotency.
5. **RBAC động:** dựa permission_code + scope và xác thực server/RLS; không hardcode role name vào API; không dùng service-role trên client.
6. **Stitch không phải phần mềm:** chỉ tham khảo UX, màu sắc và thành phần; HTML có dữ liệu/logic chưa đúng V5 (đặc biệt ISO và các ví dụ giá). Không copy nguyên vào sản phẩm.

## 4. Cách làm việc để không mất ngữ cảnh

- **Trước mỗi task:** mở `05_Nhat_ky_du_an/CURRENT_STATUS.md` và `OPEN_DECISIONS_UAT.md` + nguồn nghiệp vụ liên quan.
- **Trong task:** chia thay đổi nhỏ, có migration/test/backup trước thay đổi dữ liệu nhạy cảm.
- **Sau mỗi task:** ghi `WORK_LOG.md` nêu file sửa, trạng thái test, blocker, tiếp theo; cập nhật `CURRENT_STATUS.md`.
- **Khi người dùng chốt:** ghi `DECISION_LOG.md` (không thay quyết định trước đó mà không lưu vết).
- **Khi thiếu căn cứ:** tạo mục trong `OPEN_DECISIONS_UAT.md`, không bịa quy tắc.
- **Khi đổi spec:** chỉnh chỉ khi có xác nhận và bổ sung ngày/phiên bản, kiểm tra tác động dữ liệu/migration/API/UI/UAT.

> **Lưu ý:** Folder `ProjectContext` tự nó không bảo đảm mô hình AI đọc mọi tệp mỗi lần. File `AGENTS.md` và `.agents/rules/` ở thư mục gốc workspace được thêm để Antigravity nạp quy tắc và chỉ dẫn đọc bộ hồ sơ; tài liệu lớn vẫn cần AI mở đúng lúc.
