# Hồ sơ Ngữ cảnh An ninh & Baseline Kiểm toán (Security Context)

**Dự án:** Quản lý bến bãi/cảng cạn Sơn Cảng (YMS — Cảng cạn Tà Lùng Quang Minh)  
**Thời điểm lập:** 16/10/2026 22:55:00 +07:00  
**Tài liệu chỉ dẫn:** `AGENT_FULL_AUDIT_AND_FIX.md` (Phiên bản 1.0) — Áp dụng Profile 3.3  

---

## 1. Thông tin Định danh & Baseline
| Trường | Giá trị thực tế |
|---|---|
| **Repository / workspace** | `d:\thanhnx\OpenCode\YMS-project` |
| **Git Baseline** | Branch `main`, Commit HEAD `81de451` (`feat: Bo sung Modal In ve xe vao bai POS 80mm va Co che giam sat mang PWA Offline`), working tree clean |
| **Hệ điều hành / Runtime** | Windows 11 / Node.js v20+ / pnpm v12.10.1 |
| **Framework & Stack** | Next.js 16.4.0 (App Router, Turbopack, Cache Components, PPR), React 19.3.0, TypeScript 5, Tailwind CSS v4, Lucide React 1.55.0, ExcelJS 4.4.0, XLSX 0.18.5 |
| **Trạng thái Build Baseline** | `npx tsc --noEmit`: **PASS** (0 errors). `npx next build`: **PASS** (21/21 static routes + 1 dynamic API route) |

---

## 2. Thành phần Kiến trúc & Đích kết nối
| Thành phần | Công nghệ / Đích đến | Chế độ an toàn |
|---|---|---|
| **Frontend / PWA** | Next.js 16 App Router, Service Worker (`public/sw.js`), Web App Manifest | Client-side chỉ dùng `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **Backend / API** | Next.js Server Actions & Route Handler (`src/app/api/admin/users/reset-password`) | Chạy phía Server, bảo vệ secret role key |
| **Cơ sở dữ liệu (Database)** | PostgreSQL (Supabase Cloud DEV) | `NEXT_PUBLIC_ENABLE_REAL_WRITE="false"` (Chế độ Real Write tắt, fallback Mock Repository an toàn) |
| **Auth & Phân quyền** | Supabase Auth (`@supabase/ssr`), Session Cookie, Role-Based Access Control (RBAC) V5 | Phân định nghiêm ngặt 5 vai trò nghiệp vụ |
| **Storage / File Upload** | Local static assets / Supabase Storage (khi kích hoạt) | Chặn file độc hại, giới hạn định dạng hình ảnh/tài liệu |
| **Export Báo cáo** | ExcelJS & SheetJS | Cần kiểm soát triệt để CSV/Excel Formula Injection |

---

## 3. Vai trò Nghiệp vụ (RBAC V5) & Quyền hạn
Theo tài liệu nghiệp vụ V5 và `HUONG_DAN_TRIEN_KHAI_RBAC_PWA_SON_CANG.md`:
1. **AN_NINH (Bảo vệ cổng vào / cổng ra):**
   - Đăng ký xe vào bãi, quét CCCD, in vé giấy POS 80mm, thu tiền vé vào cổng.
   - Kiểm tra điều kiện xe xuất bãi (đã thanh toán đủ vé, tiền điện, phí lưu bãi, đã rút phích điện reefer).
2. **DIEU_PHOI (Điều hành bãi):**
   - Phân bổ vị trí đỗ bãi, quản lý sơ đồ bãi (Yard Map), theo dõi công suất.
3. **KY_THUAT_DIEN (Kỹ thuật điện lạnh / Reefer):**
   - Ghi nhận cắm/rút điện container lạnh, ghi số điện (kWh đầu/cuối), kiểm tra nhiệt độ container.
4. **KE_TOAN / THU_NGAN (Kế toán & Thu ngân):**
   - Tính toán phí lưu bãi (qua đêm mốc 22:00, miễn đêm đầu), tính tiền điện cắm rút (làm tròn 5.000đ), thu tiền xuất bãi, đối soát ca.
5. **QUAN_TRI (Ban quản trị / Admin):**
   - Cấu hình biểu phí V5, quản lý người dùng, xem nhật ký kiểm toán (Audit Logs), cấu hình danh mục.

---

## 4. Ràng buộc An toàn & Giới hạn Thực thi (Profile 3.3)
- **TUYỆT ĐỐI KHÔNG:** Reset database (`supabase db reset`), sửa/xóa migration cũ 001–004, tự tạo/apply migration vào DB production/cloud.
- **TUYỆT ĐỐI KHÔNG:** Bật `NEXT_PUBLIC_ENABLE_REAL_WRITE="true"` khi chưa có phê duyệt bằng văn bản từ người dùng.
- **TUYỆT ĐỐI KHÔNG:** Đổi cấu trúc RBAC/RLS hoặc tự động gán trạng thái CHỐT cho các mục UAT còn mở trong `OPEN_DECISIONS_UAT.md`.
- **TUYỆT ĐỐI KHÔNG:** Để lộ `SUPABASE_SERVICE_ROLE_KEY` ra phía client bundle hoặc log.
- **TUYỆT ĐỐI KHÔNG:** Tự động sửa/gộp container theo 7 số cuối, check-digit hay fuzzy match.

---

## 5. Phạm vi Kiểm toán 32 Nhóm SEC & Kế hoạch
- Thực hiện rà soát chuyên sâu toàn bộ codebase `src/`, `public/`, `next.config.ts`, `middleware.ts`.
- Ghi nhận mã phát hiện theo chuẩn `F-xxx`.
- Sửa cục bộ nguyên nhân gốc và bổ sung kiểm thử hồi quy tự động.
