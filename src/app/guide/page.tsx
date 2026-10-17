'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Truck, 
  Layers, 
  Zap, 
  Receipt, 
  LogOut, 
  Landmark, 
  BarChart3, 
  ShieldCheck, 
  History, 
  BookOpen, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Download, 
  ExternalLink, 
  Eye, 
  Lock, 
  Clock, 
  ChevronRight,
  Compass,
  X,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { WorkspaceHeader } from '@/components/workspace/workspace-header';
import { WorkspaceTabs } from '@/components/workspace/workspace-tabs';

export default function GuideOverviewPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'WORKFLOW' | 'CABINETS' | 'RULES' | 'GALLERY'>('WORKFLOW');
  const [selectedWorkflowStep, setSelectedWorkflowStep] = useState<number>(1);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; title: string; subtitle: string } | null>(null);

  // 7 Bước vận hành phần mềm liên hoàn
  const workflowSteps = [
    {
      step: 1,
      id: 'entry',
      title: 'Tiếp nhận Cổng vào',
      route: '/entry',
      role: 'An ninh Cổng vào (SEC_STAFF / SEC_LEAD)',
      roleBadge: 'bg-[#ECFDF3] text-[#0A9444] border-[#A6F4C5]',
      icon: Truck,
      summary: 'Tiếp nhận phương tiện & container vào bãi, quét QR CCCD chip tài xế, cấp mã vé điện tử (tùy chọn in giấy).',
      keyFeatures: [
        'Nhận diện biển số xe đầu kéo, xe bo tải thùng, xe sang tải nội bộ',
        'Quét mã QR thẻ CCCD gắn chip tự động bóc tách số CCCD, họ tên tài xế',
        'Hỗ trợ chế độ tiếp nhận song song 2 Container 20ft trên cùng 1 rơ-moóc',
        'Tự động đối soát và khớp Phiếu yêu cầu cấp điện dự kiến từ CCKB',
        'Thu tiền vé vào cổng theo biểu giá niêm yết (Tiền mặt / Chuyển khoản VietQR)'
      ],
      ruleNotice: 'Biển số xe và số container là căn cứ pháp lý — nếu sơn mờ phải lập biên bản kiểm tra thực tế.',
      images: [
        { src: '/user_inserted_images/image1.png', title: 'Toàn cảnh Giao diện Đăng nhập Hệ thống Sơn Cảng' },
        { src: '/user_inserted_images/image2.png', title: 'Màn hình Tiếp nhận Cổng vào (/entry)' },
        { src: '/user_inserted_images/image3.png', title: 'Toàn cảnh Form Tiếp nhận Cổng vào đầy đủ thông tin' },
        { src: '/user_inserted_images/image4.png', title: 'Nhập tay số CCCD 12 số của tài xế' },
        { src: '/user_inserted_images/image5.png', title: 'Hộp thoại Quét QR CCCD gắn chip bóc tách tự động' },
        { src: '/user_inserted_images/image6.png', title: 'Tiếp nhận song song 2 Cont 20ft & Khớp phiếu điện' }
      ]
    },
    {
      step: 2,
      id: 'yard',
      title: 'Quản lý Bãi & Tủ điện',
      route: '/yard',
      role: 'Điều phối viên (DIS_STAFF / DIS_LEAD)',
      roleBadge: 'bg-[#EAF1FD] text-[#326DD8] border-[#D0E1FD]',
      icon: Layers,
      summary: 'Quản lý sơ đồ 4 phân khu bến bãi, giám sát 70 xe, cước lưu bãi tích lũy và hệ thống 13 tủ điện.',
      keyFeatures: [
        'Bảng điều khiển bến bãi: Theo dõi số ngày đỗ, cột cước lưu bãi tích lũy (~X đ (Y đêm)), phân trang 20 dòng',
        'Sơ đồ 4 Phân khu trực quan: Khu A (Cont Lạnh), Khu B (Hàng Khô), Khu C (Vỏ Rỗng), Khu D (Chờ Xuất)',
        'Mạng lưới cấp điện 13 Tủ điện & 50 Giắc cắm 380V chuẩn công nghiệp bến bãi',
        'Tính năng Cắm nhanh Container tại bãi (Quick Plug 1-chạm vào giắc 380V)',
        'Cập nhật trạng thái HÀNG hoặc RỖNG của container theo tiến độ đóng rút hàng',
        'Hiệu chỉnh Biển số xe / Số Cont bắt buộc nhập lý do lưu vết Kiểm toán (Audit Log)'
      ],
      ruleNotice: 'Cước lưu bãi container chỉ mang tính chất tích lũy dự tính, CHỈ được chốt và thu thực tế tại Cổng ra khi container rời bãi.',
      images: [
        { src: '/user_inserted_images/IMG-YARD-01-dashboard.png', title: 'Bảng điều khiển bến bãi, cước lưu bãi tích lũy (~X đ (Y đêm))' },
        { src: '/user_inserted_images/IMG-YARD-02-zones-grid.png', title: 'Sơ đồ 4 Phân khu & Lưới 13 Tủ điện 50 Giắc cắm 380V' },
        { src: '/user_inserted_images/IMG-YARD-03-modal-add-cabinet.png', title: 'Hộp thoại Thêm Mới Tủ Điện 380V (Mã tủ T14, 4 giắc 380V)' },
        { src: '/user_inserted_images/IMG-YARD-04-modal-quick-plug.png', title: 'Hộp thoại Cắm Container Nhanh Tại Bãi (Quick Plug)' },
        { src: '/user_inserted_images/IMG-YARD-05-modal-edit-plate.png', title: 'Hộp thoại Hiệu chỉnh Biển số xe & Lưu vết Audit' }
      ]
    },
    {
      step: 3,
      id: 'reefer',
      title: 'Điện lạnh CCKB',
      route: '/reefer',
      role: 'Nghiệp vụ CCKB (PORT_STAFF / PORT_LEAD)',
      roleBadge: 'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]',
      icon: Zap,
      summary: 'Lập yêu cầu cắm điện, quản lý phiên cắm rút, ghi nhật ký nhiệt độ và chốt cước điện tự động.',
      keyFeatures: [
        'Lập Phiếu yêu cầu cắm điện dự kiến (Target Temp -18°C, chủ hàng, số giờ dự kiến)',
        'Màn hình theo dõi 4 Tab: Đang cắm điện, Sẵn sàng cắm, Phiếu yêu cầu, Nhật ký nhiệt độ',
        'Live Ticker đồng hồ thời gian thực tế tự động tính giờ và công tơ',
        'Ghi nhật ký nhiệt độ định kỳ (-18.5°C Normal / Cảnh báo nhiệt)',
        'Hộp thoại Rút điện chốt cước tự động: Làm tròn đến 5.000đ theo thời gian thực tế',
        'Đối chiếu phiên cắm/rút với hình ảnh giắc cắm và video nhóm Zalo CCKB trực ban'
      ],
      ruleNotice: 'Cước điện container lạnh tính theo thời gian cắm thực tế, làm tròn đến 5.000đ. Không khóa cước trước khi rút điện.',
      images: [
        { src: '/user_inserted_images/IMG-REEFER-01-active-sessions.png', title: 'Tab Đang cắm điện — Live ticker thời gian thực tế' },
        { src: '/user_inserted_images/IMG-REEFER-02-ready-queue.png', title: 'Tab Sẵn sàng cắm — Danh sách container chờ cấp điện' },
        { src: '/user_inserted_images/IMG-REEFER-03-modal-create-request.png', title: 'Hộp thoại Lập Yêu cầu Cắm điện Dự kiến CCKB' },
        { src: '/user_inserted_images/IMG-REEFER-04-modal-plug.png', title: 'Hộp thoại Cắm điện Container & Chọn Tủ/Giắc 380V' },
        { src: '/user_inserted_images/IMG-REEFER-05-modal-unplug.png', title: 'Hộp thoại Rút điện Chốt cước tự động (Làm tròn 5.000đ)' }
      ]
    },
    {
      step: 4,
      id: 'billing',
      title: 'Sổ cái Thu phí',
      route: '/billing',
      role: 'An ninh / CCKB / Kế toán (Toàn quyền)',
      roleBadge: 'bg-[#F9F5FF] text-[#6941C6] border-[#E9D7FE]',
      icon: Receipt,
      summary: 'Sổ cái thu phí tập trung toàn bãi, thu tiền đơn lẻ, thu gộp nhiều khoản và đối soát ca trực.',
      keyFeatures: [
        'Sổ cái đa tiêu chí: Lọc theo loại phí (Vé vào bãi, Cước điện lạnh, Cước lưu bãi, Phạt mất vé)',
        'Lọc trạng thái thanh toán Chưa thu / Đã thu / Đã miễn phí',
        'Modal Thu tiền đơn lẻ: Ghi nhận Tiền mặt hoặc Chuyển khoản qua mã VietQR động',
        'Modal Thu gộp nhiều khoản (Batch Collection): Thu tiền 1 lần cho nhiều khoản cước',
        'In Phiếu thu tiền bến bãi theo mẫu tài chính chuẩn mực'
      ],
      ruleNotice: 'Không xóa hoặc ghi đè khoản thu đã xác nhận. Mọi chênh lệch phải xử lý qua phiếu điều chỉnh được phê duyệt.',
      images: [
        { src: '/user_inserted_images/IMG-BILLING-01-ledger-table.png', title: 'Sổ cái Thu phí Toàn bãi & Bộ lọc đa tiêu chí' },
        { src: '/user_inserted_images/IMG-BILLING-02-modal-collect.png', title: 'Hộp thoại Thu tiền Đơn lẻ (Tiền mặt / Chuyển khoản VietQR)' },
        { src: '/user_inserted_images/IMG-BILLING-03-modal-batch.png', title: 'Hộp thoại Thu gộp nhiều khoản cước (Batch Collection)' },
        { src: '/user_inserted_images/IMG-BILLING-04-modal-receipt.png', title: 'Hộp thoại In Phiếu Thu Tiền Bến Bãi Chuẩn Mực' }
      ]
    },
    {
      step: 5,
      id: 'exit',
      title: 'Cổng ra & Xuất bãi',
      route: '/exit',
      role: 'An ninh Cổng ra & Trưởng CCKB (SEC_STAFF / PORT_LEAD)',
      roleBadge: 'bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]',
      icon: LogOut,
      summary: 'Kiểm soát 3 điều kiện xuất bãi, tính cước lưu bãi container theo số đêm thực tế và xác nhận cho xe ra.',
      keyFeatures: [
        'Checklist 3 Điều kiện Xuất bãi bắt buộc: [✓] Vé cổng OK, [✓] Cước điện lạnh OK, [✓] CCKB duyệt xuất OK',
        'Modal Hợp nhất Kiểm soát theo xe: Xác định container chở trên xe, tính cước lưu bãi theo đêm',
        'Nghiệp vụ CCKB Duyệt xuất bãi (Clearance) kiểm tra toàn diện tình trạng hàng và hóa đơn',
        'Cơ chế Bảo lãnh Công nợ (AP07): Cho phép khách hàng uy tín nợ cước theo văn bản cam kết bảo lãnh',
        'In Biên lai thu tiền lưu bãi và vé cổng ra trực tiếp tại bốt bảo vệ'
      ],
      ruleNotice: 'An ninh cổng ra KHÔNG ĐƯỢC MỞ BARRIER khi chưa đủ 3 điều kiện tích xanh hợp lệ.',
      images: [
        { src: '/user_inserted_images/IMG-EXIT-01-gate-checklist.png', title: 'Màn hình Kiểm soát Cổng ra & Checklist 3 Điều kiện' },
        { src: '/user_inserted_images/IMG-EXIT-02-modal-unified-exit.png', title: 'Hộp thoại An ninh Cổng ra Hợp nhất Kiểm soát theo xe' },
        { src: '/user_inserted_images/IMG-EXIT-03-clearance-queue.png', title: 'Tab Nghiệp vụ CCKB Duyệt xuất bãi (Clearance)' },
        { src: '/user_inserted_images/IMG-EXIT-04-modal-debt-guarantee.png', title: 'Hộp thoại CCKB Duyệt Xuất bãi Kèm Bảo Lãnh Công Nợ' },
        { src: '/user_inserted_images/IMG-EXIT-05-modal-receipt.png', title: 'Hộp thoại In Biên lai Thu phí Lưu bãi Cổng ra' }
      ]
    },
    {
      step: 6,
      id: 'accounting',
      title: 'Kế toán & Hóa đơn',
      route: '/accounting',
      role: 'Phòng Kế toán (ACC_STAFF / CHIEF_ACC)',
      roleBadge: 'bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF]',
      icon: Landmark,
      summary: 'Biên bản chốt tiền mặt 4 mắt, xuất hóa đơn VAT điện tử, theo dõi công nợ và sổ quỹ tiền mặt.',
      keyFeatures: [
        'Tab 1: Bảng kê Chốt tiền mặt ca trực (Nguyên tắc 4 mắt: Nhân viên trực ban & Kế toán xác nhận)',
        'Tab 2: Sổ Hóa đơn GTGT Bến bãi: Lập hóa đơn thuế 8%/10% cho khách hàng',
        'Tab 3: Sổ Theo dõi Công nợ: Theo dõi các khoản cước được CCKB phê duyệt bảo lãnh nợ',
        'Tab 4: Sổ Quỹ Tiền mặt Toàn bãi: Theo dõi số dư đầu ca, thu trong ca, nộp về thủ quỹ',
        'Xuất báo cáo tài chính 4 Sheet sang định dạng Excel (.xlsx) chuẩn kiểm toán'
      ],
      ruleNotice: 'Cuối mỗi ca trực bắt buộc phải lập biên bản chốt tiền mặt có đầy đủ chữ ký 4 mắt trước khi bàn giao.',
      images: [
        { src: '/user_inserted_images/IMG-ACCOUNTING-01-cash-settlement.png', title: 'Bảng kê Chốt tiền mặt ca trực & Đối chiếu 4 mắt' },
        { src: '/user_inserted_images/IMG-ACCOUNTING-02-modal-settlement.png', title: 'Hộp thoại Lập Biên bản Chốt Tiền mặt Ca trực Hiện trường' },
        { src: '/user_inserted_images/IMG-ACCOUNTING-03-modal-print-settlement.png', title: 'Hộp thoại In Biên Bản Bàn Giao Tiền Mặt Ca Trực' },
        { src: '/user_inserted_images/IMG-ACCOUNTING-04-invoices-ledger.png', title: 'Sổ Quản lý Hóa đơn GTGT Bến bãi & Thuế suất' },
        { src: '/user_inserted_images/IMG-ACCOUNTING-05-modal-invoice.png', title: 'Hộp thoại Lập & Phát hành Hóa đơn GTGT Bến bãi' },
        { src: '/user_inserted_images/IMG-ACCOUNTING-06-debts-management.png', title: 'Màn hình Quản lý & Thu hồi Công nợ Bảo lãnh' }
      ]
    },
    {
      step: 7,
      id: 'admin',
      title: 'Báo cáo & Kiểm toán',
      route: '/reports',
      role: 'Ban Giám đốc & Quản trị Hệ thống (SYS_ADMIN)',
      roleBadge: 'bg-[#F4F3FF] text-[#5925DC] border-[#D9D6FE]',
      icon: ShieldCheck,
      summary: 'Báo cáo điều hành vận hành, phân tích dòng tiền, phân quyền RBAC V5 và nhật ký kiểm toán bất biến.',
      keyFeatures: [
        'Báo cáo Sản lượng xe vào/ra, tỷ lệ lấp đầy bãi theo từng phân khu',
        'Phân tích Doanh thu và Dòng tiền theo ngày/tuần/tháng, cơ cấu doanh thu theo từng loại phí',
        'Quản trị Nhân sự & Phân quyền RBAC V5: 7 vai trò chuẩn hóa, kiểm soát 67 hành vi nghiệp vụ',
        'Ma trận Phân quyền 206 Grants đảm bảo chặt chẽ bảo mật thông tin',
        'Sổ Nhật ký Kiểm toán Toàn bãi (Audit Logs): Ghi nhận chi tiết người thao tác, thời gian, IP, nội dung thay đổi trước/sau'
      ],
      ruleNotice: 'Nhật ký kiểm toán (Audit Logs) là bản ghi bất biến, không thể xóa hoặc sửa dưới bất kỳ hình thức nào.',
      images: [
        { src: '/user_inserted_images/IMG-REPORTS-01-operations.png', title: 'Báo cáo Vận hành Bến bãi (Sản lượng xe, Tải bãi, Tải điện)' },
        { src: '/user_inserted_images/IMG-REPORTS-02-financial.png', title: 'Báo cáo Dòng tiền & Doanh thu Bến bãi theo ngày/tháng' },
        { src: '/user_inserted_images/IMG-ADMIN-01-users-list.png', title: 'Quản trị Nhân sự & Danh sách Người dùng (7 vai trò RBAC V5)' },
        { src: '/user_inserted_images/IMG-ADMIN-02-modal-add-user.png', title: 'Hộp thoại Thêm mới / Cập nhật Tài khoản Nhân sự' },
        { src: '/user_inserted_images/IMG-ADMIN-03-rbac-matrix.png', title: 'Ma trận Phân quyền 67 Hành vi Nghiệp vụ & 206 Quyền hạn V5' },
        { src: '/user_inserted_images/IMG-ADMIN-04-audit-logs.png', title: 'Sổ Nhật ký Kiểm toán Toàn bãi (Audit Logs) Truy vết Lịch sử' }
      ]
    }
  ];

  // Bảng phân bổ 13 Tủ điện 50 Giắc cắm 380V (Khu A)
  const powerCabinets = [
    { code: 'T01', name: 'Tủ điện T01', sockets: 3, codes: 'T01-01 .. T01-03', spec: 'Ổ công nghiệp 3P 380V' },
    { code: 'T02', name: 'Tủ điện T02', sockets: 4, codes: 'T02-01 .. T02-04', spec: 'Ổ công nghiệp 3P 380V' },
    { code: 'T03', name: 'Tủ điện T03', sockets: 4, codes: 'T03-01 .. T03-04', spec: 'Ổ công nghiệp 3P 380V' },
    { code: 'T04', name: 'Tủ điện T04', sockets: 3, codes: 'T04-01 .. T04-03', spec: 'Ổ công nghiệp 3P 380V' },
    { code: 'T05', name: 'Tủ điện T05', sockets: 8, codes: 'T05-01 .. T05-08', spec: 'Tủ công suất lớn trung tâm' },
    { code: 'T06', name: 'Tủ điện T06', sockets: 3, codes: 'T06-01 .. T06-03', spec: 'Ổ công nghiệp 3P 380V' },
    { code: 'T07', name: 'Tủ điện T07', sockets: 3, codes: 'T07-01 .. T07-03', spec: 'Ổ công nghiệp 3P 380V' },
    { code: 'T08', name: 'Tủ điện T08', sockets: 2, codes: 'T08-01 .. T08-02', spec: 'Ổ công nghiệp 3P 380V' },
    { code: 'T09', name: 'Tủ điện T09', sockets: 5, codes: 'T09-01 .. T09-05', spec: 'Ổ công nghiệp 3P 380V' },
    { code: 'T10', name: 'Tủ điện T10', sockets: 3, codes: 'T10-01 .. T10-03', spec: 'Ổ công nghiệp 3P 380V' },
    { code: 'T11', name: 'Tủ điện T11', sockets: 4, codes: 'T11-01 .. T11-04', spec: 'Ổ công nghiệp 3P 380V' },
    { code: 'T12', name: 'Tủ điện T12', sockets: 4, codes: 'T12-01 .. T12-04', spec: 'Ổ công nghiệp 3P 380V' },
    { code: 'T13', name: 'Tủ điện T13', sockets: 4, codes: 'T13-01 .. T13-04', spec: 'Ổ công nghiệp 3P 380V' },
  ];

  // 6 Quy tắc vàng vận hành bến bãi
  const goldenRules = [
    {
      num: '01',
      title: 'Không Khóa Cước Lưu Bãi Trước Khi Container Rời Bãi',
      desc: 'Phí lưu bãi container chỉ được tính toán và chốt cước thực tế tại Cổng ra (/exit) vào thời điểm phương tiện làm thủ tục xuất bãi, đảm bảo tính đúng và đủ theo số đêm thực tế.',
      tag: 'Tài chính bến bãi',
      icon: Clock
    },
    {
      num: '02',
      title: 'Cổng Ra Nghiêm Ngặt Kiểm Soát 3 Điều Kiện Xuất Bãi',
      desc: 'An ninh cổng ra chỉ mở barie khi kiểm tra đủ 3 điều kiện: (1) Vé xe cổng hợp lệ, (2) Cước điện lạnh đã chốt và thanh toán, (3) Nghiệp vụ CCKB đã phê duyệt xuất bãi (hoặc bảo lãnh nợ).',
      tag: 'Kiểm soát cổng',
      icon: ShieldCheck
    },
    {
      num: '03',
      title: 'Cước Cấp Điện Làm Tròn 5.000đ Theo Giờ Thực Tế',
      desc: 'Cước điện lạnh được tính toán tự động dựa trên thời gian cắm/rút thực tế, làm tròn cước đến 5.000 VNĐ. Có đối chiếu hình ảnh giắc cắm và video nhóm Zalo CCKB trực ban.',
      tag: 'CCKB Reefer',
      icon: Zap
    },
    {
      num: '04',
      title: 'Bàn Giao & Chốt Tiền Mặt Ca Trực Nguyên Tắc 4 Mắt',
      desc: 'Cuối mỗi ca trực, nhân viên trực ban và kế toán/thủ quỹ phải cùng kiểm đếm tiền mặt, lập biên bản bàn giao có đầy đủ chữ ký 4 mắt (người giao, người nhận, người làm chứng).',
      tag: 'Kế toán quỹ',
      icon: Landmark
    },
    {
      num: '05',
      title: 'Không Xóa Hay Ghi Đè Bản Ghi Thu Tiền Đã Xác Nhận',
      desc: 'Mọi giao dịch thu tiền đã xác nhận trên hệ thống không thể xóa hoặc ghi đè. Trường hợp có sai lệch phải lập phiếu đề nghị điều chỉnh qua quy trình phê duyệt AP04/AP07.',
      tag: 'Bảo mật tài chính',
      icon: Lock
    },
    {
      num: '06',
      title: 'Lưu Vết Kiểm Toán (Audit Log) Toàn Bộ Thao Tác Sửa Sai',
      desc: 'Mọi thao tác sửa biển số xe, số container, cập nhật giờ vào bãi, duyệt bảo lãnh công nợ đều bắt buộc phải nhập lý do và được lưu vết kiểm toán vĩnh viễn, không thể tẩy xóa.',
      tag: 'Giám sát điều hành',
      icon: History
    }
  ];

  const currentStepData = workflowSteps.find(s => s.step === selectedWorkflowStep) || workflowSteps[0];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F5F8FA]">
      {/* 1. WORKSPACE HEADER CHUẨN DESIGN SYSTEM */}
      <WorkspaceHeader
        title="Cẩm nang Hướng dẫn Vận hành & Kiến trúc V5"
        subtitle="Hệ thống Quản lý bến bãi/cảng cạn Sơn Cảng — Công ty Cổ phần Tà Lùng Quang Minh"
        icon={BookOpen}
        badge={
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#ECFDF3] text-[#0A9444] border border-[#A6F4C5]">
            Phiên bản V5 Chuẩn hóa
          </span>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href="/Tai_Lieu_Huong_Dan_Su_Dung_Son_Cang_Co_Placeholder.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#344054] bg-white hover:bg-[#F8F9FB] rounded-lg border border-[#D0D5DD] transition-colors shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#0A9444]" />
              <span>Tải Hướng dẫn (PDF)</span>
            </a>
            <a
              href="/Tai_Lieu_Huong_Dan_Su_Dung_Son_Cang_Co_Placeholder.docx"
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#344054] bg-white hover:bg-[#F8F9FB] rounded-lg border border-[#D0D5DD] transition-colors shadow-2xs cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-[#223873]" />
              <span>Tải Bản Word (.docx)</span>
            </a>
          </div>
        }
      />

      {/* 2. SUB-NAVIGATION TABS THEO CHUẨN WORKSPACE TABS */}
      <WorkspaceTabs
        tabs={[
          { id: 'WORKFLOW', label: '1. Quy trình Nghiệp vụ 7 Bước', count: 7, icon: Compass },
          { id: 'CABINETS', label: '2. Mạng lưới 13 Tủ điện 380V', count: 50, icon: Zap },
          { id: 'RULES', label: '3. 6 Quy tắc Vàng Bắt buộc', count: 6, icon: ShieldCheck },
          { id: 'GALLERY', label: '4. Thư viện 33 Ảnh Thực tế', count: 33, icon: Eye },
        ]}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as any)}
      />

      {/* 3. NỘI DUNG CHÍNH (CANVAS CUỘN TỰ DO, NỀN #F5F8FA) */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6 space-y-6">
        
        {/* TAB 1: WORKFLOW PIPELINE INTERACTIVE */}
        {activeTab === 'WORKFLOW' && (
          <div className="space-y-6">
            {/* Step Selector Horizontal Bar */}
            <div className="bg-white rounded-xl border border-[#E5E9F0] shadow-2xs p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#475467]">
                  Sơ đồ Tiến trình Nghiệp vụ Liên hoàn (Bấm chọn bước để xem chi tiết & hình ảnh):
                </h3>
                <span className="text-[11px] text-[#667085]">Bước {selectedWorkflowStep}/7</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                {workflowSteps.map((s) => {
                  const Icon = s.icon;
                  const isSelected = selectedWorkflowStep === s.step;
                  return (
                    <button
                      key={s.step}
                      type="button"
                      onClick={() => setSelectedWorkflowStep(s.step)}
                      className={`relative flex flex-col items-center p-3 rounded-lg border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#EAF1FD] border-[#326DD8] text-[#326DD8] font-semibold ring-2 ring-[#326DD8]/20 shadow-2xs'
                          : 'bg-white border-[#E5E9F0] text-[#475467] hover:bg-[#F8F9FB] hover:text-[#17202E]'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1.5 ${
                        isSelected ? 'bg-[#326DD8] text-white' : 'bg-[#F1F4F8] text-[#667085]'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-bold text-[#98A2B3] uppercase">Bước {s.step}</span>
                      <span className="text-xs font-semibold leading-tight line-clamp-1 mt-0.5">{s.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Step Detail Panel */}
            <div className="bg-white rounded-xl border border-[#E5E9F0] shadow-2xs overflow-hidden">
              {/* Header của thẻ chi tiết bước */}
              <div className="p-4 sm:p-5 border-b border-[#F0F2F6] bg-[#F8F9FB] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#EAF1FD] text-[#326DD8] border border-[#D0E1FD]">
                      Bước {currentStepData.step} / 7
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${currentStepData.roleBadge}`}>
                      {currentStepData.role}
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-[#17202E] truncate">
                    {currentStepData.title}
                  </h2>
                  <p className="text-xs text-[#667085] line-clamp-2 max-w-3xl">
                    {currentStepData.summary}
                  </p>
                </div>

                <Link
                  href={currentStepData.route}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#087C3C] hover:bg-[#076934] text-white text-xs font-semibold shadow-2xs transition-colors shrink-0 cursor-pointer"
                >
                  <span>Mở Phân hệ ({currentStepData.route})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="p-4 sm:p-6 space-y-6">
                {/* Rule Callout */}
                <div className="p-3.5 sm:p-4 rounded-xl bg-[#FFFAEB] border border-[#FEDF89] text-[#7A2E0E] flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-[#B54708] shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed">
                    <strong className="uppercase tracking-wide text-[#93370D]">Lưu ý nghiệp vụ bắt buộc: </strong>
                    <span>{currentStepData.ruleNotice}</span>
                  </div>
                </div>

                {/* Key Features List */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#475467] mb-3">
                    Các Tính năng & Quy trình Nghiệp vụ Cốt lõi:
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {currentStepData.keyFeatures.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 p-3 rounded-lg bg-[#F8F9FB] border border-[#E5E9F0]">
                        <CheckCircle2 className="w-4 h-4 text-[#0A9444] shrink-0 mt-0.5" />
                        <span className="text-xs text-[#17202E] font-medium leading-relaxed">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Screenshots Gallery for this Step */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#475467]">
                      Hình ảnh Giao diện & Hộp thoại (Modal) Thực tế ({currentStepData.images.length} ảnh):
                    </h4>
                    <span className="text-xs text-[#326DD8] font-medium">Bấm vào ảnh để phóng to</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {currentStepData.images.map((img, i) => (
                      <div
                        key={i}
                        onClick={() => setLightboxImage({ src: img.src, title: img.title, subtitle: `Bước ${currentStepData.step}: ${currentStepData.title}` })}
                        className="group relative rounded-xl border border-[#E5E9F0] bg-white overflow-hidden cursor-pointer hover:shadow-sm hover:border-[#326DD8] transition-all"
                      >
                        <div className="aspect-video w-full bg-[#F8F9FB] relative overflow-hidden flex items-center justify-center">
                          <img
                            src={img.src}
                            alt={img.title}
                            className="object-cover w-full h-full group-hover:scale-102 transition-transform duration-200"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-[#17202E]/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="px-3 py-1.5 rounded-lg bg-white text-[#17202E] text-xs font-semibold flex items-center gap-1.5 shadow-md">
                              <Eye className="w-3.5 h-3.5 text-[#326DD8]" /> Xem chi tiết
                            </span>
                          </div>
                        </div>
                        <div className="p-2.5 bg-white border-t border-[#F0F2F6]">
                          <p className="text-xs font-semibold text-[#17202E] truncate">{img.title}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: POWER CABINETS GRID 380V */}
        {activeTab === 'CABINETS' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-[#E5E9F0] shadow-2xs p-5 sm:p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F0F2F6] pb-4">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-[#17202E]">
                    Quy Hoạch Hệ Thống Cấp Điện Container Lạnh 380V (Khu A)
                  </h2>
                  <p className="text-xs text-[#667085] mt-0.5">
                    Hệ thống cấp điện bến bãi Sơn Cảng gồm <strong>13 Tủ điện công nghiệp</strong> phân bổ tổng cộng <strong>50 Giắc cắm 3 pha 380V</strong>.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href="/yard?tab=zones"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#223873] hover:bg-[#1A2C5B] text-white text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                  >
                    <span>Xem Sơ đồ Bến bãi</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Summary Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-xl bg-white border border-[#E5E9F0] shadow-2xs">
                  <span className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider">Tổng số Tủ điện</span>
                  <p className="text-2xl font-bold font-mono text-[#17202E] mt-1">13 Tủ</p>
                  <span className="text-[11px] text-[#326DD8]">Từ Tủ T01 đến T13</span>
                </div>
                <div className="p-4 rounded-xl bg-white border border-[#E5E9F0] shadow-2xs">
                  <span className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider">Tổng Giắc cắm</span>
                  <p className="text-2xl font-bold font-mono text-[#0A9444] mt-1">50 Giắc</p>
                  <span className="text-[11px] text-[#0A9444]">Chuẩn 3P 380V / 32A</span>
                </div>
                <div className="p-4 rounded-xl bg-white border border-[#E5E9F0] shadow-2xs">
                  <span className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider">Tủ Công Suất Lớn</span>
                  <p className="text-2xl font-bold font-mono text-[#B54708] mt-1">Tủ T05</p>
                  <span className="text-[11px] text-[#B54708]">8 ổ cắm trung tâm</span>
                </div>
                <div className="p-4 rounded-xl bg-white border border-[#E5E9F0] shadow-2xs">
                  <span className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider">Biểu Phí Điện V5</span>
                  <p className="text-2xl font-bold font-mono text-[#17202E] mt-1">40.000 đ/h</p>
                  <span className="text-[11px] text-[#667085]">Làm tròn chẵn 5.000đ</span>
                </div>
              </div>

              {/* Cabinets Table */}
              <div className="overflow-x-auto border border-[#E5E9F0] rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8F9FB] text-[#475467] uppercase font-bold text-[11px] border-b border-[#E5E9F0]">
                    <tr>
                      <th className="py-2.5 px-3.5">Mã Tủ</th>
                      <th className="py-2.5 px-3.5">Tên Tủ Điện</th>
                      <th className="py-2.5 px-3.5 text-center">Số Giắc 380V</th>
                      <th className="py-2.5 px-3.5">Dải Mã Giắc Cắm</th>
                      <th className="py-2.5 px-3.5">Đặc tính kỹ thuật & Vị trí</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F2F6] font-medium text-[#17202E]">
                    {powerCabinets.map((c) => (
                      <tr key={c.code} className="hover:bg-[#F8F9FB] transition-colors">
                        <td className="py-2.5 px-3.5 font-mono font-bold text-[#326DD8]">{c.code}</td>
                        <td className="py-2.5 px-3.5 font-semibold">{c.name}</td>
                        <td className="py-2.5 px-3.5 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-[#ECFDF3] text-[#0A9444] border border-[#A6F4C5]">
                            {c.sockets} ổ
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 font-mono text-[#667085]">{c.codes}</td>
                        <td className="py-2.5 px-3.5 text-[#667085]">{c.spec}</td>
                      </tr>
                    ))}
                    <tr className="bg-[#F8F9FB] font-bold text-[#17202E]">
                      <td className="py-3 px-3.5" colSpan={2}>TỔNG CỘNG HỆ THỐNG</td>
                      <td className="py-3 px-3.5 text-center text-[#0A9444] font-black">50 Giắc</td>
                      <td className="py-3 px-3.5 text-[#475467]" colSpan={2}>
                        (3+4+4+3+8+3+3+2+5+3+4+4+4 = 50 ổ điện 3 pha 380V)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: GOLDEN RULES */}
        {activeTab === 'RULES' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-[#E5E9F0] shadow-2xs p-5 sm:p-6 space-y-5">
              <div className="border-b border-[#F0F2F6] pb-3">
                <h2 className="text-base sm:text-lg font-bold text-[#17202E]">
                  6 Quy Tắc Vàng Vận Hành Bắt Buộc — Bến Bãi Sơn Cảng
                </h2>
                <p className="text-xs text-[#667085] mt-0.5">
                  Mọi nhân sự trực ban thuộc các bộ phận An ninh, CCKB, Điều phối và Kế toán phải tuân thủ nghiêm ngặt các nguyên tắc dưới đây:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {goldenRules.map((rule) => {
                  const Icon = rule.icon;
                  return (
                    <div key={rule.num} className="p-4 sm:p-5 rounded-xl border border-[#E5E9F0] bg-white hover:border-[#D0E1FD] hover:shadow-2xs transition-all space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xl font-bold font-mono text-[#223873]">#{rule.num}</span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#EAF1FD] text-[#326DD8] border border-[#D0E1FD]">
                          {rule.tag}
                        </span>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#EAF1FD] text-[#326DD8] flex items-center justify-center shrink-0 mt-0.5">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-[#17202E]">{rule.title}</h3>
                          <p className="text-xs text-[#667085] mt-1 leading-relaxed">{rule.desc}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ALL 33 SCREENSHOTS GALLERY */}
        {activeTab === 'GALLERY' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-[#E5E9F0] shadow-2xs p-5 sm:p-6 space-y-6">
              <div className="border-b border-[#F0F2F6] pb-3">
                <h2 className="text-base sm:text-lg font-bold text-[#17202E]">
                  Thư Viện 33 Ảnh Chụp Thực Tế Giao Diện & Modal Hệ Thống
                </h2>
                <p className="text-xs text-[#667085] mt-0.5">
                  Toàn bộ hình ảnh thực tế được chụp từ hệ thống đang chạy với 70 xe, 65 cont, 13 tủ điện và các nghiệp vụ tài chính thực tế.
                </p>
              </div>

              <div className="space-y-8">
                {workflowSteps.map((s) => (
                  <div key={s.step} className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-[#F0F2F6] pb-2">
                      <span className="w-6 h-6 rounded-md bg-[#EAF1FD] text-[#326DD8] text-xs font-bold flex items-center justify-center">
                        {s.step}
                      </span>
                      <h3 className="text-sm font-bold text-[#17202E]">{s.title}</h3>
                      <span className="text-xs text-[#667085]">({s.images.length} ảnh thực tế)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {s.images.map((img, idx) => (
                        <div
                          key={idx}
                          onClick={() => setLightboxImage({ src: img.src, title: img.title, subtitle: `${s.title} (Ảnh ${idx + 1}/${s.images.length})` })}
                          className="group rounded-xl border border-[#E5E9F0] bg-white overflow-hidden cursor-pointer hover:shadow-2xs hover:border-[#326DD8] transition-all"
                        >
                          <div className="aspect-video bg-[#F8F9FB] relative overflow-hidden flex items-center justify-center">
                            <img
                              src={img.src}
                              alt={img.title}
                              className="object-cover w-full h-full group-hover:scale-102 transition-transform duration-200"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-[#17202E]/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="px-3 py-1.5 rounded-lg bg-white text-[#17202E] text-xs font-semibold flex items-center gap-1.5 shadow-md">
                                <Eye className="w-3.5 h-3.5 text-[#326DD8]" /> Xem ảnh lớn
                              </span>
                            </div>
                          </div>
                          <div className="p-2.5 bg-white border-t border-[#F0F2F6]">
                            <p className="text-xs font-medium text-[#17202E] truncate">{img.title}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* 4. LIGHTBOX MODAL PHÓNG TO ẢNH CHUẨN DESIGN SYSTEM */}
      {lightboxImage && (
        <div 
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-[#101828]/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-5xl w-full overflow-hidden shadow-2xl border border-[#E5E9F0] flex flex-col max-h-[90vh]"
          >
            <div className="px-5 py-3.5 bg-white text-[#17202E] flex items-center justify-between border-b border-[#E5E9F0]">
              <div>
                <span className="text-[10px] font-bold text-[#326DD8] uppercase tracking-wider">{lightboxImage.subtitle}</span>
                <h3 className="text-sm font-semibold text-[#17202E] mt-0.5">{lightboxImage.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="p-1.5 rounded-lg text-[#667085] hover:text-[#17202E] hover:bg-[#F8F9FB] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 overflow-auto bg-[#0F172A] flex items-center justify-center">
              <img
                src={lightboxImage.src}
                alt={lightboxImage.title}
                className="max-h-[75vh] w-auto object-contain rounded-lg shadow-md"
              />
            </div>
            <div className="px-5 py-3 bg-[#F8F9FB] text-right border-t border-[#E5E9F0]">
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="py-1.5 px-4 text-xs font-semibold text-[#344054] bg-white hover:bg-[#F8F9FB] rounded-lg border border-[#D0D5DD] transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
