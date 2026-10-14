# Phân Hệ Kế Toán Bến Bãi Sơn Cảng — Kế Hoạch Triển Khai (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng hoàn chỉnh phân hệ Kế toán bến bãi Sơn Cảng (`/accounting`), bao gồm chốt & thu gom tiền mặt hiện trường không cố định giờ (có biên bản bàn giao 2 bên), quản lý xuất hóa đơn GTGT đa đối tượng (Doanh nghiệp MST & Cá nhân CCCD 12 số) kèm bảng kê Mẫu số 01:BPA, quản lý thu hồi công nợ AP07, và sổ quỹ dòng tiền xuất Excel đa sheet.

**Architecture:** Mở rộng hệ thống RBAC V5 trên PostgreSQL Supabase với bộ phận `KE_TOAN` và vai trò `ACCOUNTANT`. Bảo toàn tính bất biến của sổ cái thanh toán `app_payments` bằng bảng quan hệ trung gian `app_cash_settlement_items`. Thiết lập các RPC `SECURITY DEFINER` giao dịch tài chính an toàn. Xây dựng giao diện Next.js 16 App Router chuẩn công thái học cảng cạn với 4 tab nghiệp vụ chuyên sâu, form hóa đơn linh hoạt và mẫu in biên bản bàn giao đạt chuẩn kế toán.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Supabase Database (PostgreSQL 15), RPC Stored Procedures, `ExcelJS` (báo cáo OpenXML), Lucide Icons.

**Spec:** [docs/superpowers/specs/2026-10-14-accounting-subsystem-design.md](file:///d:/thanhnx/OpenCode/YMS-project/docs/superpowers/specs/2026-10-14-accounting-subsystem-design.md)

## Global Constraints

- **Bộ phận & Vai trò:** Mã bộ phận `KE_TOAN`, mã vai trò `ACCOUNTANT`, tên hiển thị "Kế toán Bến bãi".
- **Quyền hạn Action Permissions:** `accounting.shift_cash.collect`, `accounting.invoice.prepare`, `accounting.debt.manage`, `accounting.reports.view`.
- **Bảo toàn Sổ cái Bất biến:** Tuyệt đối KHÔNG chạy lệnh `UPDATE` hay `DELETE` trên `app_payments`; liên kết đợt chốt tiền mặt qua bảng trung gian `app_cash_settlement_items`.
- **Cơ chế Thuế Gross:** Đơn giá thu tại hiện trường là giá đã gồm VAT. Khi xuất HĐ GTGT (8% hoặc 10%), hệ thống tách ngược doanh thu và thuế, tổng tiền hóa đơn bằng đúng tổng tiền thu thực tế.
- **Hóa đơn CCCD & MST:** Form nhập bắt buộc hỗ trợ cả 2 chế độ: Cá nhân với CCCD 12 chữ số và Doanh nghiệp với MST 10 hoặc 13 chữ số.
- **Phân quyền truy cập:** Phân hệ `/accounting` chỉ cấp quyền cho vai trò `ACCOUNTANT` và `SYS_ADMIN`. Nhân viên hiện trường (An ninh, CCKB, Điều phối) không có quyền truy cập sổ quỹ.
- **Audit Logging:** Mọi hành vi chốt quỹ, lập hóa đơn, thu nợ, hủy hóa đơn đều ghi vào `app_audit_events`.

## Review Focus

1. **Kiểm tra chốt trùng tiền mặt:** Phiếu thu đã được Kế toán chốt ở đợt trước tuyệt đối không xuất hiện ở đợt chốt tiếp theo (kiểm tra `NOT EXISTS` trong `app_cash_settlement_items`).
2. **Kiểm tra định dạng CCCD:** Khi chọn xuất hóa đơn cá nhân, số CCCD phải đúng 12 chữ số (không nhận chữ, không nhận thiếu/thừa số).
3. **Kiểm tra khớp số tiền hóa đơn Gross:** Tổng tiền trước thuế + Tiền thuế VAT phải luôn khớp chính xác với tổng số tiền các khoản thu được chọn gom vào lô.
4. **Kiểm tra thu nợ bến bãi:** Kế toán thu nợ ghi nhận vào `app_payments` với `collector_dept = 'KE_TOAN'` không bị chặn bởi check constraint và tự động hoàn tất khoản nợ.
5. **Hiển thị chênh lệch tiền mặt:** Nếu Kế toán nhập số tiền thực đếm lệch so với sổ sách, bắt buộc phải nhập lý do chênh lệch mới cho phép xác nhận nộp quỹ.

---

### Task 1: Database Migration 28 & Cloud Database Sync

**Files:**
- Create/Modify: `supabase/migrations/20261014000028_accounting_settlement_and_invoicing.sql`
- Test: `scripts/test-migration-28.ts` (hoặc test script tương đương)

**Interfaces:**
- Produces:
  * Department: `KE_TOAN`
  * Role: `ACCOUNTANT`
  * Permissions: `accounting.shift_cash.collect`, `accounting.invoice.prepare`, `accounting.debt.manage`, `accounting.reports.view`
  * Tables: `app_cash_settlements`, `app_cash_settlement_items`, `app_invoices`
  * Constraints: `app_payments_collector_dept_check` cho phép `KE_TOAN`
  * RPCs: `sc_confirm_cash_settlement`, `sc_accounting_collect_debt`, `sc_create_or_update_invoice`, `sc_issue_invoice`
  * Seed user: `acc_01@soncang.vn` (Bùi Thị Lan)

- [ ] **Step 1: Hoàn thiện file migration `20261014000028_accounting_settlement_and_invoicing.sql`**
  Cập nhật migration 28 với cấu trúc bảng `app_cash_settlement_items`, nới lỏng check constraint `collector_dept` trên `app_payments` cho phép `KE_TOAN`, và định nghĩa 4 RPC bảo mật.

- [ ] **Step 2: Đẩy migration lên database Supabase Cloud qua `npx supabase db push`**
  Run: `npx supabase db push`
  Expected: Remote database synced, migration 28 applied với exit code 0.

- [ ] **Step 3: Viết test script kiểm tra quyền và RPC Kế toán**
  Tạo script kiểm tra gọi RPC `sc_confirm_cash_settlement` và `sc_accounting_collect_debt` trên database thực tế.

- [ ] **Step 4: Chạy test script kiểm chứng**
  Run: `npx tsx scripts/test-migration-28.ts`
  Expected: RPC thực thi thành công, trả về JSON kết quả hợp lệ.

- [ ] **Step 5: Commit task 1**
  ```bash
  git add supabase/migrations/20261014000028_accounting_settlement_and_invoicing.sql
  git commit -m "feat(accounting): database migration 28 for cash settlement, invoices and debt"
  ```

---

### Task 2: Domain Types & Repository Layer

**Files:**
- Modify: `src/types/domain.types.ts`
- Modify: `src/lib/services/repository-interface.ts`
- Modify: `src/lib/services/demo-repository.ts`
- Modify: `src/lib/services/supabase-repository.ts`

**Interfaces:**
- Produces:
  * Types: `CashSettlement`, `CashSettlementItem`, `YardInvoice`, `InvoiceType` (`COMPANY` | `INDIVIDUAL`), `InvoiceStatus`
  * Repository methods:
    - `getCashSettlements(): Promise<CashSettlement[]>`
    - `getUnsettledCashPayments(dept?: string): Promise<PaymentRecord[]>`
    - `confirmCashSettlement(params: ConfirmSettlementParams): Promise<CashSettlement>`
    - `getYardInvoices(): Promise<YardInvoice[]>`
    - `getInvoicableCharges(): Promise<Charge[]>`
    - `createYardInvoice(params: CreateInvoiceParams): Promise<YardInvoice>`
    - `updateInvoiceIssued(invoiceId: string, eInvoiceNo: string, issuedAt?: string): Promise<YardInvoice>`
    - `getAccountingDebts(): Promise<AccountingDebtItem[]>`
    - `collectAccountingDebt(chargeId: string, amount: number, method: PaymentMethod, note?: string): Promise<PaymentRecord>`

- [ ] **Step 1: Khai báo types trong `src/types/domain.types.ts`**
  Định nghĩa `CashSettlement`, `CashSettlementItem`, `YardInvoice`, `InvoiceType`, và các interfaces tham số liên quan.

- [ ] **Step 2: Cập nhật interface `IRepository` trong `src/lib/services/repository-interface.ts`**
  Bổ sung các phương thức kế toán vào interface chuẩn.

- [ ] **Step 3: Triển khai các phương thức trên `src/lib/services/supabase-repository.ts`**
  Kết nối trực tiếp tới các bảng `app_cash_settlements`, `app_cash_settlement_items`, `app_invoices` và gọi RPC tương ứng.

- [ ] **Step 4: Triển khai mock fallback trên `src/lib/services/demo-repository.ts`**
  Đảm bảo môi trường offline/demo hoạt động trơn tru.

- [ ] **Step 5: Kiểm tra typecheck**
  Run: `npx tsc --noEmit`
  Expected: 0 type errors.

- [ ] **Step 6: Commit task 2**
  ```bash
  git add src/types/domain.types.ts src/lib/services/
  git commit -m "feat(accounting): add domain types and repository methods for accounting subsystem"
  ```

---

### Task 3: Navigation & AppShell Integration

**Files:**
- Modify: `src/components/layout/app-shell.tsx`

**Interfaces:**
- Consumes: `ACCOUNTANT` role, permissions `accounting.shift_cash.collect`, `accounting.invoice.prepare`
- Produces: Mục menu `/accounting` trên Sidebar Desktop, Top Navbar và Mobile Drawer.

- [ ] **Step 1: Bổ sung item điều hướng Kế toán vào `AppShell`**
  Thêm icon `Landmark` hoặc `ReceiptText`, đường dẫn `/accounting`, tiêu đề "Kế toán & Hóa đơn", badge "Quỹ / HĐ".

- [ ] **Step 2: Phân quyền hiển thị menu**
  Chỉ hiển thị nếu người dùng có quyền kế toán (`accounting.shift_cash.collect` hoặc `accounting.invoice.prepare`) hoặc có vai trò `ACCOUNTANT` hoặc `SYS_ADMIN`.

- [ ] **Step 3: Kiểm tra biên dịch**
  Run: `npm run build`
  Expected: Build thành công, không lỗi routing hay rendering.

- [ ] **Step 4: Commit task 3**
  ```bash
  git add src/components/layout/app-shell.tsx
  git commit -m "feat(nav): integrate accounting module into app shell navigation"
  ```

---

### Task 4: Chốt Tiền Mặt Hiện Trường & In Biên Bản Bàn Giao (Tab 1)

**Files:**
- Create: `src/components/accounting/create-settlement-modal.tsx`
- Create: `src/components/accounting/settlement-receipt-print.tsx`
- Create/Modify: `src/app/accounting/page.tsx`

**Interfaces:**
- Consumes: `getCashSettlements`, `getUnsettledCashPayments`, `confirmCashSettlement`
- Produces: Màn hình Tab 1 Chốt tiền mặt, modal đếm tiền 4 mắt, mẫu in Biên bản bàn giao tiền mặt.

- [ ] **Step 1: Xây dựng Component Modal Chốt Thu Tiền Mặt (`CreateSettlementModal`)**
  - Hiển thị danh sách các phiếu thu tiền mặt trong kỳ (từ lần chốt trước đến hiện tại).
  - Khung đếm tiền: Tổng tiền mặt hệ thống kỳ vọng vs Ô nhập tiền thực đếm.
  - Tự động tính chênh lệch; nếu lệch, bắt buộc nhập `Lý do chênh lệch`.
  - Ô nhập Tên người bàn giao ca trực hiện trường.
  - Nút bấm `Xác nhận Thu Tiền Về Quỹ & In Biên Bản`.

- [ ] **Step 2: Xây dựng Mẫu in Biên bản Bàn giao Tiền mặt (`SettlementReceiptPrint`)**
  - Khổ giấy in chuẩn: Tiêu đề công ty Cổ phần Tà Lùng Quang Minh.
  - Bảng kê chi tiết tiền mặt, tiền chuyển khoản, chênh lệch.
  - Bảng 2 chữ ký: Đại diện bên giao (Hiện trường) — Đại diện bên nhận (Kế toán).

- [ ] **Step 3: Tích hợp Tab 1 vào `src/app/accounting/page.tsx`**
  - 4 thẻ KPI: Tiền mặt chờ thu An ninh, Tiền mặt chờ thu CCKB, Đã nộp quỹ hôm nay, Chuyển khoản đối soát.
  - Bảng danh sách các đợt chốt tiền mặt đã thực hiện kèm trạng thái và nút In lại biên bản.

- [ ] **Step 4: Kiểm tra hoạt động Tab 1**
  Kiểm thử mở modal, nhập tiền đếm, xác nhận tạo bản ghi và hiển thị preview in.

- [ ] **Step 5: Commit task 4**
  ```bash
  git add src/app/accounting/ src/components/accounting/
  git commit -m "feat(accounting): implement cash settlement tab and printable handover receipt"
  ```

---

### Task 5: Quản Lý Hóa Đơn MST & CCCD kèm Bảng Kê Mẫu số 01:BPA (Tab 2)

**Files:**
- Create: `src/components/accounting/create-invoice-modal.tsx`
- Create: `src/components/accounting/record-e-invoice-modal.tsx`
- Create: `src/components/accounting/invoice-statement-print.tsx`
- Modify: `src/app/accounting/page.tsx`

**Interfaces:**
- Consumes: `getYardInvoices`, `getInvoicableCharges`, `createYardInvoice`, `updateInvoiceIssued`
- Produces: Tab 2 Quản lý hóa đơn, modal lập hóa đơn gom đa đối tượng (Doanh nghiệp MST & Cá nhân CCCD 12 số), modal nhập số HĐĐT, mẫu in Bảng kê Mẫu 01:BPA.

- [ ] **Step 1: Xây dựng Component Modal Lập Đề Nghị Xuất Hóa Đơn (`CreateInvoiceModal`)**
  - Bước 1: Chọn các khoản thu gom vào lô (Vé cổng, Cước điện, Lưu bãi).
  - Bước 2: Nhập thông tin người mua:
    * Toggle `[ 🏢 Doanh nghiệp (MST) ]`: Tên công ty, MST (10 hoặc 13 số), Địa chỉ, Email nhận HĐĐT.
    * Toggle `[ 👤 Cá nhân (CCCD) ]`: Họ tên người mua (lái xe/chủ hàng), Số CCCD (bắt buộc đúng 12 chữ số), Địa chỉ thường trú, SĐT.
  - Bước 3: Chọn thuế suất VAT (8% hoặc 10%), tự động tách ngược doanh thu trước thuế và tiền thuế Gross.
  - Bước 4: Lưu ở trạng thái `CHỜ XUẤT HĐ` (`PREPARED`).

- [ ] **Step 2: Xây dựng Modal Ghi nhận Số HĐĐT (`RecordEInvoiceModal`)**
  - Cho phép Kế toán nhập Số HĐĐT chính thức (vd: `0004521`), Ký hiệu (vd: `1C26TQM`), Ngày ký để chuyển trạng thái sang `ĐÃ XUẤT HĐĐT` (`INVOICED`).

- [ ] **Step 3: Xây dựng Mẫu in Bảng kê Chi tiết Hóa đơn (`InvoiceStatementPrint`)**
  - Định dạng in chuẩn theo `Mẫu số 01:BPA` của Công ty Tà Lùng Quang Minh: Tên Cont, Biển số xe, Người mua hàng, Số CCCD/MST, Địa chỉ, Thời gian vào/ra, Số giờ/đêm, Thành tiền.

- [ ] **Step 4: Tích hợp Tab 2 vào `src/app/accounting/page.tsx`**
  - Bảng danh sách các hóa đơn đã lập, bộ lọc theo trạng thái (`CHỜ XUẤT HĐ`, `ĐÃ XUẤT HĐĐT`), nút In bảng kê đính kèm, nút Ghi nhận số HĐĐT.

- [ ] **Step 5: Kiểm tra hoạt động Tab 2**
  Kiểm thử lập hóa đơn cho cá nhân CCCD `031077007508`, kiểm tra tách thuế và in bảng kê.

- [ ] **Step 6: Commit task 5**
  ```bash
  git add src/app/accounting/ src/components/accounting/
  git commit -m "feat(accounting): implement invoice management for company (MST) and individual (CCCD)"
  ```

---

### Task 6: Quản Lý & Thu Hồi Công Nợ Bến Bãi (Tab 3)

**Files:**
- Create: `src/components/accounting/collect-debt-modal.tsx`
- Modify: `src/app/accounting/page.tsx`

**Interfaces:**
- Consumes: `getAccountingDebts`, `collectAccountingDebt`
- Produces: Tab 3 Công nợ bến bãi, modal thu tiền nợ khách hàng (Tiền mặt / Chuyển khoản).

- [ ] **Step 1: Xây dựng Component Modal Thu Hồi Nợ (`CollectDebtModal`)**
  - Hiển thị thông tin khoản nợ: Số cont, Biển xe, Loại phí, Số tiền nợ, Người duyệt bảo lãnh AP07.
  - Chọn hình thức thu: `Tiền mặt` hoặc `Chuyển khoản VietQR`.
  - Nhập số tiền thu (toàn bộ hoặc một phần), ghi chú và gọi `collectAccountingDebt`.

- [ ] **Step 2: Tích hợp Tab 3 vào `src/app/accounting/page.tsx`**
  - Thẻ KPI: Tổng nợ toàn bãi, Nợ cước điện lạnh CCKB, Nợ vé/lưu bãi An ninh.
  - Bảng danh sách công nợ gom theo từng Khách hàng, chi tiết từng xe/cont nợ cước, nút `[ Thu Nợ ]`.

- [ ] **Step 3: Kiểm tra hoạt động Tab 3**
  Xác minh gạch nợ thành công, tiền ghi nhận vào sổ cái không vi phạm constraint.

- [ ] **Step 4: Commit task 6**
  ```bash
  git add src/app/accounting/ src/components/accounting/
  git commit -m "feat(accounting): implement debt management and collection tab"
  ```

---

### Task 7: Báo Cáo Sổ Quỹ & Xuất File Excel Đa Sheet (Tab 4)

**Files:**
- Modify: `src/lib/excel-export.ts`
- Modify: `src/app/accounting/page.tsx`

**Interfaces:**
- Consumes: `ExcelJS` library
- Produces: Hàm `exportAccountingReportExcel` xuất file `.xlsx` 4 sheet chuyên nghiệp, Tab 4 Báo cáo sổ quỹ.

- [ ] **Step 1: Bổ sung hàm xuất Excel chuyên biệt cho Kế toán trong `src/lib/excel-export.ts`**
  - Tạo file `.xlsx` có 4 Sheet chuẩn:
    * Sheet 1: `Báo cáo Doanh thu & Dòng tiền` (Phân loại dịch vụ, bộ phận, hình thức thanh toán).
    * Sheet 2: `Bảng kê Chốt tiền mặt` (Mã biên bản, ngày giờ, người giao, người nhận, tiền thực đếm, chênh lệch).
    * Sheet 3: `Sổ Hóa đơn MST & CCCD` (Số HĐ, loại HĐ, người mua, CCCD/MST, doanh thu trước thuế, VAT, tổng tiền).
    * Sheet 4: `Sổ Theo dõi Công nợ` (Danh sách xe/cont nợ, ngày duyệt, người bảo lãnh, dư nợ).
  - Styling chuẩn thương hiệu Sơn Cảng: Header Navy `#1E3A8A`, viền mỏng, format số kế toán `#,#0`, dòng tổng cộng viền kép `double`.

- [ ] **Step 2: Tích hợp Tab 4 vào `src/app/accounting/page.tsx`**
  - Bộ lọc khoảng thời gian tùy chọn (Từ ngày - Đến ngày).
  - Bảng tổng hợp dòng tiền phân tích rõ: Đã nộp quỹ Kế toán, Còn tại bốt trực, Đã chuyển khoản ngân hàng.
  - Nút `[ 📥 Xuất Excel Báo Cáo Kế Toán (.xlsx) ]`.

- [ ] **Step 3: Chạy toàn bộ kiểm thử hệ thống & xác minh build**
  Run: `npm run build`
  Expected: Mã thoát 0, toàn bộ các routes bao gồm `/accounting` biên dịch thành công 100%.

- [ ] **Step 4: Commit task 7**
  ```bash
  git add src/lib/excel-export.ts src/app/accounting/
  git commit -m "feat(accounting): implement financial reports and multi-sheet excel export"
  ```

---

### Task 8: Cập Nhật Nhật Ký Dự Án & Bàn Giao

**Files:**
- Modify: `ProjectContext/05_Nhat_ky_du_an/CURRENT_STATUS.md`
- Modify: `ProjectContext/05_Nhat_ky_du_an/DECISION_LOG.md`
- Modify: `ProjectContext/05_Nhat_ky_du_an/WORK_LOG.md`
- Modify: `ProjectContext/05_Nhat_ky_du_an/OPEN_DECISIONS_UAT.md`

- [ ] **Step 1: Cập nhật `CURRENT_STATUS.md`** ghi nhận hoàn thành Phân hệ Kế toán (Migration 28).
- [ ] **Step 2: Cập nhật `DECISION_LOG.md`** ghi nhận quyết định về Kế toán bến bãi, xuất hóa đơn CCCD & MST, cơ chế chốt tiền linh hoạt.
- [ ] **Step 3: Cập nhật `OPEN_DECISIONS_UAT.md`** cập nhật trạng thái RV08 và RV12 thành đã giải quyết.
- [ ] **Step 4: Bổ sung `WORK_LOG.md`** chi tiết các file đã thêm/sửa và kết quả kiểm thử.
- [ ] **Step 5: Commit tài liệu & push Git lên nhánh `main`**
  ```bash
  git add ProjectContext/
  git commit -m "docs(status): update project logs for accounting subsystem release"
  git push origin main
  ```
