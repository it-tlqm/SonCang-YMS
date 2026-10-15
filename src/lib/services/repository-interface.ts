/**
 * Interface cho Yard Repository — Phần mềm quản lý bến bãi/cảng cạn Sơn Cảng
 * Cho phép phân tách hoàn toàn giữa Chế độ Demo (LocalStorage) và Chế độ Supabase Backend.
 */

import { 
  VehicleType, 
  VehicleVisit, 
  VehicleVisitStatus,
  TicketPaymentStatus,
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

export interface CreateVehicleParams {
  yardId: string;
  vehicleTypeCode: string;
  licensePlate: string;
  driverName?: string;
  driverPhone?: string;
  ticketCode?: string;
  note?: string;
  hasContainer: boolean;
  operatorId: string;
  operatorName: string;
  idempotencyKey?: string;
  containerNo?: string;
  containerSize?: string;
  containerType?: string;
  cargoStatus?: string;
  // Hỗ trợ xe chở 2 container 20ft song song:
  secondContainer?: {
    containerNo: string;
    containerSize?: string;
    containerType?: string;
    cargoStatus?: string;
  };
  collectPaymentNow?: boolean;
  paymentMethod?: 'CASH' | 'TRANSFER';
  receiptCode?: string;
  // Cấu hình kiểm soát trùng lặp phương tiện chuyên sâu:
  overrideDuplicate?: boolean;
  duplicateReason?: string;
  closePreviousVisit?: boolean;
}

export interface CreateContainerParams {
  yardId: string;
  containerNo: string;
  containerSize: string;
  containerType: string;
  vehicleVisitId?: string;
  licensePlate?: string;
  operatorId: string;
  operatorName: string;
  cargoStatus?: CargoStatus;
  yardZone?: string;
  slotCode?: string;
  inboundAt?: string;
  notes?: string;
  idempotencyKey?: string;
}

export interface AdjustVehicleVisitParams {
  vehicleId: string;
  operatorId: string;
  operatorName: string;
  operatorRole: string; // Phải là SEC_LEAD hoặc SYS_ADMIN
  reason: string; // Lý do hiệu chỉnh (Bắt buộc tối thiểu 5 ký tự)
  entryAt?: string; // Giờ vào (cho phép backdate)
  exitAt?: string | null; // Giờ ra (cho phép backdate hoặc bỏ xuất bãi)
  status?: VehicleVisitStatus; // IN_YARD hoặc EXITED hoặc CANCELLED
  vehicleType?: string; // Sửa loại xe
  ticketPaymentStatus?: TicketPaymentStatus; // PAID, UNPAID, EXEMPT, CANCELLED
  ticketAmount?: number; // Điều chỉnh tiền vé
  paymentMethod?: 'CASH' | 'TRANSFER' | 'OTHER';
  refundReason?: string; // Lý do hủy vé / hoàn tiền
  driverName?: string;
  driverPhone?: string;
  note?: string;
  // Xử lý container đi kèm khi chuyển từ loại xe có cont sang loại xe không cont
  containerAction?: 'CANCEL' | 'DETACH' | 'KEEP';
  containerActionReason?: string;
}

export interface PlugInReeferParams {
  yardId: string;
  containerVisitId: string;
  containerNo: string;
  pluggedInAt?: string;
  plugSocketCode?: string;
  operatorId: string;
  notes?: string;
}

export interface UnplugReeferParams {
  sessionId: string;
  unpluggedAt?: string;
  operatorId: string;
  notes?: string;
}

export interface CollectPaymentParams {
  chargeId: string;
  amount: number;
  paymentMethod?: 'CASH' | 'TRANSFER' | 'OTHER';
  operatorId: string;
  operatorDept: 'AN_NINH' | 'CCKB';
  receiptCode?: string;
  notes?: string;
}

export interface BatchCollectPaymentsParams {
  chargeIds: string[];
  paymentMethod: 'CASH' | 'TRANSFER' | 'OTHER';
  operatorId: string;
  operatorDept: 'AN_NINH' | 'CCKB';
  receiptCode: string;
  notes?: string;
}

export interface GetPaymentsFilter {
  yardId?: string;
  startDate?: string;
  endDate?: string;
  collectorDept?: 'AN_NINH' | 'CCKB' | 'ALL';
  paymentMethod?: 'CASH' | 'TRANSFER' | 'OTHER' | 'ALL';
}

export interface ApproveClearanceParams {
  containerId: string;
  allowDebt: boolean;
  notes?: string;
  operatorId: string;
}

export interface ConfirmExitParams {
  containerId: string;
  outboundVehicleId?: string;
  notes?: string;
  operatorId: string;
  paidAtGate?: boolean;
  paymentMethod?: 'CASH' | 'BANK_TRANSFER';
  receiptCode?: string;
  // Thu vé vào cổng tại Cổng ra (nếu xe lúc vào chưa thu)
  collectEntryTicket?: boolean;
  entryTicketPaymentMethod?: 'CASH' | 'BANK_TRANSFER';
  entryTicketReceiptCode?: string;
}

export interface ConfirmVehicleOnlyExitParams {
  vehicleId: string;
  notes?: string;
  operatorId: string;
  // Thu vé vào cổng tại Cổng ra (nếu xe lúc vào chưa thu)
  collectEntryTicket?: boolean;
  entryTicketPaymentMethod?: 'CASH' | 'BANK_TRANSFER';
  entryTicketReceiptCode?: string;
}

export interface CorrectContainerNumberParams {
  containerId: string;
  newNumber: string;
  reason: string;
  evidenceUrl?: string;
  operatorId: string;
  operatorName: string;
}

export interface CorrectVehiclePlateParams {
  vehicleId: string;
  newLicensePlate: string;
  reason: string;
  operatorId: string;
  operatorName: string;
}

export interface RecordCompletedReeferSessionParams {
  yardId: string;
  containerVisitId: string;
  containerNo?: string;
  pluggedInAt: string;
  unpluggedAt: string;
  plugSocketCode?: string;
  notes?: string;
  operatorId: string;
}

export interface VerifyReeferSessionZaloParams {
  sessionId: string;
  adjustedPluggedInAt?: string;
  adjustedUnpluggedAt?: string;
  verificationNotes?: string;
  status?: ReeferPowerStatus;
}

export interface UpdateReeferRequestParams {
  requestId: string;
  containerNoPlanned?: string;
  expectedLicensePlate?: string;
  customerName?: string;
  customerPhone?: string;
  powerMode?: 'HOURLY' | 'CONTINUOUS';
  temperatureSetting?: string;
  plugSocketCode?: string;
  status?: ReeferRequestStatus;
  notes?: string;
}

export interface ConfirmSettlementParams {
  handoverDept: 'AN_NINH' | 'CCKB' | 'ALL';
  periodFrom: string;
  periodTo: string;
  totalCashCounted: number;
  handoverPersonName: string;
  differenceReason?: string;
  notes?: string;
  paymentIds?: string[];
}

export interface CreateInvoiceParams {
  invoiceType: 'COMPANY' | 'INDIVIDUAL';
  buyerName: string;
  buyerAddress: string;
  taxCode?: string;
  idCardNo?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  vatRate?: number;
  chargeIds: string[];
  notes?: string;
  createdBy?: string;
}

export interface CollectAccountingDebtParams {
  chargeId: string;
  amount: number;
  paymentMethod: 'CASH' | 'TRANSFER';
  receiptCode?: string;
  notes?: string;
}

export interface IYardRepository {
  readonly mode: 'DEMO' | 'SUPABASE';

  /** Lấy danh mục các loại xe đang kích hoạt */
  getVehicleTypes(): Promise<VehicleType[]>;

  /** Lấy danh sách lượt xe đang trong bãi (IN_YARD) */
  getVehicles(yardId?: string): Promise<VehicleVisit[]>;

  /** Lấy danh sách container đang trong bãi (IN_YARD) */
  getContainers(yardId?: string): Promise<ContainerVisit[]>;

  /** Lấy danh sách phiên cắm điện container */
  getReeferSessions(yardId?: string): Promise<ReeferPowerSession[]>;

  /** Lấy danh sách các khoản phải thu */
  getCharges(yardId?: string): Promise<ChargeItem[]>;

  /** Lấy danh sách biểu phí hiện hành */
  getTariffs(): Promise<TariffItem[]>;

  /** Cập nhật đơn giá biểu phí dịch vụ bến bãi (Quản trị viên SYS_ADMIN) */
  updateTariff(code: string, amount: number, reason?: string): Promise<{ success: boolean; tariff?: TariffItem; error?: string }>;

  /** Lấy lịch sử sửa số container */
  getContainerNumberChanges(containerId: string): Promise<ContainerNumberChange[]>;

  /** Lấy lịch sử sửa biển số xe */
  getVehiclePlateChanges(vehicleId: string): Promise<VehiclePlateChange[]>;

  /** Lấy danh sách yêu cầu cắm điện dự kiến (CCKB) */
  getReeferRequests(yardId?: string): Promise<ReeferRequest[]>;

  /** Tạo yêu cầu cắm điện container (CCKB) - hỗ trợ cả container trong bãi và đăng ký trước */
  createReeferRequest(params: {
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
    plugSocketCode?: string;
    notes?: string;
    operatorId?: string;
    createdBy?: string;
  }): Promise<{ id?: string; error?: string }>;

  /** Khớp hoặc cập nhật trạng thái yêu cầu điện dự kiến */
  matchReeferRequest(params: {
    requestId: string;
    containerVisitId?: string;
    status?: 'PLANNED' | 'CONTAINER_ARRIVED' | 'PLUGGED' | 'COMPLETED' | 'CANCELLED';
  }): Promise<{ success: boolean; error?: string }>;

  /** Cập nhật chi tiết yêu cầu cắm điện dự kiến (CCKB) */
  updateReeferRequest(params: UpdateReeferRequestParams): Promise<{ success: boolean; error?: string }>;

  /** Tiếp nhận xe vào cổng (kèm container nguyên tử nếu xe có container, hỗ trợ 2 cont 20ft) */
  createVehicleEntry(params: CreateVehicleParams): Promise<{ 
    vehicle: VehicleVisit | null; 
    container?: ContainerVisit | null; 
    secondContainer?: ContainerVisit | null;
    containers?: ContainerVisit[];
    error?: string 
  }>;

  /** Tiếp nhận container vào bãi */
  createContainerEntry(params: CreateContainerParams): Promise<{ container: ContainerVisit | null; error?: string }>;

  /** Cập nhật trạng thái HÀNG / RỖNG (chỉ Điều phối viên) */
  updateCargoStatus(
    containerId: string,
    cargoStatus: CargoStatusUpdate,
    operatorRole: string
  ): Promise<{ success: boolean; error?: string }>;

  /** Sửa số container trên cùng ID lượt (An ninh / CCKB trưởng) */
  correctContainerNumber(params: CorrectContainerNumberParams): Promise<{ success: boolean; error?: string }>;

  /** Sửa biển số xe trên cùng ID lượt và lưu log lịch sử (An ninh / Điều phối) */
  correctVehiclePlate(params: CorrectVehiclePlateParams): Promise<{ success: boolean; error?: string }>;

  /** Cắm điện container lạnh */
  plugInReefer(params: PlugInReeferParams): Promise<{ session: ReeferPowerSession | null; error?: string }>;

  /** Rút điện container lạnh và tính tiền */
  unplugReefer(params: UnplugReeferParams): Promise<{ session: ReeferPowerSession | null; error?: string }>;

  /** Ghi nhận phiên cắm rút hoàn tất hồi tố (theo ảnh/video Zalo timestamp - E04) */
  recordCompletedReeferSession(params: RecordCompletedReeferSessionParams): Promise<{ session: ReeferPowerSession | null; error?: string }>;

  /** CCKB đối chiếu và xác nhận lại giờ giắc Zalo cho phiên điện */
  verifyReeferSessionZalo(params: VerifyReeferSessionZaloParams): Promise<{ success: boolean; error?: string }>;

  /** Ghi nhận thu tiền vào sổ cái bất biến */
  collectPayment(params: CollectPaymentParams): Promise<{ success: boolean; error?: string }>;

  /** Thu gộp nhiều khoản phải thu trong 1 lần giao dịch với cùng mã biên lai chung */
  batchCollectPayments(params: BatchCollectPaymentsParams): Promise<{
    success: boolean;
    collectedCount: number;
    totalAmount: number;
    error?: string;
  }>;

  /** Lấy danh sách lịch sử thu tiền từ sổ cái bất biến app_payments phục vụ Báo cáo ca trực & Bàn giao */
  getPayments(filter?: GetPaymentsFilter): Promise<PaymentRecord[]>;

  /** CCKB duyệt điều kiện xuất bãi (Clearance) */
  approveClearance(params: ApproveClearanceParams): Promise<{ success: boolean; error?: string }>;

  /** An ninh xác nhận container ra bãi vật lý tại cổng và chốt phí lưu */
  confirmPhysicalExit(params: ConfirmExitParams): Promise<{ 
    success: boolean; 
    storageFee: number; 
    chargedNights: number; 
    error?: string;
  }>;

  /** Tính phí lưu bãi container (Preview/Tính trước theo mốc 22:00-06:00 V5) */
  calculateStorageFee(inboundAt: string, outboundAt?: string): Promise<{
    totalNights: number;
    chargedNights: number;
    fee: number;
  }>;

  /** An ninh xác nhận xe riêng không cõng cont rời bãi (không thu phí lưu cont) */
  confirmVehicleOnlyExit(params: ConfirmVehicleOnlyExitParams): Promise<{
    success: boolean;
    error?: string;
  }>;

  /** Kiểm tra trùng lặp biển số xe đang trong bãi theo chính sách chuyên sâu */
  checkVehicleDuplicate(licensePlate: string, vehicleType?: string, yardId?: string): Promise<VehicleDuplicateCheckResult>;

  /** Đọc cấu hình chính sách kiểm soát trùng lặp xe của bãi */
  getVehicleDuplicatePolicy(yardId?: string): Promise<VehicleDuplicatePolicy | null>;

  /** Cập nhật cấu hình chính sách kiểm soát trùng lặp xe */
  updateVehicleDuplicatePolicy(params: Partial<VehicleDuplicatePolicy> & { yard_id: string }): Promise<{ success: boolean; policy?: VehicleDuplicatePolicy; error?: string }>;

  /** Lấy danh mục các phân khu chức năng của bến bãi */
  getYardZones(): Promise<YardZoneInfo[]>;

  /** Tạo phân khu bãi mới (Điều phối viên / SYS_ADMIN) */
  createYardZone(zone: YardZoneInfo): Promise<{ success: boolean; error?: string }>;

  /** Cập nhật thông tin phân khu bãi (Điều phối viên / SYS_ADMIN) */
  updateYardZone(code: string, zone: Partial<YardZoneInfo>): Promise<{ success: boolean; error?: string }>;

  /** Xóa phân khu bãi (chỉ khi không còn xe/cont đang đỗ) */
  deleteYardZone(code: string): Promise<{ success: boolean; error?: string }>;

  /** Cập nhật vị trí đỗ / phân khu bãi của phương tiện (Điều phối viên / An ninh) */
  updateVehicleLocation(params: { vehicleId: string; yardZone?: string; slotCode?: string }): Promise<{ success: boolean; error?: string }>;

  /** Cập nhật vị trí bãi của container (Điều phối viên) */
  updateContainerLocation(params: { containerId: string; yardZone?: string; slotCode?: string }): Promise<{ success: boolean; error?: string }>;

  /** Ghi nhận nhật ký đo kiểm nhiệt độ container lạnh định kỳ */
  recordReeferTemperatureLog(params: Omit<ReeferTemperatureLog, 'id'>): Promise<{ success: boolean; error?: string }>;

  /** Lấy lịch sử đo kiểm nhiệt độ container lạnh */
  getReeferTemperatureLogs(containerVisitId?: string): Promise<ReeferTemperatureLog[]>;

  /** Lấy danh sách phương tiện đã xuất bãi trong ngày phục vụ tra cứu cổng ra */
  getExitedVehicles(yardId?: string, limit?: number): Promise<VehicleVisit[]>;

  /** Ca trưởng An ninh / Quản trị viên hiệu chỉnh lượt xe (Backdate giờ vào/ra, sửa loại xe, hủy vé/hoàn tiền) */
  adjustVehicleVisit(params: AdjustVehicleVisitParams): Promise<{ success: boolean; vehicle?: VehicleVisit; error?: string }>;

  /** Thu tiền vé vào cổng trực tiếp tại Cổng ra (khi xe vào cổng chưa thanh toán) */
  collectVehicleEntryTicket(params: {
    vehicleId: string;
    paymentMethod: 'CASH' | 'BANK_TRANSFER';
    receiptCode?: string;
    operatorId: string;
    notes?: string;
  }): Promise<{ success: boolean; error?: string }>;

  /** Lấy danh mục khách hàng / chủ hàng chuẩn */
  getCustomers(): Promise<Customer[]>;

  /** Tạo khách hàng / chủ hàng mới nhanh (hỗ trợ nhập 1 chạm chuẩn AppSheet) */
  createCustomer(customer: { name: string; phone?: string; tax_code?: string; address?: string; notes?: string }): Promise<{
    success: boolean;
    customer?: Customer;
    error?: string;
  }>;

  /** Cập nhật thông tin khách hàng / chủ hàng (sửa nhầm tên, SĐT, MST, ghi chú, trạng thái) */
  updateCustomer(customer: Partial<Customer> & { id: string }): Promise<{
    success: boolean;
    customer?: Customer;
    error?: string;
  }>;

  /** Xóa hoặc vô hiệu hóa khách hàng / chủ hàng */
  deleteCustomer(id: string): Promise<{ success: boolean; error?: string }>;

  /** Lấy danh sách nhân sự / người dùng trực ca (Staff Users) */
  getStaffUsers(): Promise<StaffUser[]>;

  /** Tạo mới nhân sự / người dùng và gán vai trò V1 */
  createStaffUser(user: Partial<StaffUser>): Promise<{ success: boolean; user?: StaffUser; error?: string }>;

  /** Cập nhật thông tin nhân sự / đổi vai trò / đổi bộ phận */
  updateStaffUser(user: Partial<StaffUser> & { id: string }): Promise<{ success: boolean; user?: StaffUser; error?: string }>;

  /** Khóa hoặc Mở khóa tài khoản nhân sự */
  toggleStaffUserStatus(id: string, isActive: boolean): Promise<{ success: boolean; error?: string }>;

  /** Xóa nhân sự / tài khoản khỏi hệ thống */
  deleteStaffUser(id: string): Promise<{ success: boolean; error?: string }>;

  /** Admin / Trưởng ca đặt lại mật khẩu cho nhân sự (lưu vết audit) */
  adminResetStaffPassword(params: {
    staffId: string;
    newPassword: string;
    reason: string;
    mustChangePassword?: boolean;
  }): Promise<{ success: boolean; message?: string; error?: string }>;

  /** Ghi nhận audit log khi người dùng đổi mật khẩu cá nhân */
  recordPasswordChangeAudit(email: string, reason?: string): Promise<{ success: boolean; error?: string }>;

  /** Lấy danh mục các trụ / giắc cắm điện container lạnh 380V */
  getPowerSockets(zoneCode?: string): Promise<PowerSocket[]>;

  /** Tạo mới trụ điện / giắc cắm 380V */
  createPowerSocket(params: {
    socketCode: string;
    socketName: string;
    zoneCode?: string;
    voltage?: string;
    amperage?: string;
    phase?: string;
    notes?: string;
  }): Promise<{ success: boolean; socket?: PowerSocket; error?: string }>;

  /** Cập nhật thông tin trụ điện / giắc cắm */
  updatePowerSocket(
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
  ): Promise<{ success: boolean; socket?: PowerSocket; error?: string }>;

  /** Xóa trụ điện / giắc cắm */
  deletePowerSocket(socketCode: string): Promise<{ success: boolean; error?: string }>;

  /** Cập nhật trạng thái trụ điện (Sẵn sàng / Đang cắm / Bảo trì / Hỏng) */
  setPowerSocketStatus(
    socketCode: string,
    status: PowerSocketStatus,
    notes?: string
  ): Promise<{ success: boolean; error?: string }>;

  /** Lấy danh mục các vai trò (Roles) trong hệ thống */
  getRoles(): Promise<AppRole[]>;

  /** Tạo mới hoặc sửa thông tin vai trò */
  createRole(role: { code: string; name: string; department_code: string; description?: string }): Promise<{ success: boolean; role?: AppRole; error?: string }>;

  /** Cập nhật vai trò */
  updateRole(role: { code: string; name: string; department_code: string; description?: string; is_active?: boolean }): Promise<{ success: boolean; role?: AppRole; error?: string }>;

  /** Lấy danh sách quyền đã cấp theo vai trò */
  getRolePermissions(roleCode?: string): Promise<AppRolePermission[]>;

  /** Bật / Tắt cấp quyền cho vai trò */
  toggleRolePermission(roleCode: string, permissionCode: string, isEnabled: boolean, scope?: string): Promise<{ success: boolean; error?: string }>;

  // ==============================================================================
  // PHÂN HỆ KẾ TOÁN (ACCOUNTING SUB-SYSTEM)
  // ==============================================================================

  /** Lấy danh sách các đợt chốt & gom tiền mặt hiện trường */
  getCashSettlements(): Promise<CashSettlement[]>;

  /** Lấy danh sách phiếu thu tiền mặt chưa được Kế toán chốt thu về quỹ */
  getUnsettledCashPayments(dept?: string): Promise<PaymentRecord[]>;

  /** Xác nhận Kế toán chốt và thu tiền mặt hiện trường (tạo biên bản bàn giao) */
  confirmCashSettlement(params: ConfirmSettlementParams): Promise<{ success: boolean; settlement?: CashSettlement; error?: string }>;

  /** Lấy danh sách hóa đơn bến bãi (MST & CCCD) */
  getYardInvoices(status?: string): Promise<YardInvoice[]>;

  /** Lấy danh sách các khoản thu đã thanh toán sẵn sàng gom vào hóa đơn */
  getInvoicableCharges(): Promise<ChargeItem[]>;

  /** Lập hồ sơ đề nghị xuất hóa đơn GTGT (hỗ trợ Doanh nghiệp MST & Cá nhân CCCD 12 số) */
  createYardInvoice(params: CreateInvoiceParams): Promise<{ success: boolean; invoice?: YardInvoice; error?: string }>;

  /** Ghi nhận số HĐĐT chính thức đã phát hành */
  issueYardInvoice(invoiceId: string, eInvoiceNo: string, issuedAt?: string, notes?: string): Promise<{ success: boolean; error?: string }>;

  /** Lấy danh sách công nợ bến bãi chờ thu (theo khách hàng & lượt xe/cont) */
  getAccountingDebts(): Promise<AccountingDebtItem[]>;

  /** Kế toán trực tiếp thu hồi nợ cước bến bãi AP07 */
  collectAccountingDebt(params: CollectAccountingDebtParams): Promise<{ success: boolean; paymentId?: string; error?: string }>;

  /** Lấy danh sách nhật ký kiểm toán toàn hệ thống (bất biến, đối soát thực tế) */
  getAuditLogs(): Promise<AuditLogEntry[]>;

  /** Ghi nhận một sự kiện kiểm toán hệ thống */
  logAuditEvent(entry: Omit<AuditLogEntry, 'id' | 'occurred_at'> & { occurred_at?: string }): Promise<{ success: boolean; id?: string; error?: string }>;

  /** Khôi phục dữ liệu demo về mặc định (chỉ có ở Demo) */
  resetDemoData?(): void;

  /** Khởi tạo bãi trống 100% (làm sạch toàn bộ xe, cont, phiên điện, công nợ thử nghiệm) */
  resetYardToClean(): Promise<{ success: boolean; error?: string }>;
}

export interface AuditLogEntry {
  id: string;
  event_name: string;
  category: 'VEHICLE' | 'CONTAINER' | 'PAYMENT' | 'REEFER' | 'CLEARANCE' | 'SYSTEM';
  actor_name: string;
  actor_role: string;
  target_id: string;
  target_label: string;
  description: string;
  old_value?: string | null;
  new_value?: string | null;
  reason?: string | null;
  occurred_at: string;
}



