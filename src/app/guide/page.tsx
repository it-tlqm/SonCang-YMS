'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
  Cpu, 
  Lock, 
  Smartphone, 
  Clock, 
  ChevronRight,
  Info,
  QrCode,
  Users,
  Compass,
  X,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export default function GuideOverviewPage() {
  const { user, role } = useAuth();
  const [activeTab, setActiveTab] = useState<'WORKFLOW' | 'CABINETS' | 'RULES' | 'RBAC' | 'GALLERY'>('WORKFLOW');
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
      roleBadge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      icon: Truck,
      color: 'from-emerald-500 to-teal-600',
      summary: 'Tiếp nhận phương tiện & container vào bãi, quét QR CCCD chip tài xế, in vé vào cổng.',
      keyFeatures: [
        'Nhận diện biển số xe đầu kéo, xe bo tải thùng, xe sang tải nội bộ',
        'Quét mã QR thẻ CCCD gắn chip tự động bóc tách số CCCD, họ tên tài xế',
        'Hỗ trợ chế độ tiếp nhận song song 2 Container 20ft trên cùng 1 rơ-moóc',
        'Tự động đối soát và khớp Phiếu yêu cầu cấp điện dự kiến từ CCKB',
        'Thu tiền vé vào cổng theo biểu giá niêm yết (Tiền mặt / Chuyển khoản VietQR)'
      ],
      ruleNotice: 'Biển số xe và số container là căn cứ pháp lý — nếu sơn mờ phải lập biên bản kiểm tra thực tế.',
      images: [
        { src: '/docs/user_inserted_images/image3.png', title: 'Toàn cảnh Form Tiếp nhận Cổng vào (/entry)' },
        { src: '/docs/user_inserted_images/image4.png', title: 'Nhập tay số CCCD 12 số của tài xế' },
        { src: '/docs/user_inserted_images/image5.png', title: 'Hộp thoại Quét QR CCCD gắn chip bóc tách tự động' },
        { src: '/docs/user_inserted_images/image6.png', title: 'Tiếp nhận song song 2 Cont 20ft & Khớp phiếu điện' }
      ]
    },
    {
      step: 2,
      id: 'yard',
      title: 'Quản lý Bãi & Tủ điện',
      route: '/yard',
      role: 'Điều phối viên (DIS_STAFF / DIS_LEAD)',
      roleBadge: 'bg-blue-100 text-blue-800 border-blue-300',
      icon: Layers,
      color: 'from-blue-600 to-indigo-600',
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
        { src: '/docs/user_inserted_images/IMG-YARD-01-dashboard.png', title: 'Bảng điều khiển bến bãi, cước lưu bãi tích lũy (~X đ (Y đêm))' },
        { src: '/docs/user_inserted_images/IMG-YARD-02-zones-grid.png', title: 'Sơ đồ 4 Phân khu & Lưới 13 Tủ điện 50 Giắc cắm 380V' },
        { src: '/docs/user_inserted_images/IMG-YARD-03-modal-add-cabinet.png', title: 'Hộp thoại Thêm Mới Tủ Điện 380V (Mã tủ T14, 4 giắc 380V)' },
        { src: '/docs/user_inserted_images/IMG-YARD-04-modal-quick-plug.png', title: 'Hộp thoại Cắm Container Nhanh Tại Bãi (Quick Plug)' },
        { src: '/docs/user_inserted_images/IMG-YARD-05-modal-edit-plate.png', title: 'Hộp thoại Hiệu chỉnh Biển số xe & Lưu vết Audit' }
      ]
    },
    {
      step: 3,
      id: 'reefer',
      title: 'Điện lạnh CCKB',
      route: '/reefer',
      role: 'Nghiệp vụ CCKB (PORT_STAFF / PORT_LEAD)',
      roleBadge: 'bg-amber-100 text-amber-800 border-amber-300',
      icon: Zap,
      color: 'from-amber-500 to-orange-600',
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
        { src: '/docs/user_inserted_images/IMG-REEFER-01-active-sessions.png', title: 'Tab Đang cắm điện — Live ticker thời gian thực tế' },
        { src: '/docs/user_inserted_images/IMG-REEFER-02-ready-queue.png', title: 'Tab Sẵn sàng cắm — Danh sách container chờ cấp điện' },
        { src: '/docs/user_inserted_images/IMG-REEFER-03-modal-create-request.png', title: 'Hộp thoại Lập Yêu cầu Cắm điện Dự kiến CCKB' },
        { src: '/docs/user_inserted_images/IMG-REEFER-04-modal-plug.png', title: 'Hộp thoại Cắm điện Container & Chọn Tủ/Giắc 380V' },
        { src: '/docs/user_inserted_images/IMG-REEFER-05-modal-unplug.png', title: 'Hộp thoại Rút điện Chốt cước tự động (Làm tròn 5.000đ)' }
      ]
    },
    {
      step: 4,
      id: 'billing',
      title: 'Sổ cái Thu phí',
      route: '/billing',
      role: 'An ninh / CCKB / Kế toán (Toàn quyền)',
      roleBadge: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      icon: Receipt,
      color: 'from-indigo-600 to-purple-600',
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
        { src: '/docs/user_inserted_images/IMG-BILLING-01-ledger-table.png', title: 'Sổ cái Thu phí Toàn bãi & Bộ lọc đa tiêu chí' },
        { src: '/docs/user_inserted_images/IMG-BILLING-02-modal-collect.png', title: 'Hộp thoại Thu tiền Đơn lẻ (Tiền mặt / Chuyển khoản VietQR)' },
        { src: '/docs/user_inserted_images/IMG-BILLING-03-modal-batch.png', title: 'Hộp thoại Thu gộp nhiều khoản cước (Batch Collection)' },
        { src: '/docs/user_inserted_images/IMG-BILLING-04-modal-receipt.png', title: 'Hộp thoại In Phiếu Thu Tiền Bến Bãi Chuẩn Mực' }
      ]
    },
    {
      step: 5,
      id: 'exit',
      title: 'Cổng ra & Xuất bãi',
      route: '/exit',
      role: 'An ninh Cổng ra & Trưởng CCKB (SEC_STAFF / PORT_LEAD)',
      roleBadge: 'bg-rose-100 text-rose-800 border-rose-300',
      icon: LogOut,
      color: 'from-rose-500 to-red-600',
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
        { src: '/docs/user_inserted_images/IMG-EXIT-01-gate-checklist.png', title: 'Màn hình Kiểm soát Cổng ra & Checklist 3 Điều kiện' },
        { src: '/docs/user_inserted_images/IMG-EXIT-02-modal-unified-exit.png', title: 'Hộp thoại An ninh Cổng ra Hợp nhất Kiểm soát theo xe' },
        { src: '/docs/user_inserted_images/IMG-EXIT-03-clearance-queue.png', title: 'Tab Nghiệp vụ CCKB Duyệt xuất bãi (Clearance)' },
        { src: '/docs/user_inserted_images/IMG-EXIT-04-modal-debt-guarantee.png', title: 'Hộp thoại CCKB Duyệt Xuất bãi Kèm Bảo Lãnh Công Nợ' },
        { src: '/docs/user_inserted_images/IMG-EXIT-05-modal-receipt.png', title: 'Hộp thoại In Biên lai Thu phí Lưu bãi Cổng ra' }
      ]
    },
    {
      step: 6,
      id: 'accounting',
      title: 'Kế toán & Hóa đơn',
      route: '/accounting',
      role: 'Kế toán Bến bãi (ACCOUNTANT / SYS_ADMIN)',
      roleBadge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      icon: Landmark,
      color: 'from-teal-600 to-emerald-700',
      summary: 'Bàn giao và chốt tiền mặt ca trực nguyên tắc 4 mắt, quản lý hóa đơn điện tử MST/CCCD và thu hồi công nợ.',
      keyFeatures: [
        'Biên bản Chốt tiền mặt ca trực nguyên tắc 4 mắt (Người giao, Người nhận, Kế toán trưởng)',
        'Kiểm đếm chênh lệch tiền mặt thực tế so với phần mềm ghi nhận',
        'In Biên bản bàn giao quỹ tiền mặt ca trực để lưu trữ hồ sơ tài chính',
        'Sổ Quản lý Hóa đơn điện tử: Lưu trữ thông tin Mã số thuế, tên doanh nghiệp, CCCD, email',
        'Lập & Phát hành hóa đơn GTGT bến bãi cho khách hàng',
        'Quản lý danh sách công nợ bảo lãnh và ghi nhận thu hồi nợ'
      ],
      ruleNotice: 'Mọi khoản tiền mặt thu từ các ca trực phải được bàn giao và khóa sổ ngay cuối ca trực theo biên bản 4 mắt.',
      images: [
        { src: '/docs/user_inserted_images/IMG-ACCOUNTING-01-cash-settlement.png', title: 'Màn hình Bàn giao & Chốt tiền mặt ca trực nguyên tắc 4 mắt' },
        { src: '/docs/user_inserted_images/IMG-ACCOUNTING-02-modal-settlement.png', title: 'Hộp thoại Lập Biên bản Bàn giao & Khóa sổ Quỹ Ca trực' },
        { src: '/docs/user_inserted_images/IMG-ACCOUNTING-03-modal-print-settlement.png', title: 'Hộp thoại In Biên bản Bàn giao Quỹ Tiền mặt Ca trực' },
        { src: '/docs/user_inserted_images/IMG-ACCOUNTING-04-invoices-ledger.png', title: 'Sổ Quản lý Hóa đơn điện tử MST / CCCD' },
        { src: '/docs/user_inserted_images/IMG-ACCOUNTING-05-modal-invoice.png', title: 'Hộp thoại Lập & Phát hành Hóa đơn GTGT Bến bãi' },
        { src: '/docs/user_inserted_images/IMG-ACCOUNTING-06-debts-management.png', title: 'Màn hình Quản lý & Thu hồi Công nợ Bảo lãnh' }
      ]
    },
    {
      step: 7,
      id: 'admin',
      title: 'Báo cáo & Kiểm toán',
      route: '/reports',
      role: 'Ban Giám đốc & Quản trị Hệ thống (SYS_ADMIN)',
      roleBadge: 'bg-purple-100 text-purple-800 border-purple-300',
      icon: ShieldCheck,
      color: 'from-purple-600 to-indigo-800',
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
        { src: '/docs/user_inserted_images/IMG-REPORTS-01-operations.png', title: 'Báo cáo Vận hành Bến bãi (Sản lượng xe, Tải bãi, Tải điện)' },
        { src: '/docs/user_inserted_images/IMG-REPORTS-02-financial.png', title: 'Báo cáo Dòng tiền & Doanh thu Bến bãi theo ngày/tháng' },
        { src: '/docs/user_inserted_images/IMG-ADMIN-01-users-list.png', title: 'Quản trị Nhân sự & Danh sách Người dùng (7 vai trò RBAC V5)' },
        { src: '/docs/user_inserted_images/IMG-ADMIN-02-modal-add-user.png', title: 'Hộp thoại Thêm mới / Cập nhật Tài khoản Nhân sự' },
        { src: '/docs/user_inserted_images/IMG-ADMIN-03-rbac-matrix.png', title: 'Ma trận Phân quyền 67 Hành vi Nghiệp vụ & 206 Quyền hạn V5' },
        { src: '/docs/user_inserted_images/IMG-ADMIN-04-audit-logs.png', title: 'Sổ Nhật ký Kiểm toán Toàn bãi (Audit Logs) Truy vết Lịch sử' }
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
    <div className="min-h-screen bg-[#F8FAFC] pb-16">
      {/* 1. HERO HEADER */}
      <div className="bg-gradient-to-r from-[#172554] via-[#1E3A8A] to-[#0F172A] text-white pt-10 pb-16 px-4 sm:px-6 lg:px-8 border-b border-blue-900 shadow-md">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-blue-300" />
                Cẩm nang Hướng dẫn Vận hành & Kiến trúc Hệ thống V5
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                Hệ Thống Quản Lý Bến Bãi & Cảng Cạn Sơn Cảng
              </h1>
              <p className="text-sm sm:text-base text-blue-100/90 leading-relaxed">
                Nền tảng số hóa toàn diện quy trình kiểm soát phương tiện, container, cấp điện lạnh công nghiệp 380V, 
                thu phí tự động minh bạch và đối soát tài chính bến bãi — Công ty Cổ phần Tà Lùng Quang Minh.
              </p>
            </div>

            {/* Quick Action Buttons: Download Docs */}
            <div className="flex flex-col sm:flex-row md:flex-col gap-3 min-w-[240px]">
              <a
                href="/Tai_Lieu_Huong_Dan_Su_Dung_Son_Cang_Co_Placeholder.pdf"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs sm:text-sm shadow-md transition-all"
              >
                <Download className="w-4 h-4" />
                Tải Hướng dẫn Sử dụng (PDF)
              </a>
              <a
                href="/Tai_Lieu_Huong_Dan_Su_Dung_Son_Cang_Co_Placeholder.docx"
                download
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium text-xs sm:text-sm border border-white/20 transition-all"
              >
                <FileText className="w-4 h-4" />
                Tải Bản Word Đầy đủ (.docx)
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 2. NAVIGATION TABS */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-7">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-1.5 flex flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('WORKFLOW')}
            className={`flex-1 min-w-[150px] py-2.5 px-4 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'WORKFLOW'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Compass className="w-4 h-4" />
            1. Luồng Phần mềm 7 Bước
          </button>
          <button
            onClick={() => setActiveTab('CABINETS')}
            className={`flex-1 min-w-[150px] py-2.5 px-4 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'CABINETS'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Zap className="w-4 h-4" />
            2. Mạng lưới 13 Tủ điện 380V
          </button>
          <button
            onClick={() => setActiveTab('RULES')}
            className={`flex-1 min-w-[150px] py-2.5 px-4 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'RULES'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            3. 6 Quy tắc Vàng Nghiệp vụ
          </button>
          <button
            onClick={() => setActiveTab('GALLERY')}
            className={`flex-1 min-w-[150px] py-2.5 px-4 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'GALLERY'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Eye className="w-4 h-4" />
            4. Thư viện 33 Ảnh Thực tế
          </button>
        </div>
      </div>

      {/* 3. MAIN CONTENT BODY */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* TAB 1: WORKFLOW PIPELINE INTERACTIVE */}
        {activeTab === 'WORKFLOW' && (
          <div className="space-y-8">
            {/* Step Selector Horizontal Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Sơ đồ Tiến trình Nghiệp vụ (Bấm vào từng bước để xem chi tiết tính năng & modal):
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {workflowSteps.map((s) => {
                  const Icon = s.icon;
                  const isSelected = selectedWorkflowStep === s.step;
                  return (
                    <button
                      key={s.step}
                      onClick={() => setSelectedWorkflowStep(s.step)}
                      className={`relative flex flex-col items-center p-3 rounded-lg border text-center transition-all ${
                        isSelected
                          ? 'bg-blue-50/80 border-blue-600 ring-2 ring-blue-600/20 text-blue-900 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1.5 ${
                        isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Bước {s.step}</span>
                      <span className="text-xs font-semibold leading-tight line-clamp-1">{s.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Step Detail Panel */}
            <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
              <div className="p-6 sm:p-8 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-500 text-white font-bold text-xs uppercase tracking-wide">
                      Bước {currentStepData.step} / 7
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full font-medium text-xs border ${currentStepData.roleBadge}`}>
                      {currentStepData.role}
                    </span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-white">{currentStepData.title}</h2>
                  <p className="text-xs sm:text-sm text-blue-100/90 max-w-2xl">{currentStepData.summary}</p>
                </div>

                <Link
                  href={currentStepData.route}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-md transition-all shrink-0"
                >
                  Mở Phân hệ ({currentStepData.route})
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="p-6 sm:p-8 space-y-6">
                {/* Rule Callout */}
                <div className="p-4 rounded-xl bg-amber-50 border-l-4 border-amber-500 text-amber-900 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-xs sm:text-sm uppercase tracking-wide">Lưu ý nghiệp vụ bắt buộc: </span>
                    <span className="text-xs sm:text-sm">{currentStepData.ruleNotice}</span>
                  </div>
                </div>

                {/* Key Features List */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                    Các Tính năng & Quy trình Nghiệp vụ Cốt lõi:
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {currentStepData.keyFeatures.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="text-xs sm:text-sm text-slate-700 font-medium">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Screenshots Gallery for this Step */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Hình ảnh Giao diện & Hộp thoại (Modal) Thực tế ({currentStepData.images.length} ảnh):
                    </h4>
                    <span className="text-xs text-blue-600 font-medium">Bấm vào ảnh để phóng to</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {currentStepData.images.map((img, i) => (
                      <div
                        key={i}
                        onClick={() => setLightboxImage({ src: img.src, title: img.title, subtitle: `Bước ${currentStepData.step}: ${currentStepData.title}` })}
                        className="group relative rounded-xl border border-slate-200 bg-slate-100 overflow-hidden cursor-pointer hover:shadow-md hover:border-blue-400 transition-all"
                      >
                        <div className="aspect-video w-full bg-slate-200 relative overflow-hidden flex items-center justify-center">
                          <img
                            src={img.src}
                            alt={img.title}
                            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="px-3 py-1.5 rounded-lg bg-white/90 text-slate-900 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                              <Eye className="w-3.5 h-3.5" /> Xem chi tiết
                            </span>
                          </div>
                        </div>
                        <div className="p-2.5 bg-white border-t border-slate-200">
                          <p className="text-xs font-semibold text-slate-800 line-clamp-1">{img.title}</p>
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
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Quy Hoạch Hệ Thống Cấp Điện Container Lạnh 380V (Khu A)
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Hệ thống cấp điện bến bãi Sơn Cảng gồm <strong>13 Tủ điện công nghiệp</strong> phân bổ tổng cộng <strong>50 Giắc cắm 3 pha 380V</strong>.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href="/yard?tab=zones"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-sm"
                  >
                    Xem Sơ đồ Bến bãi
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Summary Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200">
                  <span className="text-xs font-semibold text-blue-700 uppercase">Tổng số Tủ điện</span>
                  <p className="text-2xl font-black text-blue-900 mt-1">13 Tủ</p>
                  <span className="text-[11px] text-blue-600">T01 đến T13</span>
                </div>
                <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200">
                  <span className="text-xs font-semibold text-emerald-700 uppercase">Tổng Giắc cắm</span>
                  <p className="text-2xl font-black text-emerald-900 mt-1">50 Giắc</p>
                  <span className="text-[11px] text-emerald-600">3P 380V / 32A</span>
                </div>
                <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200">
                  <span className="text-xs font-semibold text-amber-700 uppercase">Tủ Công Suất Lớn</span>
                  <p className="text-2xl font-black text-amber-900 mt-1">Tủ T05</p>
                  <span className="text-[11px] text-amber-600">8 ổ cắm trung tâm</span>
                </div>
                <div className="p-4 rounded-xl bg-purple-50/80 border border-purple-200">
                  <span className="text-xs font-semibold text-purple-700 uppercase">Chuẩn Kỹ Thuật</span>
                  <p className="text-2xl font-black text-purple-900 mt-1">380V / 3P</p>
                  <span className="text-[11px] text-purple-600">Làm tròn cước 5.000đ</span>
                </div>
              </div>

              {/* Cabinets Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Mã Tủ</th>
                      <th className="py-3 px-4">Tên Tủ Điện</th>
                      <th className="py-3 px-4 text-center">Số Giắc 380V</th>
                      <th className="py-3 px-4">Dải Mã Giắc Cắm</th>
                      <th className="py-3 px-4">Đặc tính kỹ thuật & Vị trí</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    {powerCabinets.map((c) => (
                      <tr key={c.code} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-blue-700">{c.code}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{c.name}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            {c.sockets} ổ
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">{c.codes}</td>
                        <td className="py-3 px-4 text-slate-600">{c.spec}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-100/80 font-bold text-slate-900">
                      <td className="py-3 px-4" colSpan={2}>TỔNG CỘNG HỆ THỐNG</td>
                      <td className="py-3 px-4 text-center text-emerald-700 font-black">50 Giắc</td>
                      <td className="py-3 px-4" colSpan={2}>
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
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-2">
                6 Quy Tắc Vàng Vận Hành Bắt Buộc — Phần Mềm Sơn Cảng
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mb-6">
                Mọi nhân sự trực ban thuộc các bộ phận An ninh, CCKB, Điều phối và Kế toán phải tuân thủ nghiêm ngặt các nguyên tắc dưới đây:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {goldenRules.map((rule) => {
                  const Icon = rule.icon;
                  return (
                    <div key={rule.num} className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-black text-blue-600 font-mono">#{rule.num}</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">
                          {rule.tag}
                        </span>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm sm:text-base font-bold text-slate-900">{rule.title}</h3>
                          <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">{rule.desc}</p>
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
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Thư Viện 33 Ảnh Chụp Thực Tế Giao Diện & Modal Hệ Thống
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Toàn bộ hình ảnh thực tế được chụp từ hệ thống đang chạy với 70 xe, 65 cont, 13 tủ điện và các nghiệp vụ tài chính thực tế.
                  </p>
                </div>
              </div>

              <div className="space-y-8">
                {workflowSteps.map((s) => (
                  <div key={s.step} className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                        {s.step}
                      </span>
                      <h3 className="text-base font-bold text-slate-900">{s.title}</h3>
                      <span className="text-xs text-slate-500">({s.images.length} ảnh thực tế)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {s.images.map((img, idx) => (
                        <div
                          key={idx}
                          onClick={() => setLightboxImage({ src: img.src, title: img.title, subtitle: `${s.title} (Ảnh ${idx + 1}/${s.images.length})` })}
                          className="group rounded-xl border border-slate-200 bg-white overflow-hidden cursor-pointer hover:shadow-md hover:border-blue-500 transition-all"
                        >
                          <div className="aspect-video bg-slate-100 relative overflow-hidden flex items-center justify-center">
                            <img
                              src={img.src}
                              alt={img.title}
                              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="px-3 py-1.5 rounded-lg bg-white/90 text-slate-900 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                                <Eye className="w-3.5 h-3.5" /> Xem ảnh lớn
                              </span>
                            </div>
                          </div>
                          <div className="p-3">
                            <p className="text-xs font-semibold text-slate-800 line-clamp-1">{img.title}</p>
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

      {/* 4. LIGHTBOX MODAL PHÓNG TO ẢNH */}
      {lightboxImage && (
        <div 
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-5xl w-full overflow-hidden shadow-2xl border border-slate-700 flex flex-col max-h-[90vh]"
          >
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div>
                <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">{lightboxImage.subtitle}</span>
                <h3 className="text-sm sm:text-base font-bold text-white">{lightboxImage.title}</h3>
              </div>
              <button
                onClick={() => setLightboxImage(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 overflow-auto bg-slate-950 flex items-center justify-center">
              <img
                src={lightboxImage.src}
                alt={lightboxImage.title}
                className="max-h-[75vh] w-auto object-contain rounded-lg shadow-md"
              />
            </div>
            <div className="p-3 bg-slate-900 text-right border-t border-slate-800">
              <button
                onClick={() => setLightboxImage(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition-colors"
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
