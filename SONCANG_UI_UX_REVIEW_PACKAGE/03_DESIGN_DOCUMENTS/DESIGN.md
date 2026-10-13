# DESIGN.md — Công ty Cổ phần Tà Lùng Quang Minh

**Ứng dụng tham chiếu:** Phần mềm quản lý bến bãi/cảng cạn — Bãi Sơn Cảng (Website + PWA)  
**Tên tổ chức hiển thị:** Công ty Cổ phần Tà Lùng Quang Minh  
**Bản đề xuất:** DS-01, 11/10/2026  
**Stitch Project ID:** Dự án blank do người dùng đã tạo; điền ID thực tế khi biết.  
**Theme:** **LIGHT ONLY** — giao diện sáng duy nhất trong giai đoạn thiết kế này.  
**Nguồn xác nhận:** màu nhận diện `#0A9444`, `#223873`; các token còn lại là đề xuất UI có thể tinh chỉnh, KHÔNG giả định là brandbook chính thức.

## 1. Visual Theme & Atmosphere

A bright, trustworthy, practical enterprise logistics interface. Light canvas, white working surfaces, compact and readable operations data. Brand-forward but restrained. Strong visual hierarchy, clear field labels, low-friction actions for outdoor gate security staff, and data-dense yet calm screens for CCKB, Điều phối and management.

- Absolutely no dark mode, black background, neon glow, oversized gradients, decorative glassmorphism, 3D illustrations or over-animated dashboards.
- Use **real Vietnamese UI copy**, not English lorem ipsum. Operational clarity > decorative style.
- Green brand accents emphasize primary action and progress. Deep blue anchors navigation, headers and trusted information. Status colors are semantic, never ornamental.
- Preserve enough space for real table data without creating excessive blank areas.
- Company logo: use the **official provided logo only**. When unavailable, use a plain text wordmark `TÀ LÙNG QUANG MINH` and product subtitle `Quản lý bến bãi Sơn Cảng`; do not invent or redraw any official logo.

## 2. Color Palette & Semantic Roles

### Company identity (confirmed)

| Token | Hex | Usage |
|---|---|---|
| `brand.green` | `#0A9444` | Official company green: logo context, brand emphasis, focus cues, highlights |
| `brand.navy` | `#223873` | Official company blue: navigation, titles, key data hierarchy |

### UI palette (proposed, Light Mode only)

| Token | Hex | Semantic role |
|---|---|---|
| `color.canvas` | `#F5F8FA` | Page background |
| `color.surface` | `#FFFFFF` | Primary cards, dialogs, forms, table surfaces |
| `color.surface-soft` | `#F0F5F2` | Soft feature summary, selected region |
| `color.text-primary` | `#1F2937` | Main text, numeric totals |
| `color.text-secondary` | `#475467` | Explanations, table metadata |
| `color.text-muted` | `#667085` | Optional assistance only; don't use for crucial information |
| `color.border` | `#E3E8EF` | Dividers and input strokes |
| `color.action-primary` | `#087C3C` | Solid primary CTA **with white text**; contrast-safe shade of brand green |
| `color.action-primary-hover` | `#076934` | CTA hover/pressed |
| `color.nav-active-bg` | `#EAF6EF` | Highlighted menu item |
| `color.info` | `#1D4ED8` | Informational notices, pending requests |
| `color.info-bg` | `#EFF6FF` | Soft info badge/callout |
| `color.success` | `#067647` | Successful, settled, physically completed |
| `color.success-bg` | `#ECFDF3` | Soft success state |
| `color.warning` | `#9A4808` | Unpaid fee, mismatch, manual verification required |
| `color.warning-bg` | `#FFFAEB` | Soft warning state |
| `color.danger` | `#B42318` | Blocking error, critical conflict |
| `color.danger-bg` | `#FEF3F2` | Soft critical state |

**Accessibility note:** `#0A9444` on white is valid for sufficiently large/bold text but **white body-sized text on a `#0A9444` solid fill does not reach WCAG AA 4.5:1**. Therefore solid green CTA with white type must use `#087C3C` (or darker); reserve original brand green for non-critical accents or suitable large text. Do not rely only on color to express a payment or gate-out state. Keep visible focus states.

### Status vocabulary (non-interchangeable)

- `Có yêu cầu điện dự kiến`: information/blue; not a started electrical session.
- `Chờ cắm`: info/blue, `Đang cắm`: active/green, `Đã rút`: neutral/success depending on payment; not the same as `Đã thu`.
- `Chưa thu`: warning/amber; `Đã thu`: success/green; `Còn nợ / ngoại lệ cho ra`: warning with reason; never display as paid.
- `Chờ đối chiếu số container`: warning; `Sai thông tin`: danger only if action is blocked.
- `Được CCKB xác nhận tài chính`: info or success, **not** equal to `Đã ra cổng`.
- Container cargo status `HÀNG`, `RỖNG`, `Chưa xác định`: three distinct neutral, clearly labeled tags; do not use error red for `RỖNG`.

## 3. Typography Rules

- **One primary typeface:** `Be Vietnam Pro` (supports Vietnamese). Fallback: `Arial`, sans-serif. This is a **UI proposal** until the company supplies a typography brandbook.
- Weight 400 body; 500 labels; 600 section headings, important status; 700 only main KPI/money.
- Desktop section title 22–26px, mobile page title 20–22px, body 14–16px (input text **at least 16px on mobile**), metadata 12–13px when legible.
- Numeric values use tabular figures where available; currency use Vietnamese formatting: `250.000đ`, time `HH:mm`, date `dd/MM/yyyy`, timezone `Asia/Ho_Chi_Minh`.
- **Container ID is a critical identifier**: uppercase, 18–20px where practical, semi-bold, visibly separate 4-letter prefix and last 7 digits. Allow tap/copy and show the full code; never truncate a verified ID in a transaction. Suggest near matches but never auto-substitute.
- Never substitute a confusing decorative font for gate-control text.

## 4. Component Stylings

### Buttons and actions
- Primary solid `#087C3C` white label, 10px radius, height 44–48px; touch targets at least 44×44px.
- Secondary white with `#E3E8EF` outline and `#223873` text; neutral tertiary actions available.
- Destructive/correction actions separated from safe primary action and demand confirmation where needed.
- Each CTA must describe the real action: `Ghi nhận xe vào`, `Xác nhận xe ra`, `Tạo yêu cầu điện`, `Ghi giờ rút`, `Thu tiền điện`, `Báo sai số cont`, `Xác nhận đối chiếu`.
- Avoid a generic button labeled `Hoàn tất` for different responsibilities.

### Cards, summary tiles, tables
- White surfaces on soft off-white canvas, 10–14px radius; subtle shadow at most, use clean borders more often than shadows.
- Summary cards: label, precise number, unit, contextual secondary line. Avoid giant KPI decorations.
- Desktop tables: sticky header, compact rows 44–52px, lightweight dividers, filters, sortable columns, right aligned currency, status and row actions.
- Mobile records: vertical card rows with strong container/plate identification, status chips, short essentials and an obvious primary action. No overflowing fixed desktop grid.

### Forms and input controls
- Always show persistent visible field labels and validation messages next to the field. 42–48px field height; mobile input font ≥16px.
- Conditional fields: `Số container` required only when a vehicle actually carries one; `Xe bo 3 bánh` may omit license plate and uses an internal visit ID.
- Search: full container ID, 7-digit suffix, and **suggested near matches**. Present options with supporting metadata for manual confirmation; never automatically merge near matches.
- Date/time picker + direct editable text for CCKB actual plug/unplug times; show `Thời lượng thực tế`, `Thời lượng tính tiền`, `Khoản điều chỉnh` as separate fields.
- Correction dialog: `Giá trị cũ`, `Giá trị mới`, `Lý do`, supporting evidence if present, person acting, and next review/notification step.
- Payment widget: `Tiền phải thu`, `Đã thu`, `Còn phải thu`, payment method, receipt evidence where required. Status must not be inferred from clicking a button.

### Icons, alerts, interaction
- Consistent outlined line icons (Lucide-like). Use icons only when they reinforce labels.
- Alerts should make distinction between warning (review) and blocking error (cannot proceed). Don't automatically block when the business rule explicitly allows an override with reason.
- Loading / saving / disconnected / unsynced states must be explicit; no false `Đã ra` confirmation when offline.
- Transitions 120–180ms subtle, disabled/reduced motion friendly; no parallax or animated 3D charts.

## 5. Layout Principles & Responsive Behavior

Use **one visual system with responsive variants**; key workflows remain available on all devices subject to role permission.

| Viewport | Reference width | Navigation | Content layout |
|---|---:|---|---|
| Mobile | 375–430px (design at 390px) | Compact header + contextual bottom navigation (max 4–5 items) | Single column, stacked record cards, persistent search, sticky primary action |
| Tablet portrait | 768–834px (design at 820px) | Compact rail/drawer | Two-column when appropriate, touch-friendly lists and detail panel |
| Tablet landscape | 1024–1199px (design at 1024px) | Collapsible sidebar | Tables + contextual detail drawer, comfortable touch targets |
| Desktop/laptop | 1280–1600px (design at 1440px) | Fixed sidebar + top toolbar | Readable data tables, filters, role-specific widgets, multi-column forms |

- Use a spacing scale derived from 4px/8px; mobile gutters 16px, desktop 24px. Keep operational controls above the fold when possible.
- Phone layout **must not be a shrunk desktop screenshot**. Use an intentional workflow: single prominent task, quick search and large buttons.
- Tablet must explicitly work in both orientations.
- Touch devices must not rely on hover to expose actions.
- Desktop max-width for text-heavy detail blocks 1100–1280px; tables can use full working width.
- Never hide critical payment, gate status or discrepancy warnings behind an ellipsis-only menu.

## 6. Components to Cover in an Initial Design-System Preview

The component specimen page should visibly include: typography scale; green and navy identity tokens; neutral surfaces; primary/secondary/destructive buttons; role-aware navigation; input/select/datetime; full-container-ID search; status chips for planned/pending/plugged/unplugged/unpaid/paid/approved/actual-exited; KPI tiles; desktop table and mobile record cards; payment breakdown; discrepancy alert with evidence thumbnail; confirmation dialog; empty/loading/offline/error states.

These are **visual components only** in Stitch; actual role enforcement, billing and server transactions are implemented later in Antigravity/Supabase.

## 7. Product Vocabulary — Use These Exact Vietnamese Concepts

- Product family: `Phần mềm quản lý bến bãi/cảng cạn`, contextual location: `Bãi Sơn Cảng`.
- Department: `Bộ phận An ninh`, `Bộ phận Nghiệp vụ cổng cảng kho bãi (CCKB)`, `Bộ phận Điều phối`.
- Main entities: `Lượt xe`, `Lượt container`, `Yêu cầu cắm điện dự kiến`, `Phiên cắm điện`, `Tiền vé`, `Phí lưu container`, `Tiền điện`.
- Actions: `Ghi nhận vào`, `Chốt giờ ra thực tế`, `Sửa số container`, `Báo CCKB đối chiếu`, `Kiểm tra thanh toán`, `Xác nhận cho ra`.
- Do **not** introduce `BOS`, invented container pricing formulas, or a "khóa phí lưu" concept.
