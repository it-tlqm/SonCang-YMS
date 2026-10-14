/**
 * Demo Repository — Triển khai IYardRepository cho Chế độ Mô phỏng UI (LocalStorage)
 * Dùng 100% 7 loại xe V5 chuẩn và dữ liệu mẫu an toàn, tách biệt hoàn toàn khỏi Backend.
 */

import { 
  VehicleType, 
  VehicleVisit, 
  ContainerVisit, 
  CargoStatus,
  CargoStatusUpdate, 
  ReeferPowerSession,
  ReeferPowerStatus,
  ReeferRequest,
  ReeferRequestStatus,
  ChargeItem,
  TariffItem,
  ContainerNumberChange,
  VehiclePlateChange,
  TicketPaymentStatus,
  VehicleDuplicatePolicy,
  VehicleDuplicateCheckResult,
  PaymentRecord,
  YardZoneInfo,
  ReeferTemperatureLog,
  Customer,
  StaffUser,
  PowerSocket,
  PowerSocketStatus,
  AppRole,
  AppRolePermission,
  CashSettlement,
  CashSettlementItem,
  YardInvoice,
  AccountingDebtItem,
  InvoiceType
} from '@/types/domain.types';
import { 
  IYardRepository, 
  CreateVehicleParams, 
  CreateContainerParams, 
  CollectPaymentParams,
  BatchCollectPaymentsParams,
  GetPaymentsFilter,
  ApproveClearanceParams,
  ConfirmSettlementParams,
  CreateInvoiceParams,
  CollectAccountingDebtParams,
  ConfirmExitParams,
  ConfirmVehicleOnlyExitParams,
  CorrectContainerNumberParams,
  CorrectVehiclePlateParams,
  RecordCompletedReeferSessionParams,
  VerifyReeferSessionZaloParams,
  UpdateReeferRequestParams,
  AdjustVehicleVisitParams
} from './repository-interface';
import { calculateStorageFeeOffline } from './supabase-repository';

// 7 loại xe chuẩn V5 khởi tạo từ Migration 004
export const SEED_VEHICLE_TYPES_V5: VehicleType[] = [
  {
    code: 'CONT_LANH',
    name: 'Xe container lạnh/khô có hàng',
    description: 'Xe container vào bãi (có cắm điện hoặc không cắm điện)',
    default_ticket_amount: 250000,
    allows_container: true,
    is_active: true,
    sort_order: 1,
  },
  {
    code: 'DAU_KEO',
    name: 'Xe đầu kéo không cont',
    description: 'Xe đầu kéo vào bãi lấy container hoặc trả rỗng không cõng cont',
    default_ticket_amount: 0, // 0đ = Miễn phí hợp lệ
    allows_container: false,
    is_active: true,
    sort_order: 2,
  },
  {
    code: 'XE_BO_4_CHAN',
    name: 'Xe bơ 4 chân',
    description: 'Xe tải thùng 4 chân chở hàng rời / nông sản',
    default_ticket_amount: 200000,
    allows_container: false,
    is_active: true,
    sort_order: 3,
  },
  {
    code: 'XE_BO_3_CHAN',
    name: 'Xe bơ 3 chân',
    description: 'Xe tải thùng 3 chân',
    default_ticket_amount: 200000,
    allows_container: false,
    is_active: true,
    sort_order: 4,
  },
  {
    code: 'XE_BO_8_TAN_2_CHAN',
    name: 'Xe bơ 8 tấn (2 chân)',
    description: 'Xe tải trung 2 chân tải trọng 8 tấn',
    default_ticket_amount: 100000,
    allows_container: false,
    is_active: true,
    sort_order: 5,
  },
  {
    code: 'XE_BO_3_BANH',
    name: 'Xe bò 3 bánh',
    description: 'Phương tiện trung chuyển nhỏ trong bãi',
    default_ticket_amount: 40000,
    allows_container: false,
    is_active: true,
    sort_order: 6,
  },
  {
    code: 'XE_SANG_TAI',
    name: 'Xe sang tải',
    description: 'Phương tiện thực hiện tác nghiệp sang tải tại bãi',
    default_ticket_amount: 0, // 0đ = Miễn phí hợp lệ
    allows_container: false,
    is_active: true,
    sort_order: 7,
  },
];

const INITIAL_DEMO_VEHICLES: VehicleVisit[] = [
  {
    id: '11000000-0000-0000-0000-000000000001',
    yard_id: '20000000-0000-0000-0000-000000000001',
    vehicle_type: 'CONT_LANH',
    vehicle_type_name: 'Xe container lạnh/khô có hàng',
    license_plate: '14C-123.45',
    driver_name: 'Nguyễn Văn Hùng',
    driver_phone: '0912.345.678',
    ticket_code: 'VE-20261011-001',
    ticket_amount: 250000,
    ticket_payment_status: 'UNPAID', // Mặc định chưa thu, không tự gán PAID
    status: 'IN_YARD',
    entry_at: '2026-10-11T08:30:00Z',
    entry_by: '20000000-0000-0000-0000-000000000020',
    entry_by_name: 'Hoàng Văn An (Cổng chính)',
    exit_at: null,
    exit_by: null,
    note: 'Chở hoa quả xuất khẩu',
    idempotency_key: 'INIT-VEH-001',
  },
  {
    id: '11000000-0000-0000-0000-000000000002',
    yard_id: '20000000-0000-0000-0000-000000000001',
    vehicle_type: 'DAU_KEO',
    vehicle_type_name: 'Xe đầu kéo không cont',
    license_plate: '15C-678.90',
    driver_name: 'Trần Văn Nam',
    driver_phone: '0988.765.432',
    ticket_code: 'VE-20261011-002',
    ticket_amount: 0,
    ticket_payment_status: 'EXEMPT', // 0đ = Miễn phí hợp lệ
    status: 'IN_YARD',
    entry_at: '2026-10-11T09:15:00Z',
    entry_by: '20000000-0000-0000-0000-000000000020',
    entry_by_name: 'Hoàng Văn An (Cổng chính)',
    exit_at: null,
    exit_by: null,
    note: 'Vào bãi lấy vỏ cont rỗng',
    idempotency_key: 'INIT-VEH-002',
  },
  {
    id: '11000000-0000-0000-0000-000000000003',
    yard_id: '20000000-0000-0000-0000-000000000001',
    vehicle_type: 'XE_BO_4_CHAN',
    vehicle_type_name: 'Xe bơ 4 chân',
    license_plate: '29H-555.55',
    driver_name: 'Phạm Văn Long',
    driver_phone: '0903.111.222',
    ticket_code: 'VE-20261011-003',
    ticket_amount: 150000,
    ticket_payment_status: 'UNPAID', // Chưa thu
    status: 'IN_YARD',
    entry_at: '2026-10-11T10:00:00Z',
    entry_by: '20000000-0000-0000-0000-000000000020',
    entry_by_name: 'Hoàng Văn An (Cổng chính)',
    exit_at: null,
    exit_by: null,
    note: 'Chở phân bón nhập khẩu',
    idempotency_key: 'INIT-VEH-003',
  },
];

const INITIAL_DEMO_CONTAINERS: ContainerVisit[] = [
  {
    id: '22000000-0000-0000-0000-000000000001',
    yard_id: '20000000-0000-0000-0000-000000000001',
    container_no_current: 'MSKU0934128',
    container_no_original: 'MSKU0934128',
    container_size: '40',
    container_type: 'RF',
    status: 'IN_YARD',
    cargo_status: 'HANG',
    inbound_vehicle_visit_id: '11000000-0000-0000-0000-000000000001',
    inbound_license_plate: '14C-123.45',
    inbound_at: '2026-10-11T08:30:00Z',
    outbound_at: null,
    created_at: '2026-10-11T08:30:00Z',
    created_by: '20000000-0000-0000-0000-000000000020',
    created_by_name: 'Hoàng Văn An (Cổng chính)',
    number_changes_count: 0,
  },
  {
    id: '22000000-0000-0000-0000-000000000002',
    yard_id: '20000000-0000-0000-0000-000000000001',
    container_no_current: 'TGHU7654321',
    container_no_original: 'TGHU7654321',
    container_size: '40',
    container_type: 'DC',
    status: 'IN_YARD',
    cargo_status: 'RONG',
    inbound_vehicle_visit_id: null,
    inbound_license_plate: '14C-999.99',
    inbound_at: '2026-10-10T14:00:00Z',
    outbound_at: null,
    created_at: '2026-10-10T14:00:00Z',
    created_by: '20000000-0000-0000-0000-000000000020',
    created_by_name: 'Hoàng Văn An (Cổng chính)',
    number_changes_count: 0,
  },
  {
    id: '22000000-0000-0000-0000-000000000003',
    yard_id: '20000000-0000-0000-0000-000000000001',
    container_no_current: 'CMAU1122334',
    container_no_original: 'CMAU1122334',
    container_size: '20',
    container_type: 'RF',
    status: 'IN_YARD',
    cargo_status: 'CHUA_XAC_DINH', // Chưa xác định ban đầu
    inbound_vehicle_visit_id: null,
    inbound_license_plate: '14C-888.88',
    inbound_at: '2026-10-11T11:20:00Z',
    outbound_at: null,
    created_at: '2026-10-11T11:20:00Z',
    created_by: '20000000-0000-0000-0000-000000000020',
    created_by_name: 'Hoàng Văn An (Cổng chính)',
    number_changes_count: 0,
  },
  {
    id: '22000000-0000-0000-0000-000000000004',
    yard_id: '20000000-0000-0000-0000-000000000001',
    container_no_current: 'TEMU7788990',
    container_no_original: 'TEMU7788990',
    container_size: '40',
    container_type: 'RF',
    status: 'IN_YARD',
    cargo_status: 'HANG',
    inbound_vehicle_visit_id: null,
    inbound_license_plate: '14C-777.88',
    inbound_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    outbound_at: null,
    created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    created_by: '20000000-0000-0000-0000-000000000020',
    created_by_name: 'Hoàng Văn An (Cổng chính)',
    number_changes_count: 0,
  },
];

const INITIAL_DEMO_PAYMENTS: PaymentRecord[] = [
  {
    id: 'pay-demo-001',
    yard_id: '11111111-1111-1111-1111-111111111111',
    charge_id: 'charge-002',
    payment_amount: 400000,
    payment_method: 'CASH',
    collected_by: '20000000-0000-0000-0000-000000000020',
    collected_by_name: 'Thương vụ CCKB',
    collector_dept: 'CCKB',
    collected_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    receipt_code: 'PT-000002',
    notes: 'Thu tiền điện lạnh container OOLU6543210 (4h)',
    charge_type: 'REEFER',
    charge_title: 'Tiền điện Container OOLU6543210 (240 phút)',
    container_no: 'OOLU6543210',
    license_plate: null,
  },
  {
    id: 'pay-demo-002',
    yard_id: '11111111-1111-1111-1111-111111111111',
    charge_id: 'charge-001',
    payment_amount: 250000,
    payment_method: 'TRANSFER',
    collected_by: '20000000-0000-0000-0000-000000000020',
    collected_by_name: 'An ninh Cổng 1',
    collector_dept: 'AN_NINH',
    collected_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    receipt_code: 'PT-000001',
    notes: 'Thu vé xe container lạnh vào cổng',
    charge_type: 'TICKET',
    charge_title: 'Vé vào cổng Xe 14C-123.45 (CONT_LANH)',
    container_no: 'TEMU9182341',
    license_plate: '14C-123.45',
  }
];

export const SEED_YARD_ZONES_SON_CANG: YardZoneInfo[] = [
  {
    code: 'KHU_A_REEFER',
    name: 'Khu A — Bãi Container Lạnh (Reefer)',
    description: 'Bãi cắm điện chuyên dụng, trang bị 30 trụ điện 3 pha công nghiệp 380V (R01 - R30)',
    capacity: 30,
    has_power_outlets: true,
    color_badge: 'bg-amber-100 text-amber-800 border-amber-300',
  },
  {
    code: 'KHU_B_DRY',
    name: 'Khu B — Bãi Container Khô & Vỏ Rỗng',
    description: 'Bãi xếp dỡ vỏ rỗng và container khô (DC/HC), chờ kéo ra hoặc đóng hàng',
    capacity: 80,
    has_power_outlets: false,
    color_badge: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  {
    code: 'KHU_C_TRANSFER',
    name: 'Khu C — Bãi Xe Bo Sang Tải',
    description: 'Khu vực sang tải nông sản, hoa quả giữa các xe bo 4 chân, 3 chân, 8 tấn',
    capacity: 50,
    has_power_outlets: false,
    color_badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  {
    code: 'KHU_D_TRACTOR',
    name: 'Khu D — Bãi Xe Đầu Kéo Chờ Chuyến',
    description: 'Bãi đỗ xe đầu kéo không mooc hoặc chờ thông quan xuất nhập cảnh',
    capacity: 60,
    has_power_outlets: false,
    color_badge: 'bg-purple-100 text-purple-800 border-purple-300',
  },
];

const INITIAL_DEMO_TEMP_LOGS: ReeferTemperatureLog[] = [
  {
    id: 'temp-001',
    container_visit_id: 'cont-001',
    container_no: 'TEMU9182341',
    temperature_celsius: -18.5,
    cooling_status: 'RUNNING_NORMAL',
    logged_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    logged_by: '20000000-0000-0000-0000-000000000020',
    logged_by_name: 'Kỹ thuật trực ca',
    notes: 'Bảo quản thanh long đông lạnh, máy chạy ổn định',
  }
];

export const INITIAL_DEMO_CUSTOMERS: Customer[] = [
  { id: 'cust-1', name: 'Công ty Cổ phần Tà Lùng Quang Minh', phone: '0206.3852.888', tax_code: '4800123456', notes: 'Đối tác chiến lược / Doanh nghiệp cảng' },
  { id: 'cust-2', name: 'Cty TNHH XNK Nông sản Tà Lùng', phone: '0912.888.999', tax_code: '4800234567', notes: 'Chuyên cont hoa quả sầu riêng, thanh long xuất khẩu' },
  { id: 'cust-3', name: 'Công ty Logistics Quốc tế Hưng Phát', phone: '0988.666.777', tax_code: '0100345678', notes: 'Đội xe cont lạnh Lạng Sơn - Cao Bằng' },
  { id: 'cust-4', name: 'Công ty Vận tải & Thương mại Quảng Tây', phone: '+86 138 0013 8000', notes: 'Chủ hàng xe cont Trung Quốc' },
  { id: 'cust-5', name: 'Chủ hàng Nguyễn Văn An', phone: '0912.345.678', notes: 'Khách hàng thân thiết tuyến Hải Phòng - Tà Lùng' },
  { id: 'cust-6', name: 'Chủ hàng Trần Văn Bình', phone: '0988.765.432', notes: 'Hàng đông lạnh thịt trâu/bò' },
  { id: 'cust-7', name: 'Hợp tác xã Vận tải Cao Bằng', phone: '0206.3822.333', notes: 'Xe bo và đầu kéo địa phương' },
  { id: 'cust-8', name: 'Khách hàng vãng lai', phone: '', notes: 'Thu tiền trực tiếp từng lượt' }
];

export const INITIAL_DEMO_STAFF_USERS: StaffUser[] = [
  {
    id: '20000000-0000-0000-0000-000000000010',
    full_name: 'Ban Quản trị Hệ thống (Super Admin)',
    email: 'sys_admin_uat@example.com',
    phone: '0988 888 999',
    role_code: 'SYS_ADMIN',
    role_name: 'Quản trị viên Hệ thống',
    department_code: 'HE_THONG',
    department_name: 'Ban Quản trị & Công nghệ',
    yard_id: null,
    yard_name: 'Toàn hệ thống',
    is_active: true,
    notes: 'Toàn quyền cấu hình, tài khoản nhân sự, phân quyền và audit logs'
  }
];

export const INITIAL_DEMO_POWER_SOCKETS: PowerSocket[] = Array.from({ length: 30 }, (_, i) => {
  const code = `R${String(i + 1).padStart(2, '0')}`;
  return {
    id: `socket-${code}`,
    socket_code: code,
    socket_name: `Trụ điện ${code}`,
    zone_code: 'KHU_A_REEFER',
    voltage: '380V',
    amperage: '32A',
    phase: '3_PHASE',
    status: 'AVAILABLE',
    notes: 'Trụ cấp điện container lạnh chuyên dụng 380V/32A chuẩn công nghiệp 3 pha',
    is_active: true,
  };
});

export class DemoRepository implements IYardRepository {
  readonly mode = 'DEMO' as const;

  private vehicles: VehicleVisit[] = [...INITIAL_DEMO_VEHICLES];
  private containers: ContainerVisit[] = [...INITIAL_DEMO_CONTAINERS];
  private numberChanges: ContainerNumberChange[] = [];
  private plateChanges: VehiclePlateChange[] = [];
  private reeferRequests: ReeferRequest[] = [];
  private payments: PaymentRecord[] = [...INITIAL_DEMO_PAYMENTS];
  private temperatureLogs: ReeferTemperatureLog[] = [...INITIAL_DEMO_TEMP_LOGS];
  private customers: Customer[] = [...INITIAL_DEMO_CUSTOMERS];
  private staffUsers: StaffUser[] = [...INITIAL_DEMO_STAFF_USERS];
  private yardZones: YardZoneInfo[] = [...SEED_YARD_ZONES_SON_CANG];
  private powerSockets: PowerSocket[] = [...INITIAL_DEMO_POWER_SOCKETS];
  private cashSettlements: CashSettlement[] = [];
  private settlementItems: CashSettlementItem[] = [];
  private yardInvoices: YardInvoice[] = [];
  private duplicatePolicy: VehicleDuplicatePolicy = {
    id: 'pol-demo-01',
    yard_id: '20000000-0000-0000-0000-000000000001',
    policy_mode: 'WARN_AND_ALLOW',
    cooldown_minutes: 15,
    cooldown_action: 'BLOCK',
    check_unpaid_ticket: true,
    block_if_unpaid_ticket: false,
    require_override_reason: true,
    allow_quick_exit_previous: true,
    exempt_vehicle_types: ['DAU_KEO', 'XE_BO_4_CHAN', 'XE_BO_3_CHAN', 'XE_BO_8_TAN_2_CHAN', 'XE_SANG_TAI'],
    preset_reasons: [
      { code: 'XE_BO_CHAY_CHUYEN_MOI', label: 'Xe bo / xe kéo chạy chuyến mới trong ngày' },
      { code: 'QUEN_QUET_RA', label: 'Quên quẹt ra ca trước / Cổng ra chưa xác nhận' },
      { code: 'XE_QUAY_DAU', label: 'Xe quay đầu ra ngoài rồi quay lại bãi' },
      { code: 'NHAP_BU_DOI_SOAT', label: 'Nhập bù dữ liệu đối soát thực tế ca trực' },
      { code: 'LY_DO_KHAC', label: 'Lý do nghiệp vụ khác' },
    ],
  };

  constructor() {
    if (typeof window !== 'undefined') {
      const savedV = localStorage.getItem('soncang_v5_demo_vehicles');
      const savedC = localStorage.getItem('soncang_v5_demo_containers');
      const savedNC = localStorage.getItem('soncang_v5_demo_number_changes');
      const savedPC = localStorage.getItem('soncang_v5_demo_plate_changes');
      const savedRR = localStorage.getItem('soncang_v5_demo_reefer_requests');
      const savedDP = localStorage.getItem('soncang_v5_demo_duplicate_policy');
      const savedPAY = localStorage.getItem('soncang_v5_demo_payments');
      const savedTL = localStorage.getItem('soncang_v5_demo_temperature_logs');
      const savedCust = localStorage.getItem('soncang_v5_customers');
      if (savedV) {
        try { this.vehicles = JSON.parse(savedV); } catch {}
      }
      if (savedC) {
        try { this.containers = JSON.parse(savedC); } catch {}
      }
      if (savedNC) {
        try { this.numberChanges = JSON.parse(savedNC); } catch {}
      }
      if (savedPC) {
        try { this.plateChanges = JSON.parse(savedPC); } catch {}
      }
      if (savedRR) {
        try { this.reeferRequests = JSON.parse(savedRR); } catch {}
      }
      if (savedDP) {
        try { this.duplicatePolicy = JSON.parse(savedDP); } catch {}
      }
      if (savedPAY) {
        try { this.payments = JSON.parse(savedPAY); } catch {}
      }
      if (savedTL) {
        try { this.temperatureLogs = JSON.parse(savedTL); } catch {}
      }
      if (savedCust) {
        try { this.customers = JSON.parse(savedCust); } catch {}
      }
      const savedStaff = localStorage.getItem('soncang_v5_staff_users');
      if (savedStaff) {
        try { this.staffUsers = JSON.parse(savedStaff); } catch {}
      }
      const savedTF = localStorage.getItem('soncang_v5_demo_tariffs');
      if (savedTF) {
        try { this.tariffs = JSON.parse(savedTF); } catch {}
      }
      const savedYZ = localStorage.getItem('soncang_v5_yard_zones');
      if (savedYZ) {
        try { this.yardZones = JSON.parse(savedYZ); } catch {}
      }
      const savedSockets = localStorage.getItem('soncang_v5_power_sockets');
      if (savedSockets) {
        try { this.powerSockets = JSON.parse(savedSockets); } catch {}
      }
      const savedSettlements = localStorage.getItem('soncang_v5_cash_settlements');
      if (savedSettlements) {
        try { this.cashSettlements = JSON.parse(savedSettlements); } catch {}
      }
      const savedSetItems = localStorage.getItem('soncang_v5_settlement_items');
      if (savedSetItems) {
        try { this.settlementItems = JSON.parse(savedSetItems); } catch {}
      }
      const savedInvoices = localStorage.getItem('soncang_v5_yard_invoices');
      if (savedInvoices) {
        try { this.yardInvoices = JSON.parse(savedInvoices); } catch {}
      }
    }
  }

  private persist() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('soncang_v5_demo_vehicles', JSON.stringify(this.vehicles));
      localStorage.setItem('soncang_v5_demo_containers', JSON.stringify(this.containers));
      localStorage.setItem('soncang_v5_demo_number_changes', JSON.stringify(this.numberChanges));
      localStorage.setItem('soncang_v5_demo_plate_changes', JSON.stringify(this.plateChanges));
      localStorage.setItem('soncang_v5_demo_reefer_requests', JSON.stringify(this.reeferRequests));
      localStorage.setItem('soncang_v5_demo_duplicate_policy', JSON.stringify(this.duplicatePolicy));
      localStorage.setItem('soncang_v5_demo_payments', JSON.stringify(this.payments));
      localStorage.setItem('soncang_v5_demo_temperature_logs', JSON.stringify(this.temperatureLogs));
      localStorage.setItem('soncang_v5_customers', JSON.stringify(this.customers));
      localStorage.setItem('soncang_v5_staff_users', JSON.stringify(this.staffUsers));
      localStorage.setItem('soncang_v5_demo_tariffs', JSON.stringify(this.tariffs));
      localStorage.setItem('soncang_v5_yard_zones', JSON.stringify(this.yardZones));
      localStorage.setItem('soncang_v5_power_sockets', JSON.stringify(this.powerSockets));
      localStorage.setItem('soncang_v5_cash_settlements', JSON.stringify(this.cashSettlements));
      localStorage.setItem('soncang_v5_settlement_items', JSON.stringify(this.settlementItems));
      localStorage.setItem('soncang_v5_yard_invoices', JSON.stringify(this.yardInvoices));
    }
  }


  async getVehicleTypes(): Promise<VehicleType[]> {
    return SEED_VEHICLE_TYPES_V5.filter(t => t.is_active);
  }

  async getVehicles(yardId?: string): Promise<VehicleVisit[]> {
    if (yardId) {
      return this.vehicles.filter(v => v.yard_id === yardId);
    }
    return this.vehicles;
  }

  async getContainers(yardId?: string): Promise<ContainerVisit[]> {
    if (yardId) {
      return this.containers.filter(c => c.yard_id === yardId);
    }
    return this.containers;
  }

  async createVehicleEntry(params: CreateVehicleParams): Promise<{ 
    vehicle: VehicleVisit | null; 
    container?: ContainerVisit | null; 
    secondContainer?: ContainerVisit | null;
    containers?: ContainerVisit[];
    error?: string 
  }> {
    const vType = SEED_VEHICLE_TYPES_V5.find(t => t.code === params.vehicleTypeCode);
    if (!vType) {
      return { vehicle: null, error: 'Loại phương tiện không hợp lệ.' };
    }

    // Nghiệp vụ bảo vệ V5: Xe có container thì không được áp dụng vé 0đ của đầu kéo không cont
    if (params.hasContainer && params.vehicleTypeCode === 'DAU_KEO') {
      return {
        vehicle: null,
        error: 'Quy tắc vé cổng V5: Xe đầu kéo khi chở container vào bãi phải áp dụng loại vé Xe container (250.000đ). Không được chọn Đầu kéo không cont (0đ).',
      };
    }

    // Xác định số tiền vé và trạng thái thanh toán
    let ticketAmount = vType.default_ticket_amount;
    let paymentStatus: TicketPaymentStatus = 'UNPAID';

    if (params.hasContainer) {
      ticketAmount = 250000;
      paymentStatus = params.collectPaymentNow ? 'PAID' : 'UNPAID';
    } else if (ticketAmount === 0) {
      paymentStatus = 'EXEMPT';
    } else if (params.collectPaymentNow) {
      paymentStatus = 'PAID';
    }

    // Kiểm tra Idempotency chống double-click
    if (params.idempotencyKey) {
      const existing = this.vehicles.find(
        v => v.yard_id === params.yardId && v.idempotency_key === params.idempotencyKey
      );
      if (existing) {
        return { vehicle: existing };
      }
    }

    const cleanPlate = params.licensePlate.trim().toUpperCase();
    const existingDup = this.vehicles.find(
      v => v.yard_id === params.yardId && v.license_plate?.trim().toUpperCase() === cleanPlate && v.status === 'IN_YARD'
    );

    if (existingDup) {
      if (params.closePreviousVisit || this.duplicatePolicy.policy_mode === 'AUTO_CLOSE_PREVIOUS') {
        existingDup.status = 'EXITED';
        existingDup.exit_at = new Date().toISOString();
        existingDup.exit_by = params.operatorId;
        existingDup.note = (existingDup.note ? `${existingDup.note} | ` : '') + 
          `Tự động xuất bãi do tiếp nhận lượt mới vào lúc ${new Date().toLocaleTimeString('vi-VN')}`;
      }
    }

    const randomSuffix = Math.random().toString(16).substring(2, 6);
    const newId = `11000000-${randomSuffix}-0000-0000-${Date.now().toString(16).substring(0, 12)}`;
    const ticketCode = `VE-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

    const newVehicle: VehicleVisit = {
      id: newId,
      yard_id: params.yardId,
      vehicle_type: params.vehicleTypeCode,
      vehicle_type_name: vType.name,
      license_plate: cleanPlate,
      driver_name: params.driverName?.trim() || null,
      driver_phone: params.driverPhone?.trim() || null,
      ticket_code: ticketCode,
      ticket_amount: ticketAmount,
      ticket_payment_status: paymentStatus,
      status: 'IN_YARD',
      entry_at: new Date().toISOString(),
      entry_by: params.operatorId,
      entry_by_name: params.operatorName,
      exit_at: null,
      exit_by: null,
      note: params.note?.trim() || null,
      idempotency_key: params.idempotencyKey || null,
      is_duplicate_entry: !!existingDup,
      previous_visit_id: existingDup ? existingDup.id : null,
      duplicate_override_reason: params.duplicateReason || null,
      duplicate_override_by: existingDup ? params.operatorId : null,
    };

    this.vehicles.unshift(newVehicle);

    let newCont: ContainerVisit | undefined = undefined;
    if (params.hasContainer && params.containerNo) {
      const cleanNo = params.containerNo.trim().toUpperCase();
      const existingActive = this.containers.find(
        c => c.yard_id === params.yardId && c.container_no_current === cleanNo && c.status === 'IN_YARD'
      );
      if (existingActive) {
        return { 
          vehicle: null, 
          error: `Cảnh báo trùng số container: Container ${cleanNo} hiện đang có một lượt lưu bãi khác ở trạng thái IN_YARD.` 
        };
      }

      newCont = {
        id: `21000000-${Math.random().toString(16).substring(2, 6)}-0000-0000-${Date.now().toString(16).substring(0, 12)}`,
        yard_id: params.yardId,
        container_no_current: cleanNo,
        container_no_original: cleanNo,
        container_size: params.containerSize || '40',
        container_type: params.containerType || 'RF',
        status: 'IN_YARD',
        cargo_status: (params.cargoStatus as CargoStatus) || 'CHUA_XAC_DINH',
        inbound_vehicle_visit_id: newVehicle.id,
        inbound_license_plate: newVehicle.license_plate,
        inbound_at: newVehicle.entry_at,
        outbound_at: null,
        clearance_status: 'PENDING',
        storage_fee_amount: 0,
        storage_fee_payment_status: 'EXEMPT',
        storage_nights_charged: 0,
        created_at: newVehicle.entry_at,
        created_by: params.operatorId,
        number_changes_count: 0,
      };
      this.containers.unshift(newCont);
    }

    let secondCont: ContainerVisit | undefined = undefined;
    if (params.secondContainer && params.secondContainer.containerNo) {
      const cleanNo2 = params.secondContainer.containerNo.trim().toUpperCase();
      const existingActive2 = this.containers.find(
        c => c.yard_id === params.yardId && c.container_no_current === cleanNo2 && c.status === 'IN_YARD'
      );
      if (!existingActive2) {
        secondCont = {
          id: `21000000-${Math.random().toString(16).substring(2, 6)}-0000-0000-${Date.now().toString(16).substring(0, 12)}`,
          yard_id: params.yardId,
          container_no_current: cleanNo2,
          container_no_original: cleanNo2,
          container_size: params.secondContainer.containerSize || '20',
          container_type: params.secondContainer.containerType || 'RF',
          status: 'IN_YARD',
          cargo_status: (params.secondContainer.cargoStatus as CargoStatus) || 'CHUA_XAC_DINH',
          inbound_vehicle_visit_id: newVehicle.id,
          inbound_license_plate: newVehicle.license_plate,
          inbound_at: newVehicle.entry_at,
          outbound_at: null,
          clearance_status: 'PENDING',
          storage_fee_amount: 0,
          storage_fee_payment_status: 'EXEMPT',
          storage_nights_charged: 0,
          created_at: newVehicle.entry_at,
          created_by: params.operatorId,
          number_changes_count: 0,
        };
        this.containers.unshift(secondCont);
      }
    }

    const containersList: ContainerVisit[] = [];
    if (newCont) containersList.push(newCont);
    if (secondCont) containersList.push(secondCont);
    newVehicle.containers = containersList;

    this.persist();
    return { vehicle: newVehicle, container: newCont, secondContainer: secondCont, containers: containersList };
  }

  async createContainerEntry(params: CreateContainerParams): Promise<{ container: ContainerVisit | null; error?: string }> {
    const cleanNo = params.containerNo.trim().toUpperCase();

    // Kiểm tra trùng container active trong bãi (quy tắc partial unique index)
    const existingActive = this.containers.find(
      c => c.yard_id === params.yardId && c.container_no_current === cleanNo && c.status === 'IN_YARD'
    );
    if (existingActive) {
      return {
        container: null,
        error: `Số container ${cleanNo} hiện đang tồn tại trong bãi với trạng thái ĐANG TRONG BÃI (IN_YARD). Không thể tiếp nhận trùng lặp!`,
      };
    }

    const randomSuffix = Math.random().toString(16).substring(2, 6);
    const newId = `22000000-${randomSuffix}-0000-0000-${Date.now().toString(16).substring(0, 12)}`;
    const newContainer: ContainerVisit = {
      id: newId,
      yard_id: params.yardId,
      container_no_current: cleanNo,
      container_no_original: cleanNo,
      container_size: params.containerSize,
      container_type: params.containerType,
      status: 'IN_YARD',
      cargo_status: (params.cargoStatus as CargoStatus) || 'CHUA_XAC_DINH',
      inbound_vehicle_visit_id: params.vehicleVisitId || null,
      inbound_license_plate: params.licensePlate || null,
      inbound_at: params.inboundAt || new Date().toISOString(),
      outbound_at: null,
      yard_zone: params.yardZone,
      slot_code: params.slotCode,
      notes: params.notes,
      created_at: params.inboundAt || new Date().toISOString(),
      created_by: params.operatorId,
      created_by_name: params.operatorName,
      number_changes_count: 0,
    };

    this.containers.unshift(newContainer);
    this.persist();
    return { container: newContainer };
  }

  async updateCargoStatus(
    containerId: string,
    cargoStatus: CargoStatusUpdate,
    operatorRole: string
  ): Promise<{ success: boolean; error?: string }> {
    // Chỉ DIS_STAFF, DIS_LEAD, SYS_ADMIN
    if (!['DIS_STAFF', 'DIS_LEAD', 'SYS_ADMIN'].includes(operatorRole)) {
      return {
        success: false,
        error: 'Từ chối truy cập: Chỉ nhân viên Điều phối (DIS_STAFF) hoặc Quản trị viên mới có quyền cập nhật trạng thái Hàng/Rỗng!',
      };
    }

    const target = this.containers.find(c => c.id === containerId);
    if (!target) {
      return { success: false, error: 'Không tìm thấy lượt container.' };
    }

    if (target.status !== 'IN_YARD') {
      return { success: false, error: 'Chỉ được cập nhật trạng thái HÀNG/RỖNG khi container đang trong bãi (IN_YARD).' };
    }

    target.cargo_status = cargoStatus;
    this.persist();
    return { success: true };
  }

  private reeferSessions: ReeferPowerSession[] = [
    {
      id: 'reefer-demo-001',
      yard_id: '11111111-1111-1111-1111-111111111111',
      container_visit_id: 'cont-001',
      container_no: 'TEMU9182341',
      power_status: 'PLUGGED',
      plugged_in_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(), // 3 giờ trước
      plugged_in_by: 'An ninh Cổng 1',
      unplugged_at: null,
      unplugged_by: null,
      raw_duration_seconds: null,
      billable_minutes: null,
      applied_hourly_rate: 100000,
      total_power_amount: null,
      payment_status: 'UNPAID',
      notes: 'Bảo quản hoa quả tươi xuất khẩu',
      created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    },
    {
      id: 'reefer-demo-002',
      yard_id: '11111111-1111-1111-1111-111111111111',
      container_visit_id: 'cont-004',
      container_no: 'OOLU6543210',
      power_status: 'UNPLUGGED',
      plugged_in_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
      plugged_in_by: 'An ninh Cổng 2',
      unplugged_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      unplugged_by: 'CCKB Trực ca',
      raw_duration_seconds: 4 * 3600,
      billable_minutes: 240,
      applied_hourly_rate: 100000,
      total_power_amount: 400000,
      payment_status: 'PAID',
      notes: 'Đã hoàn tất thanh toán tiền điện',
      created_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    }
  ];

  async getReeferSessions(yardId?: string): Promise<ReeferPowerSession[]> {
    if (!yardId) return this.reeferSessions;
    return this.reeferSessions.filter(s => s.yard_id === yardId);
  }

  async plugInReefer(params: {
    yardId: string;
    containerVisitId: string;
    containerNo: string;
    pluggedInAt?: string;
    operatorId: string;
    notes?: string;
  }): Promise<{ session: ReeferPowerSession | null; error?: string }> {
    // Chống 2 phiên active trên cùng 1 container
    const existing = this.reeferSessions.find(
      s => s.container_visit_id === params.containerVisitId && s.power_status === 'PLUGGED'
    );
    if (existing) {
      return {
        session: null,
        error: `Container ${params.containerNo} hiện đang có một phiên cắm điện chưa rút (Bắt đầu lúc ${new Date(existing.plugged_in_at).toLocaleTimeString()}). Không thể cắm điện trùng lặp.`
      };
    }

    const newSession: ReeferPowerSession = {
      id: `reefer-${Date.now()}`,
      yard_id: params.yardId,
      container_visit_id: params.containerVisitId,
      container_no: params.containerNo,
      power_status: 'PLUGGED',
      plug_socket_code: (params as any).plugSocketCode?.trim() || null,
      plugged_in_at: params.pluggedInAt || new Date().toISOString(),
      plugged_in_by: params.operatorId,
      unplugged_at: null,
      unplugged_by: null,
      raw_duration_seconds: null,
      billable_minutes: null,
      applied_hourly_rate: this.tariffs.find(t => t.code === 'DIEN_CONT_GIO')?.amount || 100000,
      total_power_amount: null,
      payment_status: 'UNPAID',
      notes: params.notes || null,
      created_at: new Date().toISOString(),
    };

    // Cập nhật container liên kết
    const cont = this.containers.find(c => c.id === params.containerVisitId);
    if (cont) {
      cont.is_plugged = true;
      cont.plug_socket_code = (params as any).plugSocketCode?.trim() || null;
      cont.yard_zone = 'KHU_A_REEFER';
    }

    this.reeferSessions.unshift(newSession);
    return { session: newSession };
  }

  async unplugReefer(params: {
    sessionId: string;
    unpluggedAt?: string;
    operatorId: string;
    notes?: string;
  }): Promise<{ session: ReeferPowerSession | null; error?: string }> {
    const session = this.reeferSessions.find(s => s.id === params.sessionId);
    if (!session) {
      return { session: null, error: 'Không tìm thấy phiên cắm điện.' };
    }
    if (session.power_status !== 'PLUGGED') {
      return { session: null, error: `Phiên cắm điện đã ở trạng thái ${session.power_status}.` };
    }

    const unplugTime = params.unpluggedAt ? new Date(params.unpluggedAt) : new Date();
    const plugTime = new Date(session.plugged_in_at);
    const durationSeconds = Math.max(0, Math.floor((unplugTime.getTime() - plugTime.getTime()) / 1000));

    // Ca 0 giây: đưa về PENDING_REVIEW chờ xác minh
    if (durationSeconds <= 0) {
      session.power_status = 'PENDING_REVIEW';
      session.unplugged_at = unplugTime.toISOString();
      session.unplugged_by = params.operatorId;
      session.raw_duration_seconds = 0;
      session.billable_minutes = 0;
      session.total_power_amount = 0;
      session.notes = params.notes ? `${session.notes || ''} [0s: Chờ CCKB xác minh]`.trim() : session.notes;
      return { session };
    }

    // Làm tròn 15 phút
    const billableMinutes = Math.ceil(durationSeconds / 900) * 15;
    const totalAmount = Math.round((billableMinutes / 60) * session.applied_hourly_rate);

    session.power_status = 'UNPLUGGED';
    session.unplugged_at = unplugTime.toISOString();
    session.unplugged_by = params.operatorId;
    session.raw_duration_seconds = durationSeconds;
    session.billable_minutes = billableMinutes;
    session.total_power_amount = totalAmount;
    if (params.notes) session.notes = params.notes;

    // Giải phóng container giắc cắm
    const cont = this.containers.find(c => c.id === session.container_visit_id);
    if (cont) {
      cont.is_plugged = false;
      cont.plug_socket_code = null;
    }

    // Tự động tạo khoản phải thu tiền điện trong sổ cái
    const newCharge: ChargeItem = {
      id: `charge-reefer-${Date.now()}`,
      yard_id: session.yard_id,
      charge_type: 'REEFER',
      title: `Tiền điện Container ${session.container_no} (${billableMinutes} phút)`,
      vehicle_visit_id: null,
      container_visit_id: session.container_visit_id,
      container_no: session.container_no,
      license_plate: null,
      amount: totalAmount,
      paid_amount: 0,
      status: 'UNPAID',
      notes: params.notes || null,
      created_at: new Date().toISOString(),
    };
    this.charges.unshift(newCharge);

    return { session };
  }

  async recordCompletedReeferSession(params: RecordCompletedReeferSessionParams): Promise<{ session: ReeferPowerSession | null; error?: string }> {
    const cont = this.containers.find(c => c.id === params.containerVisitId);
    if (!cont) {
      return { session: null, error: 'Không tìm thấy container.' };
    }

    const plugTime = new Date(params.pluggedInAt);
    const unplugTime = new Date(params.unpluggedAt);
    if (unplugTime.getTime() < plugTime.getTime()) {
      return { session: null, error: 'Thời gian rút điện không thể trước thời gian cắm điện.' };
    }

    const durationSeconds = Math.max(0, Math.floor((unplugTime.getTime() - plugTime.getTime()) / 1000));
    const billableMinutes = durationSeconds <= 0 ? 0 : Math.ceil(durationSeconds / 900) * 15;
    const rate = this.tariffs.find(t => t.code === 'DIEN_CONT_GIO')?.amount || 100000;
    const totalAmount = Math.round((billableMinutes / 60) * rate);
    const status: ReeferPowerStatus = durationSeconds <= 0 ? 'PENDING_REVIEW' : 'UNPLUGGED';

    const session: ReeferPowerSession = {
      id: `session-${Date.now()}`,
      yard_id: params.yardId,
      container_visit_id: params.containerVisitId,
      container_no: params.containerNo || cont.container_no_current,
      power_status: status,
      plugged_in_at: plugTime.toISOString(),
      plugged_in_by: params.operatorId,
      unplugged_at: unplugTime.toISOString(),
      unplugged_by: params.operatorId,
      raw_duration_seconds: durationSeconds,
      billable_minutes: billableMinutes,
      applied_hourly_rate: rate,
      total_power_amount: totalAmount,
      payment_status: 'UNPAID',
      notes: params.notes || 'Ghi nhận hoàn tất Zalo timestamp',
      created_at: new Date().toISOString(),
    };
    this.reeferSessions.unshift(session);

    if (totalAmount > 0) {
      this.charges.unshift({
        id: `charge-reefer-${Date.now()}`,
        yard_id: params.yardId,
        charge_type: 'REEFER',
        title: `Tiền điện Container ${session.container_no} (${billableMinutes} phút - Zalo timestamp)`,
        vehicle_visit_id: null,
        container_visit_id: session.container_visit_id,
        container_no: session.container_no,
        license_plate: null,
        amount: totalAmount,
        paid_amount: 0,
        status: 'UNPAID',
        notes: params.notes || null,
        created_at: new Date().toISOString(),
      });
    }

    this.persist();
    return { session };
  }

  async verifyReeferSessionZalo(params: VerifyReeferSessionZaloParams): Promise<{ success: boolean; error?: string }> {
    const session = this.reeferSessions.find(s => s.id === params.sessionId);
    if (!session) {
      return { success: false, error: 'Không tìm thấy phiên cắm điện.' };
    }

    if (params.status) {
      session.power_status = params.status;
    }

    if (params.adjustedPluggedInAt) session.plugged_in_at = new Date(params.adjustedPluggedInAt).toISOString();
    if (params.adjustedUnpluggedAt) {
      session.unplugged_at = new Date(params.adjustedUnpluggedAt).toISOString();
      session.power_status = 'UNPLUGGED';
      const plugTime = new Date(session.plugged_in_at).getTime();
      const unplugTime = new Date(session.unplugged_at).getTime();
      const durSec = Math.max(0, Math.floor((unplugTime - plugTime) / 1000));
      const billMin = Math.ceil(durSec / 900) * 15;
      const amount = Math.round((billMin / 60) * session.applied_hourly_rate);
      session.raw_duration_seconds = durSec;
      session.billable_minutes = billMin;
      session.total_power_amount = amount;

      const charge = this.charges.find(c => c.reefer_session_id === session.id);
      if (charge && charge.status === 'UNPAID') {
        charge.amount = amount;
      }
    }

    session.notes = `${session.notes || ''} [CCKB xác nhận: ${params.verificationNotes || 'Khớp giờ giắc'}]`.trim();
    this.persist();
    return { success: true };
  }

  private tariffs: TariffItem[] = [
    { id: 'tf-1', code: 'VE_CONT_LANH', name: 'Vé xe container lạnh vào cổng', unit: 'Lượt xe', amount: 250000, is_active: true },
    { id: 'tf-2', code: 'VE_DAU_KEO', name: 'Vé xe đầu kéo không cont', unit: 'Lượt xe', amount: 0, is_active: true },
    { id: 'tf-3', code: 'VE_XE_BO_4_CHAN', name: 'Vé xe bo 4 chân tải thùng', unit: 'Lượt xe', amount: 200000, is_active: true },
    { id: 'tf-4', code: 'VE_XE_BO_3_CHAN', name: 'Vé xe bo 3 chân tải thùng', unit: 'Lượt xe', amount: 200000, is_active: true },
    { id: 'tf-5', code: 'VE_XE_BO_8_TAN', name: 'Vé xe bo 8 tấn (2 chân)', unit: 'Lượt xe', amount: 100000, is_active: true },
    { id: 'tf-6', code: 'VE_XE_BO_3_BANH', name: 'Vé xe bo 3 bánh nội bộ', unit: 'Lượt xe', amount: 40000, is_active: true },
    { id: 'tf-7', code: 'VE_XE_SANG_TAI', name: 'Vé xe sang tải nội bộ', unit: 'Lượt xe', amount: 0, is_active: true },
    { id: 'tf-8', code: 'DIEN_CONT_GIO', name: 'Tiền điện container theo giờ (Làm tròn 15p)', unit: 'Giờ', amount: 100000, is_active: true },
    { id: 'tf-9', code: 'LUU_CONT_DEM', name: 'Phí lưu container qua đêm (22h-06h, miễn đêm đầu)', unit: 'Đêm', amount: 100000, is_active: true },
  ];

  private charges: ChargeItem[] = [
    {
      id: 'charge-001',
      yard_id: '11111111-1111-1111-1111-111111111111',
      charge_type: 'TICKET',
      title: 'Vé vào cổng Xe 14C-123.45 (Xe container lạnh)',
      vehicle_visit_id: 'veh-001',
      container_visit_id: 'cont-001',
      container_no: 'TEMU9182341',
      license_plate: '14C-123.45',
      customer_name: 'Công ty TNHH Vận tải Á Châu',
      customer_phone: '0912345678',
      amount: 250000,
      paid_amount: 0,
      status: 'UNPAID',
      notes: 'Chưa thu vé cổng',
      created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    },
    {
      id: 'charge-002',
      yard_id: '11111111-1111-1111-1111-111111111111',
      charge_type: 'REEFER',
      title: 'Cước cắm điện Container OOLU6543210 — 240 phút',
      vehicle_visit_id: null,
      container_visit_id: 'cont-004',
      container_no: 'OOLU6543210',
      license_plate: '14C-888.99',
      customer_name: 'Nguyễn Văn Tuấn (Chủ hàng Sầu riêng)',
      customer_phone: '0988776655',
      amount: 400000,
      paid_amount: 400000,
      status: 'PAID',
      notes: 'Đã thu bởi CCKB',
      created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    },
    {
      id: 'charge-002b',
      yard_id: '11111111-1111-1111-1111-111111111111',
      charge_type: 'REEFER',
      title: 'Cước cắm điện Container OOLU6543210 — 480 phút (Lần cắm 2)',
      vehicle_visit_id: null,
      container_visit_id: 'cont-004',
      container_no: 'OOLU6543210',
      license_plate: '14C-888.99',
      customer_name: 'Nguyễn Văn Tuấn (Chủ hàng Sầu riêng)',
      customer_phone: '0988776655',
      amount: 800000,
      paid_amount: 0,
      status: 'UNPAID',
      notes: 'Cắm bổ sung giữ nhiệt ban ngày',
      created_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    },
    {
      id: 'charge-002c',
      yard_id: '11111111-1111-1111-1111-111111111111',
      charge_type: 'REEFER',
      title: 'Cước cắm điện Container TEMU9182341 — 600 phút',
      vehicle_visit_id: 'veh-001',
      container_visit_id: 'cont-001',
      container_no: 'TEMU9182341',
      license_plate: '14C-123.45',
      customer_name: 'Công ty TNHH Vận tải Á Châu',
      customer_phone: '0912345678',
      amount: 1000000,
      paid_amount: 0,
      status: 'UNPAID',
      notes: 'Phiên cắm liên tục bảo quản Thanh Long',
      created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    },
    {
      id: 'charge-003',
      yard_id: '11111111-1111-1111-1111-111111111111',
      charge_type: 'STORAGE',
      title: 'Phí lưu bãi Container CMAU5432198 — 1 đêm chịu phí',
      vehicle_visit_id: null,
      container_visit_id: 'cont-003',
      container_no: 'CMAU5432198',
      license_plate: '14C-555.66',
      customer_name: 'Kho lạnh Tà Lùng',
      customer_phone: null,
      amount: 100000,
      paid_amount: 0,
      status: 'UNPAID',
      notes: 'Lưu qua đêm 22h-06h, đêm 2 chịu phí (đêm đầu miễn phí)',
      created_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    }
  ];

  async getCharges(yardId?: string): Promise<ChargeItem[]> {
    if (!yardId) return this.charges;
    return this.charges.filter(c => c.yard_id === yardId);
  }

  async getTariffs(): Promise<TariffItem[]> {
    return this.tariffs;
  }

  async updateTariff(code: string, amount: number, reason?: string): Promise<{ success: boolean; tariff?: TariffItem; error?: string }> {
    const item = this.tariffs.find(t => t.code === code);
    if (!item) {
      return { success: false, error: 'Không tìm thấy mục biểu phí có mã ' + code };
    }
    if (amount < 0) {
      return { success: false, error: 'Đơn giá không được âm.' };
    }
    item.amount = amount;
    this.persist();
    return { success: true, tariff: item };
  }

  async collectPayment(params: CollectPaymentParams): Promise<{ success: boolean; error?: string }> {
    const charge = this.charges.find(c => c.id === params.chargeId);
    if (!charge) {
      return { success: false, error: 'Không tìm thấy khoản thu.' };
    }

    if (charge.status === 'PAID') {
      return { success: false, error: 'Khoản thu đã được thanh toán hoàn tất.' };
    }

    // RBAC V5 GUARD BẮT BUỘC:
    // Tiền điện: Chỉ CCKB được thu (An ninh TUYỆT ĐỐI KHÔNG được thu tiền điện)
    if (charge.charge_type === 'REEFER' && params.operatorDept === 'AN_NINH') {
      return {
        success: false,
        error: 'VI PHẠM PHÂN QUYỀN V5: An ninh TUYỆT ĐỐI KHÔNG được phép thu tiền điện container! Chỉ nhân viên CCKB (reefer.payment.collect) mới có quyền thu.'
      };
    }

    // Phí lưu container: An ninh thu tại cổng khi cont ra (AP07)
    if (charge.charge_type === 'STORAGE' && params.operatorDept !== 'AN_NINH' && params.operatorDept !== 'CCKB') {
      return {
        success: false,
        error: 'Chỉ An ninh hoặc CCKB mới có quyền thu phí lưu container.'
      };
    }

    charge.paid_amount += params.amount;
    if (charge.paid_amount >= charge.amount) {
      charge.status = 'PAID';
    } else {
      charge.status = 'PARTIALLY_PAID';
    }

    const paymentRecord: PaymentRecord = {
      id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      yard_id: charge.yard_id,
      charge_id: charge.id,
      payment_amount: params.amount,
      payment_method: params.paymentMethod || 'CASH',
      collected_by: params.operatorId,
      collected_by_name: params.operatorDept === 'AN_NINH' ? 'An ninh Cổng' : 'Thương vụ CCKB',
      collector_dept: params.operatorDept,
      collected_at: new Date().toISOString(),
      receipt_code: params.receiptCode || `PT-${Date.now().toString().slice(-6)}`,
      notes: params.notes || null,
      charge_type: charge.charge_type,
      charge_title: charge.title,
      license_plate: charge.license_plate,
      container_no: charge.container_no,
    };
    this.payments.unshift(paymentRecord);
    this.persist();

    return { success: true };
  }

  async batchCollectPayments(params: BatchCollectPaymentsParams): Promise<{
    success: boolean;
    collectedCount: number;
    totalAmount: number;
    error?: string;
  }> {
    let collectedCount = 0;
    let totalAmount = 0;

    for (const chgId of params.chargeIds) {
      const charge = this.charges.find(c => c.id === chgId);
      if (!charge || charge.status === 'PAID') continue;

      if (charge.charge_type === 'REEFER' && params.operatorDept === 'AN_NINH') {
        continue;
      }

      const remain = charge.amount - charge.paid_amount;
      if (remain <= 0) continue;

      charge.paid_amount += remain;
      charge.status = 'PAID';

      const paymentRecord: PaymentRecord = {
        id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        yard_id: charge.yard_id,
        charge_id: charge.id,
        payment_amount: remain,
        payment_method: params.paymentMethod,
        collected_by: params.operatorId,
        collected_by_name: params.operatorDept === 'AN_NINH' ? 'An ninh Cổng' : 'Thương vụ CCKB',
        collector_dept: params.operatorDept,
        collected_at: new Date().toISOString(),
        receipt_code: params.receiptCode,
        notes: params.notes || `Thu gộp theo biên lai ${params.receiptCode}`,
        charge_type: charge.charge_type,
        charge_title: charge.title,
        license_plate: charge.license_plate,
        container_no: charge.container_no,
      };

      this.payments.unshift(paymentRecord);
      collectedCount++;
      totalAmount += remain;
    }

    this.persist();
    return { success: true, collectedCount, totalAmount };
  }

  async getPayments(filter?: GetPaymentsFilter): Promise<PaymentRecord[]> {
    let list = [...this.payments];

    if (filter?.yardId) {
      list = list.filter(p => p.yard_id === filter.yardId);
    }
    if (filter?.startDate) {
      list = list.filter(p => new Date(p.collected_at) >= new Date(filter.startDate!));
    }
    if (filter?.endDate) {
      list = list.filter(p => new Date(p.collected_at) <= new Date(filter.endDate!));
    }
    if (filter?.collectorDept && filter.collectorDept !== 'ALL') {
      list = list.filter(p => p.collector_dept === filter.collectorDept);
    }
    if (filter?.paymentMethod && filter.paymentMethod !== 'ALL') {
      list = list.filter(p => p.payment_method === filter.paymentMethod);
    }

    return list.sort((a, b) => new Date(b.collected_at).getTime() - new Date(a.collected_at).getTime());
  }

  async approveClearance(params: ApproveClearanceParams): Promise<{ success: boolean; error?: string }> {
    const cont = this.containers.find(c => c.id === params.containerId);
    if (!cont) {
      return { success: false, error: 'Không tìm thấy container.' };
    }

    if (cont.status !== 'IN_YARD') {
      return { success: false, error: `Container không ở trong bãi (Trạng thái: ${cont.status}).` };
    }

    // Kiểm tra xem container có đang cắm điện không
    const isPlugged = this.reeferSessions.some(
      s => s.container_visit_id === params.containerId && s.power_status === 'PLUGGED'
    );
    if (isPlugged) {
      return {
        success: false,
        error: `Container ${cont.container_no_current} đang có phiên cắm điện chưa rút! Bắt buộc phải rút điện trước khi duyệt clearance.`
      };
    }

    cont.clearance_status = params.allowDebt ? 'CLEARED_WITH_DEBT' : 'CLEARED';
    cont.cleared_at = new Date().toISOString();
    cont.cleared_by = params.operatorId;
    cont.clearance_notes = params.notes || null;
    this.persist();

    return { success: true };
  }

  async confirmPhysicalExit(params: ConfirmExitParams): Promise<{ 
    success: boolean; 
    storageFee: number; 
    chargedNights: number; 
    error?: string;
  }> {
    const cont = this.containers.find(c => c.id === params.containerId);
    if (!cont) {
      return { success: false, storageFee: 0, chargedNights: 0, error: 'Không tìm thấy container.' };
    }

    if (cont.status !== 'IN_YARD') {
      return { success: false, storageFee: 0, chargedNights: 0, error: 'Container không ở trong bãi.' };
    }

    // Kiểm tra cắm điện reefer: Chỉ container CÓ phát sinh cắm điện mới bắt buộc CCKB duyệt
    const hasReeferActivity = this.reeferSessions.some(s => s.container_visit_id === cont.id) ||
                              this.charges.some(c => c.container_visit_id === cont.id && c.charge_type === 'REEFER');

    if (hasReeferActivity) {
      if (!cont.clearance_status || (cont.clearance_status !== 'CLEARED' && cont.clearance_status !== 'CLEARED_WITH_DEBT')) {
        return { 
          success: false, 
          storageFee: 0, 
          chargedNights: 0, 
          error: 'Container có phát sinh cắm điện nhưng chưa được bộ phận CCKB duyệt clearance! Vui lòng liên hệ CCKB duyệt trước khi cho xe ra bãi.' 
        };
      }
    } else {
      // Container không phát sinh cắm điện: Miễn duyệt CCKB
      if (!cont.clearance_status || cont.clearance_status === 'PENDING') {
        cont.clearance_status = 'CLEARED';
        cont.clearance_notes = 'Miễn duyệt CCKB (Không phát sinh cắm điện)';
      }
    }

    const now = new Date();
    const feeInfo = calculateStorageFeeOffline(cont.inbound_at, now.toISOString());
    const storageFee = feeInfo.fee;
    const chargedNights = feeInfo.chargedNights;

    // Rào chắn thu phí lưu bãi (đồng bộ tuyệt đối với Migration 008)
    if (storageFee > 0 && !params.paidAtGate) {
      if (cont.clearance_status !== 'CLEARED_WITH_DEBT') {
        return {
          success: false,
          storageFee,
          chargedNights,
          error: `Container phát sinh phí lưu bãi ${storageFee.toLocaleString()}đ (${chargedNights} đêm) chưa thanh toán! Bắt buộc thu tiền tại cổng (paidAtGate = true) hoặc cần CCKB duyệt cho nợ (CLEARED_WITH_DEBT).`
        };
      }
    }

    cont.status = 'EXITED';
    cont.outbound_at = now.toISOString();
    cont.storage_fee_amount = storageFee;
    cont.storage_nights_charged = chargedNights;

    const isPaid = storageFee > 0 && params.paidAtGate;
    cont.storage_fee_payment_status = storageFee === 0 ? 'EXEMPT' : (isPaid ? 'PAID' : 'UNPAID');

    // Tạo khoản phí lưu bãi vào sổ cái
    if (storageFee > 0) {
      const newCharge: ChargeItem = {
        id: `charge-storage-${Date.now()}`,
        yard_id: cont.yard_id,
        charge_type: 'STORAGE',
        title: `Phí lưu bãi Container ${cont.container_no_current} (${chargedNights} đêm chịu phí)`,
        vehicle_visit_id: null,
        container_visit_id: cont.id,
        container_no: cont.container_no_current,
        license_plate: null,
        amount: storageFee,
        paid_amount: isPaid ? storageFee : 0,
        status: isPaid ? 'PAID' : 'UNPAID',
        notes: isPaid ? `Đã thu tại cổng (${params.paymentMethod || 'CASH'})` : `Ghi nợ theo ngoại lệ AP06 (${chargedNights} đêm x 100.000đ)`,
        created_at: now.toISOString(),
      };
      this.charges.unshift(newCharge);
    }

    // Nếu có yêu cầu thu vé vào cổng cho xe chở cont ra (khi xe vào cổng chưa trả)
    if (params.collectEntryTicket && params.outboundVehicleId) {
      await this.collectVehicleEntryTicket({
        vehicleId: params.outboundVehicleId,
        paymentMethod: params.entryTicketPaymentMethod || 'CASH',
        receiptCode: params.entryTicketReceiptCode,
        operatorId: params.operatorId,
        notes: 'Thu vé cổng lúc xe kéo container xuất bãi',
      });
    }

    this.persist();
    return { success: true, storageFee, chargedNights };
  }

  async calculateStorageFee(inboundAt: string, outboundAt?: string): Promise<{
    totalNights: number;
    chargedNights: number;
    fee: number;
  }> {
    return calculateStorageFeeOffline(inboundAt, outboundAt);
  }

  async confirmVehicleOnlyExit(params: ConfirmVehicleOnlyExitParams): Promise<{ success: boolean; error?: string }> {
    const veh = this.vehicles.find(v => v.id === params.vehicleId);
    if (!veh) return { success: false, error: 'Không tìm thấy lượt xe' };
    if (veh.status !== 'IN_YARD') return { success: false, error: `Xe không ở trong bãi (${veh.status})` };

    // Nếu xe có cont mang vào trong bãi, đánh dấu cont đã hạ bãi lưu kho độc lập (không chặn xe ra một mình)
    const activeConts = this.containers.filter(c => c.inbound_vehicle_visit_id === veh.id && c.status === 'IN_YARD');
    if (activeConts.length > 0) {
      activeConts.forEach(c => {
        c.notes = (c.notes ? `${c.notes} | ` : '') + `Xe kéo ${veh.license_plate || 'đầu kéo'} xuất bãi dạng xe riêng. Container đã hạ bãi lưu kho.`;
      });
    }

    // Thu tiền vé vào cổng tại Cổng ra nếu xe chưa thanh toán
    if (params.collectEntryTicket && veh.ticket_payment_status === 'UNPAID') {
      await this.collectVehicleEntryTicket({
        vehicleId: veh.id,
        paymentMethod: params.entryTicketPaymentMethod || 'CASH',
        receiptCode: params.entryTicketReceiptCode,
        operatorId: params.operatorId,
        notes: 'Thu vé cổng lúc xe xuất bãi',
      });
    }

    veh.status = 'EXITED';
    veh.exit_at = new Date().toISOString();
    veh.exit_by = params.operatorId;
    if (params.notes) veh.note = veh.note ? `${veh.note} | ${params.notes}` : params.notes;

    this.persist();
    return { success: true };
  }

  async getContainerNumberChanges(containerId: string): Promise<ContainerNumberChange[]> {

    return this.numberChanges.filter(c => c.container_visit_id === containerId);
  }

  async correctContainerNumber(params: CorrectContainerNumberParams): Promise<{ success: boolean; error?: string }> {
    const cont = this.containers.find(c => c.id === params.containerId);
    if (!cont) {
      return { success: false, error: 'Không tìm thấy container.' };
    }

    const cleanNewNo = params.newNumber.trim().toUpperCase();
    if (!cleanNewNo || cleanNewNo.length < 4) {
      return { success: false, error: 'Số container mới không hợp lệ (tối thiểu 4 ký tự).' };
    }

    if (cleanNewNo === cont.container_no_current) {
      return { success: false, error: 'Số mới trùng với số container hiện tại. Không cần thay đổi.' };
    }

    // Kiểm tra trùng số với container khác đang IN_YARD
    const isDup = this.containers.some(
      c => c.id !== cont.id && c.container_no_current === cleanNewNo && c.status === 'IN_YARD'
    );
    if (isDup) {
      return {
        success: false,
        error: `Cảnh báo: Container ${cleanNewNo} hiện đang có một lượt lưu bãi khác trong cùng bãi. Không tự động gộp lượt!`
      };
    }

    if (!params.reason.trim() || params.reason.trim().length < 3) {
      return { success: false, error: 'Lý do sửa số container là bắt buộc (tối thiểu 3 ký tự).' };
    }

    const changeRecord: ContainerNumberChange = {
      id: this.numberChanges.length + 1,
      container_visit_id: cont.id,
      yard_id: cont.yard_id,
      old_number: cont.container_no_current,
      new_number: cleanNewNo,
      reason: params.reason.trim(),
      evidence_url: params.evidenceUrl || null,
      changed_by: params.operatorId,
      changed_by_name: params.operatorName,
      changed_at: new Date().toISOString(),
    };

    this.numberChanges.unshift(changeRecord);

    // Cập nhật số container trên lượt xe
    cont.container_no_current = cleanNewNo;
    cont.number_changes_count = (cont.number_changes_count || 0) + 1;

    // Đồng bộ số container mới trong các phiên điện và sổ thu liên quan (Bảo toàn ID)
    this.reeferSessions.forEach(s => {
      if (s.container_visit_id === cont.id) s.container_no = cleanNewNo;
    });
    this.charges.forEach(ch => {
      if (ch.container_visit_id === cont.id) ch.container_no = cleanNewNo;
    });

    this.persist();
    return { success: true };
  }

  async getVehiclePlateChanges(vehicleId: string): Promise<VehiclePlateChange[]> {
    return this.plateChanges.filter(c => c.vehicle_visit_id === vehicleId);
  }

  async correctVehiclePlate(params: CorrectVehiclePlateParams): Promise<{ success: boolean; error?: string }> {
    const veh = this.vehicles.find(v => v.id === params.vehicleId);
    if (!veh) {
      return { success: false, error: 'Không tìm thấy lượt xe.' };
    }

    const cleanNewPlate = params.newLicensePlate.trim().toUpperCase();
    if (!cleanNewPlate || cleanNewPlate.length < 3) {
      return { success: false, error: 'Biển số xe mới không hợp lệ (tối thiểu 3 ký tự).' };
    }

    if (cleanNewPlate === veh.license_plate?.trim().toUpperCase()) {
      return { success: false, error: 'Biển số mới trùng với biển số xe hiện tại. Không cần thay đổi.' };
    }

    if (!params.reason.trim() || params.reason.trim().length < 3) {
      return { success: false, error: 'Lý do sửa biển số xe là bắt buộc (tối thiểu 3 ký tự).' };
    }

    const oldPlate = veh.license_plate || '—';
    const changeRecord: VehiclePlateChange = {
      id: `vpc-${Date.now()}-${this.plateChanges.length + 1}`,
      vehicle_visit_id: veh.id,
      yard_id: veh.yard_id,
      old_plate: oldPlate,
      new_plate: cleanNewPlate,
      reason: params.reason.trim(),
      changed_by: params.operatorId,
      changed_by_name: params.operatorName,
      changed_at: new Date().toISOString(),
    };

    this.plateChanges.unshift(changeRecord);

    // Cập nhật biển số xe trên lượt xe
    veh.license_plate = cleanNewPlate;
    veh.plate_changes_count = (veh.plate_changes_count || 0) + 1;
    if (params.reason) {
      veh.note = veh.note ? `${veh.note} | Sửa biển: ${params.reason.trim()}` : `Sửa biển: ${params.reason.trim()}`;
    }

    // Đồng bộ biển số xe trên container đi kèm nếu có
    this.containers.forEach(c => {
      if (c.inbound_vehicle_visit_id === veh.id) {
        c.inbound_license_plate = cleanNewPlate;
      }
    });

    // Đồng bộ biển số xe trong sổ cái các khoản thu
    this.charges.forEach(ch => {
      if (ch.vehicle_visit_id === veh.id) {
        ch.license_plate = cleanNewPlate;
      }
    });

    this.persist();
    return { success: true };
  }

  async getReeferRequests(yardId?: string): Promise<ReeferRequest[]> {
    if (yardId) {
      return this.reeferRequests.filter(r => r.yard_id === yardId);
    }
    return this.reeferRequests;
  }

  async createReeferRequest(params: {
    yardId: string;
    containerNo?: string;
    containerNoPlanned?: string;
    containerVisitId?: string;
    status?: ReeferRequestStatus;
    expectedLicensePlate?: string;
    customerName?: string;
    customerPhone?: string;
    cargoType?: string;
    powerMode?: 'HOURLY' | 'CONTINUOUS';
    expectedHours?: number;
    targetTemperature?: string;
    temperatureSetting?: string;
    notes?: string;
    operatorId?: string;
    createdBy?: string;
  }): Promise<{ id?: string; error?: string }> {
    const contNo = (params.containerNo || params.containerNoPlanned || '').trim().toUpperCase();
    const reqStatus = params.status || (params.containerVisitId ? 'CONTAINER_ARRIVED' : 'PLANNED');
    const nowIso = new Date().toISOString();

    const newReq: ReeferRequest = {
      id: `req-${Date.now()}`,
      yard_id: params.yardId,
      container_no: contNo,
      container_no_planned: contNo,
      expected_license_plate: params.expectedLicensePlate?.trim().toUpperCase() || null,
      customer_name: params.customerName?.trim() || null,
      customer_phone: params.customerPhone?.trim() || null,
      cargo_type: params.cargoType?.trim() || null,
      power_mode: params.powerMode || 'HOURLY',
      expected_hours: params.expectedHours || (params.powerMode === 'HOURLY' ? 8 : null),
      target_temperature: params.targetTemperature?.trim() || params.temperatureSetting?.trim() || null,
      temperature_setting: params.temperatureSetting?.trim() || params.targetTemperature?.trim() || null,
      status: reqStatus,
      container_visit_id: params.containerVisitId || null,
      arrived_at: reqStatus === 'CONTAINER_ARRIVED' || reqStatus === 'PLUGGED' ? nowIso : undefined,
      plugged_at: reqStatus === 'PLUGGED' ? nowIso : undefined,
      notes: params.notes?.trim() || null,
      created_by: params.createdBy || params.operatorId || 'demo-user',
      created_at: nowIso,
    };
    this.reeferRequests.unshift(newReq);
    this.persist();
    return { id: newReq.id };
  }

  async matchReeferRequest(params: {
    requestId: string;
    containerVisitId?: string;
    status?: 'PLANNED' | 'CONTAINER_ARRIVED' | 'PLUGGED' | 'COMPLETED' | 'CANCELLED';
  }): Promise<{ success: boolean; error?: string }> {
    const req = this.reeferRequests.find(r => r.id === params.requestId);
    if (!req) return { success: false, error: 'Không tìm thấy yêu cầu điện.' };
    if (params.containerVisitId) {
      req.container_visit_id = params.containerVisitId;
    }
    req.status = params.status || 'CONTAINER_ARRIVED';
    if (req.status === 'CONTAINER_ARRIVED' && !req.arrived_at) {
      req.arrived_at = new Date().toISOString();
    } else if (req.status === 'PLUGGED' && !req.plugged_at) {
      req.plugged_at = new Date().toISOString();
    } else if (req.status === 'COMPLETED' && !req.completed_at) {
      req.completed_at = new Date().toISOString();
    }
    this.persist();
    return { success: true };
  }

  async updateReeferRequest(params: UpdateReeferRequestParams): Promise<{ success: boolean; error?: string }> {
    const req = this.reeferRequests.find(r => r.id === params.requestId);
    if (!req) return { success: false, error: 'Không tìm thấy yêu cầu điện.' };

    if (params.containerNoPlanned !== undefined) {
      req.container_no_planned = params.containerNoPlanned.trim().toUpperCase();
      req.container_no = req.container_no_planned;
    }
    if (params.expectedLicensePlate !== undefined) {
      req.expected_license_plate = params.expectedLicensePlate.trim().toUpperCase() || null;
    }
    if (params.customerName !== undefined) {
      req.customer_name = params.customerName.trim() || null;
    }
    if (params.customerPhone !== undefined) {
      req.customer_phone = params.customerPhone.trim() || null;
    }
    if (params.powerMode !== undefined) {
      req.power_mode = params.powerMode;
    }
    if (params.temperatureSetting !== undefined) {
      req.temperature_setting = params.temperatureSetting.trim() || null;
      req.target_temperature = req.temperature_setting;
    }
    if (params.status !== undefined) {
      req.status = params.status;
    }
    if (params.notes !== undefined) {
      req.notes = params.notes.trim() || null;
    }

    this.persist();
    return { success: true };
  }

  async checkVehicleDuplicate(licensePlate: string, vehicleType?: string, yardId?: string): Promise<VehicleDuplicateCheckResult> {
    const cleanPlate = licensePlate.trim().toUpperCase();
    if (!cleanPlate || cleanPlate.length < 2) {
      return { has_duplicate: false, can_proceed: true };
    }

    if (this.duplicatePolicy.policy_mode === 'ALLOW_SILENT') {
      return { has_duplicate: false, can_proceed: true, policy_mode: 'ALLOW_SILENT' };
    }

    const dupVeh = this.vehicles.find(
      v => (!yardId || v.yard_id === yardId) && 
           v.license_plate?.trim().toUpperCase() === cleanPlate && 
           v.status === 'IN_YARD'
    );

    if (!dupVeh) {
      return { has_duplicate: false, can_proceed: true, policy_mode: this.duplicatePolicy.policy_mode };
    }

    const entryTime = new Date(dupVeh.entry_at).getTime();
    const nowTime = Date.now();
    const durationMins = Math.max(1, Math.round((nowTime - entryTime) / (60 * 1000)));
    const durationHours = Math.round((durationMins / 60) * 10) / 10;
    const durationDisplay = durationMins < 60 ? `${durationMins} phút` : `${durationHours} giờ (${durationMins} phút)`;

    const isWithinCooldown = durationMins < this.duplicatePolicy.cooldown_minutes;
    const isExempt = (vehicleType && this.duplicatePolicy.exempt_vehicle_types.includes(vehicleType)) ||
                     this.duplicatePolicy.exempt_vehicle_types.includes(dupVeh.vehicle_type);
    const hasUnpaidTicket = this.duplicatePolicy.check_unpaid_ticket && 
                            (dupVeh.ticket_amount || 0) > 0 && 
                            dupVeh.ticket_payment_status === 'UNPAID';

    let canProceed = true;
    let requiresOverride = false;
    let blockReason: string | undefined = undefined;

    if (isWithinCooldown && this.duplicatePolicy.cooldown_action === 'BLOCK') {
      canProceed = false;
      blockReason = `Xe vừa mới vào bãi cách đây ${durationMins} phút (dưới ngưỡng tối thiểu ${this.duplicatePolicy.cooldown_minutes} phút). Nghi vấn nhập lặp hoặc nhấp đúp.`;
    } else if (this.duplicatePolicy.policy_mode === 'BLOCK_STRICT' && !isExempt) {
      canProceed = false;
      blockReason = `Chính sách bến bãi đang Chặn nghiêm ngặt: Biển số ${cleanPlate} hiện đang có lượt trong bãi. Yêu cầu làm thủ tục xuất bãi tại Cổng ra trước.`;
    } else if (hasUnpaidTicket && this.duplicatePolicy.block_if_unpaid_ticket) {
      canProceed = false;
      blockReason = `Xe còn nợ vé vào cổng lượt trước (${dupVeh.ticket_amount?.toLocaleString('vi-VN')} đ). Yêu cầu thanh toán trước khi tiếp nhận lượt mới.`;
    } else {
      canProceed = true;
      if (this.duplicatePolicy.policy_mode === 'WARN_AND_ALLOW' || isWithinCooldown || hasUnpaidTicket) {
        requiresOverride = true;
      }
    }

    const message = blockReason || 
      `Phát hiện biển số ${cleanPlate} đang có 1 lượt trong bãi (Vào lúc ${new Date(dupVeh.entry_at).toLocaleTimeString('vi-VN')} ${new Date(dupVeh.entry_at).toLocaleDateString('vi-VN')}, đã đỗ ${durationDisplay}).`;

    return {
      has_duplicate: true,
      can_proceed: canProceed,
      requires_override: requiresOverride,
      requires_reason: this.duplicatePolicy.require_override_reason,
      allow_quick_exit: this.duplicatePolicy.allow_quick_exit_previous,
      is_within_cooldown: isWithinCooldown,
      cooldown_minutes: this.duplicatePolicy.cooldown_minutes,
      is_exempt_type: isExempt,
      has_unpaid_ticket: hasUnpaidTicket,
      policy_mode: this.duplicatePolicy.policy_mode,
      block_reason: blockReason,
      message,
      existing_visit: {
        id: dupVeh.id,
        license_plate: dupVeh.license_plate,
        vehicle_type: dupVeh.vehicle_type,
        entry_at: dupVeh.entry_at,
        duration_minutes: durationMins,
        duration_display: durationDisplay,
        ticket_code: dupVeh.ticket_code,
        ticket_amount: dupVeh.ticket_amount,
        ticket_payment_status: dupVeh.ticket_payment_status,
        driver_name: dupVeh.driver_name,
        driver_phone: dupVeh.driver_phone,
        note: dupVeh.note,
      },
      preset_reasons: this.duplicatePolicy.preset_reasons,
    };
  }

  async getVehicleDuplicatePolicy(yardId?: string): Promise<VehicleDuplicatePolicy | null> {
    return { ...this.duplicatePolicy };
  }

  async updateVehicleDuplicatePolicy(params: Partial<VehicleDuplicatePolicy> & { yard_id: string }): Promise<{ success: boolean; policy?: VehicleDuplicatePolicy; error?: string }> {
    this.duplicatePolicy = {
      ...this.duplicatePolicy,
      ...params,
      updated_at: new Date().toISOString(),
    };
    this.persist();
    return { success: true, policy: { ...this.duplicatePolicy } };
  }

  async getYardZones(): Promise<YardZoneInfo[]> {
    return [...this.yardZones];
  }

  async createYardZone(zone: YardZoneInfo): Promise<{ success: boolean; error?: string }> {
    const cleanCode = zone.code.trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, error: 'Mã phân khu không được để trống.' };
    }
    if (this.yardZones.some(z => z.code === cleanCode)) {
      return { success: false, error: `Mã phân khu "${cleanCode}" đã tồn tại trên hệ thống.` };
    }
    this.yardZones.push({
      ...zone,
      code: cleanCode,
      name: zone.name.trim(),
      description: zone.description ? zone.description.trim() : '',
      capacity: Number(zone.capacity) || 0,
      has_power_outlets: Boolean(zone.has_power_outlets),
      color_badge: zone.color_badge || 'bg-slate-100 text-slate-800 border-slate-300',
    });
    this.persist();
    return { success: true };
  }

  async updateYardZone(code: string, zoneUpdate: Partial<YardZoneInfo>): Promise<{ success: boolean; error?: string }> {
    const idx = this.yardZones.findIndex(z => z.code === code);
    if (idx === -1) {
      return { success: false, error: `Không tìm thấy phân khu "${code}".` };
    }
    this.yardZones[idx] = {
      ...this.yardZones[idx],
      ...zoneUpdate,
      name: zoneUpdate.name !== undefined ? zoneUpdate.name.trim() : this.yardZones[idx].name,
      description: zoneUpdate.description !== undefined ? (zoneUpdate.description ? zoneUpdate.description.trim() : '') : this.yardZones[idx].description,
      capacity: zoneUpdate.capacity !== undefined ? (Number(zoneUpdate.capacity) || 0) : this.yardZones[idx].capacity,
      has_power_outlets: zoneUpdate.has_power_outlets !== undefined ? Boolean(zoneUpdate.has_power_outlets) : this.yardZones[idx].has_power_outlets,
      color_badge: zoneUpdate.color_badge !== undefined ? zoneUpdate.color_badge : this.yardZones[idx].color_badge,
    };
    this.persist();
    return { success: true };
  }

  async deleteYardZone(code: string): Promise<{ success: boolean; error?: string }> {
    const hasVehicles = this.vehicles.some(v => v.yard_zone === code && v.status === 'IN_YARD');
    const hasContainers = this.containers.some(c => c.yard_zone === code && c.status === 'IN_YARD');
    if (hasVehicles || hasContainers) {
      return { 
        success: false, 
        error: `Không thể xóa phân khu "${code}" vì vẫn còn ${hasVehicles ? 'xe' : ''} ${hasContainers ? 'container' : ''} đang đỗ tại phân khu này. Vui lòng chuyển vị trí trước khi xóa!` 
      };
    }
    this.yardZones = this.yardZones.filter(z => z.code !== code);
    this.persist();
    return { success: true };
  }

  async updateVehicleLocation(params: { vehicleId: string; yardZone?: string; slotCode?: string }): Promise<{ success: boolean; error?: string }> {
    const veh = this.vehicles.find(v => v.id === params.vehicleId);
    if (!veh) return { success: false, error: 'Không tìm thấy xe.' };
    veh.yard_zone = params.yardZone;
    veh.slot_code = params.slotCode;
    this.persist();
    return { success: true };
  }

  async updateContainerLocation(params: { containerId: string; yardZone?: string; slotCode?: string }): Promise<{ success: boolean; error?: string }> {
    const cont = this.containers.find(c => c.id === params.containerId);
    if (!cont) return { success: false, error: 'Không tìm thấy container.' };
    cont.yard_zone = params.yardZone;
    cont.slot_code = params.slotCode;
    this.persist();
    return { success: true };
  }

  async recordReeferTemperatureLog(params: Omit<ReeferTemperatureLog, 'id'>): Promise<{ success: boolean; error?: string }> {
    const newLog: ReeferTemperatureLog = {
      ...params,
      id: `temp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      logged_at: params.logged_at || new Date().toISOString(),
    };
    this.temperatureLogs.unshift(newLog);
    this.persist();
    return { success: true };
  }

  async getReeferTemperatureLogs(containerVisitId?: string): Promise<ReeferTemperatureLog[]> {
    if (containerVisitId) {
      return this.temperatureLogs.filter(l => l.container_visit_id === containerVisitId);
    }
    return [...this.temperatureLogs];
  }

  async getExitedVehicles(yardId?: string, limit: number = 50): Promise<VehicleVisit[]> {
    let list = this.vehicles.filter(v => v.status === 'EXITED');
    if (yardId) {
      list = list.filter(v => v.yard_id === yardId);
    }
    return list.slice(0, limit);
  }

  async adjustVehicleVisit(params: AdjustVehicleVisitParams): Promise<{ success: boolean; vehicle?: VehicleVisit; error?: string }> {
    if (!['SEC_LEAD', 'SYS_ADMIN'].includes(params.operatorRole)) {
      return {
        success: false,
        error: 'Từ chối truy cập: Chỉ Ca trưởng An ninh (SEC_LEAD) hoặc Quản trị viên (SYS_ADMIN) mới có quyền hiệu chỉnh lượt xe!',
      };
    }

    if (!params.reason || params.reason.trim().length < 5) {
      return {
        success: false,
        error: 'Bắt buộc nhập lý do hiệu chỉnh ca trực tối thiểu 5 ký tự để lưu vết kiểm toán!',
      };
    }

    const veh = this.vehicles.find(v => v.id === params.vehicleId);
    if (!veh) {
      return { success: false, error: 'Không tìm thấy thông tin lượt xe trong hệ thống.' };
    }

    // Hiệu chỉnh giờ vào (Backdate)
    if (params.entryAt) {
      veh.entry_at = params.entryAt;
      // Đồng bộ giờ vào cho các container đi kèm xe này
      this.containers
        .filter(c => c.inbound_vehicle_visit_id === veh.id)
        .forEach(c => {
          c.inbound_at = params.entryAt!;
        });
    }

    // Hiệu chỉnh giờ ra
    if (params.exitAt !== undefined) {
      veh.exit_at = params.exitAt;
    }

    // Hiệu chỉnh trạng thái lượt xe
    if (params.status) {
      veh.status = params.status;
      if (params.status === 'IN_YARD') {
        veh.exit_at = null;
      } else if (params.status === 'EXITED' && !veh.exit_at) {
        veh.exit_at = params.exitAt || new Date().toISOString();
      }
    }

    // Hiệu chỉnh loại xe
    if (params.vehicleType) {
      veh.vehicle_type = params.vehicleType;
      const vt = SEED_VEHICLE_TYPES_V5.find(t => t.code === params.vehicleType);
      veh.vehicle_type_name = vt ? vt.name : params.vehicleType;
      if (params.ticketAmount !== undefined) {
        veh.ticket_amount = params.ticketAmount;
      } else if (vt) {
        veh.ticket_amount = vt.default_ticket_amount;
      }
    }

    // Hiệu chỉnh tiền vé
    if (params.ticketAmount !== undefined) {
      veh.ticket_amount = params.ticketAmount;
    }

    // Hiệu chỉnh trạng thái thanh toán vé
    if (params.ticketPaymentStatus) {
      veh.ticket_payment_status = params.ticketPaymentStatus;

      // Xử lý Hủy vé / Hoàn tiền
      if (params.ticketPaymentStatus === 'CANCELLED') {
        const ticketCharge = this.charges.find(c => c.vehicle_visit_id === veh.id && c.charge_type === 'TICKET');
        if (ticketCharge) {
          ticketCharge.status = 'CANCELLED';
          ticketCharge.notes = `${ticketCharge.notes || ''} [HỦY VÉ/HOÀN TIỀN: ${params.refundReason || params.reason}]`.trim();
        }
      } else if (params.ticketPaymentStatus === 'PAID') {
        let ticketCharge = this.charges.find(c => c.vehicle_visit_id === veh.id && c.charge_type === 'TICKET');
        const amount = params.ticketAmount !== undefined ? params.ticketAmount : (veh.ticket_amount || 250000);
        const payMethod = params.paymentMethod || 'CASH';

        if (ticketCharge) {
          ticketCharge.status = 'PAID';
          ticketCharge.amount = amount;
          ticketCharge.paid_amount = amount;
          ticketCharge.notes = `${ticketCharge.notes || ''} [Hiệu chỉnh ca trực: Thu vé (${payMethod}) bởi ${params.operatorName}]`.trim();
        } else {
          ticketCharge = {
            id: `charge-ticket-${Date.now()}`,
            yard_id: veh.yard_id,
            charge_type: 'TICKET',
            title: `Vé vào cổng phương tiện ${veh.license_plate || veh.vehicle_type}`,
            vehicle_visit_id: veh.id,
            container_visit_id: null,
            container_no: null,
            license_plate: veh.license_plate,
            amount,
            paid_amount: amount,
            status: 'PAID',
            notes: `Hiệu chỉnh ca trực: Thu vé (${payMethod}) bởi ${params.operatorName}`,
            created_at: new Date().toISOString(),
          };
          this.charges.unshift(ticketCharge);
        }

        // Cập nhật hoặc tạo bản ghi sổ thu app_payments
        const existingPayment = this.payments.find(p => p.charge_id === ticketCharge!.id);
        if (existingPayment) {
          existingPayment.payment_method = payMethod;
          existingPayment.payment_amount = amount;
          existingPayment.notes = `${existingPayment.notes || ''} [Đổi hình thức thu sang ${payMethod} bởi ${params.operatorName}]`.trim();
        } else {
          this.payments.unshift({
            id: `pay-ticket-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            yard_id: veh.yard_id,
            charge_id: ticketCharge.id,
            payment_amount: amount,
            payment_method: payMethod,
            collected_by: params.operatorId,
            collected_by_name: params.operatorName,
            collector_dept: 'AN_NINH',
            collected_at: new Date().toISOString(),
            receipt_code: veh.ticket_code || `VE-${Date.now().toString().slice(-6)}`,
            notes: `Thu vé cổng bởi ${params.operatorName} (Hiệu chỉnh ca trực)`,
            charge_type: 'TICKET',
            charge_title: ticketCharge.title,
            license_plate: veh.license_plate,
          });
        }
      }
    }

    // Xử lý container đi kèm nếu có yêu cầu (khi đổi sang xe không chở cont)
    if (params.containerAction && params.containerAction !== 'KEEP') {
      const attachedConts = this.containers.filter(c => c.inbound_vehicle_visit_id === veh.id && c.status === 'IN_YARD');
      if (params.containerAction === 'CANCEL') {
        attachedConts.forEach(c => {
          c.status = 'CANCELLED';
          c.notes = (c.notes ? `${c.notes} | ` : '') + 
            `HỦY CONTAINER bởi ${params.operatorName} (${params.operatorRole}) do hiệu chỉnh xe không chở cont: ${params.containerActionReason || params.reason}`;
        });
      } else if (params.containerAction === 'DETACH') {
        attachedConts.forEach(c => {
          c.inbound_vehicle_visit_id = null;
          c.notes = (c.notes ? `${c.notes} | ` : '') + 
            `TÁCH THÀNH CONT TỒN BÃI HẠ BÃI ĐỘC LẬP do xe ${veh.license_plate} hiệu chỉnh: ${params.containerActionReason || params.reason}`;
        });
      }
    }

    // Hiệu chỉnh tài xế
    if (params.driverName !== undefined) veh.driver_name = params.driverName;
    if (params.driverPhone !== undefined) veh.driver_phone = params.driverPhone;

    // Ghi vết audit log vào note của xe
    const auditNote = `[Hiệu chỉnh ca trực ${new Date().toLocaleString('vi-VN')} bởi ${params.operatorName} (${params.operatorRole})]: ${params.reason}${params.refundReason ? ` (Hủy/hoàn tiền: ${params.refundReason})` : ''}`;
    veh.note = veh.note ? `${veh.note} | ${auditNote}` : auditNote;

    this.persist();
    return { success: true, vehicle: { ...veh } };
  }

  async collectVehicleEntryTicket(params: {
    vehicleId: string;
    paymentMethod: 'CASH' | 'BANK_TRANSFER';
    receiptCode?: string;
    operatorId: string;
    notes?: string;
  }): Promise<{ success: boolean; error?: string }> {
    const veh = this.vehicles.find(v => v.id === params.vehicleId);
    if (!veh) return { success: false, error: 'Không tìm thấy lượt xe' };

    veh.ticket_payment_status = 'PAID';
    const audit = `Thu vé cổng tại Cổng ra (${params.paymentMethod === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'}${params.receiptCode ? ` - BL: ${params.receiptCode}` : ''})`;
    veh.note = veh.note ? `${veh.note} | ${audit}` : audit;

    let ticketCharge = this.charges.find(c => c.vehicle_visit_id === veh.id && c.charge_type === 'TICKET');
    const amount = veh.ticket_amount || 250000;
    if (ticketCharge) {
      ticketCharge.status = 'PAID';
      ticketCharge.paid_amount = ticketCharge.amount;
      ticketCharge.notes = (ticketCharge.notes ? `${ticketCharge.notes} | ` : '') + audit;
    } else {
      ticketCharge = {
        id: `charge-ticket-${Date.now()}`,
        yard_id: veh.yard_id,
        charge_type: 'TICKET',
        title: `Vé vào cổng phương tiện ${veh.license_plate || veh.vehicle_type}`,
        vehicle_visit_id: veh.id,
        container_visit_id: null,
        container_no: null,
        license_plate: veh.license_plate,
        amount,
        paid_amount: amount,
        status: 'PAID',
        notes: audit,
        created_at: new Date().toISOString(),
      };
      this.charges.unshift(ticketCharge);
    }

    const paymentRecord: PaymentRecord = {
      id: `pay-ticket-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      yard_id: veh.yard_id,
      charge_id: ticketCharge.id,
      payment_amount: amount,
      payment_method: params.paymentMethod === 'CASH' ? 'CASH' : 'TRANSFER',
      collected_by: params.operatorId,
      collected_by_name: 'An ninh Cổng ra',
      collector_dept: 'AN_NINH',
      collected_at: new Date().toISOString(),
      receipt_code: params.receiptCode || `VE-RA-${Date.now().toString().slice(-6)}`,
      notes: params.notes || audit,
      charge_type: 'TICKET',
      charge_title: ticketCharge.title,
      license_plate: veh.license_plate,
      container_no: null,
    };
    this.payments.unshift(paymentRecord);
    this.persist();
    return { success: true };
  }

  async getCustomers(): Promise<Customer[]> {
    return [...this.customers];
  }

  async createCustomer(params: { name: string; phone?: string; tax_code?: string; address?: string; notes?: string }): Promise<{
    success: boolean;
    customer?: Customer;
    error?: string;
  }> {
    const trimmedName = params.name.trim();
    if (!trimmedName) {
      return { success: false, error: 'Tên khách hàng không được để trống' };
    }
    const existing = this.customers.find(c => c.name.toLowerCase() === trimmedName.toLowerCase());
    if (existing) {
      return { success: true, customer: existing };
    }
    const newCust: Customer = {
      id: `cust-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: trimmedName,
      phone: params.phone?.trim() || null,
      tax_code: params.tax_code?.trim() || null,
      address: params.address?.trim() || null,
      notes: params.notes?.trim() || null,
      is_active: true,
      created_at: new Date().toISOString()
    };
    this.customers.unshift(newCust);
    this.persist();
    return { success: true, customer: newCust };
  }

  async updateCustomer(customer: Partial<Customer> & { id: string }): Promise<{
    success: boolean;
    customer?: Customer;
    error?: string;
  }> {
    const idx = this.customers.findIndex(c => c.id === customer.id);
    if (idx === -1) {
      return { success: false, error: 'Không tìm thấy khách hàng cần cập nhật' };
    }
    const updated: Customer = {
      ...this.customers[idx],
      name: customer.name !== undefined ? customer.name.trim() : this.customers[idx].name,
      phone: customer.phone !== undefined ? (customer.phone ? customer.phone.trim() : null) : this.customers[idx].phone,
      tax_code: customer.tax_code !== undefined ? (customer.tax_code ? customer.tax_code.trim() : null) : this.customers[idx].tax_code,
      address: customer.address !== undefined ? (customer.address ? customer.address.trim() : null) : this.customers[idx].address,
      notes: customer.notes !== undefined ? (customer.notes ? customer.notes.trim() : null) : this.customers[idx].notes,
      is_active: customer.is_active !== undefined ? customer.is_active : this.customers[idx].is_active,
      updated_at: new Date().toISOString()
    };
    this.customers[idx] = updated;
    this.persist();
    return { success: true, customer: updated };
  }

  async deleteCustomer(id: string): Promise<{ success: boolean; error?: string }> {
    const idx = this.customers.findIndex(c => c.id === id);
    if (idx === -1) {
      return { success: false, error: 'Không tìm thấy khách hàng' };
    }
    this.customers.splice(idx, 1);
    this.persist();
    return { success: true };
  }

  async getStaffUsers(): Promise<StaffUser[]> {
    return [...this.staffUsers];
  }

  async createStaffUser(user: Partial<StaffUser>): Promise<{ success: boolean; user?: StaffUser; error?: string }> {
    const fullName = user.full_name?.trim();
    const email = user.email?.trim().toLowerCase();
    if (!fullName) return { success: false, error: 'Họ và tên nhân viên không được để trống' };
    if (!email) return { success: false, error: 'Email nhân viên không được để trống' };

    const existing = this.staffUsers.find(u => u.email.toLowerCase() === email);
    if (existing) {
      return { success: false, error: `Email "${email}" đã tồn tại trong danh sách nhân sự` };
    }

    const newUser: StaffUser = {
      id: user.id || `staff-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      full_name: fullName,
      email: email,
      phone: user.phone?.trim() || null,
      role_code: user.role_code || 'SEC_STAFF',
      role_name: user.role_name || `Vai trò ${user.role_code || 'SEC_STAFF'}`,
      department_code: user.department_code || 'AN_NINH',
      department_name: user.department_name || 'Bộ phận An ninh & Bảo vệ',
      yard_id: user.yard_id || 'fe83bb2b-833e-412c-aed4-b9a781a6decd',
      yard_name: user.yard_name || 'Bãi Sơn Cảng',
      is_active: user.is_active !== undefined ? user.is_active : true,
      notes: user.notes?.trim() || null,
      created_at: new Date().toISOString()
    };
    this.staffUsers.unshift(newUser);
    this.persist();
    return { success: true, user: newUser };
  }

  async updateStaffUser(user: Partial<StaffUser> & { id: string }): Promise<{ success: boolean; user?: StaffUser; error?: string }> {
    const idx = this.staffUsers.findIndex(u => u.id === user.id);
    if (idx === -1) {
      return { success: false, error: 'Không tìm thấy nhân viên cần cập nhật' };
    }
    const current = this.staffUsers[idx];
    const updated: StaffUser = {
      ...current,
      full_name: user.full_name !== undefined ? user.full_name.trim() : current.full_name,
      email: user.email !== undefined ? user.email.trim().toLowerCase() : current.email,
      phone: user.phone !== undefined ? (user.phone ? user.phone.trim() : null) : current.phone,
      role_code: user.role_code || current.role_code,
      role_name: user.role_name || current.role_name,
      department_code: user.department_code || current.department_code,
      department_name: user.department_name || current.department_name,
      yard_id: user.yard_id !== undefined ? user.yard_id : current.yard_id,
      yard_name: user.yard_name !== undefined ? user.yard_name : current.yard_name,
      is_active: user.is_active !== undefined ? user.is_active : current.is_active,
      notes: user.notes !== undefined ? (user.notes ? user.notes.trim() : null) : current.notes,
      updated_at: new Date().toISOString()
    };
    this.staffUsers[idx] = updated;
    this.persist();
    return { success: true, user: updated };
  }

  async toggleStaffUserStatus(id: string, isActive: boolean): Promise<{ success: boolean; error?: string }> {
    const idx = this.staffUsers.findIndex(u => u.id === id);
    if (idx === -1) {
      return { success: false, error: 'Không tìm thấy nhân viên' };
    }
    this.staffUsers[idx].is_active = isActive;
    this.staffUsers[idx].updated_at = new Date().toISOString();
    this.persist();
    return { success: true };
  }

  async deleteStaffUser(id: string): Promise<{ success: boolean; error?: string }> {
    const idx = this.staffUsers.findIndex(u => u.id === id);
    if (idx === -1) {
      return { success: false, error: 'Không tìm thấy nhân viên' };
    }
    this.staffUsers.splice(idx, 1);
    this.persist();
    return { success: true };
  }

  async adminResetStaffPassword(params: {
    staffId: string;
    newPassword: string;
    reason: string;
    mustChangePassword?: boolean;
  }): Promise<{ success: boolean; message?: string; error?: string }> {
    const user = this.staffUsers.find(u => u.id === params.staffId);
    if (!user) {
      return { success: false, error: 'Không tìm thấy nhân sự' };
    }
    user.password_reset_at = new Date().toISOString();
    user.must_change_password = params.mustChangePassword !== false;
    user.temp_password_hint = params.newPassword;
    this.persist();
    return { success: true, message: `Đã đặt lại mật khẩu cho ${user.full_name} thành công` };
  }

  async recordPasswordChangeAudit(email: string, reason?: string): Promise<{ success: boolean; error?: string }> {
    const user = this.staffUsers.find(u => u.email === email);
    if (user) {
      user.must_change_password = false;
      user.temp_password_hint = undefined;
      this.persist();
    }
    return { success: true };
  }

  async getPowerSockets(zoneCode?: string): Promise<PowerSocket[]> {
    if (!zoneCode || zoneCode === 'ALL') {
      return [...this.powerSockets];
    }
    return this.powerSockets.filter(s => s.zone_code === zoneCode);
  }

  async createPowerSocket(params: {
    socketCode: string;
    socketName: string;
    zoneCode?: string;
    voltage?: string;
    amperage?: string;
    phase?: string;
    notes?: string;
  }): Promise<{ success: boolean; socket?: PowerSocket; error?: string }> {
    const cleanCode = params.socketCode.trim().toUpperCase();
    if (this.powerSockets.some(s => s.socket_code === cleanCode)) {
      return { success: false, error: `Mã trụ điện ${cleanCode} đã tồn tại` };
    }
    const newSocket: PowerSocket = {
      id: `socket-${Date.now()}-${cleanCode}`,
      socket_code: cleanCode,
      socket_name: params.socketName.trim() || `Trụ điện ${cleanCode}`,
      zone_code: params.zoneCode || 'KHU_A_REEFER',
      voltage: params.voltage || '380V',
      amperage: params.amperage || '32A',
      phase: params.phase || '3_PHASE',
      status: 'AVAILABLE',
      notes: params.notes?.trim() || null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.powerSockets.push(newSocket);
    this.powerSockets.sort((a, b) => a.socket_code.localeCompare(b.socket_code));
    this.persist();
    return { success: true, socket: newSocket };
  }

  async updatePowerSocket(
    socketCode: string,
    params: Partial<{
      socketName: string;
      zoneCode: string;
      voltage: string;
      amperage: string;
      phase: string;
      status: PowerSocketStatus;
      notes: string;
      isActive: boolean;
    }>
  ): Promise<{ success: boolean; socket?: PowerSocket; error?: string }> {
    const idx = this.powerSockets.findIndex(s => s.socket_code === socketCode);
    if (idx === -1) {
      return { success: false, error: `Không tìm thấy trụ điện ${socketCode}` };
    }
    const cur = this.powerSockets[idx];
    const updated: PowerSocket = {
      ...cur,
      socket_name: params.socketName !== undefined ? params.socketName.trim() : cur.socket_name,
      zone_code: params.zoneCode || cur.zone_code,
      voltage: params.voltage || cur.voltage,
      amperage: params.amperage || cur.amperage,
      phase: params.phase || cur.phase,
      status: params.status || cur.status,
      notes: params.notes !== undefined ? params.notes?.trim() || null : cur.notes,
      is_active: params.isActive !== undefined ? params.isActive : cur.is_active,
      updated_at: new Date().toISOString(),
    };
    this.powerSockets[idx] = updated;
    this.persist();
    return { success: true, socket: updated };
  }

  async deletePowerSocket(socketCode: string): Promise<{ success: boolean; error?: string }> {
    const idx = this.powerSockets.findIndex(s => s.socket_code === socketCode);
    if (idx === -1) {
      return { success: false, error: `Không tìm thấy trụ điện ${socketCode}` };
    }
    // Không cho xóa trụ đang cắm điện
    if (this.powerSockets[idx].status === 'IN_USE') {
      return { success: false, error: `Không thể xóa trụ ${socketCode} vì đang có container cắm điện!` };
    }
    this.powerSockets.splice(idx, 1);
    this.persist();
    return { success: true };
  }

  async setPowerSocketStatus(
    socketCode: string,
    status: PowerSocketStatus,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    const idx = this.powerSockets.findIndex(s => s.socket_code === socketCode);
    if (idx === -1) {
      return { success: false, error: `Không tìm thấy trụ điện ${socketCode}` };
    }
    this.powerSockets[idx].status = status;
    if (notes !== undefined) {
      this.powerSockets[idx].notes = notes;
    }
    this.powerSockets[idx].updated_at = new Date().toISOString();
    this.persist();
    return { success: true };
  }

  async getRoles(): Promise<AppRole[]> {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('soncang_v5_roles');
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return [
      { code: 'SEC_STAFF', name: 'Nhân viên An ninh Cổng', department_code: 'AN_NINH', description: 'Trực ca bốt cổng vào & cổng ra', is_active: true, permissions_count: 26 },
      { code: 'SEC_LEAD', name: 'Trưởng bộ phận An ninh', department_code: 'AN_NINH', description: 'Giám sát ca trực an ninh, duyệt điều chỉnh', is_active: true, permissions_count: 31 },
      { code: 'PORT_STAFF', name: 'Nhân viên Thương vụ CCKB', department_code: 'CCKB', description: 'Quản lý yêu cầu điện, thu tiền điện container', is_active: true, permissions_count: 31 },
      { code: 'PORT_LEAD', name: 'Trưởng bộ phận CCKB', department_code: 'CCKB', description: 'Trưởng ca CCKB, phê duyệt công nợ và clearance', is_active: true, permissions_count: 38 },
      { code: 'DIS_STAFF', name: 'Nhân viên Điều phối Bãi', department_code: 'DIEU_PHOI', description: 'Cập nhật tình trạng HÀNG/RỖNG hiện trường', is_active: true, permissions_count: 9 },
      { code: 'DIS_LEAD', name: 'Trưởng bộ phận Điều phối', department_code: 'DIEU_PHOI', description: 'Trưởng ca điều phối bến bãi', is_active: true, permissions_count: 11 },
      { code: 'SYS_ADMIN', name: 'Quản trị viên Hệ thống', department_code: 'HE_THONG', description: 'Toàn quyền cấu hình, tài khoản và audit logs', is_active: true, permissions_count: 60 }
    ];
  }

  async createRole(role: { code: string; name: string; department_code: string; description?: string }): Promise<{ success: boolean; role?: AppRole; error?: string }> {
    const list = await this.getRoles();
    const cleanCode = role.code.toUpperCase().trim();
    if (list.some(r => r.code === cleanCode)) {
      return { success: false, error: `Mã vai trò "${cleanCode}" đã tồn tại!` };
    }
    const newRole: AppRole = {
      code: cleanCode,
      name: role.name.trim(),
      department_code: role.department_code as any,
      description: role.description || '',
      is_active: true,
      permissions_count: 0
    };
    list.push(newRole);
    if (typeof window !== 'undefined') {
      localStorage.setItem('soncang_v5_roles', JSON.stringify(list));
    }
    return { success: true, role: newRole };
  }

  async updateRole(role: { code: string; name: string; department_code: string; description?: string; is_active?: boolean }): Promise<{ success: boolean; role?: AppRole; error?: string }> {
    const list = await this.getRoles();
    const idx = list.findIndex(r => r.code === role.code);
    if (idx !== -1) {
      list[idx] = {
        ...list[idx],
        name: role.name.trim(),
        department_code: role.department_code as any,
        description: role.description !== undefined ? role.description : list[idx].description,
        is_active: role.is_active !== undefined ? role.is_active : list[idx].is_active
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem('soncang_v5_roles', JSON.stringify(list));
      }
      return { success: true, role: list[idx] };
    }
    return { success: false, error: 'Không tìm thấy vai trò' };
  }

  async getRolePermissions(roleCode?: string): Promise<AppRolePermission[]> {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('soncang_v5_role_perms');
      if (saved) {
        try {
          const all: AppRolePermission[] = JSON.parse(saved);
          return roleCode ? all.filter(p => p.role_code === roleCode) : all;
        } catch {}
      }
    }
    return [];
  }

  async toggleRolePermission(roleCode: string, permissionCode: string, isEnabled: boolean, scope: string = 'ALL'): Promise<{ success: boolean; error?: string }> {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('soncang_v5_role_perms');
      let all: AppRolePermission[] = saved ? JSON.parse(saved) : [];
      if (isEnabled) {
        const existing = all.find(p => p.role_code === roleCode && p.permission_code === permissionCode);
        if (existing) {
          existing.is_enabled = true;
          existing.scope = scope;
        } else {
          all.push({ role_code: roleCode, permission_code: permissionCode, scope, is_enabled: true });
        }
      } else {
        all = all.filter(p => !(p.role_code === roleCode && p.permission_code === permissionCode));
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('soncang_v5_role_perms', JSON.stringify(all));
      }
      return { success: true };
    }
    return { success: false, error: 'Chỉ hỗ trợ trên client' };
  }

  // ==============================================================================
  // PHÂN HỆ KẾ TOÁN (ACCOUNTING SUB-SYSTEM) - DEMO MODE
  // ==============================================================================

  async getCashSettlements(): Promise<CashSettlement[]> {
    return [...this.cashSettlements];
  }

  async getUnsettledCashPayments(dept?: string): Promise<PaymentRecord[]> {
    const settledIds = new Set(this.settlementItems.map(i => i.payment_id));
    return this.payments.filter(p => {
      if (p.payment_method !== 'CASH') return false;
      if (settledIds.has(p.id)) return false;
      if (dept && dept !== 'ALL' && p.collector_dept !== dept) return false;
      return true;
    });
  }

  async confirmCashSettlement(params: ConfirmSettlementParams): Promise<{ success: boolean; settlement?: CashSettlement; error?: string }> {
    const expectedPayments = await this.getUnsettledCashPayments(params.handoverDept);
    const expectedCash = expectedPayments.reduce((sum, p) => sum + p.payment_amount, 0);
    const transferPayments = this.payments.filter(p => 
      p.payment_method !== 'CASH' && 
      (params.handoverDept === 'ALL' || p.collector_dept === params.handoverDept) &&
      new Date(p.collected_at) >= new Date(params.periodFrom) &&
      new Date(p.collected_at) <= new Date(params.periodTo)
    );
    const totalTransfer = transferPayments.reduce((sum, p) => sum + p.payment_amount, 0);
    const diff = params.totalCashCounted - expectedCash;

    const code = `BB-${new Date().toISOString().substring(0, 10).replace(/-/g, '')}-${String(this.cashSettlements.length + 1).padStart(3, '0')}-${params.handoverDept}`;
    const newSettlement: CashSettlement = {
      id: `settle-${Date.now()}`,
      settlement_code: code,
      collector_name: 'Bùi Thị Lan (Kế toán)',
      handover_dept: params.handoverDept,
      period_from: params.periodFrom,
      period_to: params.periodTo,
      total_cash_expected: expectedCash,
      total_cash_counted: params.totalCashCounted,
      difference_amount: diff,
      total_transfer_amount: totalTransfer,
      difference_reason: params.differenceReason || null,
      handover_person_name: params.handoverPersonName,
      notes: params.notes || null,
      status: 'COMPLETED',
      created_at: new Date().toISOString(),
      item_count: expectedPayments.length,
    };

    this.cashSettlements.unshift(newSettlement);

    // Link items
    for (const p of expectedPayments) {
      this.settlementItems.push({
        id: `item-${Date.now()}-${p.id}`,
        settlement_id: newSettlement.id,
        payment_id: p.id,
        settled_amount: p.payment_amount,
        payment_method: p.payment_method,
        created_at: new Date().toISOString()
      });
    }

    this.persist();
    return { success: true, settlement: newSettlement };
  }

  async getYardInvoices(status?: string): Promise<YardInvoice[]> {
    if (status && status !== 'ALL') {
      return this.yardInvoices.filter(inv => inv.status === status);
    }
    return [...this.yardInvoices];
  }

  async getInvoicableCharges(): Promise<ChargeItem[]> {
    const uninvoiced = this.charges.filter(c => 
      c.status === 'PAID' && 
      (!c.invoice_status || c.invoice_status === 'UNINVOICED')
    );
    return uninvoiced.map(c => {
      const veh = c.vehicle_visit_id ? this.vehicles.find(v => v.id === c.vehicle_visit_id) : undefined;
      const cont = c.container_visit_id ? this.containers.find(ct => ct.id === c.container_visit_id) : undefined;
      return {
        ...c,
        license_plate: veh?.license_plate || undefined,
        container_no: cont?.container_no_current || undefined,
        customer_name: veh?.driver_name || undefined
      };
    });
  }

  async createYardInvoice(params: CreateInvoiceParams): Promise<{ success: boolean; invoice?: YardInvoice; error?: string }> {
    const selectedCharges = this.charges.filter(c => params.chargeIds.includes(c.id));
    const totalAmount = selectedCharges.reduce((sum, c) => sum + c.amount, 0);
    const vatRate = params.vatRate || 8;
    const subtotal = Math.round(totalAmount / (1 + vatRate / 100));
    const vat = totalAmount - subtotal;

    const code = `HD-${new Date().toISOString().substring(0, 10).replace(/-/g, '')}-${String(this.yardInvoices.length + 1).padStart(4, '0')}`;
    const newInvoice: YardInvoice = {
      id: `inv-${Date.now()}`,
      invoice_code: code,
      invoice_type: params.invoiceType,
      buyer_name: params.buyerName,
      tax_code: params.taxCode || null,
      id_card_no: params.idCardNo || null,
      buyer_address: params.buyerAddress,
      buyer_email: params.buyerEmail || null,
      buyer_phone: params.buyerPhone || null,
      vat_rate: vatRate,
      subtotal_amount: subtotal,
      vat_amount: vat,
      total_amount: totalAmount,
      status: 'PREPARED',
      payment_status: 'PAID',
      notes: params.notes || null,
      created_by: params.createdBy || 'Bùi Thị Lan (Kế toán)',
      charge_ids: params.chargeIds,
      created_at: new Date().toISOString()
    };

    this.yardInvoices.unshift(newInvoice);

    // Update charges
    for (const c of selectedCharges) {
      c.invoice_status = 'PREPARED';
      c.invoice_id = newInvoice.id;
    }

    this.persist();
    return { success: true, invoice: newInvoice };
  }

  async issueYardInvoice(invoiceId: string, eInvoiceNo: string, issuedAt?: string, notes?: string): Promise<{ success: boolean; error?: string }> {
    const inv = this.yardInvoices.find(i => i.id === invoiceId);
    if (!inv) return { success: false, error: 'Không tìm thấy hóa đơn' };

    inv.status = 'INVOICED';
    inv.e_invoice_no = eInvoiceNo;
    inv.invoice_issued_at = issuedAt || new Date().toISOString();
    if (notes) inv.notes = notes;

    for (const cid of inv.charge_ids) {
      const c = this.charges.find(ch => ch.id === cid);
      if (c) c.invoice_status = 'INVOICED';
    }

    this.persist();
    return { success: true };
  }

  async getAccountingDebts(): Promise<AccountingDebtItem[]> {
    const unpaidCharges = this.charges.filter(c => c.status === 'UNPAID' || c.status === 'PARTIALLY_PAID');
    return unpaidCharges.map(c => {
      const veh = c.vehicle_visit_id ? this.vehicles.find(v => v.id === c.vehicle_visit_id) : undefined;
      const cont = c.container_visit_id ? this.containers.find(ct => ct.id === c.container_visit_id) : undefined;
      const total = c.amount;
      const paid = c.paid_amount || 0;
      return {
        id: c.id,
        charge_id: c.id,
        customer_name: veh?.driver_name || 'Khách hàng vãng lai',
        customer_phone: veh?.driver_phone || null,
        container_no: cont?.container_no_current || null,
        license_plate: veh?.license_plate || null,
        charge_type: c.charge_type,
        charge_title: c.notes || 'Khoản nợ cước bến bãi',
        total_amount: total,
        paid_amount: paid,
        debt_amount: total - paid,
        cleared_at: c.created_at,
        guarantor_name: 'Trưởng ca duyệt AP07',
        notes: c.notes
      };
    });
  }

  async collectAccountingDebt(params: CollectAccountingDebtParams): Promise<{ success: boolean; paymentId?: string; error?: string }> {
    const chg = this.charges.find(c => c.id === params.chargeId);
    if (!chg) return { success: false, error: 'Không tìm thấy khoản nợ' };

    const paymentId = `pay-acc-${Date.now()}`;
    const newPayment: PaymentRecord = {
      id: paymentId,
      yard_id: chg.yard_id,
      charge_id: chg.id,
      payment_amount: params.amount,
      payment_method: params.paymentMethod,
      collected_by: '20000000-0000-0000-0000-000000000050',
      collected_by_name: 'Bùi Thị Lan (Kế toán)',
      collector_dept: 'KE_TOAN',
      collected_at: new Date().toISOString(),
      receipt_code: params.receiptCode || null,
      notes: params.notes || 'Kế toán thu nợ bến bãi'
    };

    this.payments.unshift(newPayment);

    chg.paid_amount = (chg.paid_amount || 0) + params.amount;
    if (chg.paid_amount >= chg.amount) {
      chg.status = 'PAID';
    } else {
      chg.status = 'PARTIALLY_PAID';
    }

    this.persist();
    return { success: true, paymentId };
  }

  resetDemoData() {
    this.vehicles = [...INITIAL_DEMO_VEHICLES];
    this.containers = [...INITIAL_DEMO_CONTAINERS];
    this.numberChanges = [];
    this.plateChanges = [];
    this.reeferRequests = [];
    this.temperatureLogs = [...INITIAL_DEMO_TEMP_LOGS];
    this.customers = [...INITIAL_DEMO_CUSTOMERS];
    this.staffUsers = [...INITIAL_DEMO_STAFF_USERS];
    this.powerSockets = [...INITIAL_DEMO_POWER_SOCKETS];
    this.persist();
  }
}

export const demoRepository = new DemoRepository();
