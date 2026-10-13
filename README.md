# Phần mềm Quản lý Bến bãi / Cảng cạn Sơn Cảng (SonCang-YMS)

**Đơn vị chủ quản:** Công ty Cổ phần Tà Lùng Quang Minh  
**Địa bàn hoạt động:** Bến bãi Cửa khẩu Quốc tế Tà Lùng — Tỉnh Cao Bằng  

---

## 📌 Giới thiệu dự án

Hệ thống Website & PWA **Quản lý Bến bãi Sơn Cảng (YMS)** phục vụ số hóa toàn diện quy trình tiếp nhận phương tiện, quản lý hạ bãi / lưu bãi container, dịch vụ cắm & rút điện container lạnh (Reefer), đối soát thu phí bến bãi theo ca trực và kiểm soát an ninh xuất bãi.

---

## 🚀 Các phân hệ vận hành chính

1. **Tổng quan Vận hành (`/dashboard`):** Bảng chỉ huy trực quan thời gian thực theo dõi tổng lượng xe trong bãi, container tồn bãi, công suất nguồn điện Reefer và doanh thu ca trực.
2. **Tiếp nhận Cổng vào (`/entry`):** Quản lý xe vào bãi, nhận diện tài xế quen, phát hành vé cổng và in phiếu tiếp nhận nhanh chóng (`Ctrl + Enter`).
3. **Bãi & Điều phối (`/yard`):** Sơ đồ phân khu bãi, quản lý cặp Xe — Cont, cập nhật trạng thái HÀNG / RỖNG, heatmap cảnh báo thời gian lưu bãi (<24h, ≥24h, ≥48h), tiếp nhận cont lẻ hạ bãi.
4. **Dịch vụ Điện Container Reefer (`/reefer`):** Giám sát cắm / rút điện, live ticker tính cước thời gian thực theo block 15 phút, quy trình duyệt thương vụ CCKB, nhập đối soát bằng chứng Zalo giắc điện.
5. **Thu phí & Sổ cái Bến bãi (`/billing`):** Thu tiền mặt & chuyển khoản QR, quản lý sổ cái khoản thu & công nợ, bảng kê bàn giao ca trực và chứng từ nộp tiền.
6. **Kiểm soát Cổng ra & Xuất bãi (`/exit`):** Đối soát 4 điều kiện xuất bãi (Vé cổng, Điện cont, CCKB duyệt xuất, Thanh toán nợ), ghi nhận thời điểm xe rời bãi.
7. **Thống kê & Báo cáo Quản trị (`/reports`):** Báo cáo chỉ số KPI, sản lượng xe theo chủng loại, doanh thu theo ngày và theo từng nguồn thu.
8. **Quản trị & Kiểm toán (`/admin`):** Biểu cước bến bãi, phân quyền vai trò người dùng (RBAC V5), danh mục phương tiện, nhật ký kiểm toán (Audit Logs).
9. **Xuất Báo cáo Excel Chuyên nghiệp:** Tích hợp mô-đun sinh file `.xlsx` chuẩn OpenXML với styling thương hiệu, căn lề, viền kẻ ô và định dạng số kế toán.

---

## 🛠️ Công nghệ sử dụng

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript
- **Styling & UI:** Tailwind CSS, Lucide Icons, Mobile-first Responsive & PWA
- **Báo cáo & Xuất dữ liệu:** ExcelJS (Tạo file .xlsx đa sheet có styling doanh nghiệp)
- **Backend & Database:** Supabase (PostgreSQL, Row Level Security — RLS, Supabase Auth)
- **Bảo mật & Phân quyền:** RBAC V5 (Role-Based Access Control) với 7 nhóm vai trò nghiệp vụ (An ninh, CCKB, Điều phối, Kế toán, Quản trị).

---

## ⚙️ Cài đặt & Khởi chạy

### 1. Yêu cầu môi trường
- Node.js ≥ 20.x
- Quản lý gói: `pnpm` (khuyên dùng) hoặc `npm`

### 2. Cài đặt thư viện
```bash
pnpm install
```

### 3. Cấu hình biến môi trường
Tạo file `.env.local` từ mẫu `.env.example`:
```bash
cp .env.example .env.local
```

Điền các thông tin kết nối Supabase:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Chạy môi trường phát triển
```bash
pnpm dev
```
Truy cập ứng dụng tại: `http://localhost:3000`

### 5. Đóng gói & Chạy môi trường Production
```bash
pnpm build
pnpm start
```

---

## 📄 Bản quyền
© 2026 Công ty Cổ phần Tà Lùng Quang Minh. Mọi quyền được bảo lưu.
