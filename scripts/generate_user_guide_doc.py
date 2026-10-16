import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

def set_cell_background(cell, hex_color):
    """Sets background color of a table cell."""
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    """Sets internal padding for a table cell (in twips: 20 twips = 1 pt)."""
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def set_table_borders(table, color="CBD5E1"):
    """Sets light subtle borders for a table."""
    tblPr = table._tbl.tblPr
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'  <w:top w:val="single" w:sz="6" w:space="0" w:color="{color}"/>'
        f'  <w:bottom w:val="single" w:sz="6" w:space="0" w:color="{color}"/>'
        f'  <w:insideH w:val="single" w:sz="4" w:space="0" w:color="{color}"/>'
        f'  <w:left w:val="none"/>'
        f'  <w:right w:val="none"/>'
        f'  <w:insideV w:val="none"/>'
        f'</w:tblBorders>'
    )
    tblPr.append(borders)

def format_row(row, is_header=False, bg_color="FFFFFF", text_color="17202E", font_size=9.5, bold=False):
    for cell in row.cells:
        set_cell_background(cell, bg_color)
        set_cell_margins(cell, top=100, bottom=100, left=140, right=140)
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        for p in cell.paragraphs:
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            for run in p.runs:
                run.font.name = "Calibri"
                run.font.size = Pt(font_size)
                run.font.bold = bold
                if isinstance(text_color, str):
                    run.font.color.rgb = RGBColor.from_string(text_color)
                else:
                    run.font.color.rgb = text_color

def add_callout(doc, text_content, title="LƯU Ý VẬN HÀNH QUAN TRỌNG", border_color="223873", bg_color="F8F9FB"):
    """Creates a stylized callout box."""
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = tbl.cell(0, 0)
    set_cell_background(cell, bg_color)
    set_cell_margins(cell, top=140, bottom=140, left=200, right=200)
    
    tcPr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>'
        f'  <w:top w:val="none"/>'
        f'  <w:left w:val="single" w:sz="24" w:space="0" w:color="{border_color}"/>'
        f'  <w:bottom w:val="none"/>'
        f'  <w:right w:val="none"/>'
        f'</w:tcBorders>'
    )
    tcPr.append(borders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(2)
    run_title = p.add_run(f"📌 {title}\n")
    run_title.font.bold = True
    run_title.font.name = "Calibri"
    run_title.font.size = Pt(10)
    run_title.font.color.rgb = RGBColor.from_string(border_color)
    
    run_body = p.add_run(text_content)
    run_body.font.name = "Calibri"
    run_body.font.size = Pt(9.5)
    run_body.font.color.rgb = RGBColor(50, 60, 75)
    
    doc.add_paragraph().paragraph_format.space_after = Pt(4)

def add_image_placeholder(doc, code, title, description, focus_note, height_pt=150):
    """Creates an attractive image placeholder box with dashed borders for user to insert screenshots."""
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = tbl.cell(0, 0)
    cell.width = Inches(6.5)
    
    set_cell_background(cell, "F8FAFC")
    set_cell_margins(cell, top=180, bottom=180, left=220, right=220)
    
    # Dashed border XML
    tcPr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>'
        f'  <w:top w:val="dashed" w:sz="12" w:space="0" w:color="326DD8"/>'
        f'  <w:left w:val="dashed" w:sz="12" w:space="0" w:color="326DD8"/>'
        f'  <w:bottom w:val="dashed" w:sz="12" w:space="0" w:color="326DD8"/>'
        f'  <w:right w:val="dashed" w:sz="12" w:space="0" w:color="326DD8"/>'
        f'</w:tcBorders>'
    )
    tcPr.append(borders)
    
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(2)
    
    # Icon and Title
    r_icon = p.add_run("📷 KHUNG DÁN ẢNH MINH HỌA GIAO DIỆN\n")
    r_icon.font.name = "Calibri"
    r_icon.font.size = Pt(11)
    r_icon.font.bold = True
    r_icon.font.color.rgb = RGBColor.from_string("326DD8")
    
    r_code = p.add_run(f"[{code}] {title}\n")
    r_code.font.name = "Calibri"
    r_code.font.size = Pt(10)
    r_code.font.bold = True
    r_code.font.color.rgb = RGBColor.from_string("1E293B")
    
    r_desc = p.add_run(f"{description}\n")
    r_desc.font.name = "Calibri"
    r_desc.font.size = Pt(9)
    r_desc.font.italic = True
    r_desc.font.color.rgb = RGBColor.from_string("64748B")
    
    r_focus = p.add_run(f"🔍 Điểm cần chú thích/khoanh vùng: {focus_note}\n")
    r_focus.font.name = "Calibri"
    r_focus.font.size = Pt(8.5)
    r_focus.font.bold = True
    r_focus.font.color.rgb = RGBColor.from_string("0A9444")
    
    r_guide = p.add_run("👉 Hướng dẫn: Nhấp chuột phải vào khung này → Chọn 'Paste/Dán ảnh' (Ctrl+V) hoặc Chèn hình chụp màn hình thực tế vào đây.")
    r_guide.font.name = "Calibri"
    r_guide.font.size = Pt(8.5)
    r_guide.font.color.rgb = RGBColor.from_string("94A3B8")
    
    # Caption below the box
    cap = doc.add_paragraph()
    cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cap.paragraph_format.space_before = Pt(3)
    cap.paragraph_format.space_after = Pt(8)
    r_cap = cap.add_run(f"Hình minh họa — {code}: {title}")
    r_cap.font.name = "Calibri"
    r_cap.font.size = Pt(8.5)
    r_cap.font.italic = True
    r_cap.font.color.rgb = RGBColor.from_string("64748B")

def generate_user_guide_doc(output_path):
    doc = Document()
    
    # Page Setup - Standard A4 with 0.75 inch margins
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(0.75)
        section.bottom_margin = Inches(0.75)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)
        
        # Header & Footer
        header = section.header
        hp = header.paragraphs[0]
        hp.alignment = WD_ALIGN_PARAGRAPH.LEFT
        hrun = hp.add_run("CÔNG TY CỔ PHẦN TÀ LÙNG QUANG MINH — SỔ TAY HƯỚNG DẪN VẬN HÀNH BẾN BÃI SƠN CẢNG")
        hrun.font.name = "Calibri"
        hrun.font.size = Pt(8)
        hrun.font.bold = True
        hrun.font.color.rgb = RGBColor(140, 150, 165)
        
        footer = section.footer
        fp = footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        frun = fp.add_run("Phần mềm quản lý bến bãi/cảng cạn Sơn Cảng (V1.0 - V5) | Trang ")
        frun.font.name = "Calibri"
        frun.font.size = Pt(8.5)
        frun.font.color.rgb = RGBColor(140, 150, 165)
        
        fldSimple = parse_xml(r'<w:fldSimple %s w:instr="PAGE"/>' % nsdecls('w'))
        fp._p.append(fldSimple)

    # Base Normal Style
    style_normal = doc.styles['Normal']
    style_normal.font.name = 'Calibri'
    style_normal.font.size = Pt(10)
    style_normal.font.color.rgb = RGBColor(30, 40, 55)
    style_normal.paragraph_format.line_spacing = 1.15
    style_normal.paragraph_format.space_after = Pt(4)

    # -------------------------------------------------------------
    # BÌA TÀI LIỆU (COVER PAGE)
    # -------------------------------------------------------------
    cp_org = doc.add_paragraph()
    cp_org.paragraph_format.space_before = Pt(10)
    cp_org.paragraph_format.space_after = Pt(2)
    r_org = cp_org.add_run("CÔNG TY CỔ PHẦN TÀ LÙNG QUANG MINH\n")
    r_org.font.bold = True
    r_org.font.size = Pt(11.5)
    r_org.font.color.rgb = RGBColor.from_string("0A9444")
    
    r_dept = cp_org.add_run("BAN ĐIỀU HÀNH BẾN BÃI & TRUNG TÂM CÔNG NGHỆ THÔNG TIN")
    r_dept.font.bold = True
    r_dept.font.size = Pt(9.5)
    r_dept.font.color.rgb = RGBColor(100, 110, 125)

    doc.add_paragraph().paragraph_format.space_after = Pt(20)

    # Document Title
    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_after = Pt(6)
    r_title = p_title.add_run("SỔ TAY HƯỚNG DẪN SỬ DỤNG\n& VẬN HÀNH THAO TÁC HỆ THỐNG")
    r_title.font.bold = True
    r_title.font.size = Pt(22)
    r_title.font.color.rgb = RGBColor.from_string("223873")

    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_after = Pt(18)
    r_sub = p_sub.add_run("PHẦN MỀM QUẢN LÝ BẾN BÃI / CẢNG CẠN SƠN CẢNG (SON CANG YMS)\n"
                          "Tài liệu thao tác từng bước kèm khung ảnh minh họa cho các bộ phận: An ninh Cổng, CCKB Điện lạnh, Điều phối, Kế toán & Quản trị")
    r_sub.font.size = Pt(10.5)
    r_sub.font.italic = True
    r_sub.font.color.rgb = RGBColor(70, 85, 105)

    # Metadata Box Table
    meta_table = doc.add_table(rows=7, cols=2)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(meta_table, "CBD5E1")
    
    meta_data = [
        ("Tên tài liệu:", "Sổ tay Hướng dẫn Vận hành & Thao tác Phần mềm Sơn Cảng (Kèm Placeholder Ảnh)"),
        ("Đối tượng áp dụng:", "Bộ phận An ninh Cổng, CCKB Điện lạnh, Điều phối bến bãi, Kế toán & Ban Giám đốc"),
        ("Đơn vị ban hành:", "Công ty Cổ phần Tà Lùng Quang Minh (TLQM)"),
        ("Phiên bản phần mềm:", "Phiên bản V1.0 (Quy chuẩn V5 — Giao diện Modern Enterprise DS-02)"),
        ("Địa chỉ truy cập Web/PWA:", "https://son-cang-yms.vercel.app"),
        ("Đặc điểm tài liệu:", "Có sẵn 16 Khung Placeholder ảnh — Sẵn sàng dán ảnh chụp màn hình thực tế"),
        ("Ghi chú thử nghiệm mới:", "Hỗ trợ Nhập thủ công 12 số CCCD & Quét mã QR CCCD gắn chip của tài xế vào cổng"),
    ]
    
    col_widths = [Inches(2.4), Inches(4.3)]
    for idx, (label, val) in enumerate(meta_data):
        row = meta_table.rows[idx]
        row.cells[0].width = col_widths[0]
        row.cells[1].width = col_widths[1]
        row.cells[0].text = label
        row.cells[1].text = val
        bg = "F8F9FB" if idx % 2 == 0 else "FFFFFF"
        format_row(row, bg_color=bg, text_color="17202E", font_size=9.5)
        row.cells[0].paragraphs[0].runs[0].font.bold = True
        row.cells[0].paragraphs[0].runs[0].font.color.rgb = RGBColor.from_string("223873")
        if "https://" in val:
            row.cells[1].paragraphs[0].runs[0].font.color.rgb = RGBColor.from_string("326DD8")
            row.cells[1].paragraphs[0].runs[0].font.bold = True
        if "Placeholder Ảnh" in val or "CCCD" in val:
            row.cells[1].paragraphs[0].runs[0].font.bold = True

    doc.add_page_break()

    # -------------------------------------------------------------
    # HEADINGS HELPER
    # -------------------------------------------------------------
    def add_h1(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(16)
        p.paragraph_format.space_after = Pt(5)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.bold = True
        run.font.size = Pt(13.5)
        run.font.color.rgb = RGBColor.from_string("223873")
        return p

    def add_h2(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(11)
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.bold = True
        run.font.size = Pt(11)
        run.font.color.rgb = RGBColor.from_string("0A9444")
        return p

    def add_h3(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(8)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.bold = True
        run.font.size = Pt(10)
        run.font.color.rgb = RGBColor.from_string("17202E")
        return p

    # -------------------------------------------------------------
    # PHẦN 1: TỔNG QUAN & HƯỚNG DẪN TRUY CẬP ĐĂNG NHẬP
    # -------------------------------------------------------------
    add_h1("PHẦN 1. HƯỚNG DẪN TRUY CẬP & ĐĂNG NHẬP HỆ THỐNG")
    
    doc.add_paragraph(
        "Hệ thống Phần mềm Quản lý Bến bãi / Cảng cạn Sơn Cảng hoạt động theo mô hình Website kết hợp Ứng dụng Web Lũy tiến (PWA), "
        "tương thích hoàn hảo trên máy tính để bàn (PC), máy tính xách tay (Laptop), máy tính bảng (Tablet) và điện thoại thông minh (Smartphone) của cán bộ nhân viên."
    )
    
    add_h2("1.1. Địa chỉ truy cập và Cài đặt PWA trên thiết bị di động")
    doc.add_paragraph(
        "• Địa chỉ truy cập chính thức: https://son-cang-yms.vercel.app\n"
        "• Cài đặt PWA về màn hình chính điện thoại (Khuyên dùng cho An ninh & CCKB hiện trường):\n"
        "   - Trên Android (Chrome): Mở liên kết → Nhấp vào dấu 3 chấm góc phải trên → Chọn 'Cài đặt ứng dụng' hoặc 'Thêm vào Màn hình chính'.\n"
        "   - Trên iOS (Safari): Mở liên kết → Nhấp vào nút 'Chia sẻ' (Share) ở thanh dưới → Chọn 'Thêm vào MH chính' (Add to Home Screen)."
    )
    
    add_h2("1.2. Đăng nhập và Phân quyền ca trực")
    doc.add_paragraph(
        "Mỗi nhân sự trực ca được cấp 01 tài khoản định danh cá nhân gắn liền với vai trò nghiệp vụ (RBAC V5). Tuyệt đối không dùng chung mật khẩu."
    )
    
    # Bảng tài khoản công vụ khởi tạo sẵn cho kiểm thử và vận hành
    acc_table = doc.add_table(rows=7, cols=5)
    acc_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(acc_table, "CBD5E1")
    acc_headers = ["Vị trí trực ca", "Họ tên nhân sự", "Email công vụ", "Mật khẩu", "Vai trò RBAC V5"]
    for i, h in enumerate(acc_headers):
        acc_table.rows[0].cells[i].text = h
    format_row(acc_table.rows[0], is_header=True, bg_color="223873", text_color="FFFFFF", font_size=9, bold=True)
    
    accounts_data = [
        ("An ninh Cổng trực ca", "An Ninh Sơn Cảng", "anninh.talunglogistics@gmail.com", "Anninh@2026", "SEC_STAFF (26 quyền)"),
        ("Trưởng bộ phận An ninh", "Lương Duy Thái", "thaild@talunglogistics.com", "Thaild@2026", "SEC_LEAD (31 quyền)"),
        ("Nhân viên Thương vụ CCKB", "Linh Minh Trọng", "tronglm@talunglogistics.com", "Tronglm@2026", "PORT_STAFF (31 quyền)"),
        ("Trưởng bộ phận CCKB", "Trịnh Công Nguyên", "nguyentc@talunglogistics.com", "Nguyentc@2026", "PORT_LEAD (38 quyền)"),
        ("Nhân viên Điều phối bãi", "Điều phối", "dieuphoi.talunglogistics@gmail.com", "Dieuphoi@2026", "DIS_STAFF (9 quyền)"),
        ("Quản trị viên Hệ thống", "Ban Quản trị IT", "it@talunglogistics.com", "Admin@2026", "SYS_ADMIN (63 quyền)"),
    ]
    col_w_acc = [Inches(1.5), Inches(1.3), Inches(2.2), Inches(1.0), Inches(1.2)]
    for idx, (pos, name, em, pwd, rl) in enumerate(accounts_data, start=1):
        row = acc_table.rows[idx]
        for c_idx, val in enumerate([pos, name, em, pwd, rl]):
            row.cells[c_idx].width = col_w_acc[c_idx]
            row.cells[c_idx].text = val
        bg = "F8F9FB" if idx % 2 == 1 else "FFFFFF"
        format_row(row, bg_color=bg, text_color="17202E", font_size=8.5)
        row.cells[0].paragraphs[0].runs[0].font.bold = True
        row.cells[3].paragraphs[0].runs[0].font.name = "Consolas"
        row.cells[3].paragraphs[0].runs[0].font.bold = True
        row.cells[3].paragraphs[0].runs[0].font.color.rgb = RGBColor.from_string("0A9444")

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    add_callout(doc, 
        "Hệ thống quy định 7 vai trò chuẩn V5: Nhân viên An ninh (SEC_STAFF), Trưởng bộ phận An ninh (SEC_LEAD), "
        "Nhân viên CCKB (PORT_STAFF), Trưởng bộ phận CCKB (PORT_LEAD), Điều phối viên (DIS_STAFF), Trưởng BP Điều phối (DIS_LEAD), "
        "và Kế toán Bến bãi (ACCOUNTANT). Mỗi vai trò chỉ thao tác đúng thẩm quyền được phân công.",
        "QUY TẮC BẢO MẬT & ĐỊNH DANH CÁ NHÂN"
    )
    
    add_image_placeholder(doc,
        code="IMG-AUTH-01",
        title="Màn hình Đăng nhập Công vụ & Đổi mật khẩu (/login)",
        description="Giao diện đăng nhập hệ thống với tên đăng nhập/email, mật khẩu cá nhân và menu đổi mật khẩu người dùng.",
        focus_note="Ô nhập tài khoản cá nhân, nút 'Đăng nhập vào ca trực' và cảnh báo bảo mật."
    )

    # -------------------------------------------------------------
    # PHẦN 2: HƯỚNG DẪN BỘ PHẬN AN NINH — CỔNG VÀO (/entry)
    # -------------------------------------------------------------
    add_h1("PHẦN 2. HƯỚNG DẪN BỘ PHẬN AN NINH — TIẾP NHẬN PHƯƠNG TIỆN CỔNG VÀO (/entry)")
    
    doc.add_paragraph(
        "Bộ phận An ninh bốt cổng chịu trách nhiệm kiểm soát 100% lượt phương tiện vào bãi, ghi nhận biển số xe, loại xe theo biểu phí V5, "
        "số container, định danh tài xế (CCCD), thu tiền vé cổng và in vé/biên nhận."
    )
    
    add_h2("2.1. Quy trình tiếp nhận phương tiện vào cổng từng bước")
    steps_entry = [
        ("Bước 1 — Nhập Biển số xe: ", "Nhập biển số xe vào ô 'Biển số xe vào cổng'. Hệ thống tự động chuyển chữ hoa và tự động kiểm tra trùng xe trong bãi theo thời gian thực."),
        ("Bước 2 — Chọn Loại phương tiện V5: ", "Chọn 1 trong 7 loại xe theo Biểu phí chuẩn V5 (Xe container có hàng 250.000đ; Đầu kéo không cont 0đ; Xe bo 4 chân 200.000đ; Xe bo 3 chân 200.000đ; Xe bo 8 tấn 100.000đ; Xe bo 3 bánh 40.000đ; Xe sang tải 0đ)."),
        ("Bước 3 — Định danh Tài xế (CCCD & SĐT): ", "Nhập Họ tên tài xế, Số điện thoại liên hệ và Số CCCD tài xế (12 số). Có thể gõ tay trực tiếp hoặc bấm nút 'Quét CCCD tài xế' để máy quét/camera đọc mã QR CCCD gắn chip tự động điền."),
        ("Bước 4 — Nhập thông tin Container (Nếu có): ", "Nếu là Xe container, chọn chế độ chở 1 Cont 40ft/45ft hoặc 2 Cont 20ft song song; nhập Số container (chuẩn ISO 4 chữ + 7 số, kiểm tra check-digit tự động); chọn kích thước và loại vỏ (Lạnh RF / Khô DC)."),
        ("Bước 5 — Thu tiền vé cổng & Xác nhận: ", "Tích chọn 'Thu tiền vé ngay tại bốt cổng' (Tiền mặt hoặc Chuyển khoản VietQR). Nhấn 'Xác nhận xe vào bãi' để hoàn tất giao dịch trong vòng 1-2 giây.")
    ]
    for bold_p, text_p in steps_entry:
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_after = Pt(2)
        r = p.add_run(bold_p)
        r.bold = True
        r.font.color.rgb = RGBColor.from_string("17202E")
        p.add_run(text_p)

    add_image_placeholder(doc,
        code="IMG-ENTRY-01",
        title="Giao diện Form Tiếp nhận Phương tiện Cổng vào (/entry)",
        description="Toàn cảnh form tiếp nhận bố trí công thái học theo chiều dọc: Thông tin phương tiện, Thông tin Container và Thanh toán vé.",
        focus_note="Ô Biển số xe, danh mục 7 loại xe, ô kiểm tra trùng xe và nút 'Xác nhận xe vào bãi'."
    )

    add_h2("2.2. Hướng dẫn tính năng mới: Nhập thủ công & Quét mã QR CCCD tài xế")
    doc.add_paragraph(
        "Nhằm nâng cao năng lực định danh tài xế ra vào cảng, chống gian lận và phục vụ việc xuất hóa đơn GTGT cho khách hàng cá nhân, "
        "hệ thống trang bị 2 cơ chế tiếp nhận CCCD:"
    )
    doc.add_paragraph(
        "• Cơ chế 1 — Nhập thủ công số CCCD: Nhân viên An ninh nhìn thẻ CCCD của lái xe và gõ trực tiếp 12 chữ số vào ô 'Số CCCD tài xế' (Ví dụ: 001095012345). "
        "Hệ thống tự động kiểm tra đủ 12 số hợp lệ.\n"
        "• Cơ chế 2 — Quét mã QR CCCD gắn chip: Nhân viên nhấp nút 'Quét CCCD tài xế', đưa thẻ CCCD vào máy quét mã vạch hoặc camera. "
        "Hệ thống tự động bóc tách chuỗi dữ liệu (Số CCCD, Họ và tên) và tự động điền vào các ô tương ứng trên màn hình."
    )

    add_image_placeholder(doc,
        code="IMG-ENTRY-02",
        title="Ô Nhập thủ công CCCD 12 số & Hộp thoại Quét QR CCCD gắn chip (/entry)",
        description="Chi tiết ô nhập Số CCCD tài xế trực tiếp trên form và popup quét trích xuất tự động từ mã QR CCCD gắn chip.",
        focus_note="Ô input 'Số CCCD tài xế', nút 'Quét CCCD tài xế' và thông báo xác nhận trích xuất thành công."
    )

    add_h2("2.3. Hỗ trợ xe chở 2 container 20 feet (2x20ft) & Ghép yêu cầu điện CCKB")
    doc.add_paragraph(
        "Hệ thống hỗ trợ đầy đủ trường hợp xe đầu kéo kéo mooc chở cùng lúc 2 container 20ft (chế độ 'Cặp 2 container 20ft'). "
        "Mỗi container được cấp một mã lượt độc lập (`container_visit_id`), đảm bảo tính toán tiền điện và phí lưu bãi chính xác từng cont.\n"
        "Đồng thời, nếu Thương vụ CCKB đã lập phiếu cắm điện dự kiến trước, hệ thống sẽ hiển thị thẻ thông báo màu xanh dương nổi bật "
        "tại cột 'Đối chiếu & Trợ giúp' để An ninh ghép nối 1-chạm."
    )

    add_image_placeholder(doc,
        code="IMG-ENTRY-03",
        title="Tiếp nhận 2 Container 20ft song song & Cảnh báo khớp phiếu điện CCKB (/entry)",
        description="Khu vực nhập đồng thời Container #1 và Container #2 cùng thẻ cảnh báo khớp yêu cầu cắm điện trước tại cột phải.",
        focus_note="Chuyển đổi toggle 1 Cont / 2 Cont 20ft và thẻ cảnh báo màu xanh dương 'Khớp yêu cầu cắm điện trước'."
    )

    # -------------------------------------------------------------
    # PHẦN 3: HƯỚNG DẪN BỘ PHẬN AN NINH & CCKB — QUẢN LÝ BẾN BÃI (/yard)
    # -------------------------------------------------------------
    add_h1("PHẦN 3. HƯỚNG DẪN QUẢN LÝ BẾN BÃI, TỒN BÃI & SƠ ĐỒ PHÂN KHU (/yard)")
    
    doc.add_paragraph(
        "Màn hình Quản lý Bến bãi (`/yard`) là trung tâm giám sát thời gian thực toàn bộ lượng xe và container đang hiện diện trong bãi Sơn Cảng. "
        "Màn hình áp dụng chuẩn Full-Width và Full-Height Table chống co cụt, đảm bảo không bao giờ bị che khuất các nút thao tác."
    )
    
    add_h2("3.1. Theo dõi 3 danh sách bến bãi chính & Các tiện ích vận hành nâng cao")
    doc.add_paragraph(
        "• Tab 'Tổng hợp Cặp Xe — Container': Hiển thị liên kết trực quan giữa xe đầu kéo và container đang mang theo, trạng thái điện lạnh và thời gian lưu bãi.\n"
        "• Tab 'Phương tiện trong bãi': Thống kê chi tiết biển số xe, loại xe, giờ vào, tài xế và trạng thái thanh toán vé cổng.\n"
        "• Tab 'Container tồn bãi': Danh sách toàn bộ container đang lưu tại bãi, phân loại rõ cont HÀNG / RỖNG, trạng thái cắm điện và vị trí phân khu.\n"
        "• Hiển thị Phí lưu bãi Container tích lũy tạm tính (Quyết định D-022): Trên cả 2 bảng Cặp xe - Cont và Container tồn bãi, ngay dưới huy hiệu giờ lưu (≥24h, ≥48h), hệ thống hiển thị dòng chữ màu hổ phách 'Lưu bãi: ~X đ (Y đêm)' tính toán động theo khung giờ 22h-06h (miễn đêm đầu, đơn giá 100.000đ/đêm) giúp Điều phối và An ninh nắm bắt ngay cước phát sinh trước khi xe ra.\n"
        "• Tối ưu tải dữ liệu & Phân trang (Pagination): Toàn bộ bảng bến bãi trang bị bộ phân trang thông minh (tùy chọn 10, 20, 50, 100 dòng/trang, mặc định 20 dòng), tự động chuyển trang mượt mà trên cả máy tính lẫn điện thoại di động.\n"
        "• Tiện ích 'Làm sạch bãi (0 xe)' / 'Khởi tạo bãi trống 100%': Nút thao tác trên thanh công cụ và Menu người dùng cho phép Quản trị viên đưa bãi về trạng thái sạch sau các đợt kiểm thử mà không làm ảnh hưởng đến danh mục biểu phí, phân khu hay tài khoản nhân sự."
    )

    add_image_placeholder(doc,
        code="IMG-YARD-01",
        title="Màn hình Bảng điều khiển Quản lý Bến bãi, Phí lưu bãi tích lũy & Phân trang (/yard)",
        description="Giao diện Full-Width hiển thị thanh KPI 4 ô, huy hiệu giờ lưu kèm tiền lưu bãi tạm tính, bộ lọc và thanh phân trang 20 dòng/trang.",
        focus_note="Thanh KPI phương tiện tồn bãi, dòng 'Lưu bãi: ~X đ (Y đêm)' màu hổ phách, thanh phân trang và menu thao tác mở thông minh."
    )

    add_h2("3.2. Sơ đồ 4 Phân khu bãi (Khu A, B, C, D) & 30 Trụ điện 380V")
    doc.add_paragraph(
        "Chuyển sang tab 'Sơ đồ Phân khu & Trụ điện' để quan sát trực quan sức chứa bến bãi:\n"
        "• 4 Phân khu chuẩn: Khu A (Cont hàng xuất - 150 TEU), Khu B (Cont hàng nhập - 200 TEU), Khu C (Bãi chờ thông quan - 120 TEU), Khu D (Bãi xe sang tải - 80 xe).\n"
        "• 30 Trụ điện 380V chuyên dụng: Hiển thị trạng thái Đang cắm điện (Xanh lá), Sẵn sàng (Xám) hoặc Đang bảo trì (Đỏ) kèm công suất tải hiện tại."
    )

    add_image_placeholder(doc,
        code="IMG-YARD-02",
        title="Sơ đồ 4 Phân khu Bến bãi & Danh mục 30 Trụ điện 380V (/yard)",
        description="Lưới hiển thị 4 phân khu với tỷ lệ lấp đầy trực quan và danh sách 30 trụ điện container lạnh có badge trạng thái.",
        focus_note="Thẻ phân khu A/B/C/D, tỷ lệ lấp đầy (%) và trạng thái các trụ điện (Đang cắm / Trống)."
    )

    add_h2("3.3. Hiệu chỉnh biển số xe & Sửa số container (Lưu vết kiểm toán)")
    doc.add_paragraph(
        "Khi nhân viên phát hiện nhập sai biển số xe hoặc số container do tài xế báo nhầm hoặc bốt cổng gõ vội:\n"
        "1. Nhấp vào nút 'Thao tác' tại dòng phương tiện/container tương ứng → Chọn 'Sửa biển số xe' hoặc 'Sửa số container'.\n"
        "2. Nhập số mới chính xác và bắt buộc nhập Lý do điều chỉnh (Ví dụ: 'Sửa theo cavet xe', 'Đối chiếu thực tế hiện trường').\n"
        "3. Hệ thống giữ nguyên mã ID bất biến và lưu toàn bộ vết sửa vào Nhật ký kiểm toán (Audit Logs) để Ban Giám đốc hậu kiểm."
    )

    add_image_placeholder(doc,
        code="IMG-YARD-03",
        title="Hộp thoại Hiệu chỉnh Biển số xe / Số Container & Lưu vết Audit (/yard)",
        description="Modal hiệu chỉnh theo chuẩn DS-02 bo góc 16px, yêu cầu nhập số mới và lý do sửa đổi bắt buộc.",
        focus_note="Ô nhập số mới, ô 'Lý do hiệu chỉnh bắt buộc' và nút 'Lưu thay đổi'."
    )

    # -------------------------------------------------------------
    # PHẦN 4: HƯỚNG DẪN BỘ PHẬN CCKB & AN NINH — CONTAINER ĐIỆN LẠNH (/reefer)
    # -------------------------------------------------------------
    add_h1("PHẦN 4. HƯỚNG DẪN QUẢN LÝ CONTAINER ĐIỆN LẠNH & CẮM RÚT ĐIỆN (/reefer)")
    
    doc.add_paragraph(
        "Phân hệ Container Điện lạnh (`/reefer`) là nghiệp vụ cốt lõi, đảm bảo việc bảo quản nông sản xuất nhập khẩu lạnh "
        "và tính cước dịch vụ điện chính xác tuyệt đối theo quyết định mới nhất của Ban Giám đốc."
    )
    
    add_callout(doc,
        "QUY TẮC TÍNH TIỀN ĐIỆN MỚI (QUYẾT ĐỊNH D-021 CHỐT):\n"
        "1. Đơn giá: 100.000 VNĐ/giờ (áp dụng cho cả Cắm theo giờ và Cắm liên tục).\n"
        "2. Bỏ hoàn toàn quy tắc làm tròn 15 phút: Thời gian tính cước là SỐ PHÚT THỰC TẾ cắm điện ngoài bãi (billable_minutes = ROUND(giây / 60)).\n"
        "3. Làm tròn tiền cước đến bội số 5.000 VNĐ: Thành tiền = (Số phút thực tế / 60) * 100.000 VNĐ và được làm tròn đến mốc 5.000đ gần nhất (ROUND(cước / 5000) * 5000). Mọi phiên cắm thực tế (> 0s) đều đạt tối thiểu 5.000đ và tuyệt đối không phát sinh tiền lẻ 500đ, 1k, 2k.\n"
        "4. Chốt cước: Tiền điện chốt dứt điểm khi RÚT ĐIỆN thực tế và tự động ghi vào Sổ cái thu phí (charges).",
        "QUY TẮC CỐT LÕI TÍNH CƯỚC ĐIỆN LẠNH THỜI GIAN THỰC TẾ"
    )

    doc.add_paragraph(
        "Cấu trúc Phân hệ Giám sát điện gồm 4 Tab nghiệp vụ trực quan theo đúng quy trình phối hợp hiện trường:\n"
        "• Tab 1 — Yêu cầu cắm điện CCKB (Mặc định): Tiếp nhận và quản lý các phiếu đăng ký cắm điện do chủ hàng/CCKB lập trước.\n"
        "• Tab 2 — Sẵn sàng cắm điện: Danh sách toàn bộ container lạnh đang đỗ trong bãi sẵn sàng cấp điện kèm nút 'Cắm điện ngay'.\n"
        "• Tab 3 — Phiên cắm điện thực tế: Giám sát đồng hồ đếm thời gian thực các container đang cắm, nhiệt độ, trụ điện 380V và nút 'Rút điện chốt cước'.\n"
        "• Tab 4 — Nhật ký kiểm tra nhiệt độ: Lịch sử theo dõi và ghi nhận nhiệt độ (°C) định kỳ theo từng ca trực."
    )

    add_h2("4.1. Quy trình Cắm điện ngoài hiện trường")
    doc.add_paragraph(
        "1. Khi container vào bãi, An ninh hoặc CCKB chuyển sang tab 'Sẵn sàng cắm điện' (hiển thị số lượng container chờ cắm).\n"
        "2. Chọn container cần cắm → Nhấp 'Cắm điện ngay' → Chọn Trụ điện 380V (từ Trụ 01 đến Trụ 30, hiển thị rõ trụ trống/bận).\n"
        "3. Chọn Chế độ cắm (Theo giờ hoặc Cắm liên tục), nhập Nhiệt độ cài đặt (°C) và ghi nhận Giờ cắm thực tế (Hỗ trợ lùi giờ theo giờ nhắn Zalo hiện trường).\n"
        "4. Nhấn 'Xác nhận cắm điện' → Container chuyển ngay sang trạng thái 'ĐANG CẮM ĐIỆN' và xuất hiện tại Tab 'Phiên cắm điện thực tế'."
    )

    add_image_placeholder(doc,
        code="IMG-REEFER-01",
        title="Màn hình Theo dõi Cắm rút điện 4 Tab & Danh sách Sẵn sàng cắm (/reefer)",
        description="Giao diện theo dõi 4 Tab nghiệp vụ, hiển thị đồng hồ đếm cước thời gian thực tế và danh sách container sẵn sàng cắm.",
        focus_note="4 Tab (Yêu cầu CCKB, Sẵn sàng cắm, Phiên cắm thực tế, Nhật ký nhiệt độ), huy hiệu 'Đang cắm điện' và nút 'Rút điện'."
    )

    add_h2("4.2. Quy trình Rút điện chốt cước & Ghi nhận Nhật ký nhiệt độ")
    doc.add_paragraph(
        "• Thao tác Rút điện: Khi xe chuẩn bị xuất bãi hoặc khách yêu cầu ngắt điện, nhân viên bấm 'Rút điện chốt cước'. "
        "Hệ thống tự động hiển thị Giờ rút hiện tại, tính toán Số phút thực tế cắm điện và Thành tiền cước làm tròn đến 5.000đ. "
        "Khoản tiền điện này lập tức được ghi vào Sổ cái thu phí (`charges`).\n"
        "• Nghiệp vụ Khớp giờ Zalo: Trường hợp nhân viên cắm/rút thực tế ngoài bãi báo qua Zalo nhưng chưa kịp thao tác trên phần mềm, "
        "CCKB sử dụng tính năng 'Khớp giờ Zalo' để nhập mốc giờ cắm/rút thực tế có bằng chứng ảnh/tin nhắn Zalo, đảm bảo tính công bằng và minh bạch cước.\n"
        "• Ghi nhật ký nhiệt độ: Định kỳ 2-4 tiếng/lần, kỹ thuật viên CCKB kiểm tra các cont đang cắm, nhập nhiệt độ hiển thị vào tab 'Nhật ký kiểm tra nhiệt độ' "
        "để theo dõi biểu đồ bảo quản nông sản và làm căn cứ pháp lý với chủ hàng."
    )

    add_image_placeholder(doc,
        code="IMG-REEFER-02",
        title="Hộp thoại Rút điện Chốt cước tự động (Thời gian thực tế — Làm tròn 5.000đ) (/reefer)",
        description="Modal xác nhận rút điện hiển thị bảng tính chi tiết: Giờ cắm, Giờ rút, Số phút thực tế và Thành tiền cước làm tròn bội số 5k.",
        focus_note="Dòng 'Thời gian tính cước (Phút thực tế)', ô 'Thành tiền (Tròn đến 5k)' và nút 'Xác nhận rút điện'."
    )

    add_image_placeholder(doc,
        code="IMG-REEFER-03",
        title="Lập Yêu cầu Điện dự kiến CCKB & Ghi Nhật ký nhiệt độ định kỳ (/reefer)",
        description="Form lập phiếu tiếp nhận điện lạnh trước khi xe đến bãi và form ghi nhận nhiệt độ bảo quản container.",
        focus_note="Mã container dự kiến, chế độ cắm yêu cầu, ô nhập nhiệt độ thực tế (°C) và ghi chú kỹ thuật."
    )

    # -------------------------------------------------------------
    # PHẦN 5: HƯỚNG DẪN BỘ PHẬN AN NINH & CCKB — KIỂM SOÁT CỔNG RA (/exit)
    # -------------------------------------------------------------
    add_h1("PHẦN 5. HƯỚNG DẪN KIỂM SOÁT CỔNG RA & XUẤT BÃI (/exit)")
    
    doc.add_paragraph(
        "Màn hình Kiểm soát Cổng ra (`/exit`) là chốt chặn cuối cùng ngăn ngừa thất thoát tài chính và đảm bảo an toàn vận hành. "
        "Mọi phương tiện và container muốn rời cảng bắt buộc phải thỏa mãn đầy đủ 3 Điều kiện xuất bãi."
    )
    
    add_callout(doc,
        "3 ĐIỀU KIỆN XUẤT BÃI BẮT BUỘC:\n"
        "1. Vé vào bãi: Đã thanh toán tiền vé vào bãi (PAID) hoặc thuộc diện Miễn phí hợp lệ (EXEMPT).\n"
        "2. Rút điện an toàn: Container lạnh KHÔNG CÒN CẮM ĐIỆN VẬT LÝ ngoài bãi (Phải rút điện trước khi lăn bánh).\n"
        "3. Xác nhận Thương vụ CCKB: CCKB đã xác nhận đủ điều kiện tài chính hoặc chấp thuận Bảo lãnh công nợ có lý do.",
        "3 ĐIỀU KIỆN XUẤT BÃI KHÔNG THỂ BỎ QUA"
    )

    add_h2("5.1. Quy trình Kiểm soát Xuất bãi tại Bốt Cổng ra")
    steps_exit = [
        ("Bước 1 — Kiểm tra điều kiện xe ra: ", "An ninh tra cứu Biển số xe xuất bãi. Quan sát cột 'Điều kiện xuất bãi': nếu hiển thị huy hiệu xanh lá 'Sẵn sàng xuất bãi (Vé: ✓ • Điện: ✓ • CCKB: ✓)' thì xe đủ điều kiện làm thủ tục ra."),
        ("Bước 2 — Tự động tính Phí lưu bãi qua đêm: ", "Hệ thống tự động tính số đêm lưu bãi: Tính theo mốc 22:00 đến 06:00 sáng hôm sau, MIỄN PHÍ ĐÊM ĐẦU TIÊN, từ đêm thứ 2 tính 100.000 VNĐ/đêm. Tiền lưu chỉ chốt tại đúng thời điểm xe ra."),
        ("Bước 3 — Thu phí lưu bãi phát sinh: ", "Nếu có phát sinh tiền lưu bãi, An ninh bấm 'Thu tiền lưu bãi' (Tiền mặt hoặc Chuyển khoản VietQR) và in biên lai giao cho lái xe."),
        ("Bước 4 — Xác nhận xe xuất bãi: ", "Nhấn nút 'Xác nhận cho xe xuất bãi'. Hệ thống đóng lượt xe, cập nhật trạng thái EXITED và giải phóng diện tích bãi ngay lập tức.")
    ]
    for b_ex, t_ex in steps_exit:
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_after = Pt(2)
        r = p.add_run(b_ex)
        r.bold = True
        p.add_run(t_ex)

    add_image_placeholder(doc,
        code="IMG-EXIT-01",
        title="Màn hình Kiểm soát Cổng ra An ninh & Danh sách Xe chuẩn bị xuất (/exit)",
        description="Bảng An ninh Cổng ra với cột checklist điều kiện xuất bãi tinh gọn và các nút thao tác xuất bãi nhanh.",
        focus_note="Cột 'Điều kiện xuất bãi' (Checklist 3 mục), cột 'Phí lưu bãi tự tính' và nút 'Xác nhận xuất bãi'."
    )

    add_h2("5.2. Nghiệp vụ CCKB Duyệt xuất bãi (Bảo lãnh công nợ AP07)")
    doc.add_paragraph(
        "Trường hợp chủ hàng container lạnh chưa kịp thanh toán tiền điện nhưng xin bảo lãnh cho xe ra trước để kịp giờ giao hàng: "
        "Cán bộ CCKB chuyển sang tab 'Thương vụ CCKB (Duyệt xuất)' → Chọn container → Bấm 'Duyệt xuất bãi (Bảo lãnh nợ)' → "
        "Bắt buộc chọn Khách hàng công nợ và nhập Lý do bảo lãnh. Hệ thống ghi nhận khoản nợ vào Sổ công nợ AP07 để Kế toán thu hồi sau."
    )

    add_image_placeholder(doc,
        code="IMG-EXIT-02",
        title="Tab Thương vụ CCKB Duyệt xuất bãi & Hộp thoại Bảo lãnh Công nợ (/exit)",
        description="Giao diện duyệt điều kiện tài chính của CCKB và modal bảo lãnh công nợ có lý do bắt buộc.",
        focus_note="Tab 'Thương vụ CCKB (Duyệt xuất)', nút 'Duyệt xuất bảo lãnh' và ô chọn đối tác công nợ AP07."
    )

    # -------------------------------------------------------------
    # PHẦN 6: HƯỚNG DẪN BỘ PHẬN KẾ TOÁN & THU NGÂN (/billing, /accounting)
    # -------------------------------------------------------------
    add_h1("PHẦN 6. HƯỚNG DẪN BỘ PHẬN THU NGÂN & KẾ TOÁN BẾN BÃI (/billing, /accounting)")
    
    doc.add_paragraph(
        "Phân hệ Tài chính - Kế toán đảm bảo quản lý dòng tiền bến bãi chặt chẽ, đối soát tiền mặt hiện trường, "
        "phát hành hóa đơn GTGT (Doanh nghiệp & Cá nhân theo CCCD) và theo dõi thu hồi công nợ bến bãi."
    )
    
    add_h2("6.1. Sổ cái các khoản thu & Thu gộp nhiều khoản (/billing)")
    doc.add_paragraph(
        "• Theo dõi toàn bộ các khoản thu bến bãi: Vé vào cổng (TICKET), Tiền điện lạnh (REEFER_POWER), Phí lưu bãi qua đêm (STORAGE) và Tiền phạt mất vé (PENALTY).\n"
        "• Thu gộp nhiều khoản: Khi khách hàng thanh toán cùng lúc cả vé cổng, tiền điện và tiền lưu cho một hoặc nhiều xe, nhân viên tích chọn các khoản thu tương ứng → "
        "Bấm 'Thu gộp khoản chọn' để lập 01 Phiếu thu gộp duy nhất, tiết kiệm thời gian và chứng từ cho khách hàng."
    )

    add_image_placeholder(doc,
        code="IMG-BILLING-01",
        title="Màn hình Sổ cái Thu phí & Tính năng Thu gộp nhiều khoản (/billing)",
        description="Bảng Sổ cái Full-Width hiển thị mã khoản thu, biển số, loại phí, số tiền, hình thức thanh toán và nút thu gộp.",
        focus_note="Checkbox chọn nhiều dòng, nút 'Thu gộp khoản đã chọn' và bảng kê biên lai thu tiền trong ca."
    )

    add_h2("6.2. Chốt nộp quỹ tiền mặt hiện trường (Quy trình kiểm soát 4 mắt) (/accounting)")
    doc.add_paragraph(
        "Cuối mỗi ca trực, Trưởng ca An ninh và Thủ quỹ/Kế toán thực hiện đối soát và chốt tiền mặt hiện trường tại tab 'Chốt tiền mặt hiện trường':\n"
        "1. Hệ thống tự động tổng hợp toàn bộ các khoản thu bằng TIỀN MẶT trong khoảng thời gian ca trực.\n"
        "2. Kiểm đếm tiền mặt thực tế và nhập 'Số tiền nộp quỹ thực tế'. Nếu có chênh lệch thừa/thiếu, hệ thống cảnh báo màu vàng và yêu cầu giải trình.\n"
        "3. Người bàn giao (An ninh) và Người nhận bàn giao (Kế toán) cùng ký duyệt điện tử → In 'Biên bản bàn giao tiền mặt' lưu hồ sơ."
    )

    add_h2("6.3. Quản lý Hóa đơn GTGT (Doanh nghiệp MST & Cá nhân CCCD 12 số) (/accounting)")
    doc.add_paragraph(
        "Hệ thống hỗ trợ quản lý và phân loại hóa đơn GTGT bến bãi phục vụ tích hợp hóa đơn điện tử:\n"
        "• Hóa đơn Doanh nghiệp: Nhập Tên công ty, Mã số thuế (MST) và Địa chỉ đăng ký kinh doanh.\n"
        "• Hóa đơn Khách hàng Cá nhân: Nhập Họ tên người mua và Số Căn cước công dân (CCCD 12 chữ số). Dữ liệu này được liên kết trực tiếp từ thông tin CCCD tài xế nhập tại cổng vào."
    )

    add_image_placeholder(doc,
        code="IMG-ACCOUNTING-01",
        title="Màn hình Kế toán Bến bãi: Chốt tiền mặt & Sổ Hóa đơn MST/CCCD (/accounting)",
        description="Giao diện kế toán với 3 tab: Chốt tiền mặt hiện trường, Quản lý Hóa đơn (MST & CCCD) và Thu hồi công nợ AP07.",
        focus_note="Bảng chốt tiền mặt 4 mắt, nút 'Lập đề nghị xuất hóa đơn GTGT' và nút 'Xuất Sổ Kế toán Excel 4 sheet'."
    )

    # -------------------------------------------------------------
    # PHẦN 7: HƯỚNG DẪN ĐIỀU PHỐI, BÁO CÁO & QUẢN TRỊ HỆ THỐNG
    # -------------------------------------------------------------
    add_h1("PHẦN 7. HƯỚNG DẪN ĐIỀU PHỐI BÃI, BÁO CÁO VẬN HÀNH & QUẢN TRỊ")
    
    add_h2("7.1. Cập nhật Container HÀNG / RỖNG (Bộ phận Điều phối)")
    doc.add_paragraph(
        "Nhân viên Điều phối bến bãi chịu trách nhiệm phân loại tình trạng hàng hóa của container trong bãi:\n"
        "• Thao tác nhanh: Trên màn hình `/yard` (hoặc `/reefer`), nhấp vào chip trạng thái HÀNG/RỖNG để chuyển đổi giữa 'HÀNG' (Cont có hàng hóa), 'RỖNG' (Vỏ cont không hàng) hoặc 'CHƯA XÁC ĐỊNH'.\n"
        "• Quy tắc: Việc chưa cập nhật Hàng/Rỗng không cản trở việc cắm điện hay cho xe xuất bãi, nhưng là dữ liệu bắt buộc để Điều phối lập kế hoạch xếp dỡ và sang tải."
    )

    add_h2("7.2. Thống kê & Báo cáo Vận hành Điều hành (/reports)")
    doc.add_paragraph(
        "Dành cho Ban Giám đốc và Trưởng các bộ phận theo dõi chỉ số hoạt động kinh doanh:\n"
        "• Tab 'Doanh thu & Dòng tiền': Phân tích biểu đồ doanh thu theo ngày/tuần/tháng, tỷ lệ Tiền mặt vs Chuyển khoản VietQR, doanh thu vé cổng vs cước điện.\n"
        "• Tab 'Lưu lượng & 7 Loại xe': Cơ cấu các chủng loại xe vào cảng, giờ cao điểm và phân tích tải trọng.\n"
        "• Nút 'Xem trước & In Báo cáo': Tự động xuất biểu mẫu báo cáo vận hành chuẩn hành chính để in ấn hoặc lưu trữ PDF."
    )

    add_image_placeholder(doc,
        code="IMG-REPORTS-01",
        title="Màn hình Báo cáo Vận hành & Phân tích Dòng tiền Bến bãi (/reports)",
        description="Giao diện báo cáo DS-02 với bộ chọn kỳ báo cáo, 4 tab chuyên sâu và Right Context Inspector chỉ số điều hành.",
        focus_note="Bộ chọn khoảng thời gian, biểu đồ cơ cấu doanh thu và nút 'Xem trước bản in báo cáo'."
    )

    add_h2("7.3. Quản trị Người dùng & Phân quyền RBAC V5 (/admin/users)")
    doc.add_paragraph(
        "Dành cho Quản trị viên hệ thống (SYS_ADMIN) và Ban Giám đốc:\n"
        "• Thêm mới / Khóa tài khoản cán bộ nhân viên trực ca.\n"
        "• Gán vai trò nghiệp vụ (7 vai trò RBAC V5) và phạm vi dữ liệu (Theo ca, Theo bãi, Toàn hệ thống).\n"
        "• Đặt lại mật khẩu tài khoản khi nhân viên quên mật khẩu.\n"
        "• Xem Ma trận quyền hạn chi tiết (67 hành động nghiệp vụ)."
    )

    add_h2("7.4. Nhật ký Kiểm toán Toàn bãi Append-only (/admin/audit-logs)")
    doc.add_paragraph(
        "Hệ thống tự động ghi nhận 100% các biến động nghiệp vụ nhạy cảm vào Nhật ký kiểm toán bất biến (Append-only):\n"
        "• Mọi hành động tiếp nhận xe, cắm rút điện, thu tiền, duyệt nợ, sửa biển số, sửa số container đều được lưu vết: Ai làm, Lúc mấy giờ, Giá trị cũ là gì, Giá trị mới là gì và Lý do thao tác.\n"
        "• Dữ liệu kiểm toán không thể bị xóa hoặc sửa đè bởi bất kỳ người dùng nào, kể cả Quản trị viên."
    )

    add_image_placeholder(doc,
        code="IMG-ADMIN-01",
        title="Màn hình Quản trị Nhân sự & Nhật ký Kiểm toán Toàn bãi (/admin/*)",
        description="Giao diện quản lý danh sách tài khoản nhân viên trực ca, phân quyền vai trò V5 và bảng tra cứu Audit Logs toàn bãi.",
        focus_note="Danh sách tài khoản trực ca, huy hiệu vai trò RBAC V5 và bảng Nhật ký kiểm toán lưu vết chi tiết."
    )

    # -------------------------------------------------------------
    # PHẦN KẾT: DANH SÁCH TỔNG HỢP 16 PLACEHOLDER ẢNH
    # -------------------------------------------------------------
    add_h1("PHỤ LỤC: DANH MỤC 16 KHUNG PLACEHOLDER ẢNH CẦN DÁN CHỤP THỰC TẾ")
    doc.add_paragraph(
        "Bảng dưới đây tổng hợp đầy đủ 16 ảnh chụp màn hình cần dán vào các khung placeholder trong tài liệu trước khi gửi vào nhóm Zalo/Telegram vận hành:"
    )
    
    summary_table = doc.add_table(rows=17, cols=4)
    summary_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(summary_table, "CBD5E1")
    
    headers = ["Mã ảnh", "Tên màn hình", "Đường dẫn Route", "Bộ phận phụ trách"]
    for i, h in enumerate(headers):
        summary_table.rows[0].cells[i].text = h
    format_row(summary_table.rows[0], is_header=True, bg_color="223873", text_color="FFFFFF", font_size=9.5, bold=True)
    
    placeholders_data = [
        ("IMG-AUTH-01", "Đăng nhập công vụ & Đổi mật khẩu", "/login", "Tất cả nhân sự"),
        ("IMG-ENTRY-01", "Tiếp nhận xe vào bãi & Form tổng thể", "/entry", "An ninh Cổng vào"),
        ("IMG-ENTRY-02", "Nhập tay CCCD 12 số & Quét QR CCCD", "/entry", "An ninh Cổng vào"),
        ("IMG-ENTRY-03", "Tiếp nhận 2 Cont 20ft & Khớp phiếu điện", "/entry", "An ninh Cổng vào"),
        ("IMG-YARD-01", "Bảng điều khiển Quản lý Bến bãi & Tồn bãi", "/yard", "An ninh & Điều phối"),
        ("IMG-YARD-02", "Sơ đồ 4 Phân khu & 30 Trụ điện 380V", "/yard", "Điều phối & CCKB"),
        ("IMG-YARD-03", "Hộp thoại Hiệu chỉnh Biển số / Số cont", "/yard", "An ninh & CCKB"),
        ("IMG-REEFER-01", "Màn hình Theo dõi Cắm rút điện 4 Tab", "/reefer", "CCKB & An ninh"),
        ("IMG-REEFER-02", "Hộp thoại Rút điện Chốt cước (Tròn đến 5k)", "/reefer", "CCKB Điện lạnh"),
        ("IMG-REEFER-03", "Phiếu điện dự kiến & Nhật ký nhiệt độ", "/reefer", "CCKB Điện lạnh"),
        ("IMG-EXIT-01", "Kiểm soát Xuất bãi & Checklist điều kiện", "/exit", "An ninh Cổng ra"),
        ("IMG-EXIT-02", "Thương vụ CCKB Duyệt xuất bảo lãnh nợ", "/exit", "CCKB & An ninh"),
        ("IMG-BILLING-01", "Sổ cái thu phí & Thu gộp nhiều khoản", "/billing", "Kế toán / Thu ngân"),
        ("IMG-ACCOUNTING-01", "Chốt tiền mặt hiện trường & Sổ Hóa đơn", "/accounting", "Kế toán bến bãi"),
        ("IMG-REPORTS-01", "Báo cáo Vận hành & Phân tích Dòng tiền", "/reports", "Ban Giám đốc & TBP"),
        ("IMG-ADMIN-01", "Quản trị Nhân sự & Nhật ký Kiểm toán", "/admin/*", "Quản trị hệ thống"),
    ]
    
    col_w = [Inches(1.2), Inches(2.6), Inches(1.3), Inches(1.6)]
    for idx, (c, t, r_path, dept) in enumerate(placeholders_data):
        row = summary_table.rows[idx + 1]
        for ci, val in enumerate([c, t, r_path, dept]):
            row.cells[ci].width = col_w[ci]
            row.cells[ci].text = val
        bg = "F8F9FB" if idx % 2 == 0 else "FFFFFF"
        format_row(row, bg_color=bg, text_color="17202E", font_size=9)
        row.cells[0].paragraphs[0].runs[0].font.bold = True
        row.cells[0].paragraphs[0].runs[0].font.color.rgb = RGBColor.from_string("326DD8")
        row.cells[2].paragraphs[0].runs[0].font.name = "Consolas"
        row.cells[2].paragraphs[0].runs[0].font.size = Pt(8.5)

    doc.add_paragraph().paragraph_format.space_after = Pt(16)
    
    # Save document
    doc.save(output_path)
    print(f"[OK] Da tao thanh cong tai lieu huong dan su dung co placeholder tai: {output_path}")

if __name__ == "__main__":
    out_dir = r"d:\thanhnx\OpenCode\YMS-project\docs"
    os.makedirs(out_dir, exist_ok=True)
    out_file1 = os.path.join(out_dir, "Tai_Lieu_Huong_Dan_Su_Dung_Son_Cang_Co_Placeholder.docx")
    out_file2 = r"d:\thanhnx\OpenCode\YMS-project\Tai_Lieu_Huong_Dan_Su_Dung_Son_Cang_Co_Placeholder.docx"
    
    generate_user_guide_doc(out_file1)
    generate_user_guide_doc(out_file2)
