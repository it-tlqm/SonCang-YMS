# SKILLS REGISTRY — DANH MỤC SKILLS PHÁT TRIỂN DỰ ÁN SƠN CẢNG

**Dự án:** Website + PWA Quản lý bến bãi Sơn Cảng — Tà Lùng Quang Minh  
**Thời điểm thiết lập:** 11/10/2026  
**Trạng thái:** Đã cài đặt, kiểm tra tính toàn vẹn và xác minh sẵn sàng hoạt động trong workspace.  

---

## 1. NGUYÊN TẮC VẬN HÀNH VÀ THỨ TỰ ƯU TIÊN

Khi triển khai code, các skills phối hợp theo thứ tự ưu tiên:
1. **Superpowers:** Dẫn dắt quy trình phân tích yêu cầu, lập kế hoạch chi tiết, Test-Driven Development (TDD), review code và kiểm tra chất lượng trước khi hoàn thành.
2. **Ponytail:** Kiểm soát độ phức tạp (YAGNI / KISS), tối giản thay đổi, tránh over-engineering, không cài dependency thừa. **Lưu ý:** Không cắt giảm kiểm thử, validation, RBAC, RLS, transaction nguyên tử, audit log và an toàn dữ liệu tài chính.
3. **UI/UX Pro Max:** Định hướng kiến trúc giao diện, Design System chuẩn, tối ưu layout responsive (390/820/1024/1440px), khả năng tiếp cận (Accessibility WCAG).
4. **Taste Skill (`design-taste-frontend`):** Tinh chỉnh thẩm mỹ, typography, spacing, chống giao diện AI rập khuôn. **Lưu ý:** Tuyệt đối không thay đổi màu thương hiệu (#0A9444, #223873, #087C3C), font Be Vietnam Pro và nghiệp vụ V5.
5. **Find Skills (`find-skills`):** Chỉ kích hoạt khi cần tra cứu thêm công cụ/skill chuyên môn trong hệ sinh thái; không tự tiện cài thêm skill ngoài danh mục được duyệt.

> **Quy tắc tối thượng:** Mọi khuyến nghị của Skills phải phục tùng các ràng buộc bất biến trong [AGENTS.md](../../AGENTS.md), các rules trong `.agents/rules/` và hồ sơ nghiệp vụ V5 tại `ProjectContext/01_Nghiep_vu_V5/PROJECT_CONTEXT.md`.

---

## 2. BẢNG TỔNG HỢP 5 SKILLS ĐÃ CÀI ĐẶT

| STT | Tên Skill | Repository nguồn | Phiên bản / Hash | Phương thức cài đặt | Đường dẫn lưu trữ | Trạng thái kiểm tra |
|:---:|---|---|---|---|---|:---:|
| 1 | **Superpowers** | `https://github.com/obra/superpowers` | v7.0.0 (commit HEAD) | Antigravity Plugin & Agent Skills (Manual copy & manifest) | `.agents/plugins/superpowers/`<br>`.agents/skills/` (15 skills) | **ĐẠT** |
| 2 | **Ponytail** | `https://github.com/DietrichGebert/ponytail` | Hash `dc44b17f...` | `npx skills add --skill ponytail -a antigravity --copy` | `.agents/skills/ponytail/` | **ĐẠT** |
| 3 | **Taste Skill** (`design-taste-frontend`) | `https://github.com/Leonxlnx/taste-skill` | Hash `899b8438...` | `npx skills add --skill design-taste-frontend -a antigravity --copy` | `.agents/skills/design-taste-frontend/` | **ĐẠT** |
| 4 | **Find Skills** (`find-skills`) | `https://github.com/vercel-labs/skills` | Hash `b1460085...` | `npx skills add --skill find-skills -a antigravity --copy` | `.agents/skills/find-skills/` | **ĐẠT** |
| 5 | **UI/UX Pro Max** | `https://github.com/nextlevelbuilder/ui-ux-pro-max-skill` | v2.15.0 | `npx ui-ux-pro-max-cli init --ai antigravity` | `.agents/skills/ui-ux-pro-max/`<br>+ sub-skills hỗ trợ | **ĐẠT** |

---

## 3. CHI TIẾT TỪNG SKILL

### 3.1. Skill 1 — Superpowers
- **Repository nguồn:** https://github.com/obra/superpowers
- **Phiên bản:** 7.0.0
- **Mục đích:**
  - Quy trình phân tích yêu cầu trước khi code (`brainstorming`, `using-superpowers`).
  - Lập kế hoạch theo từng giai đoạn và thực thi (`writing-plans`, `executing-plans`).
  - Phát triển hướng kiểm thử (`test-driven-development`).
  - Xử lý lỗi có hệ thống (`systematic-debugging`).
  - Đánh giá chất lượng và kiểm chứng (`requesting-code-review`, `receiving-code-review`, `verification-before-completion`).
- **Cấu trúc cài đặt:**
  - Plugin Manifest: `.agents/plugins/superpowers/plugin.json`
  - Plugin Skills: `.agents/plugins/superpowers/skills/`
  - Project Skills: Đặt trực tiếp 15 skills vào `.agents/skills/` (`brainstorming`, `writing-plans`, `executing-plans`, `test-driven-development`, `systematic-debugging`, `requesting-code-review`, `receiving-code-review`, `verification-before-completion`, `subagent-driven-development`, `using-superpowers`, `finishing-a-development-branch`, `diagnosing-superpowers`, `dispatching-parallel-agents`, `using-git-worktrees`, `writing-skills`).
- **Cách kích hoạt:**
  - Khi bắt đầu lập kế hoạch: Tham chiếu `writing-plans`.
  - Khi triển khai tính năng: Kích hoạt `test-driven-development` (viết test trước, test fail, viết code tối thiểu, test pass, refactor).
  - Khi debug lỗi: Kích hoạt `systematic-debugging` (phân tích nguyên nhân gốc trước khi sửa).
  - Trước khi hoàn thành: Kích hoạt `verification-before-completion` (chạy lệnh kiểm chứng thật và lưu bằng chứng).
- **Lưu ý bảo mật & Xung đột:**
  - Không kích hoạt hooks thực thi lệnh ngầm độc hại.
  - TDD trong dự án này phải bao gồm test phân quyền RBAC/RLS và tính toán tài chính (làm tròn 15 phút, phí lưu qua đêm).

---

### 3.2. Skill 2 — Ponytail
- **Repository nguồn:** https://github.com/DietrichGebert/ponytail
- **Phiên bản / Computed Hash:** `dc44b17f49b1228761af8303a51bc028cd1cca866ba8d23d6072ef5fd4e0ba94`
- **Mục đích:**
  - Đóng vai "Lazy senior dev": tạo ra sự thay đổi nhỏ nhất nhưng giải quyết triệt để vấn đề.
  - Ưu tiên tái sử dụng code có sẵn, dùng hàm chuẩn, không tạo abstraction hay wrapper dư thừa.
  - Hạn chế tối đa việc cài thêm package/thư viện bên thứ ba.
- **Cấu trúc cài đặt:**
  - File chính: `.agents/skills/ponytail/SKILL.md`
  - Đăng ký trong `skills-lock.json`.
- **Cách kích hoạt:**
  - Tự động kích hoạt khi lập trình, refactor hoặc khi cần đánh giá độ phức tạp giải pháp.
  - Lệnh điều chỉnh level: `/ponytail lite` (giải pháp gọn nhất và để người dùng chọn), `/ponytail full` (mặc định), `/ponytail ultra`.
- **Lưu ý bảo mật & Xung đột:**
  - SKILL.md nêu rõ: *"Never cut: validation at trust boundaries, error handling that prevents data loss, security, accessibility, the calibration real hardware needs, anything the user asked for."*
  - **Tuyệt đối không:** Cắt giảm các tầng RLS, transaction kiểm soát đồng thời, audit log bất biến hoặc kiểm thử tiền nong để làm theo kiểu "code ngắn".

---

### 3.3. Skill 3 — Taste Skill (`design-taste-frontend`)
- **Repository nguồn:** https://github.com/Leonxlnx/taste-skill
- **Phiên bản / Computed Hash:** `899b84384f74f540ea5284d9b2e9234e050998b42eacc805410b518d4226c0b3`
- **Mục đích:**
  - Chống giao diện AI rập khuôn (Anti-slop frontend).
  - Định hình thị giác sắc nét, typography cân đối, khoảng cách (spacing) hợp lý.
  - Tối ưu bảng biểu, card dữ liệu và màn hình tác nghiệp bến bãi.
- **Cấu trúc cài đặt:**
  - File chính: `.agents/skills/design-taste-frontend/SKILL.md` (chỉ cài duy nhất skill này theo yêu cầu).
  - Đăng ký trong `skills-lock.json`.
- **Cách kích hoạt:**
  - Áp dụng khi xây dựng component và màn hình giao diện người dùng Next.js.
  - Xuất ra "Design Read" trước khi thiết kế UI: bám sát giao diện ứng dụng vận hành logistics bến bãi, rõ ràng, tin cậy.
- **Lưu ý bảo mật & Xung đột:**
  - SKILL.md có quy tắc: *"Quiet constraints - accessibility-first audiences, public-sector, regulated industries... OVERRIDE aesthetic preference."*
  - **Tuyệt đối không:** Dùng skill này để đổi bảng màu (#0A9444, #223873), không dùng dark mode (dự án chỉ dùng Light Mode), không đổi font Be Vietnam Pro, không thêm animation nặng làm chậm máy bốt cổng.

---

### 3.4. Skill 4 — Find Skills (`find-skills`)
- **Repository nguồn:** https://github.com/vercel-labs/skills
- **Phiên bản / Computed Hash:** `b146008599c31057cef1c145774cea5d5afb30e8f43fa802e47a4b461419aaaf`
- **Mục đích:**
  - Hỗ trợ tìm kiếm các skill chuẩn xác trong hệ sinh thái khi phát sinh nhu cầu chuyên sâu (Supabase, PostgreSQL, Next.js, bảo mật).
- **Cấu trúc cài đặt:**
  - File chính: `.agents/skills/find-skills/SKILL.md`
  - Đăng ký trong `skills-lock.json`.
- **Cách kích hoạt:**
  - Tra cứu khi có nhu cầu: `npx skills find <chủ đề>`.
- **Lưu ý bảo mật & Xung đột:**
  - **Nguyên tắc:** Chỉ tìm kiếm và tham khảo; KHÔNG tự ý cài đặt thêm bất kỳ skill nào vào workspace nếu chưa có sự phê duyệt của người dùng.

---

### 3.5. Skill 5 — UI/UX Pro Max
- **Repository nguồn:** https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- **Phiên bản:** 2.15.0
- **Mục đích:**
  - Cung cấp tri thức thiết kế chuyên sâu (styles, palettes, typography pairing, UX guidelines, icon, stack best practices cho Next.js + Tailwind).
  - Hỗ trợ xây dựng giao diện responsive đa thiết bị (Mobile 390px, Tablet 820px/1024px, Desktop 1440px).
- **Cấu trúc cài đặt:**
  - Skill chính: `.agents/skills/ui-ux-pro-max/SKILL.md`
  - Sub-skills bổ trợ: `.agents/skills/design-system/`, `.agents/skills/ui-styling/`, `.agents/skills/design/`, `.agents/skills/brand/`, `.agents/skills/banner-design/`, `.agents/skills/slides/`.
  - Bộ script tra cứu Python (chạy độc lập, không cần thư viện ngoài): `.agents/skills/ui-ux-pro-max/scripts/search.py`.
- **Cách kích hoạt:**
  - Dùng khi thiết kế form, bảng dữ liệu, navigation, responsive layout.
  - Tra cứu hướng dẫn qua script: `python .agents/skills/ui-ux-pro-max/scripts/search.py "<từ khóa>" --stack nextjs`.
- **Lưu ý bảo mật & Xung đột:**
  - Script sử dụng thư viện chuẩn của Python 3, không yêu cầu kết nối mạng hay cài thêm package.
  - Tuân thủ thiết kế Light Mode và Design System của Sơn Cảng.

---

## 4. KẾT QUẢ KIỂM TRA TÍNH TOÀN VẸN WORKSPACE

- [x] Không ghi đè hoặc làm thay đổi file `AGENTS.md` (giữ nguyên độ dài 2.727 bytes).
- [x] Không làm thay đổi 2 file rules trong `.agents/rules/` (`son-cang-backend-finance.md` 2.196 bytes, `son-cang-ui-ux.md` 1.562 bytes).
- [x] Toàn bộ hồ sơ trong `ProjectContext/` nguyên vẹn 100%.
- [x] Đã dọn dẹp sạch toàn bộ các file/thư mục tạm trong `scratch/`.
- [x] Không lưu trữ mật khẩu, secret key hay API credentials nào vào mã nguồn skills.
