import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
import os

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

def set_table_borders(table, color="E5E9F0"):
    """Sets light subtle borders for a table."""
    tblPr = table._tbl.tblPr
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'  <w:top w:val="single" w:sz="4" w:space="0" w:color="{color}"/>'
        f'  <w:bottom w:val="single" w:sz="4" w:space="0" w:color="{color}"/>'
        f'  <w:insideH w:val="single" w:sz="4" w:space="0" w:color="{color}"/>'
        f'  <w:left w:val="none"/>'
        f'  <w:right w:val="none"/>'
        f'  <w:insideV w:val="none"/>'
        f'</w:tblBorders>'
    )
    tblPr.append(borders)

def add_callout(doc, text_content, title="LƯU Ý NGHIỆP VỤ", border_color="223873", bg_color="F8F9FB"):
    """Creates a stylized callout box."""
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = tbl.cell(0, 0)
    set_cell_background(cell, bg_color)
    set_cell_margins(cell, top=140, bottom=140, left=200, right=200)
    
    # Custom left thick border
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

def format_row(row, is_header=False, bg_color="FFFFFF", text_color="17202E", font_size=9.5, bold=False):
    for cell in row.cells:
        set_cell_background(cell, bg_color)
        set_cell_margins(cell, top=120, bottom=120, left=150, right=150)
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

def create_system_doc(output_path):
    doc = Document()
    
    # Page Setup - Standard A4 with 0.8 inch margins
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.85)
        section.right_margin = Inches(0.85)
        
        # Header & Footer
        footer = section.footer
        fp = footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        frun = fp.add_run("Phần mềm quản lý bến bãi/cảng cạn Sơn Cảng — Công ty Cổ phần Tà Lùng Quang Minh | Trang ")
        frun.font.name = "Calibri"
        frun.font.size = Pt(8.5)
        frun.font.color.rgb = RGBColor(150, 160, 175)
        
        # Add Page Number field XML
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
    r_org.font.size = Pt(11)
    r_org.font.color.rgb = RGBColor.from_string("0A9444")
    
    r_dept = cp_org.add_run("BỘ PHẬN CÔNG NGHỆ THÔNG TIN — DỰ ÁN SƠN CẢNG YMS")
    r_dept.font.bold = True
    r_dept.font.size = Pt(9.5)
    r_dept.font.color.rgb = RGBColor(100, 110, 125)

    doc.add_paragraph().paragraph_format.space_after = Pt(24)

    # Document Title
    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_after = Pt(8)
    r_title = p_title.add_run("TÀI LIỆU MÔ TẢ HỆ THỐNG\nPHẦN MỀM QUẢN LÝ BẾN BÃI / CẢNG CẠN SƠN CẢNG")
    r_title.font.bold = True
    r_title.font.size = Pt(21)
    r_title.font.color.rgb = RGBColor.from_string("223873")

    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_after = Pt(20)
    r_sub = p_sub.add_run("Hệ thống phần mềm chuyên dụng giám sát phương tiện ra/vào, theo dõi dịch vụ điện lạnh container, quản lý tồn bãi và kiểm soát dòng tiền bến bãi theo thời gian thực")
    r_sub.font.size = Pt(11)
    r_sub.font.italic = True
    r_sub.font.color.rgb = RGBColor(80, 95, 115)

    # Metadata Box Table
    meta_table = doc.add_table(rows=6, cols=2)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(meta_table, "CBD5E1")
    
    meta_data = [
        ("Tên dự án:", "Hệ thống Quản lý Bến bãi / Cảng cạn Sơn Cảng (Son Cang YMS)"),
        ("Đơn vị sở hữu:", "Công ty Cổ phần Tà Lùng Quang Minh (TLQM)"),
        ("Người chủ trì kỹ thuật:", "Nguyễn Xuân Thành — Bộ phận Công nghệ thông tin"),
        ("Phiên bản hệ thống:", "Phiên bản V1.0 (Quy chuẩn V5 — Chuẩn giao diện DS-02)"),
        ("Môi trường triển khai:", "Production Cloud (Vercel) & Local On-Premises"),
        ("Địa chỉ truy cập chính thức:", "https://son-cang-yms.vercel.app"),
    ]
    
    col_widths = [Inches(2.2), Inches(4.5)]
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

    doc.add_page_break()

    # -------------------------------------------------------------
    # MỤC LỤC & DANH MỤC
    # -------------------------------------------------------------
    def add_heading_1(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(16)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.bold = True
        run.font.size = Pt(14)
        run.font.color.rgb = RGBColor.from_string("223873")
        return p

    def add_heading_2(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.bold = True
        run.font.size = Pt(11.5)
        run.font.color.rgb = RGBColor.from_string("0A9444")
        return p

    def add_heading_3(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(8)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.bold = True
        run.font.size = Pt(10.5)
        run.font.color.rgb = RGBColor.from_string("17202E")
        return p

    # -------------------------------------------------------------
    # 1. TỔNG QUAN HỆ THỐNG
    # -------------------------------------------------------------
    add_heading_1("1. TỔNG QUAN HỆ THỐNG & BỐI CẢNH DỰ ÁN")
    
    add_heading_2("1.1. Bối cảnh hình thành và Sự cần thiết đầu tư")
    doc.add_paragraph(
        "Bến bãi logistics Sơn Cảng thuộc Công ty Cổ phần Tà Lùng Quang Minh đóng vai trò là cửa ngõ tập kết, "
        "thông quan, trung chuyển hàng hóa xuất nhập khẩu trọng điểm. Lưu lượng xe đầu kéo container, xe tải thùng, "
        "xe sang tải nội bộ cùng lượng container lạnh (Reefer Container) bảo quản nông sản hoạt động liên tục 24/7."
    )
    doc.add_paragraph(
        "Trước đây, công tác ghi nhận phương tiện và dịch vụ bến bãi được thử nghiệm qua ứng dụng AppSheet kết hợp "
        "sổ ghi chép tay tại các bốt trực. Mặc dù bước đầu tạo thói quen số hóa biển số xe và giờ ra vào, "
        "giải pháp tạm thời bộc lộ các hạn chế nghiêm trọng:"
    )
    
    limitations = [
        ("Thiếu tính liên kết đa bộ phận: ", "Không có luồng phối hợp thời gian thực giữa An ninh Bốt Cổng, Đội Kỹ thuật CCKB (điện lạnh) và Kế toán thu ngân."),
        ("Nguy cơ thất thoát doanh thu cao: ", "Không tự động tính toán chính xác tiền cước điện làm tròn 15 phút và phí lưu bãi qua đêm (22:00–06:00, miễn đêm đầu). Xe có thể xuất bãi khi chưa thanh toán đủ tiền điện hoặc nợ chưa được duyệt."),
        ("Hạn chế kiểm toán và bảo mật: ", "Không có phân quyền đa cấp RBAC (Role-Based Access Control), không lưu nhật ký lịch sử (Audit Logs) khi sửa biển số xe hay số container."),
        ("Không hỗ trợ đối soát ca trực: ", "Không có sổ cái tài chính tập trung để kết toán tiền mặt, không phân định được nguồn thu vé cổng và nguồn thu cước điện lạnh theo từng ca trực.")
    ]
    for bold_prefix, text in limitations:
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_after = Pt(2)
        r_b = p.add_run(bold_prefix)
        r_b.font.bold = True
        r_b.font.color.rgb = RGBColor.from_string("17202E")
        p.add_run(text)

    add_heading_2("1.2. Mục tiêu tổng quát của Phần mềm")
    doc.add_paragraph(
        "Phần mềm quản lý bến bãi/cảng cạn Sơn Cảng được nghiên cứu, thiết kế và phát triển chuyên dụng nhằm thay thế "
        "hoàn toàn các giải pháp tạm thời, hướng tới các mục tiêu trọng tâm:"
    )
    
    goals = [
        "Kiểm soát chặt chẽ 100% lượt phương tiện và container ra/vào bãi bằng mã vé điện tử định danh.",
        "Thiết lập quy trình kiểm soát xuất bãi 2 cấp độc lập: Thương vụ CCKB duyệt cước điện & công nợ trước, An ninh Bốt Cổng xác nhận cho xe rời bãi sau.",
        "Tự động hóa hoàn toàn thuật toán tính phí dịch vụ theo biểu phí ban hành, loại bỏ sai sót tính nhẩm của con người.",
        "Bảo đảm an toàn dữ liệu tuyệt đối qua ma trận phân quyền 7 vai trò chuẩn RBAC V5 và cơ sở dữ liệu đám mây PostgreSQL bảo mật.",
        "Cung cấp báo cáo điều hành trực quan theo thời gian thực về sản lượng, công suất bãi và dòng tiền cho Ban Giám đốc."
    ]
    for g in goals:
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_after = Pt(2)
        p.add_run(g)

    add_callout(
        doc,
        "Nguyên tắc bất biến của hệ thống (Domain Invariants):\n"
        "1. Phương tiện (Xe) và Container là 2 thực thể độc lập: Không được gộp lượt xe và lượt cont; một xe có thể chở 1 cont 40ft, 2 cont 20ft hoặc là xe lẻ không cont.\n"
        "2. Không khóa cước lưu bãi trước giờ xe lăn bánh thực tế qua cổng ra.\n"
        "3. Tuyệt đối không tự động sửa/gộp số container theo 7 số cuối hay thuật toán fuzzy match; mọi thao tác sửa đổi phải nhập lý do và lưu vết kiểm toán.\n"
        "4. Tên gọi nghiệp vụ thống nhất: 'Phần mềm quản lý bến bãi/cảng cạn', không sử dụng thuật ngữ BOS.",
        title="NGUYÊN TẮC BẤT BIẾN NGHIỆP VỤ SƠN CẢNG (V5)",
        border_color="0A9444",
        bg_color="ECFDF3"
    )

    # -------------------------------------------------------------
    # 2. KIẾN TRÚC KỸ THUẬT & CÔNG NGHỆ
    # -------------------------------------------------------------
    add_heading_1("2. KIẾN TRÚC KỸ THUẬT & CÔNG NGHỆ NỀN TẢNG")
    
    doc.add_paragraph(
        "Hệ thống được xây dựng trên nền tảng công nghệ web hiện đại, đạt tiêu chuẩn khắt khe về hiệu năng, "
        "tính sẵn sàng cao và khả năng tương thích trên nhiều chủng loại thiết bị di động hiện trường."
    )

    tech_table = doc.add_table(rows=7, cols=2)
    tech_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(tech_table, "CBD5E1")
    
    tech_data = [
        ("Tầng Ứng dụng (Frontend):", "Next.js 16 (App Router, Turbopack Engine, React 19, TypeScript 5, Tailwind CSS 4). Đảm bảo tốc độ hiển thị dưới 0.3s, trải nghiệm mượt mà không độ trễ."),
        ("Ứng dụng web tiến bộ (PWA):", "Progressive Web App hỗ trợ cài đặt icon shortcut trực tiếp lên màn hình chính thiết bị Android, iOS, Windows Tablet. Tối ưu chạm cảm ứng lớn cho bốt trực hiện trường."),
        ("Tầng Dữ liệu & Backend:", "Supabase Cloud Enterprise trên nền tảng PostgreSQL. Hỗ trợ Row-Level Security (RLS) bảo vệ từng bản ghi dữ liệu, cơ chế khóa giao dịch chống trùng lặp (Concurrency Lock)."),
        ("Xác thực & Bảo mật (Auth):", "Supabase Auth mã hóa SSL/TLS, xác thực tập trung theo email công vụ và mật khẩu chuẩn bảo mật cao, liên kết chặt chẽ với ma trận phân quyền RBAC V5."),
        ("Tiêu chuẩn Thiết kế UI/UX:", "Modern Enterprise Workspace (DS-02) / Minimal SaaS Dashboard: Bố cục 5 vùng khoa học (Navigation Bar, Secondary Panel, Workspace Header, Main Workspace, Right Context Inspector)."),
        ("Kiểm toán & Lịch sử (Audit):", "Hệ thống tự động ghi nhật ký mọi hành vi sửa biển số, đổi số container, duyệt ngoại lệ công nợ, in lại phiếu xuất bãi và đối soát quỹ ca trực.")
    ]
    
    for idx, (label, val) in enumerate(tech_data):
        row = tech_table.rows[idx]
        row.cells[0].width = col_widths[0]
        row.cells[1].width = col_widths[1]
        row.cells[0].text = label
        row.cells[1].text = val
        bg = "F8F9FB" if idx % 2 == 0 else "FFFFFF"
        format_row(row, bg_color=bg, text_color="17202E", font_size=9.5)
        row.cells[0].paragraphs[0].runs[0].font.bold = True
        row.cells[0].paragraphs[0].runs[0].font.color.rgb = RGBColor.from_string("223873")

    doc.add_page_break()

    # -------------------------------------------------------------
    # 3. CHI TIẾT CÁC PHÂN HỆ CHỨC NĂNG CHÍNH
    # -------------------------------------------------------------
    add_heading_1("3. MÔ TẢ CHI TIẾT CÁC PHÂN HỆ NGHIỆP VỤ")
    
    # 3.1 Cổng vào
    add_heading_2("3.1. Phân hệ Tiếp nhận Phương tiện tại Cổng vào (Gate Entry)")
    doc.add_paragraph(
        "Phân hệ dành riêng cho Nhân viên An ninh bốt cổng vào, đảm nhiệm việc ghi nhận lượt xe vào bãi với tốc độ "
        "thao tác nhanh chóng (trung bình dưới 15 giây/xe), loại bỏ tình trạng ùn tắc giao thông ngoài cổng cảng."
    )
    
    entry_features = [
        ("Nhận diện 7 chủng loại phương tiện: ", "Xe container lạnh, Xe đầu kéo không moóc, Xe bo 4 chân tải thùng, Xe bo 3 chân tải thùng, Xe bo 8 tấn (2 chân), Xe bo 3 bánh nội bộ, Xe sang tải nội bộ."),
        ("Tự động áp giá vé cổng: ", "Hệ thống tự động tra cứu Biểu phí ban hành theo loại xe, hiển thị số tiền thu hoặc gắn cờ Miễn phí (0đ)."),
        ("Quản lý cặp xe & container: ", "Hỗ trợ linh hoạt: xe mang 1 cont (20ft, 40ft, 45ft), xe mang cặp 2 cont 20ft, hoặc xe lẻ không mang container."),
        ("In vé / Phiếu xác nhận vào bãi: ", "Tự động sinh mã vé duy nhất theo cấu hình (VE-YYYYMMDD-XXXX), in phiếu mã vạch/QR hỗ trợ đối soát nhanh khi xe ra.")
    ]
    for b_prefix, txt in entry_features:
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_after = Pt(2)
        r = p.add_run(b_prefix)
        r.font.bold = True
        p.add_run(txt)

    # 3.2 Cắm rút điện
    add_heading_2("3.2. Phân hệ Theo dõi Cắm rút điện Container (Reefer Management)")
    doc.add_paragraph(
        "Phân hệ phục vụ Tổ Kỹ thuật CCKB và Nhân viên theo dõi điện lạnh, giám sát liên tục quá trình cấp nguồn điện "
        "cho các container hàng lạnh lưu bãi."
    )
    
    reefer_features = [
        ("Cấu trúc 4 Tab quy trình nghiệp vụ: ", "Sắp xếp theo thứ tự phối hợp chuẩn: (1) Yêu cầu cắm điện CCKB [mặc định mở], (2) Container sẵn sàng cắm điện, (3) Phiên cắm điện thực tế, (4) Nhật ký kiểm tra nhiệt độ."),
        ("Theo dõi phiên cắm/rút thời gian thực: ", "Ghi nhận chính xác thời điểm cắm giắc điện, thời điểm rút giắc, vị trí trụ cắm và cán bộ thực hiện kèm đồng hồ đếm thời gian thực."),
        ("Thuật toán tính cước điện thời gian thực tế (Quyết định D-021): ", "Bỏ hoàn toàn quy tắc làm tròn 15 phút. Thời lượng cắm điện được tính theo SỐ PHÚT THỰC TẾ cắm ngoài bãi; thành tiền cước làm tròn đến bội số 5.000 VNĐ, triệt tiêu hoàn toàn tiền lẻ."),
        ("Nghiệp vụ Khớp giờ Zalo & Hồi tố: ", "Hỗ trợ CCKB đối soát và khớp giờ giắc điện theo bằng chứng ảnh/tin nhắn Zalo hiện trường, chống tranh chấp cước."),
        ("Giám sát nhật ký nhiệt độ định kỳ: ", "Hỗ trợ ghi nhận thông số nhiệt độ (°C) và tình trạng máy lạnh theo từng ca trực, lưu vết chứng cứ cho chủ hàng.")
    ]
    for b_prefix, txt in reefer_features:
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_after = Pt(2)
        r = p.add_run(b_prefix)
        r.font.bold = True
        p.add_run(txt)

    # 3.3 Quản lý Bãi & Tồn bãi
    add_heading_2("3.3. Phân hệ Quản lý Bến bãi & Tồn bãi (Yard Management)")
    doc.add_paragraph(
        "Cung cấp góc nhìn toàn cảnh về tình trạng chiếm dụng bến bãi, phân khu vị trí và quản lý vòng đời container."
    )
    
    yard_features = [
        ("Đồng bộ dữ liệu bến bãi thực tế: ", "Đã nạp sẵn 70 xe và 65 container tồn bãi thực tế từ dữ liệu vận hành AppSheet phục vụ kiểm thử và vận hành tức thì."),
        ("Quản lý cặp ghép Xe — Container: ", "Theo dõi trực quan xe nào đang chở container nào, xe nào đã hạ bãi cont và chuyển thành xe đơn."),
        ("Cảnh báo lưu bãi & Phí lưu bãi tích lũy tạm tính (Quyết định D-022): ", "Tự động phân loại cảnh báo ≥ 24h và ≥ 48h, đồng thời hiển thị trực quan cước lưu bãi tạm tính 'Lưu bãi: ~X đ (Y đêm)' của từng container theo khung 22h-06h (miễn đêm đầu)."),
        ("Tối ưu tải dữ liệu & Phân trang (Pagination): ", "Trang bị bộ phân trang thông minh 10/20/50/100 dòng/trang, giúp hiển thị mượt mà danh sách tồn bãi lớn mà không gây giật lag DOM."),
        ("Chuyển trạng thái HÀNG / RỖNG: ", "Quy trình cập nhật trạng thái container chặt chẽ, ghi nhận nhân viên điều phối thao tác."),
        ("Quy trình Sửa số Container / Biển số có kiểm toán: ", "Bắt buộc nhập lý do điều chỉnh và lưu vết bất biến (Append-only) vào Nhật ký kiểm toán phục vụ hậu kiểm.")
    ]
    for b_prefix, txt in yard_features:
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_after = Pt(2)
        r = p.add_run(b_prefix)
        r.font.bold = True
        p.add_run(txt)

    # 3.4 Sổ cái Tài chính & Thu ngân
    add_heading_2("3.4. Phân hệ Tài chính, Thu phí & Sổ cái Bến bãi (Billing & Cashier)")
    doc.add_paragraph(
        "Trung tâm kiểm soát toàn bộ dòng tiền thu về bến bãi, quản lý công nợ và phục vụ công tác bàn giao ca trực."
    )
    
    billing_features = [
        ("Dashboard phản ánh tài chính trung thực: ", "Thẻ chỉ số tổng quan tích hợp cả các khoản nợ đã chốt trong sổ cái và Phí lưu bãi container tích lũy tạm tính (~73.7tr) của các cont đang đỗ trong bãi."),
        ("Tổng hợp các nguồn doanh thu bến bãi: ", "Vé xe vào cổng, Cước tiền điện container, Phí lưu bãi qua đêm, và Dịch vụ nâng hạ/sang tải."),
        ("Bảng Sổ cái full-width chuyên nghiệp: ", "Hiển thị đầy đủ thông tin: Mã chứng từ, Loại phí, Đối tượng (Xe/Cont), Số tiền, Hình thức thanh toán (Tiền mặt / Chuyển khoản VietQR), Trạng thái thu."),
        ("Thanh toán gộp đa chứng từ: ", "Cho phép thu ngân chọn thanh toán đồng thời nhiều khoản phí cho cùng một chủ hàng/doanh nghiệp vận tải."),
        ("Báo cáo ca trực & Bàn giao quỹ 4 mắt: ", "Thống kê chính xác số tiền thực thu trong ca của từng nhân viên thu ngân/an ninh, chốt nộp quỹ hiện trường minh bạch.")
    ]
    for b_prefix, txt in billing_features:
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_after = Pt(2)
        r = p.add_run(b_prefix)
        r.font.bold = True
        p.add_run(txt)

    # 3.5 Cổng ra & Duyệt xuất bãi 2 cấp
    add_heading_2("3.5. Phân hệ Kiểm soát Xuất bãi & Cổng ra (Gate Exit & Clearance)")
    doc.add_paragraph(
        "Đây là chốt chặn quan trọng nhất để phòng chống thất thoát tài chính và đảm bảo an toàn giao thông cảng."
    )
    
    add_callout(
        doc,
        "Quy trình kiểm soát xuất bãi 2 cấp độc lập:\n"
        "• CẤP 1 (Thương vụ CCKB): Kiểm tra đối soát tiền cước điện lạnh và tiền lưu bãi. Nếu chủ hàng thanh toán đầy đủ hoặc được phê duyệt ghi nợ bảo lãnh hợp lệ (có lý do), CCKB ký duyệt điều kiện xuất bãi trên phần mềm.\n"
        "• CẤP 2 (An ninh Bốt Cổng ra): Kiểm tra checklist điện tử trên màn hình: Vé cổng đã thu (✓), Đã rút giắc điện (✓), CCKB đã duyệt (✓). Xác nhận xe lăn bánh ra cổng và in biên lai xuất bãi.",
        title="QUY TRÌNH KIỂM SOÁT XUẤT BÃI 2 CẤP ĐỘC LẬP",
        border_color="223873",
        bg_color="EFF8FF"
    )

    doc.add_page_break()

    # -------------------------------------------------------------
    # 4. BIỂU PHÍ & THUẬT TOÁN TÍNH TIỀN
    # -------------------------------------------------------------
    add_heading_1("4. BIỂU PHÍ DỊCH VỤ & THUẬT TOÁN TỰ ĐỘNG")
    
    doc.add_paragraph(
        "Toàn bộ đơn giá được cấu hình động trong cơ sở dữ liệu theo Quyết định ban hành biểu phí của Công ty Cổ phần Tà Lùng Quang Minh:"
    )

    fee_table = doc.add_table(rows=10, cols=4)
    fee_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(fee_table, "CBD5E1")
    
    fee_headers = ["STT", "Hạng mục Dịch vụ bến bãi", "Đơn vị tính", "Đơn giá ban hành (VNĐ)"]
    for i, h in enumerate(fee_headers):
        fee_table.rows[0].cells[i].text = h
    format_row(fee_table.rows[0], is_header=True, bg_color="223873", text_color="FFFFFF", font_size=10, bold=True)
    
    fees_data = [
        ("1", "Vé xe container lạnh vào cổng", "Lượt xe", "250.000 đ"),
        ("2", "Vé xe đầu kéo không cont", "Lượt xe", "0 đ (Miễn phí)"),
        ("3", "Vé xe bo 4 chân tải thùng", "Lượt xe", "200.000 đ"),
        ("4", "Vé xe bo 3 chân tải thùng", "Lượt xe", "200.000 đ"),
        ("5", "Vé xe bo 8 tấn (2 chân)", "Lượt xe", "100.000 đ"),
        ("6", "Vé xe bo 3 bánh nội bộ", "Lượt xe", "40.000 đ"),
        ("7", "Vé xe sang tải nội bộ", "Lượt xe", "0 đ (Miễn phí)"),
        ("8", "Tiền điện container lạnh theo giờ", "Giờ (Phút thực tế, tròn 5k)", "100.000 đ / giờ"),
        ("9", "Phí lưu container qua đêm (22:00–06:00)", "Đêm (miễn đêm đầu)", "100.000 đ / đêm"),
    ]
    
    col_w_fee = [Inches(0.6), Inches(3.2), Inches(1.4), Inches(1.8)]
    for row_idx, data in enumerate(fees_data, start=1):
        row = fee_table.rows[row_idx]
        for col_idx, text in enumerate(data):
            row.cells[col_idx].width = col_w_fee[col_idx]
            row.cells[col_idx].text = text
        bg = "F8F9FB" if row_idx % 2 == 1 else "FFFFFF"
        format_row(row, bg_color=bg, text_color="17202E", font_size=9.5)
        # Bold price column
        row.cells[3].paragraphs[0].runs[0].font.bold = True
        if "Miễn phí" in data[3]:
            row.cells[3].paragraphs[0].runs[0].font.color.rgb = RGBColor.from_string("326DD8")
        else:
            row.cells[3].paragraphs[0].runs[0].font.color.rgb = RGBColor.from_string("0A9444")

    doc.add_paragraph().paragraph_format.space_after = Pt(8)
    
    add_heading_2("Quy tắc tính toán & phân công thu tiền nghiệp vụ:")
    p_rules = doc.add_paragraph()
    p_rules.add_run("• Quy tắc tính cước điện container (Quyết định D-021): ").bold = True
    p_rules.add_run("Bỏ làm tròn 15 phút. Thời lượng tính theo số phút thực tế cắm ngoài bãi; thành tiền làm tròn đến bội số 5.000 VNĐ (tối thiểu 5.000đ cho phiên cắm > 0s), triệt tiêu hoàn toàn tiền lẻ 500đ, 1k, 2k.\n")
    p_rules.add_run("• Quy tắc tính phí lưu bãi container (Quyết định D-022): ").bold = True
    p_rules.add_run("Tính theo đêm lưu qua khung giờ 22:00 – 06:00 (miễn đêm đầu tiên, 100.000 đ/đêm); chỉ chốt và thu tiền tại Cổng ra khi container thực tế rời cảng.\n")
    p_rules.add_run("• Phân công thu tiền nghiệp vụ: ").bold = True
    p_rules.add_run("An ninh thu Vé xe vào cổng và Phí lưu bãi container tại Cổng ra; CCKB thu Tiền điện container lạnh và duyệt bảo lãnh nợ AP07. ").font.color.rgb = RGBColor(30, 40, 55)
    r_warn = p_rules.add_run("Tuyệt đối An ninh Bốt Cổng không tự ý thu tiền điện.")
    r_warn.bold = True
    r_warn.font.color.rgb = RGBColor.from_string("B54708")

    # -------------------------------------------------------------
    # 5. MA TRẬN PHÂN QUYỀN TRUY CẬP (RBAC V5)
    # -------------------------------------------------------------
    add_heading_1("5. MA TRẬN PHÂN QUYỀN TRUY CẬP (RBAC V5)")
    
    doc.add_paragraph(
        "Hệ thống thiết lập 7 nhóm vai trò công vụ chính thức, bảo đảm nguyên tắc 'Đúng người — Đúng việc — Đúng thẩm quyền':"
    )

    rbac_table = doc.add_table(rows=8, cols=3)
    rbac_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(rbac_table, "CBD5E1")
    
    rbac_headers = ["Mã vai trò", "Tên vai trò công tác", "Phạm vi chức năng & Quyền hạn chính"]
    for i, h in enumerate(rbac_headers):
        rbac_table.rows[0].cells[i].text = h
    format_row(rbac_table.rows[0], is_header=True, bg_color="223873", text_color="FFFFFF", font_size=10, bold=True)
    
    rbac_data = [
        ("BGD", "Ban Giám đốc", "Toàn quyền xem tất cả dashboard, báo cáo tài chính, lưu lượng xe, công suất bãi và lịch sử kiểm toán toàn hệ thống."),
        ("ADMIN", "Quản trị viên (Super Admin)", "Quản lý danh sách tài khoản, phân quyền, cấu hình biểu phí, giám sát an ninh kỹ thuật và khôi phục dữ liệu."),
        ("KTT", "Kế toán trưởng / Kế toán", "Quản lý sổ cái thu phí bến bãi, đối soát doanh thu, kiểm tra biên bản ca trực, chốt sổ kế toán định kỳ."),
        ("THUNGAN", "Thu ngân Bến bãi", "Lập phiếu thu, thu tiền mặt/chuyển khoản, in biên lai, thực hiện kết toán và bàn giao quỹ ca trực."),
        ("DIEUDO", "Điều độ Bến bãi", "Quản lý tồn bãi, sơ đồ phân khu, vị trí container, gán ô đỗ, cập nhật phân loại HÀNG/RỖNG."),
        ("CCKB", "Kỹ thuật / Thương vụ CCKB", "Lập yêu cầu cắm điện, quản lý phiên cắm/rút, ghi nhật ký nhiệt độ, duyệt điều kiện xuất bãi hoặc bảo lãnh nợ."),
        ("ANNINH", "An ninh Bốt Cổng (Vào/Ra)", "Check-in xe vào bãi, thu vé cổng, in vé, kiểm soát điều kiện xuất bãi, thu phí lưu bãi và xác nhận xe ra cổng.")
    ]
    
    col_w_rbac = [Inches(1.1), Inches(2.1), Inches(3.8)]
    for row_idx, (role_code, role_name, perms) in enumerate(rbac_data, start=1):
        row = rbac_table.rows[row_idx]
        row.cells[0].width = col_w_rbac[0]
        row.cells[1].width = col_w_rbac[1]
        row.cells[2].width = col_w_rbac[2]
        
        row.cells[0].text = role_code
        row.cells[1].text = role_name
        row.cells[2].text = perms
        
        bg = "F8F9FB" if row_idx % 2 == 1 else "FFFFFF"
        format_row(row, bg_color=bg, text_color="17202E", font_size=9.5)
        row.cells[0].paragraphs[0].runs[0].font.bold = True
        row.cells[0].paragraphs[0].runs[0].font.color.rgb = RGBColor.from_string("223873")
        row.cells[1].paragraphs[0].runs[0].font.bold = True

    doc.add_page_break()

    # -------------------------------------------------------------
    # 6. KẾ HOẠCH TRIỂN KHAI & ĐÀO TẠO
    # -------------------------------------------------------------
    add_heading_1("6. KẾ HOẠCH TRIỂN KHAI & ĐÀO TẠO NGƯỜI DÙNG")
    
    doc.add_paragraph(
        "Kế hoạch triển khai đưa hệ thống vào vận hành thực tế được chia làm 4 giai đoạn cụ thể từ nay đến 31/12/2026:"
    )

    plan_table = doc.add_table(rows=5, cols=4)
    plan_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(plan_table, "CBD5E1")
    
    plan_headers = ["Giai đoạn", "Nội dung công việc trọng tâm", "Bộ phận phối hợp", "Thời hạn"]
    for i, h in enumerate(plan_headers):
        plan_table.rows[0].cells[i].text = h
    format_row(plan_table.rows[0], is_header=True, bg_color="223873", text_color="FFFFFF", font_size=10, bold=True)
    
    plan_data = [
        ("Giai đoạn 1\n(Chuẩn bị)", "Khởi tạo danh sách tài khoản công vụ cho toàn bộ nhân sự theo 7 vai trò. Cài đặt shortcut PWA lên máy tính bảng bốt trực và điện thoại cán bộ.", "Bộ phận CNTT, An ninh, CCKB", "20/10/2026"),
        ("Giai đoạn 2\n(Đào tạo & Pilot)", "Tổ chức đào tạo thực hành tại hiện trường Bốt Cổng và Trạm CCKB. Biên soạn Cheat-sheet 1 trang dán tại bốt. Vận hành song song với AppSheet 10-14 ngày.", "CNTT, An ninh, CCKB, Kế toán", "15/11/2026"),
        ("Giai đoạn 3\n(Cắt chuyển Cut-over)", "Kiểm kê chốt số xe/cont tồn bãi. Đóng quyền nhập liệu trên AppSheet cũ, chuyển 100% giao dịch sang phần mềm mới. Cán bộ IT trực chốt hỗ trợ 24/7.", "Toàn bộ các bộ phận bến bãi", "30/11/2026"),
        ("Giai đoạn 4\n(Nghiệm thu)", "Đánh giá hiệu quả kiểm soát doanh thu tháng đầu tiên, tiếp thu phản hồi tối ưu hóa thao tác. Báo cáo nghiệm thu dự án trình Ban Giám đốc.", "CNTT, Kế toán, Ban Giám đốc", "31/12/2026"),
    ]
    
    col_w_plan = [Inches(1.2), Inches(3.3), Inches(1.5), Inches(1.0)]
    for row_idx, data in enumerate(plan_data, start=1):
        row = plan_table.rows[row_idx]
        for col_idx, text in enumerate(data):
            row.cells[col_idx].width = col_w_plan[col_idx]
            row.cells[col_idx].text = text
        bg = "F8F9FB" if row_idx % 2 == 1 else "FFFFFF"
        format_row(row, bg_color=bg, text_color="17202E", font_size=9.5)
        row.cells[0].paragraphs[0].runs[0].font.bold = True
        row.cells[3].paragraphs[0].runs[0].font.bold = True
        row.cells[3].paragraphs[0].runs[0].font.color.rgb = RGBColor.from_string("0A9444")

    doc.add_paragraph().paragraph_format.space_after = Pt(16)

    # -------------------------------------------------------------
    # 7. THÔNG TIN TRUY CẬP & HỖ TRỢ KỸ THUẬT
    # -------------------------------------------------------------
    add_heading_1("7. THÔNG TIN TRUY CẬP & HỖ TRỢ KỸ THUẬT")
    
    info_table = doc.add_table(rows=4, cols=2)
    info_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(info_table, "CBD5E1")
    
    info_data = [
        ("Đường dẫn Ứng dụng Cloud:", "https://son-cang-yms.vercel.app"),
        ("Tài khoản Quản trị Khởi tạo:", "it@talunglogistics.com (Mật khẩu được cấp riêng cho Quản trị viên)"),
        ("Đầu mối Hỗ trợ Kỹ thuật CNTT:", "Nguyễn Xuân Thành — Bộ phận Công nghệ thông tin TLQM"),
        ("Kênh tiếp nhận sự cố hiện trường:", "Nhóm Zalo Điều hành Sơn Cảng & Hệ thống ticket nội bộ"),
    ]
    
    for idx, (label, val) in enumerate(info_data):
        row = info_table.rows[idx]
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

    doc.add_paragraph().paragraph_format.space_after = Pt(8)
    add_heading_2("Danh sách Tài khoản Công vụ Kích hoạt sẵn phục vụ Vận hành & Kiểm thử:")
    
    uat_acc_table = doc.add_table(rows=7, cols=4)
    uat_acc_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(uat_acc_table, "CBD5E1")
    uat_headers = ["Vị trí công tác", "Nhân sự", "Email đăng nhập", "Mật khẩu khởi tạo"]
    for i, h in enumerate(uat_headers):
        uat_acc_table.rows[0].cells[i].text = h
    format_row(uat_acc_table.rows[0], is_header=True, bg_color="223873", text_color="FFFFFF", font_size=9.5, bold=True)
    
    uat_data = [
        ("An ninh Cổng trực ca (SEC_STAFF)", "An Ninh Sơn Cảng", "anninh.talunglogistics@gmail.com", "Anninh@2026"),
        ("Trưởng BP An ninh (SEC_LEAD)", "Lương Duy Thái", "thaild@talunglogistics.com", "Thaild@2026"),
        ("Thương vụ CCKB (PORT_STAFF)", "Linh Minh Trọng", "tronglm@talunglogistics.com", "Tronglm@2026"),
        ("Trưởng BP CCKB (PORT_LEAD)", "Trịnh Công Nguyên", "nguyentc@talunglogistics.com", "Nguyentc@2026"),
        ("Điều phối viên Bãi (DIS_STAFF)", "Điều phối", "dieuphoi.talunglogistics@gmail.com", "Dieuphoi@2026"),
        ("Quản trị viên Hệ thống (SYS_ADMIN)", "Ban Quản trị IT", "it@talunglogistics.com", "Admin@2026"),
    ]
    col_w_uat = [Inches(2.5), Inches(1.5), Inches(2.2), Inches(1.0)]
    for idx, (pos, name, em, pwd) in enumerate(uat_data, start=1):
        row = uat_acc_table.rows[idx]
        for c_idx, val in enumerate([pos, name, em, pwd]):
            row.cells[c_idx].width = col_w_uat[c_idx]
            row.cells[c_idx].text = val
        bg = "F8F9FB" if idx % 2 == 1 else "FFFFFF"
        format_row(row, bg_color=bg, text_color="17202E", font_size=9)
        row.cells[0].paragraphs[0].runs[0].font.bold = True
        row.cells[3].paragraphs[0].runs[0].font.name = "Consolas"
        row.cells[3].paragraphs[0].runs[0].font.bold = True
        row.cells[3].paragraphs[0].runs[0].font.color.rgb = RGBColor.from_string("0A9444")

    # Signature Block
    doc.add_paragraph().paragraph_format.space_after = Pt(20)
    sig_table = doc.add_table(rows=1, cols=2)
    sig_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(sig_table, "FFFFFF")
    
    cell_left = sig_table.rows[0].cells[0]
    cell_right = sig_table.rows[0].cells[1]
    cell_left.width = Inches(3.5)
    cell_right.width = Inches(3.5)
    
    p_l = cell_left.paragraphs[0]
    p_l.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_l1 = p_l.add_run("ĐẠI DIỆN BỘ PHẬN CNTT\nNGƯỜI LẬP BÁO CÁO\n\n\n\n\n")
    r_l1.font.bold = True
    r_l1.font.size = Pt(10)
    r_l2 = p_l.add_run("Nguyễn Xuân Thành")
    r_l2.font.bold = True
    r_l2.font.size = Pt(11)
    r_l2.font.color.rgb = RGBColor.from_string("223873")
    
    p_r = cell_right.paragraphs[0]
    p_r.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_r1 = p_r.add_run("DUYỆT NỘI DUNG TRIỂN KHAI\nBAN TỔNG GIÁM ĐỐC\n\n\n\n\n")
    r_r1.font.bold = True
    r_r1.font.size = Pt(10)
    r_r2 = p_r.add_run("CÔNG TY CỔ PHẦN TÀ LÙNG QUANG MINH")
    r_r2.font.bold = True
    r_r2.font.size = Pt(10)
    r_r2.font.color.rgb = RGBColor.from_string("0A9444")

    # Save
    doc.save(output_path)
    print(f"Document successfully created at: {output_path}")

if __name__ == "__main__":
    docs_dir = os.path.join(os.path.dirname(__file__), "..", "docs")
    os.makedirs(docs_dir, exist_ok=True)
    out_file = os.path.join(docs_dir, "Tai_Lieu_Mo_Ta_He_Thong_Quan_Ly_Ben_Bai_Son_Cang.docx")
    create_system_doc(out_file)
    
    # Also save a copy in root folder for easy access
    root_file = os.path.join(os.path.dirname(__file__), "..", "Tai_Lieu_Mo_Ta_He_Thong_Quan_Ly_Ben_Bai_Son_Cang.docx")
    create_system_doc(root_file)
