/**
 * Domain Types chuẩn V5 — Phần mềm quản lý bến bãi/cảng cạn Sơn Cảng
 * Đối chiếu: Workbook V5, Migration 002 (RBAC), Migration 004 (Domain Vehicles & Containers)
 */

import { RoleCode, DepartmentCode } from './auth.types';

// 7 loại phương tiện chuẩn V5 đã được khởi tạo trong app_vehicle_types (Migration 004)
export type VehicleTypeCode =
  | 'CONT_LANH'             // Xe container lạnh/khô có hàng (allows_container: true, 250.000đ)
  | 'DAU_KEO'               // Xe đầu kéo không cont (allows_container: false, 0đ - miễn phí)
  | 'XE_BO_4_CHAN'          // Xe bơ 4 chân (allows_container: false, 200.000đ)
  | 'XE_BO_3_CHAN'          // Xe bơ 3 chân (allows_container: false, 200.000đ)
  | 'XE_BO_8_TAN_2_CHAN'    // Xe bơ 8 tấn (2 chân) (allows_container: false, 100.000đ)
  | 'XE_BO_3_BANH'          // Xe bò 3 bánh (allows_container: false, 40.000đ)
  | 'XE_SANG_TAI';          // Xe sang tải (allows_container: false, 0đ - miễn phí)


export interface VehicleType {
  code: string;
  name: string;
  description: string | null;
  default_ticket_amount: number | null; // null = chưa thiết lập giá; 0 = miễn phí hợp lệ
  allows_container: boolean;
  is_active: boolean;
  sort_order: number;
}

export type VehicleVisitStatus = 'IN_YARD' | 'EXITED' | 'CANCELLED';

// Trạng thái thanh toán vé xe cổng chuẩn:
// - UNPAID: Chưa thu tiền (mặc định cho các loại xe có phí)
// - PAID: Đã thu tiền (chỉ khi có nghiệp vụ xác nhận thu tiền)
// - EXEMPT: Miễn phí hợp lệ (cho xe có phí = 0đ như DAU_KEO)
// - CANCELLED: Đã hủy
export type TicketPaymentStatus = 'UNPAID' | 'PAID' | 'EXEMPT' | 'CANCELLED';

export interface VehicleVisit {
  id: string;
  yard_id: string;
  vehicle_type: string;
  vehicle_type_name?: string;
  license_plate: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  ticket_code: string | null;
  ticket_amount: number | null;
  ticket_payment_status: TicketPaymentStatus;
  status: VehicleVisitStatus;
  entry_at: string;
  entry_by: string;
  entry_by_name?: string;
  exit_at: string | null;
  exit_by: string | null;
  note: string | null;
  idempotency_key: string | null;
  containers?: ContainerVisit[];
  plate_changes_count?: number;
  is_duplicate_entry?: boolean;
  previous_visit_id?: string | null;
  duplicate_override_reason?: string | null;
  duplicate_override_by?: string | null;
  yard_zone?: string | null;
  slot_code?: string | null;
}

export type DuplicatePolicyMode = 'BLOCK_STRICT' | 'WARN_AND_ALLOW' | 'AUTO_CLOSE_PREVIOUS' | 'ALLOW_SILENT';

export interface VehicleDuplicatePolicy {
  id: string;
  yard_id: string;
  policy_mode: DuplicatePolicyMode;
  cooldown_minutes: number;
  cooldown_action: 'BLOCK' | 'WARN';
  check_unpaid_ticket: boolean;
  block_if_unpaid_ticket: boolean;
  require_override_reason: boolean;
  allow_quick_exit_previous: boolean;
  exempt_vehicle_types: string[];
  preset_reasons: { code: string; label: string }[];
  updated_at?: string;
  updated_by?: string;
}

export interface VehicleDuplicateCheckResult {
  has_duplicate: boolean;
  can_proceed: boolean;
  requires_override?: boolean;
  requires_reason?: boolean;
  allow_quick_exit?: boolean;
  is_within_cooldown?: boolean;
  cooldown_minutes?: number;
  is_exempt_type?: boolean;
  has_unpaid_ticket?: boolean;
  policy_mode?: DuplicatePolicyMode;
  block_reason?: string;
  message?: string;
  existing_visit?: {
    id: string;
    license_plate: string | null;
    vehicle_type: string;
    entry_at: string;
    duration_minutes: number;
    duration_display: string;
    ticket_code?: string | null;
    ticket_amount?: number | null;
    ticket_payment_status?: TicketPaymentStatus;
    driver_name?: string | null;
    driver_phone?: string | null;
    note?: string | null;
  };
  preset_reasons?: { code: string; label: string }[];
}

export type ContainerVisitStatus = 'IN_YARD' | 'EXITED' | 'CANCELLED';

// Trạng thái hàng hóa container trong bãi:
// - CHUA_XAC_DINH: Mặc định ban đầu khi An ninh tiếp nhận (chỉ ghi nhận vỏ)
// - HANG: Điều phối viên xác nhận có hàng
// - RONG: Điều phối viên xác nhận vỏ rỗng
export type CargoStatus = 'HANG' | 'RONG' | 'CHUA_XAC_DINH';

// Chỉ cho phép cập nhật sang HANG hoặc RONG theo chữ ký RPC sc_update_container_cargo
export type CargoStatusUpdate = 'HANG' | 'RONG';

export interface ContainerVisit {
  id: string;
  yard_id: string;
  container_no_current: string;
  container_no_original: string;
  container_size: string | null;
  container_type: string | null;
  status: ContainerVisitStatus;
  cargo_status: CargoStatus;
  inbound_vehicle_visit_id: string | null;
  inbound_license_plate?: string | null;
  inbound_at: string;
  outbound_at: string | null;
  created_at: string;
  created_by: string;
  created_by_name?: string;
  number_changes_count: number;
  clearance_status?: 'PENDING' | 'CLEARED' | 'CLEARED_WITH_DEBT' | 'REJECTED';
  clearance_notes?: string | null;
  cleared_at?: string | null;
  cleared_by?: string | null;
  storage_fee_amount?: number;
  storage_fee_payment_status?: 'UNPAID' | 'PAID' | 'EXEMPT';
  storage_nights_charged?: number;
  yard_zone?: string | null;
  slot_code?: string | null;
  is_plugged?: boolean;
  plug_socket_code?: string | null;
  notes?: string | null;
}

export interface YardZoneInfo {
  code: string;
  name: string;
  description?: string | null;
  capacity: number;
  has_power_outlets: boolean;
  power_outlets_count?: number;
  color_badge: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  tax_code?: string | null;
  address?: string | null;
  notes?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ReeferTemperatureLog {
  id: string;
  session_id?: string;
  container_visit_id: string;
  container_no: string;
  temperature_celsius: number;
  cooling_status: 'RUNNING_NORMAL' | 'TEMPERATURE_WARNING' | 'TEMP_WARNING' | 'POWER_OFF' | 'POWER_TRIP' | 'DEFROST' | 'SYSTEM_ERROR';
  logged_at: string;
  logged_by: string;
  logged_by_name?: string;
  notes?: string;
}

export interface VietQrConfig {
  bankId: string;
  bankName: string;
  accountNo: string;
  accountName: string;
}

export interface ContainerNumberChange {
  id: number;
  container_visit_id: string;
  yard_id: string;
  old_number: string;
  new_number: string;
  reason: string;
  evidence_url: string | null;
  changed_by: string;
  changed_by_name?: string;
  changed_at: string;
}

export interface VehiclePlateChange {
  id: string | number;
  vehicle_visit_id: string;
  yard_id: string;
  old_plate: string;
  new_plate: string;
  reason: string;
  changed_by: string;
  changed_by_name?: string;
  changed_at: string;
}


export type ReeferPowerStatus = 'PLUGGED' | 'UNPLUGGED' | 'CANCELLED' | 'PENDING_REVIEW';

export type ReeferRequestStatus = 'PLANNED' | 'CONTAINER_ARRIVED' | 'PLUGGED' | 'COMPLETED' | 'CANCELLED';

export interface ReeferRequest {
  id: string;
  yard_id: string;
  container_no: string;
  container_no_planned?: string;
  expected_license_plate?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  cargo_type?: string | null;
  target_temperature?: string | null;
  temperature_setting?: string | null;
  power_mode: 'HOURLY' | 'CONTINUOUS';
  expected_hours?: number | null;
  status: ReeferRequestStatus;
  container_visit_id?: string | null;
  matched_container_visit_id?: string | null;
  plug_socket_code?: string | null;
  notes?: string | null;
  created_by: string;
  created_by_name?: string;
  created_at: string;
  arrived_at?: string | null;
  plugged_at?: string | null;
  completed_at?: string | null;
}

export interface ReeferPowerSession {
  id: string;
  yard_id: string;
  container_visit_id: string;
  container_no: string;
  power_status: ReeferPowerStatus;
  plug_socket_code?: string | null;
  plugged_in_at: string;
  plugged_in_by: string;
  unplugged_at: string | null;
  unplugged_by: string | null;
  raw_duration_seconds: number | null;
  billable_minutes: number | null;
  applied_hourly_rate: number;
  total_power_amount: number | null;
  payment_status: TicketPaymentStatus;
  notes: string | null;
  created_at: string;
}

export type ChargeType = 'TICKET' | 'REEFER' | 'STORAGE' | 'OTHER';
export type ChargeStatus = 'UNPAID' | 'PAID' | 'PARTIALLY_PAID' | 'EXEMPT' | 'CANCELLED';

export interface ChargeItem {
  id: string;
  yard_id: string;
  charge_type: ChargeType;
  title: string;
  vehicle_visit_id: string | null;
  container_visit_id: string | null;
  container_no?: string | null;
  reefer_session_id?: string | null;
  license_plate?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  amount: number;
  paid_amount: number;
  status: ChargeStatus;
  notes: string | null;
  created_at: string;
}

export interface PaymentRecord {
  id: string;
  yard_id: string;
  charge_id: string;
  payment_amount: number;
  payment_method: 'CASH' | 'TRANSFER' | 'OTHER';
  collected_by: string;
  collected_by_name?: string;
  collector_dept: 'AN_NINH' | 'CCKB';
  collected_at: string;
  receipt_code: string | null;
  notes: string | null;
  // Các trường liên kết mở rộng để đối soát báo cáo ca trực:
  charge_type?: ChargeType;
  charge_title?: string;
  license_plate?: string | null;
  container_no?: string | null;
}

export type ShiftType = 'SHIFT_1' | 'SHIFT_2' | 'SHIFT_3' | 'SHIFT_12H_DAY' | 'SHIFT_12H_NIGHT' | 'CUSTOM';

export interface ShiftReportBreakdown {
  ticketAmount: number;
  ticketCount: number;
  reeferAmount: number;
  reeferCount: number;
  storageAmount: number;
  storageCount: number;
  penaltyAmount: number;
  penaltyCount: number;
  otherAmount: number;
  otherCount: number;
}

export interface ShiftTrafficStats {
  inboundVehicleCount: number;
  outboundVehicleCount: number;
  reeferSessionCount: number;
}

export interface ShiftHandoverData {
  shiftName: string;
  shiftCode: ShiftType;
  dateStr: string;
  startTime: string;
  endTime: string;
  totalRevenue: number;
  totalCash: number;
  totalTransfer: number;
  totalOther: number;
  breakdown: ShiftReportBreakdown;
  traffic: ShiftTrafficStats;
  payments: PaymentRecord[];
}

export interface TariffItem {
  id: string;
  code: string;
  name: string;
  unit: string;
  amount: number;
  is_active: boolean;
}

export interface StaffUser {
  id: string;
  auth_user_id?: string | null;
  full_name: string;
  email: string;
  phone?: string | null;
  role_code: RoleCode;
  role_name?: string;
  department_code: DepartmentCode;
  department_name?: string;
  yard_id?: string | null;
  yard_name?: string;
  is_active: boolean;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type PowerSocketStatus = 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'FAULTY';

export interface PowerSocket {
  id: string;
  socket_code: string;
  socket_name: string;
  zone_code: string;
  yard_id?: string | null;
  voltage: string;
  amperage: string;
  phase: string;
  status: PowerSocketStatus;
  notes?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AppRole {
  code: string;
  name: string;
  department_code: DepartmentCode;
  department_name?: string;
  description: string;
  is_active: boolean;
  permissions_count?: number;
  created_at?: string;
}

export interface AppRolePermission {
  role_code: string;
  permission_code: string;
  scope: string;
  is_enabled: boolean;
}


