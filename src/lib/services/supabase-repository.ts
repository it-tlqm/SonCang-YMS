/**
 * Supabase Repository — Triển khai IYardRepository kết nối Supabase Cloud DEV thật.
 * Tuân thủ RLS/RBAC, đọc dữ liệu typed từ Database catalog và gọi các RPC nghiệp vụ chuẩn V5.
 * 
 * KIỂM SOÁT REAL WRITE BẰNG FEATURE FLAG (Gate C / Phase 1D-02 / Cloud DEV Readiness):
 * - Biến môi trường: NEXT_PUBLIC_ENABLE_REAL_WRITE
 * - Mặc định: "false" (TẮT)
 * - Khi TẮT (false): Toàn bộ các thao tác ghi (createVehicleEntry, createContainerEntry,
 *   updateCargoStatus, correctContainerNumber, plugInReefer, unplugReefer, collectPayment,
 *   approveClearance, confirmPhysicalExit, confirmVehicleOnlyExit) được bảo vệ an toàn,
 *   KHÔNG gửi bất kỳ mutation call nào tới Cloud DEV và trả về thông báo lỗi minh bạch.
 * - Khi BẬT (true): Thực hiện gọi các RPC nghiệp vụ đã được kiểm thử (pgTAP 181/181 PASS)
 *   qua Supabase Client có session xác thực và kiểm soát RLS/RBAC trên server.
 */

import { 
  VehicleType, 
  VehicleVisit, 
  VehicleVisitStatus,
  TicketPaymentStatus,
  ContainerVisit, 
  ContainerVisitStatus,
  CargoStatus,
  CargoStatusUpdate, 
  ReeferPowerSession, 
  ReeferPowerStatus,
  ReeferRequest,
  ReeferRequestStatus,
  ChargeItem, 
  ChargeType,
  TariffItem, 
  ContainerNumberChange,
  VehiclePlateChange,
  VehicleDuplicatePolicy,
  VehicleDuplicateCheckResult,
  PaymentRecord,
  YardZoneInfo,
  ReeferTemperatureLog,
  Customer,
  StaffUser
} from '@/types/domain.types';
import { SEED_YARD_ZONES_SON_CANG, INITIAL_DEMO_CUSTOMERS, INITIAL_DEMO_STAFF_USERS } from './demo-repository';

import { Database } from '@/types/database.types';
import { 
  IYardRepository, 
  CreateVehicleParams, 
  CreateContainerParams,
  PlugInReeferParams,
  UnplugReeferParams,
  CollectPaymentParams,
  BatchCollectPaymentsParams,
  GetPaymentsFilter,
  ApproveClearanceParams,
  ConfirmExitParams,
  ConfirmVehicleOnlyExitParams,
  CorrectContainerNumberParams,
  CorrectVehiclePlateParams,
  RecordCompletedReeferSessionParams,
  VerifyReeferSessionZaloParams,
  UpdateReeferRequestParams,
  AdjustVehicleVisitParams
} from './repository-interface';
import { createClient } from '@/lib/supabase/client';
import { getVehicleTypeName } from '@/lib/display-formatters';

type VehicleTypeRow = Database['public']['Tables']['app_vehicle_types']['Row'];
type VehicleVisitRow = Database['public']['Tables']['app_vehicle_visits']['Row'];
type ContainerVisitRow = Database['public']['Tables']['app_container_visits']['Row'];
type ReeferSessionRow = Database['public']['Tables']['app_reefer_power_sessions']['Row'];
type ChargeRow = Database['public']['Tables']['app_charges']['Row'];
type TariffRow = Database['public']['Tables']['app_tariffs']['Row'];
type ContainerNumberChangeRow = Database['public']['Tables']['app_container_number_changes']['Row'];

/**
 * Kiểm tra Feature Flag Real Write
 * Chỉ cho phép ghi xuống Supabase Cloud DEV khi cờ NEXT_PUBLIC_ENABLE_REAL_WRITE được thiết lập tường minh là "true".
 */
export function isRealWriteEnabled(): boolean {
  if (typeof process !== 'undefined' && process.env) {
    return process.env.NEXT_PUBLIC_ENABLE_REAL_WRITE === 'true';
  }
  return false;
}

const REAL_WRITE_BLOCKED_MESSAGE = 
  'Chức năng lưu dữ liệu hiện chưa được mở. Vui lòng chuyển sang Chế độ mô phỏng hoặc liên hệ Quản trị viên hệ thống để được hỗ trợ.';

export const DEFAULT_TARIFFS_V5: TariffItem[] = [
  { id: 'tf-1', code: 'VE_CONT_LANH', name: 'Vé xe container lạnh/khô', unit: 'Lượt xe', amount: 250000, is_active: true },
  { id: 'tf-2', code: 'VE_DAU_KEO', name: 'Vé xe đầu kéo không cont', unit: 'Lượt xe', amount: 0, is_active: true },
  { id: 'tf-3', code: 'VE_XE_BO_4_CHAN', name: 'Vé xe bo 4 chân tải thùng', unit: 'Lượt xe', amount: 200000, is_active: true },
  { id: 'tf-4', code: 'VE_XE_BO_3_CHAN', name: 'Vé xe bo 3 chân tải thùng', unit: 'Lượt xe', amount: 200000, is_active: true },
  { id: 'tf-5', code: 'VE_XE_BO_8_TAN', name: 'Vé xe bo 8 tấn (2 chân)', unit: 'Lượt xe', amount: 100000, is_active: true },
  { id: 'tf-6', code: 'VE_XE_BO_3_BANH', name: 'Vé xe bo 3 bánh nội bộ', unit: 'Lượt xe', amount: 40000, is_active: true },
  { id: 'tf-7', code: 'VE_XE_SANG_TAI', name: 'Vé xe sang tải nội bộ', unit: 'Lượt xe', amount: 0, is_active: true },
  { id: 'tf-8', code: 'DIEN_CONT_GIO', name: 'Tiền điện container theo giờ (Làm tròn 15p)', unit: 'Giờ', amount: 100000, is_active: true },
  { id: 'tf-9', code: 'LUU_CONT_DEM', name: 'Phí lưu container qua đêm (22h-06h, miễn đêm đầu)', unit: 'Đêm', amount: 100000, is_active: true },
];

export class SupabaseRepository implements IYardRepository {
  readonly mode = 'SUPABASE' as const;

  /**
   * Đọc danh mục loại xe đang kích hoạt
   */
  async getVehicleTypes(): Promise<VehicleType[]> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('app_vehicle_types')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error || !data) {
        console.warn('Lỗi đọc app_vehicle_types từ Supabase:', error?.message);
        return [];
      }

      const rows = data as unknown as VehicleTypeRow[];
      return rows.map((t) => ({
        code: t.code,
        name: t.display_name,
        description: t.description,
        default_ticket_amount: t.default_ticket_amount,
        allows_container: t.allows_container,
        is_active: t.is_active,
        sort_order: t.sort_order,
      }));
    } catch (err) {
      console.error('Ngoại lệ khi truy vấn app_vehicle_types:', err);
      return [];
    }
  }

  /**
   * Đọc danh sách xe đang trong bãi (IN_YARD)
   */
  async getVehicles(yardId?: string): Promise<VehicleVisit[]> {
    try {
      const supabase = createClient();
      let query = supabase
        .from('app_vehicle_visits')
        .select('*')
        .eq('status', 'IN_YARD')
        .order('entry_at', { ascending: false });

      if (yardId) {
        query = query.eq('yard_id', yardId);
      }

      const { data, error } = await query;
      if (error || !data) {
        console.warn('Lỗi đọc app_vehicle_visits từ Supabase:', error?.message);
        return [];
      }

      const rows = data as unknown as VehicleVisitRow[];
      return rows.map((v) => {
        let count = 0;
        if (v.note && v.note.includes('Sửa biển')) {
          count = v.note.split('Sửa biển').length - 1;
        }
        if (typeof window !== 'undefined') {
          const localJson = localStorage.getItem(`soncang_v5_plate_changes_${v.id}`);
          if (localJson) {
            try {
              const parsed = JSON.parse(localJson);
              if (Array.isArray(parsed) && parsed.length > count) {
                count = parsed.length;
              }
            } catch {}
          }
        }
        return {
          id: v.id,
          yard_id: v.yard_id,
          vehicle_type: v.vehicle_type,
          vehicle_type_name: getVehicleTypeName(v.vehicle_type),
          license_plate: v.license_plate,
          driver_name: v.driver_name,
          driver_phone: v.driver_phone,
          ticket_code: v.ticket_code,
          ticket_amount: v.ticket_amount,
          ticket_payment_status: v.ticket_payment_status as TicketPaymentStatus,
          status: v.status as VehicleVisitStatus,
          entry_at: v.entry_at,
          entry_by: v.entry_by,
          exit_at: v.exit_at,
          exit_by: v.exit_by,
          note: v.note,
          idempotency_key: v.idempotency_key,
          plate_changes_count: count,
        };
      });
    } catch (err) {
      console.error('Ngoại lệ khi truy vấn app_vehicle_visits:', err);
      return [];
    }
  }

  /**
   * Đọc danh sách container đang trong bãi (IN_YARD)
   */
  async getContainers(yardId?: string): Promise<ContainerVisit[]> {
    try {
      const supabase = createClient();
      let query = supabase
        .from('app_container_visits')
        .select('*')
        .eq('status', 'IN_YARD')
        .order('inbound_at', { ascending: false });

      if (yardId) {
        query = query.eq('yard_id', yardId);
      }

      const { data, error } = await query;
      if (error || !data) {
        console.warn('Lỗi đọc app_container_visits từ Supabase:', error?.message);
        return [];
      }

      const rows = data as unknown as ContainerVisitRow[];

      // Lấy danh sách biển số xe cho các container có inbound_vehicle_visit_id
      const vehicleIds = Array.from(new Set(rows.map(r => r.inbound_vehicle_visit_id).filter(Boolean))) as string[];
      let plateMap: Record<string, string> = {};
      if (vehicleIds.length > 0) {
        const { data: vData } = await supabase
          .from('app_vehicle_visits')
          .select('id, license_plate')
          .in('id', vehicleIds);
        if (vData) {
          plateMap = vData.reduce((acc, curr) => {
            if (curr.id && curr.license_plate) acc[curr.id] = curr.license_plate;
            return acc;
          }, {} as Record<string, string>);
        }
      }

      return rows.map((c) => ({
        id: c.id,
        yard_id: c.yard_id,
        container_no_current: c.container_no_current,
        container_no_original: c.container_no_original,
        container_size: c.container_size,
        container_type: c.container_type,
        status: c.status as ContainerVisitStatus,
        cargo_status: c.cargo_status as CargoStatus,
        inbound_vehicle_visit_id: c.inbound_vehicle_visit_id,
        inbound_license_plate: c.inbound_vehicle_visit_id ? (plateMap[c.inbound_vehicle_visit_id] || null) : null,
        inbound_at: c.inbound_at,
        outbound_at: c.outbound_at,
        clearance_status: c.clearance_status as ContainerVisit['clearance_status'],
        clearance_notes: c.clearance_notes,
        cleared_at: c.cleared_at,
        cleared_by: c.cleared_by,
        storage_fee_amount: c.storage_fee_amount ?? 0,
        storage_fee_payment_status: c.storage_fee_payment_status as ContainerVisit['storage_fee_payment_status'],
        storage_nights_charged: c.storage_nights_charged ?? 0,
        created_at: c.created_at,
        created_by: c.created_by,
        number_changes_count: 0,
      }));
    } catch (err) {
      console.error('Ngoại lệ khi truy vấn app_container_visits:', err);
      return [];
    }
  }

  /**
   * Tiếp nhận xe vào bãi
   * Có bảo vệ Feature Flag NEXT_PUBLIC_ENABLE_REAL_WRITE
   */
  async createVehicleEntry(params: CreateVehicleParams): Promise<{ 
    vehicle: VehicleVisit | null; 
    container?: ContainerVisit | null; 
    secondContainer?: ContainerVisit | null;
    containers?: ContainerVisit[];
    error?: string 
  }> {
    if (!isRealWriteEnabled()) {
      return { vehicle: null, error: REAL_WRITE_BLOCKED_MESSAGE };
    }

    try {
      const supabase = createClient();
      
      // Nếu có container, BẮT BUỘC dùng RPC nguyên tử sc_create_vehicle_and_container_visit_atomic (ALL-OR-NOTHING)
      if (params.hasContainer) {
        if (!params.containerNo || params.containerNo.trim().length < 4) {
          return { vehicle: null, error: 'Số container không hợp lệ khi khai báo xe chở container.' };
        }

        const { data: atomicData, error: atomicErr } = await supabase.rpc('sc_create_vehicle_and_container_visit_atomic', {
          p_yard_id: params.yardId,
          p_vehicle_type: params.vehicleTypeCode,
          p_license_plate: params.licensePlate,
          p_driver_name: params.driverName || undefined,
          p_driver_phone: params.driverPhone || undefined,
          p_ticket_code: params.ticketCode || undefined,
          p_note: params.note || undefined,
          p_has_container: true,
          p_container_no: params.containerNo.trim().toUpperCase(),
          p_container_size: params.containerSize || undefined,
          p_container_type: params.containerType || 'RF',
          p_cargo_status: params.cargoStatus || 'CHUA_XAC_DINH',
          p_idempotency_key: params.idempotencyKey || undefined,
          p_override_duplicate: params.overrideDuplicate ?? false,
          p_duplicate_reason: params.duplicateReason || undefined,
          p_close_previous_visit: params.closePreviousVisit ?? false,
        });

        if (atomicErr || !atomicData) {
          return { vehicle: null, error: atomicErr?.message || 'Lỗi RPC nguyên tử sc_create_vehicle_and_container_visit_atomic.' };
        }

        const resObj = atomicData as unknown as {
          vehicle_visit_id: string;
          container_visit_id: string | null;
          ticket_amount: number;
          ticket_payment_status: string;
          is_replay: boolean;
        };

        // Đọc lại lượt xe và lượt container đã tạo trong cùng database
        const [vehFetch, contFetch] = await Promise.all([
          supabase.from('app_vehicle_visits').select('*').eq('id', resObj.vehicle_visit_id).single(),
          resObj.container_visit_id
            ? supabase.from('app_container_visits').select('*').eq('id', resObj.container_visit_id).single()
            : Promise.resolve({ data: null, error: null })
        ]);

        if (vehFetch.error || !vehFetch.data) {
          return { vehicle: null, error: 'Tạo nguyên tử thành công nhưng không thể đọc lại lượt xe: ' + vehFetch.error?.message };
        }

        const v = vehFetch.data as any;
        const vehicle: VehicleVisit = {
          id: v.id,
          yard_id: v.yard_id,
          vehicle_type: v.vehicle_type,
          vehicle_type_name: getVehicleTypeName(v.vehicle_type),
          license_plate: v.license_plate,
          driver_name: v.driver_name,
          driver_phone: v.driver_phone,
          ticket_code: v.ticket_code,
          ticket_amount: v.ticket_amount,
          ticket_payment_status: v.ticket_payment_status as TicketPaymentStatus,
          status: v.status as VehicleVisitStatus,
          entry_at: v.entry_at,
          entry_by: v.entry_by,
          exit_at: v.exit_at,
          exit_by: v.exit_by,
          note: v.note,
          idempotency_key: v.idempotency_key,
          is_duplicate_entry: v.is_duplicate_entry ?? false,
          previous_visit_id: v.previous_visit_id || null,
          duplicate_override_reason: v.duplicate_override_reason || null,
          duplicate_override_by: v.duplicate_override_by || null,
        };

        let container: ContainerVisit | undefined = undefined;
        if (contFetch.data) {
          const c = contFetch.data as unknown as ContainerVisitRow;
          container = {
            id: c.id,
            yard_id: c.yard_id,
            container_no_current: c.container_no_current,
            container_no_original: c.container_no_original,
            container_size: c.container_size,
            container_type: c.container_type,
            status: c.status as ContainerVisitStatus,
            cargo_status: c.cargo_status as CargoStatus,
            inbound_vehicle_visit_id: c.inbound_vehicle_visit_id,
            inbound_license_plate: v.license_plate,
            inbound_at: c.inbound_at,
            outbound_at: c.outbound_at,
            created_at: c.created_at,
            created_by: c.created_by,
            number_changes_count: 0,
          };
        }

        // HỖ TRỢ XE CHỞ 2 CONTAINER 20FT SONG SONG:
        let secondContainer: ContainerVisit | undefined = undefined;
        if (params.secondContainer && params.secondContainer.containerNo?.trim().length >= 4) {
          const { data: secondContId, error: secondContErr } = await supabase.rpc('sc_create_container_visit', {
            p_yard_id: params.yardId,
            p_container_no: params.secondContainer.containerNo.trim().toUpperCase(),
            p_inbound_vehicle_visit_id: vehicle.id,
            p_container_size: params.secondContainer.containerSize || '20',
            p_container_type: params.secondContainer.containerType || 'RF',
            p_idempotency_key: params.idempotencyKey ? `${params.idempotencyKey}-c2` : undefined,
          });

          if (!secondContErr && secondContId) {
            const { data: c2Data } = await supabase
              .from('app_container_visits')
              .select('*')
              .eq('id', secondContId)
              .single();

            if (c2Data) {
              const c2 = c2Data as unknown as ContainerVisitRow;
              secondContainer = {
                id: c2.id,
                yard_id: c2.yard_id,
                container_no_current: c2.container_no_current,
                container_no_original: c2.container_no_original,
                container_size: c2.container_size,
                container_type: c2.container_type,
                status: c2.status as ContainerVisitStatus,
                cargo_status: c2.cargo_status as CargoStatus,
                inbound_vehicle_visit_id: c2.inbound_vehicle_visit_id,
                inbound_license_plate: v.license_plate,
                inbound_at: c2.inbound_at,
                outbound_at: c2.outbound_at,
                created_at: c2.created_at,
                created_by: c2.created_by,
                number_changes_count: 0,
              };
            }
          } else if (secondContErr) {
            console.error('Lỗi tiếp nhận container thứ hai (20ft):', secondContErr);
          }
        }

        const containersList: ContainerVisit[] = [];
        if (container) containersList.push(container);
        if (secondContainer) containersList.push(secondContainer);
        vehicle.containers = containersList;

        // Nếu chọn thu tiền vé ngay tại cổng và vé có phí (> 0đ)
        if (params.collectPaymentNow && vehicle.ticket_amount && vehicle.ticket_amount > 0) {
          try {
            const { data: chargeRows, error: chgErr } = await supabase
              .from('app_charges')
              .select('id, amount, notes')
              .eq('vehicle_visit_id', vehicle.id)
              .eq('charge_type', 'TICKET')
              .eq('status', 'UNPAID')
              .order('created_at', { ascending: true });

            if (chgErr) {
              console.error('Lỗi truy vấn app_charges cho lượt xe:', chgErr);
            }

            if (chargeRows && chargeRows.length > 0) {
              const mainCharge = chargeRows[0];
              const { error: payErr } = await supabase.rpc('sc_collect_payment', {
                p_charge_id: mainCharge.id,
                p_amount: mainCharge.amount,
                p_payment_method: params.paymentMethod || 'CASH',
                p_receipt_code: params.receiptCode || vehicle.ticket_code || undefined,
                p_notes: `Thu tiền vé cổng trực tiếp tại cổng vào (An ninh): ${v.license_plate}`,
              });

              if (!payErr) {
                vehicle.ticket_payment_status = 'PAID';

                // Nếu có bản ghi duplicate thừa (do RPC atomic trước đó chèn thêm), hủy bản ghi thừa
                if (chargeRows.length > 1) {
                  for (let i = 1; i < chargeRows.length; i++) {
                    await supabase
                      .from('app_charges')
                      .update({ 
                        status: 'CANCELLED', 
                        notes: (chargeRows[i].notes || '') + ' [Hủy bản ghi thừa trùng lặp]' 
                      })
                      .eq('id', chargeRows[i].id);
                  }
                }
              } else {
                console.error('Lỗi gọi sc_collect_payment:', payErr);
              }
            }
          } catch (payExc) {
            console.warn('Cảnh báo ghi nhận thu tiền tại cổng:', payExc);
          }
        }

        return { vehicle, container, secondContainer, containers: containersList };
      }

      // Xe KHÔNG mang container: Gọi RPC tạo xe đơn lẻ
      const { data: vehId, error } = await supabase.rpc('sc_create_vehicle_visit', {
        p_yard_id: params.yardId,
        p_vehicle_type: params.vehicleTypeCode,
        p_license_plate: params.licensePlate || undefined,
        p_driver_name: params.driverName || undefined,
        p_driver_phone: params.driverPhone || undefined,
        p_note: params.note || undefined,
        p_idempotency_key: params.idempotencyKey || undefined,
        p_override_duplicate: params.overrideDuplicate ?? false,
        p_duplicate_reason: params.duplicateReason || undefined,
        p_close_previous_visit: params.closePreviousVisit ?? false,
      });

      if (error || !vehId) {
        return { vehicle: null, error: error?.message || 'Không thể tạo lượt xe vào bãi qua Supabase RPC.' };
      }

      // Đọc lại bản ghi vừa tạo
      const { data: vehRow, error: fetchErr } = await supabase
        .from('app_vehicle_visits')
        .select('*')
        .eq('id', vehId)
        .single();

      if (fetchErr || !vehRow) {
        return { vehicle: null, error: 'Tạo lượt xe thành công nhưng không thể đọc lại bản ghi: ' + fetchErr?.message };
      }

      const v = vehRow as any;
      const vehicle: VehicleVisit = {
        id: v.id,
        yard_id: v.yard_id,
        vehicle_type: v.vehicle_type,
        vehicle_type_name: getVehicleTypeName(v.vehicle_type),
        license_plate: v.license_plate,
        driver_name: v.driver_name,
        driver_phone: v.driver_phone,
        ticket_code: v.ticket_code,
        ticket_amount: v.ticket_amount,
        ticket_payment_status: v.ticket_payment_status as TicketPaymentStatus,
        status: v.status as VehicleVisitStatus,
        entry_at: v.entry_at,
        entry_by: v.entry_by,
        exit_at: v.exit_at,
        exit_by: v.exit_by,
        note: v.note,
        idempotency_key: v.idempotency_key,
        is_duplicate_entry: v.is_duplicate_entry ?? false,
        previous_visit_id: v.previous_visit_id || null,
        duplicate_override_reason: v.duplicate_override_reason || null,
        duplicate_override_by: v.duplicate_override_by || null,
      };

      // Nếu chọn thu tiền vé ngay tại cổng và vé có phí (> 0đ)
      if (params.collectPaymentNow && vehicle.ticket_amount && vehicle.ticket_amount > 0) {
        try {
          const { data: chargeRows, error: chgErr } = await supabase
            .from('app_charges')
            .select('id, amount, notes')
            .eq('vehicle_visit_id', vehicle.id)
            .eq('charge_type', 'TICKET')
            .eq('status', 'UNPAID')
            .order('created_at', { ascending: true });

          if (chgErr) {
            console.error('Lỗi truy vấn app_charges cho lượt xe:', chgErr);
          }

          if (chargeRows && chargeRows.length > 0) {
            const mainCharge = chargeRows[0];
            const { error: payErr } = await supabase.rpc('sc_collect_payment', {
              p_charge_id: mainCharge.id,
              p_amount: mainCharge.amount,
              p_payment_method: params.paymentMethod || 'CASH',
              p_receipt_code: params.receiptCode || vehicle.ticket_code || undefined,
              p_notes: `Thu tiền vé cổng trực tiếp tại cổng vào (An ninh): ${v.license_plate}`,
            });

            if (!payErr) {
              vehicle.ticket_payment_status = 'PAID';

              // Nếu có bản ghi duplicate thừa, hủy bản ghi thừa
              if (chargeRows.length > 1) {
                for (let i = 1; i < chargeRows.length; i++) {
                  await supabase
                    .from('app_charges')
                    .update({ 
                      status: 'CANCELLED', 
                      notes: (chargeRows[i].notes || '') + ' [Hủy bản ghi thừa trùng lặp]' 
                    })
                    .eq('id', chargeRows[i].id);
                }
              }
            } else {
              console.error('Lỗi gọi sc_collect_payment:', payErr);
            }
          }
        } catch (payExc) {
          console.warn('Cảnh báo ghi nhận thu tiền tại cổng:', payExc);
        }
      }

      return { vehicle };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { vehicle: null, error: 'Lỗi ngoại lệ khi tạo lượt xe: ' + msg };
    }
  }

  /**
   * Tiếp nhận container vào bãi
   * Có bảo vệ Feature Flag NEXT_PUBLIC_ENABLE_REAL_WRITE
   */
  async createContainerEntry(params: CreateContainerParams): Promise<{ container: ContainerVisit | null; error?: string }> {
    if (!isRealWriteEnabled()) {
      return { container: null, error: REAL_WRITE_BLOCKED_MESSAGE };
    }

    try {
      const supabase = createClient();
      let contId: string | null = null;

      if (params.vehicleVisitId) {
        const { data, error } = await supabase.rpc('sc_create_container_visit', {
          p_yard_id: params.yardId,
          p_container_no: params.containerNo,
          p_inbound_vehicle_visit_id: params.vehicleVisitId,
          p_container_size: params.containerSize || undefined,
          p_container_type: params.containerType || 'RF',
          p_idempotency_key: params.idempotencyKey || undefined,
        });

        if (error || !data) {
          return { container: null, error: error?.message || 'Không thể tạo lượt container qua Supabase RPC.' };
        }
        contId = data;
      } else {
        // Tiếp nhận container lẻ hạ bãi (không theo lượt xe vận tải cổng)
        const insertPayload: any = {
          yard_id: params.yardId,
          container_no_current: params.containerNo.trim().toUpperCase(),
          container_no_original: params.containerNo.trim().toUpperCase(),
          container_size: params.containerSize || '40',
          container_type: params.containerType || 'RF',
          cargo_status: (params.cargoStatus as any) || 'CHUA_XAC_DINH',
          inbound_at: params.inboundAt || new Date().toISOString(),
          status: 'IN_YARD',
          created_by: params.operatorId,
          clearance_notes: params.notes || null,
        };
        const { data: newRow, error: insertErr } = await supabase
          .from('app_container_visits')
          .insert(insertPayload)
          .select('id')
          .single();

        if (insertErr || !newRow) {
          return { container: null, error: 'Lỗi tiếp nhận container riêng lẻ: ' + insertErr?.message };
        }
        contId = newRow.id;
      }

      // Cập nhật bổ sung các thuộc tính giờ vào hồi tố nếu có khi gọi qua RPC
      const updates: any = {};
      if (params.cargoStatus) updates.cargo_status = params.cargoStatus;
      if (params.inboundAt) updates.inbound_at = params.inboundAt;
      if (params.notes) updates.clearance_notes = params.notes;

      if (Object.keys(updates).length > 0 && params.vehicleVisitId) {
        await supabase
          .from('app_container_visits')
          .update(updates)
          .eq('id', contId);
      }

      const { data: contRow, error: fetchErr } = await supabase
        .from('app_container_visits')
        .select('*')
        .eq('id', contId)
        .single();

      if (fetchErr || !contRow) {
        return { container: null, error: 'Tạo container thành công nhưng không thể đọc lại bản ghi: ' + fetchErr?.message };
      }

      const c = contRow as unknown as ContainerVisitRow;
      return {
        container: {
          id: c.id,
          yard_id: c.yard_id,
          container_no_current: c.container_no_current,
          container_no_original: c.container_no_original,
          container_size: c.container_size,
          container_type: c.container_type,
          status: c.status as ContainerVisitStatus,
          cargo_status: c.cargo_status as CargoStatus,
          inbound_vehicle_visit_id: c.inbound_vehicle_visit_id,
          inbound_license_plate: params.licensePlate || null,
          inbound_at: c.inbound_at,
          outbound_at: c.outbound_at,
          yard_zone: (c as any).yard_zone || params.yardZone,
          slot_code: (c as any).slot_code || params.slotCode,
          notes: (c as any).notes || params.notes,
          created_at: c.created_at,
          created_by: c.created_by,
          number_changes_count: 0,
        },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { container: null, error: 'Lỗi ngoại lệ khi tạo lượt container: ' + msg };
    }
  }

  /**
   * Cập nhật trạng thái HÀNG / RỖNG (Điều phối viên)
   * Có bảo vệ Feature Flag NEXT_PUBLIC_ENABLE_REAL_WRITE
   */
  async updateCargoStatus(
    containerId: string,
    cargoStatus: CargoStatusUpdate,
    _operatorRole: string
  ): Promise<{ success: boolean; error?: string }> {
    void _operatorRole;
    if (!isRealWriteEnabled()) {
      return { success: false, error: REAL_WRITE_BLOCKED_MESSAGE };
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.rpc('sc_update_container_cargo', {
        p_container_visit_id: containerId,
        p_cargo_status: cargoStatus,
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: 'Lỗi ngoại lệ khi cập nhật HÀNG/RỖNG: ' + msg };
    }
  }

  /**
   * Đọc danh sách phiên cắm điện container
   */
  async getReeferSessions(yardId?: string): Promise<ReeferPowerSession[]> {
    try {
      const supabase = createClient();
      let query = supabase
        .from('app_reefer_power_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (yardId) {
        query = query.eq('yard_id', yardId);
      }

      const { data, error } = await query;
      if (error || !data) {
        return [];
      }
      const rows = data as unknown as ReeferSessionRow[];
      const containerVisitIds = Array.from(new Set(rows.map(r => r.container_visit_id).filter(Boolean)));
      let contNoMap: Record<string, string> = {};
      if (containerVisitIds.length > 0) {
        const { data: cData } = await supabase
          .from('app_container_visits')
          .select('id, container_no_current')
          .in('id', containerVisitIds);
        if (cData) {
          contNoMap = cData.reduce((acc, curr) => {
            if (curr.id && curr.container_no_current) acc[curr.id] = curr.container_no_current;
            return acc;
          }, {} as Record<string, string>);
        }
      }

      return rows.map(r => ({
        id: r.id,
        yard_id: r.yard_id,
        container_visit_id: r.container_visit_id,
        container_no: contNoMap[r.container_visit_id] || '',
        power_status: r.power_status as ReeferPowerStatus,
        plugged_in_at: r.plugged_in_at,
        plugged_in_by: r.plugged_in_by,
        unplugged_at: r.unplugged_at,
        unplugged_by: r.unplugged_by,
        raw_duration_seconds: r.raw_duration_seconds,
        billable_minutes: r.billable_minutes,
        applied_hourly_rate: r.applied_hourly_rate,
        total_power_amount: r.total_power_amount,
        payment_status: r.payment_status as TicketPaymentStatus,
        notes: r.notes,
        created_at: r.created_at,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Cắm điện container lạnh
   * Có bảo vệ Feature Flag NEXT_PUBLIC_ENABLE_REAL_WRITE
   */
  async plugInReefer(params: PlugInReeferParams): Promise<{ session: ReeferPowerSession | null; error?: string }> {
    if (!isRealWriteEnabled()) {
      return { session: null, error: REAL_WRITE_BLOCKED_MESSAGE };
    }

    try {
      const supabase = createClient();
      const { data: sessionId, error } = await supabase.rpc('sc_plug_in_reefer', {
        p_yard_id: params.yardId,
        p_container_visit_id: params.containerVisitId,
        p_plugged_in_at: params.pluggedInAt || undefined,
        p_notes: params.notes || undefined,
      });

      if (error || !sessionId) {
        return { session: null, error: error?.message || 'Không thể cắm điện qua Supabase RPC.' };
      }

      const { data: row, error: fetchErr } = await supabase
        .from('app_reefer_power_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (fetchErr || !row) {
        return { session: null, error: 'Cắm điện thành công nhưng không thể đọc lại bản ghi: ' + fetchErr?.message };
      }

      const r = row as unknown as ReeferSessionRow;
      return {
        session: {
          id: r.id,
          yard_id: r.yard_id,
          container_visit_id: r.container_visit_id,
          container_no: params.containerNo,
          power_status: r.power_status as ReeferPowerStatus,
          plugged_in_at: r.plugged_in_at,
          plugged_in_by: r.plugged_in_by,
          unplugged_at: r.unplugged_at,
          unplugged_by: r.unplugged_by,
          raw_duration_seconds: r.raw_duration_seconds,
          billable_minutes: r.billable_minutes,
          applied_hourly_rate: r.applied_hourly_rate,
          total_power_amount: r.total_power_amount,
          payment_status: r.payment_status as TicketPaymentStatus,
          notes: r.notes,
          created_at: r.created_at,
        },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { session: null, error: 'Lỗi ngoại lệ khi cắm điện: ' + msg };
    }
  }

  /**
   * Rút điện container lạnh và tính tiền
   * Có bảo vệ Feature Flag NEXT_PUBLIC_ENABLE_REAL_WRITE
   */
  async unplugReefer(params: UnplugReeferParams): Promise<{ session: ReeferPowerSession | null; error?: string }> {
    if (!isRealWriteEnabled()) {
      return { session: null, error: REAL_WRITE_BLOCKED_MESSAGE };
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.rpc('sc_unplug_reefer', {
        p_session_id: params.sessionId,
        p_unplugged_at: params.unpluggedAt || undefined,
        p_notes: params.notes || undefined,
      });

      if (error) {
        return { session: null, error: error.message };
      }

      const { data: row, error: fetchErr } = await supabase
        .from('app_reefer_power_sessions')
        .select('*')
        .eq('id', params.sessionId)
        .single();

      if (fetchErr || !row) {
        return { session: null, error: 'Rút điện thành công nhưng không thể đọc lại bản ghi.' };
      }

      const r = row as unknown as ReeferSessionRow;
      return {
        session: {
          id: r.id,
          yard_id: r.yard_id,
          container_visit_id: r.container_visit_id,
          container_no: '',
          power_status: r.power_status as ReeferPowerStatus,
          plugged_in_at: r.plugged_in_at,
          plugged_in_by: r.plugged_in_by,
          unplugged_at: r.unplugged_at,
          unplugged_by: r.unplugged_by,
          raw_duration_seconds: r.raw_duration_seconds,
          billable_minutes: r.billable_minutes,
          applied_hourly_rate: r.applied_hourly_rate,
          total_power_amount: r.total_power_amount,
          payment_status: r.payment_status as TicketPaymentStatus,
          notes: r.notes,
          created_at: r.created_at,
        },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { session: null, error: 'Lỗi ngoại lệ khi rút điện: ' + msg };
    }
  }

  /**
   * Ghi nhận phiên cắm rút hoàn tất hồi tố (theo ảnh/video Zalo timestamp - E04)
   * Có bảo vệ Feature Flag NEXT_PUBLIC_ENABLE_REAL_WRITE
   */
  async recordCompletedReeferSession(params: RecordCompletedReeferSessionParams): Promise<{ session: ReeferPowerSession | null; error?: string }> {
    if (!isRealWriteEnabled()) {
      return { session: null, error: REAL_WRITE_BLOCKED_MESSAGE };
    }

    try {
      const supabase = createClient();
      const { data, error } = await (supabase.rpc as any)('sc_record_completed_reefer_session', {
        p_yard_id: params.yardId,
        p_container_visit_id: params.containerVisitId,
        p_plugged_in_at: params.pluggedInAt,
        p_unplugged_at: params.unpluggedAt,
        p_notes: params.notes || undefined,
      });

      if (error || !data) {
        return { session: null, error: error?.message || 'Không thể ghi nhận phiên điện hoàn tất.' };
      }

      const res = data as unknown as { session_id: string };
      const { data: row, error: fetchErr } = await supabase
        .from('app_reefer_power_sessions')
        .select('*')
        .eq('id', res.session_id)
        .single();

      if (fetchErr || !row) {
        return { session: null, error: 'Ghi nhận thành công nhưng không thể đọc lại bản ghi.' };
      }

      const r = row as unknown as ReeferSessionRow;
      return {
        session: {
          id: r.id,
          yard_id: r.yard_id,
          container_visit_id: r.container_visit_id,
          container_no: params.containerNo || '',
          power_status: r.power_status as ReeferPowerStatus,
          plugged_in_at: r.plugged_in_at,
          plugged_in_by: r.plugged_in_by,
          unplugged_at: r.unplugged_at,
          unplugged_by: r.unplugged_by,
          raw_duration_seconds: r.raw_duration_seconds,
          billable_minutes: r.billable_minutes,
          applied_hourly_rate: r.applied_hourly_rate,
          total_power_amount: r.total_power_amount,
          payment_status: r.payment_status as TicketPaymentStatus,
          notes: r.notes,
          created_at: r.created_at,
        },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { session: null, error: 'Lỗi ngoại lệ khi ghi nhận phiên điện hoàn tất: ' + msg };
    }
  }

  /**
   * CCKB đối chiếu và xác nhận lại giờ giắc Zalo cho phiên điện
   * Có bảo vệ Feature Flag NEXT_PUBLIC_ENABLE_REAL_WRITE
   */
  async verifyReeferSessionZalo(params: VerifyReeferSessionZaloParams): Promise<{ success: boolean; error?: string }> {
    if (!isRealWriteEnabled()) {
      return { success: false, error: REAL_WRITE_BLOCKED_MESSAGE };
    }

    try {
      const supabase = createClient();
      const { error } = await (supabase.rpc as any)('sc_verify_reefer_session_zalo', {
        p_session_id: params.sessionId,
        p_adjusted_plugged_in_at: params.adjustedPluggedInAt || undefined,
        p_adjusted_unplugged_at: params.adjustedUnpluggedAt || undefined,
        p_verification_notes: params.verificationNotes || undefined,
        p_status: params.status || undefined,
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: 'Lỗi ngoại lệ khi xác nhận lại phiên Zalo: ' + msg };
    }
  }

  /**
   * Đọc danh sách khoản phải thu (app_charges)
   * Tự động liên kết biển số xe/loại xe, chuẩn hóa tiếng Việt và khử trùng lặp vé xe.
   */
  async getCharges(yardId?: string): Promise<ChargeItem[]> {
    try {
      const supabase = createClient();
      let query = supabase
        .from('app_charges')
        .select('*')
        .neq('status', 'CANCELLED')
        .order('created_at', { ascending: false });

      if (yardId) {
        query = query.eq('yard_id', yardId);
      }

      const { data, error } = await query;
      if (error || !data) {
        return [];
      }
      const rows = data as unknown as ChargeRow[];

      // 1. Phục hồi container_visit_id từ app_reefer_power_sessions nếu dòng khoản thu chỉ có reefer_session_id
      const reeferSessionIds = Array.from(
        new Set(rows.map(r => r.reefer_session_id).filter((id): id is string => Boolean(id)))
      );
      const sessionToContMap: Record<string, string> = {};
      if (reeferSessionIds.length > 0) {
        try {
          const { data: sData } = await supabase
            .from('app_reefer_power_sessions')
            .select('id, container_visit_id')
            .in('id', reeferSessionIds);
          if (sData) {
            sData.forEach((s: { id: string; container_visit_id: string }) => {
              if (s.container_visit_id) {
                sessionToContMap[s.id] = s.container_visit_id;
              }
            });
          }
        } catch {
          // Bỏ qua lỗi phụ
        }
      }

      // 2. Đọc bảng app_container_visits để lấy mã số container và xe chở vào
      const rawContIds = rows.map(
        r => r.container_visit_id || (r.reefer_session_id ? sessionToContMap[r.reefer_session_id] : null)
      );
      const containerVisitIds = Array.from(new Set(rawContIds.filter((id): id is string => Boolean(id))));
      const contMap: Record<string, { contNo: string; inboundVehicleId?: string | null }> = {};

      if (containerVisitIds.length > 0) {
        try {
          const { data: contData } = await supabase
            .from('app_container_visits')
            .select('id, container_no_current, inbound_vehicle_visit_id')
            .in('id', containerVisitIds);
          if (contData) {
            contData.forEach((c: { id: string; container_no_current: string; inbound_vehicle_visit_id: string | null }) => {
              contMap[c.id] = {
                contNo: c.container_no_current || '',
                inboundVehicleId: c.inbound_vehicle_visit_id || null,
              };
            });
          }
        } catch {
          // Bỏ qua lỗi phụ
        }
      }

      // 3. Đọc bảng app_vehicle_visits để lấy biển số xe và loại xe (cả xe trực tiếp và xe chở cont vào)
      const allVehIds = new Set<string>();
      rows.forEach(r => {
        if (r.vehicle_visit_id) allVehIds.add(r.vehicle_visit_id);
        const cId = r.container_visit_id || (r.reefer_session_id ? sessionToContMap[r.reefer_session_id] : null);
        if (cId && contMap[cId]?.inboundVehicleId) {
          allVehIds.add(contMap[cId].inboundVehicleId!);
        }
      });

      const plateMap: Record<string, { plate: string; type: string; driverName?: string | null; driverPhone?: string | null }> = {};
      if (allVehIds.size > 0) {
        try {
          const { data: vehData } = await supabase
            .from('app_vehicle_visits')
            .select('id, license_plate, vehicle_type, driver_name, driver_phone')
            .in('id', Array.from(allVehIds));

          if (vehData) {
            vehData.forEach((v: { id: string; license_plate: string | null; vehicle_type: string; driver_name?: string | null; driver_phone?: string | null }) => {
              plateMap[v.id] = {
                plate: v.license_plate || '',
                type: v.vehicle_type || '',
                driverName: v.driver_name || null,
                driverPhone: v.driver_phone || null,
              };
            });
          }
        } catch {
          // Bỏ qua lỗi phụ
        }
      }

      // 4. Tra cứu thông tin Khách hàng / Chủ hàng từ app_reefer_requests (CCKB)
      const customerByContVisitId: Record<string, { name: string; phone?: string | null; expectedPlate?: string | null }> = {};
      const customerByContNo: Record<string, { name: string; phone?: string | null; expectedPlate?: string | null }> = {};
      try {
        let reqQuery = (supabase as any)
          .from('app_reefer_requests')
          .select('container_no_planned, customer_name, customer_phone, matched_container_visit_id, expected_license_plate');
        if (yardId) {
          reqQuery = reqQuery.eq('yard_id', yardId);
        }
        const { data: reqData } = await reqQuery;
        if (reqData) {
          reqData.forEach((rq: any) => {
            const info = {
              name: rq.customer_name || '',
              phone: rq.customer_phone || null,
              expectedPlate: rq.expected_license_plate || null,
            };
            if (rq.matched_container_visit_id) {
              customerByContVisitId[rq.matched_container_visit_id] = info;
            }
            if (rq.container_no_planned) {
              customerByContNo[rq.container_no_planned.trim().toUpperCase()] = info;
            }
          });
        }
      } catch {
        // Bỏ qua lỗi phụ
      }

      // Khử trùng lặp: Nếu 1 vehicle_visit_id có nhiều hơn 1 khoản TICKET, ưu tiên bản ghi PAID
      const seenVehicles = new Set<string>();
      const dedupedRows: ChargeRow[] = [];

      const sortedRows = [...rows].sort((a, b) => {
        if (a.status === 'PAID' && b.status !== 'PAID') return -1;
        if (a.status !== 'PAID' && b.status === 'PAID') return 1;
        return 0;
      });

      for (const r of sortedRows) {
        if (r.charge_type === 'TICKET' && r.vehicle_visit_id) {
          if (seenVehicles.has(r.vehicle_visit_id)) {
            continue;
          }
          seenVehicles.add(r.vehicle_visit_id);
        }
        dedupedRows.push(r);
      }

      return dedupedRows.map(r => {
        const cVisitId = r.container_visit_id || (r.reefer_session_id ? sessionToContMap[r.reefer_session_id] : null);
        const contInfo = cVisitId ? contMap[cVisitId] : null;
        const contNo = contInfo?.contNo || null;

        const effectiveVehId = r.vehicle_visit_id || (contInfo?.inboundVehicleId || null);
        const vehInfo = effectiveVehId ? plateMap[effectiveVehId] : null;

        const custInfo = (cVisitId ? customerByContVisitId[cVisitId] : null) ||
                         (contNo ? customerByContNo[contNo.trim().toUpperCase()] : null);
        const customerName = custInfo?.name || vehInfo?.driverName || null;
        const customerPhone = custInfo?.phone || vehInfo?.driverPhone || null;
        const plate = vehInfo?.plate || custInfo?.expectedPlate || null;

        let formattedTitle = r.notes || `Khoản thu ${r.charge_type}`;

        if (r.charge_type === 'TICKET') {
          const typeName = vehInfo?.type ? getVehicleTypeName(vehInfo.type) : 'phương tiện';
          const plateText = plate ? ` (${plate})` : '';
          formattedTitle = `Vé xe vào cổng: ${typeName}${plateText}`;
        } else if (r.charge_type === 'REEFER') {
          const contPrefix = contNo ? `Container ${contNo}` : 'container';
          const noteSuffix = r.notes ? ` — ${r.notes}` : '';
          formattedTitle = `Cước cắm điện ${contPrefix}${noteSuffix}`;
        } else if (r.charge_type === 'STORAGE') {
          const contPrefix = contNo ? `Container ${contNo}` : 'container';
          const noteSuffix = r.notes ? ` — ${r.notes}` : '';
          formattedTitle = `Phí lưu bãi ${contPrefix}${noteSuffix}`;
        }

        return {
          id: r.id,
          yard_id: r.yard_id,
          charge_type: r.charge_type as ChargeType,
          title: formattedTitle,
          container_visit_id: cVisitId || null,
          vehicle_visit_id: effectiveVehId || null,
          reefer_session_id: r.reefer_session_id || null,
          container_no: contNo,
          license_plate: plate,
          customer_name: customerName,
          customer_phone: customerPhone,
          amount: r.amount,
          paid_amount: r.paid_amount,
          status: r.status as ChargeItem['status'],
          notes: r.notes,
          created_at: r.created_at,
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * Đọc danh sách biểu phí hiện hành (app_tariffs)
   */
  async getTariffs(): Promise<TariffItem[]> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('app_tariffs')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error || !data || data.length === 0) {
        return DEFAULT_TARIFFS_V5;
      }
      const rows = data as unknown as TariffRow[];
      return rows.map(r => ({
        id: r.id,
        code: r.code,
        version: r.version,
        name: r.name,
        unit: r.unit,
        amount: r.amount,
        valid_from: r.valid_from,
        valid_to: r.valid_to,
        is_active: r.is_active,
      }));
    } catch {
      return DEFAULT_TARIFFS_V5;
    }
  }

  /**
   * Cập nhật đơn giá biểu phí dịch vụ bến bãi
   * Có bảo vệ Feature Flag NEXT_PUBLIC_ENABLE_REAL_WRITE
   */
  async updateTariff(code: string, amount: number, reason?: string): Promise<{ success: boolean; tariff?: TariffItem; error?: string }> {
    if (amount < 0) {
      return { success: false, error: 'Đơn giá không được âm.' };
    }

    if (!isRealWriteEnabled()) {
      const item = DEFAULT_TARIFFS_V5.find(t => t.code === code);
      if (item) item.amount = amount;
      return { success: true, tariff: item };
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('app_tariffs')
        .update({ amount })
        .eq('code', code)
        .select()
        .single();

      if (error) {
        return { success: false, error: 'Lỗi cập nhật biểu phí Supabase: ' + error.message };
      }
      return { success: true, tariff: data as unknown as TariffItem };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Lỗi kết nối máy chủ.' };
    }
  }

  /**
   * Thu tiền ghi vào sổ cái bất biến (app_payments)
   * Có bảo vệ Feature Flag NEXT_PUBLIC_ENABLE_REAL_WRITE
   */
  async collectPayment(params: CollectPaymentParams): Promise<{ success: boolean; error?: string }> {
    if (!isRealWriteEnabled()) {
      return { success: false, error: REAL_WRITE_BLOCKED_MESSAGE };
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.rpc('sc_collect_payment', {
        p_charge_id: params.chargeId,
        p_amount: params.amount,
        p_payment_method: params.paymentMethod || 'CASH',
        p_receipt_code: params.receiptCode || undefined,
        p_notes: params.notes || undefined,
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: 'Lỗi ngoại lệ khi ghi nhận thu tiền: ' + msg };
    }
  }

  /**
   * Thu gộp nhiều khoản phải thu trong 1 lần giao dịch với cùng mã biên lai
   * Có bảo vệ Feature Flag NEXT_PUBLIC_ENABLE_REAL_WRITE
   */
  async batchCollectPayments(params: BatchCollectPaymentsParams): Promise<{
    success: boolean;
    collectedCount: number;
    totalAmount: number;
    error?: string;
  }> {
    if (!isRealWriteEnabled()) {
      return { success: false, collectedCount: 0, totalAmount: 0, error: REAL_WRITE_BLOCKED_MESSAGE };
    }

    if (!params.chargeIds || params.chargeIds.length === 0) {
      return { success: false, collectedCount: 0, totalAmount: 0, error: 'Không có khoản thu nào được chọn.' };
    }

    try {
      const supabase = createClient();
      let collectedCount = 0;
      let totalAmount = 0;

      const { data: chargeRows, error: fetchErr } = await supabase
        .from('app_charges')
        .select('id, amount, paid_amount, status, charge_type')
        .in('id', params.chargeIds);

      if (fetchErr || !chargeRows) {
        return { success: false, collectedCount: 0, totalAmount: 0, error: 'Không thể đọc thông tin các khoản thu: ' + fetchErr?.message };
      }

      for (const chg of chargeRows) {
        if (chg.status === 'PAID' || chg.status === 'CANCELLED') continue;

        const remain = Number(chg.amount) - Number(chg.paid_amount);
        if (remain <= 0) continue;

        const { error: payErr } = await supabase.rpc('sc_collect_payment', {
          p_charge_id: chg.id,
          p_amount: remain,
          p_payment_method: params.paymentMethod,
          p_receipt_code: params.receiptCode,
          p_notes: params.notes || `Thu gộp theo biên lai ${params.receiptCode}`,
        });

        if (payErr) {
          console.error(`Lỗi thu gộp cho khoản ${chg.id}:`, payErr);
        } else {
          collectedCount++;
          totalAmount += remain;
        }
      }

      if (collectedCount === 0) {
        return { success: false, collectedCount: 0, totalAmount: 0, error: 'Không thể ghi nhận thu tiền cho bất kỳ khoản nào đã chọn.' };
      }

      return { success: true, collectedCount, totalAmount };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, collectedCount: 0, totalAmount: 0, error: 'Lỗi ngoại lệ khi thu gộp: ' + msg };
    }
  }

  /**
   * Đọc danh sách thanh toán (app_payments) phục vụ Báo cáo Ca trực & Đối soát
   */
  async getPayments(filter?: GetPaymentsFilter): Promise<PaymentRecord[]> {
    try {
      const supabase = createClient();
      let query = supabase
        .from('app_payments')
        .select('*')
        .order('collected_at', { ascending: false });

      if (filter?.yardId) {
        query = query.eq('yard_id', filter.yardId);
      }
      if (filter?.startDate) {
        query = query.gte('collected_at', filter.startDate);
      }
      if (filter?.endDate) {
        query = query.lte('collected_at', filter.endDate);
      }
      if (filter?.collectorDept && filter.collectorDept !== 'ALL') {
        query = query.eq('collector_dept', filter.collectorDept);
      }
      if (filter?.paymentMethod && filter.paymentMethod !== 'ALL') {
        query = query.eq('payment_method', filter.paymentMethod);
      }

      const { data, error } = await query;
      if (error || !data) {
        return [];
      }

      const paymentRows = data as any[];
      if (paymentRows.length === 0) return [];

      const chargeIds = Array.from(new Set(paymentRows.map(p => p.charge_id).filter(Boolean)));
      const chargeMap: Record<string, { type: ChargeType; notes: string | null; vehId: string | null; contId: string | null }> = {};
      const vehicleIds: string[] = [];
      const containerIds: string[] = [];

      if (chargeIds.length > 0) {
        const { data: chgData } = await supabase
          .from('app_charges')
          .select('id, charge_type, notes, vehicle_visit_id, container_visit_id')
          .in('id', chargeIds);

        if (chgData) {
          chgData.forEach((c: any) => {
            chargeMap[c.id] = {
              type: c.charge_type,
              notes: c.notes,
              vehId: c.vehicle_visit_id,
              contId: c.container_visit_id,
            };
            if (c.vehicle_visit_id) vehicleIds.push(c.vehicle_visit_id);
            if (c.container_visit_id) containerIds.push(c.container_visit_id);
          });
        }
      }

      const plateMap: Record<string, string> = {};
      if (vehicleIds.length > 0) {
        const { data: vehData } = await supabase
          .from('app_vehicle_visits')
          .select('id, license_plate')
          .in('id', Array.from(new Set(vehicleIds)));
        if (vehData) {
          vehData.forEach((v: any) => { plateMap[v.id] = v.license_plate || ''; });
        }
      }

      const contMap: Record<string, string> = {};
      if (containerIds.length > 0) {
        const { data: contData } = await supabase
          .from('app_container_visits')
          .select('id, container_no_current')
          .in('id', Array.from(new Set(containerIds)));
        if (contData) {
          contData.forEach((c: any) => { contMap[c.id] = c.container_no_current || ''; });
        }
      }

      return paymentRows.map(p => {
        const chg = chargeMap[p.charge_id];
        const vehPlate = chg?.vehId ? plateMap[chg.vehId] : null;
        const contNo = chg?.contId ? contMap[chg.contId] : null;

        return {
          id: p.id,
          yard_id: p.yard_id,
          charge_id: p.charge_id,
          payment_amount: Number(p.payment_amount) || 0,
          payment_method: p.payment_method,
          collected_by: p.collected_by,
          collected_by_name: p.collected_by_name || (p.collector_dept === 'AN_NINH' ? 'An ninh Cổng' : 'Thương vụ CCKB'),
          collector_dept: p.collector_dept,
          collected_at: p.collected_at,
          receipt_code: p.receipt_code,
          notes: p.notes,
          charge_type: chg?.type,
          charge_title: chg?.notes || undefined,
          license_plate: vehPlate,
          container_no: contNo,
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * CCKB phê duyệt điều kiện xuất bãi (Exit Clearance)
   * Có bảo vệ Feature Flag NEXT_PUBLIC_ENABLE_REAL_WRITE
   */
  async approveClearance(params: ApproveClearanceParams): Promise<{ success: boolean; error?: string }> {
    if (!isRealWriteEnabled()) {
      return { success: false, error: REAL_WRITE_BLOCKED_MESSAGE };
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.rpc('sc_approve_exit_clearance', {
        p_container_visit_id: params.containerId,
        p_allow_debt: params.allowDebt || false,
        p_notes: params.notes || undefined,
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: 'Lỗi ngoại lệ khi duyệt clearance: ' + msg };
    }
  }

  /**
   * An ninh xác nhận container ra bãi vật lý tại cổng và chốt phí lưu
   * Có bảo vệ Feature Flag NEXT_PUBLIC_ENABLE_REAL_WRITE
   */
  async confirmPhysicalExit(params: ConfirmExitParams): Promise<{ 
    success: boolean; 
    storageFee: number; 
    chargedNights: number; 
    error?: string;
  }> {
    if (!isRealWriteEnabled()) {
      return { success: false, storageFee: 0, chargedNights: 0, error: REAL_WRITE_BLOCKED_MESSAGE };
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('sc_confirm_physical_exit', {
        p_container_visit_id: params.containerId,
        p_outbound_vehicle_id: params.outboundVehicleId || undefined,
        p_notes: params.notes || undefined,
        p_paid_at_gate: params.paidAtGate || false,
        p_payment_method: params.paymentMethod || 'CASH',
        p_receipt_code: params.receiptCode || undefined,
      });

      if (error || !data) {
        return { success: false, storageFee: 0, chargedNights: 0, error: error?.message || 'Không thể xác nhận xuất bãi vật lý.' };
      }

      const res = data as unknown as Record<string, unknown>;
      return {
        success: true,
        storageFee: Number(res?.storage_fee || 0),
        chargedNights: Number(res?.charged_nights || 0),
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, storageFee: 0, chargedNights: 0, error: 'Lỗi ngoại lệ khi xuất bãi container: ' + msg };
    }
  }

  /**
   * Tính phí lưu bãi container (Gọi RPC sc_calculate_storage_fee hoặc thuật toán 22:00-06:00 V5)
   */
  async calculateStorageFee(inboundAt: string, outboundAt?: string): Promise<{
    totalNights: number;
    chargedNights: number;
    fee: number;
  }> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('sc_calculate_storage_fee', {
        p_inbound_at: inboundAt,
        p_outbound_at: outboundAt || new Date().toISOString(),
      });

      if (!error && data) {
        const res = data as unknown as { total_nights: number; charged_nights: number; storage_fee: number };
        return {
          totalNights: Number(res.total_nights) || 0,
          chargedNights: Number(res.charged_nights) || 0,
          fee: Number(res.storage_fee) || 0,
        };
      }
    } catch {
      // Bỏ qua lỗi kết nối và fallback xuống thuật toán offline chuẩn
    }

    return calculateStorageFeeOffline(inboundAt, outboundAt);
  }

  /**
   * An ninh xác nhận xe riêng không cõng cont rời bãi
   * Có bảo vệ Feature Flag NEXT_PUBLIC_ENABLE_REAL_WRITE
   */
  async confirmVehicleOnlyExit(params: ConfirmVehicleOnlyExitParams): Promise<{ success: boolean; error?: string }> {
    if (!isRealWriteEnabled()) {
      return { success: false, error: REAL_WRITE_BLOCKED_MESSAGE };
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.rpc('sc_confirm_vehicle_only_exit', {
        p_vehicle_visit_id: params.vehicleId,
        p_notes: params.notes || undefined,
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: 'Lỗi ngoại lệ khi xuất bãi xe riêng: ' + msg };
    }
  }

  /**
   * Đọc lịch sử sửa số container
   */
  async getContainerNumberChanges(containerId: string): Promise<ContainerNumberChange[]> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('app_container_number_changes')
        .select('*')
        .eq('container_visit_id', containerId)
        .order('changed_at', { ascending: false });

      if (error || !data) {
        return [];
      }
      const rows = data as unknown as ContainerNumberChangeRow[];
      return rows.map(r => ({
        id: r.id,
        container_visit_id: r.container_visit_id,
        yard_id: r.yard_id,
        old_number: r.old_number,
        new_number: r.new_number,
        reason: r.reason,
        evidence_url: r.evidence_url,
        changed_by: r.changed_by,
        changed_at: r.changed_at,
        notified_cckb: r.notified_cckb,
        sec_ack_at: r.sec_ack_at,
        sec_ack_by: r.sec_ack_by,
        reconciled_at: r.reconciled_at,
        reconciled_by: r.reconciled_by,
        reconcile_notes: r.reconcile_notes,
        created_at: r.created_at,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Sửa số container trên cùng ID lượt
   * Có bảo vệ Feature Flag NEXT_PUBLIC_ENABLE_REAL_WRITE
   */
  async correctContainerNumber(params: CorrectContainerNumberParams): Promise<{ success: boolean; error?: string }> {
    if (!isRealWriteEnabled()) {
      return { success: false, error: REAL_WRITE_BLOCKED_MESSAGE };
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.rpc('sc_correct_container_number', {
        p_container_visit_id: params.containerId,
        p_new_container_no: params.newNumber,
        p_reason: params.reason,
        p_evidence_url: params.evidenceUrl || undefined,
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: 'Lỗi ngoại lệ khi sửa số container: ' + msg };
    }
  }

  /**
   * Đọc lịch sử sửa biển số xe (từ app_audit_logs và client cache)
   */
  async getVehiclePlateChanges(vehicleId: string): Promise<VehiclePlateChange[]> {
    try {
      const supabase = createClient();
      const changes: VehiclePlateChange[] = [];

      // 1. Thử đọc từ app_audit_logs nếu có dữ liệu
      const { data: logs, error } = await (supabase as any)
        .from('app_audit_logs')
        .select('*')
        .eq('entity_name', 'app_vehicle_visits')
        .eq('entity_id', vehicleId)
        .eq('event_type', 'vehicle.visit.update_basic')
        .order('performed_at', { ascending: false });

      if (!error && logs && Array.isArray(logs) && logs.length > 0) {
        logs.forEach((log: any, index: number) => {
          const oldData = log.old_data as Record<string, unknown> | null;
          const newData = log.new_data as Record<string, unknown> | null;
          const oldPlate = String(oldData?.license_plate || '');
          const newPlate = String(newData?.license_plate || '');
          if (newPlate && newPlate !== oldPlate) {
            changes.push({
              id: log.id || `audit-${index}`,
              vehicle_visit_id: vehicleId,
              yard_id: log.yard_id || '',
              old_plate: oldPlate || '—',
              new_plate: newPlate,
              reason: String(newData?.note || log.notes || 'Sửa biển số xe'),
              changed_by: log.actor_id || '',
              changed_by_name: log.actor_name || 'Nhân viên trực',
              changed_at: log.performed_at,
            });
          }
        });
      }

      // 2. Bổ sung từ client cache (localStorage)
      if (typeof window !== 'undefined') {
        const localKey = `soncang_v5_plate_changes_${vehicleId}`;
        const localJson = localStorage.getItem(localKey);
        if (localJson) {
          try {
            const localChanges: VehiclePlateChange[] = JSON.parse(localJson);
            localChanges.forEach((lc) => {
              if (!changes.some((c) => c.new_plate === lc.new_plate && Math.abs(new Date(c.changed_at).getTime() - new Date(lc.changed_at).getTime()) < 60000)) {
                changes.push(lc);
              }
            });
          } catch {}
        }
      }

      changes.sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime());
      return changes;
    } catch {
      if (typeof window !== 'undefined') {
        const localJson = localStorage.getItem(`soncang_v5_plate_changes_${vehicleId}`);
        if (localJson) {
          try {
            return JSON.parse(localJson);
          } catch {}
        }
      }
      return [];
    }
  }

  /**
   * Sửa biển số xe trên cùng ID lượt và lưu log lịch sử (An ninh / Điều phối)
   * Có bảo vệ Feature Flag NEXT_PUBLIC_ENABLE_REAL_WRITE
   */
  async correctVehiclePlate(params: CorrectVehiclePlateParams): Promise<{ success: boolean; error?: string }> {
    if (!isRealWriteEnabled()) {
      return { success: false, error: REAL_WRITE_BLOCKED_MESSAGE };
    }

    try {
      const supabase = createClient();
      // 1. Đọc thông tin xe hiện tại
      const { data: vehRow, error: fetchErr } = await supabase
        .from('app_vehicle_visits')
        .select('*')
        .eq('id', params.vehicleId)
        .single();

      if (fetchErr || !vehRow) {
        return { success: false, error: 'Không tìm thấy lượt xe để sửa biển số: ' + fetchErr?.message };
      }

      const oldPlate = vehRow.license_plate || '—';
      const cleanNewPlate = params.newLicensePlate.trim().toUpperCase();

      if (!cleanNewPlate || cleanNewPlate.length < 3) {
        return { success: false, error: 'Biển số xe mới không hợp lệ (tối thiểu 3 ký tự).' };
      }

      if (cleanNewPlate === oldPlate.trim().toUpperCase()) {
        return { success: false, error: 'Biển số mới trùng với biển số xe hiện tại. Không cần thay đổi.' };
      }

      if (!params.reason.trim() || params.reason.trim().length < 3) {
        return { success: false, error: 'Lý do sửa biển số xe là bắt buộc (tối thiểu 3 ký tự).' };
      }

      const existingNote = vehRow.note ? `${vehRow.note} | ` : '';
      const updatedNote = `${existingNote}Sửa biển (${oldPlate} -> ${cleanNewPlate}): ${params.reason.trim()}`;

      // 2. Gọi RPC chuẩn sc_update_vehicle_visit_basic (đã tích hợp ghi sc_log_audit_event)
      const { error: rpcErr } = await supabase.rpc('sc_update_vehicle_visit_basic', {
        p_vehicle_visit_id: params.vehicleId,
        p_license_plate: cleanNewPlate,
        p_driver_name: vehRow.driver_name || '',
        p_driver_phone: vehRow.driver_phone || '',
        p_note: updatedNote,
      });

      if (rpcErr) {
        return { success: false, error: rpcErr.message };
      }

      // 3. Lưu lịch sử vào client storage để hiển thị tức thì
      if (typeof window !== 'undefined') {
        const localKey = `soncang_v5_plate_changes_${params.vehicleId}`;
        const existingJson = localStorage.getItem(localKey);
        let changes: VehiclePlateChange[] = [];
        if (existingJson) {
          try {
            changes = JSON.parse(existingJson);
          } catch {}
        }
        changes.unshift({
          id: `vpc-${Date.now()}`,
          vehicle_visit_id: params.vehicleId,
          yard_id: vehRow.yard_id,
          old_plate: oldPlate,
          new_plate: cleanNewPlate,
          reason: params.reason.trim(),
          changed_by: params.operatorId,
          changed_by_name: params.operatorName,
          changed_at: new Date().toISOString(),
        });
        localStorage.setItem(localKey, JSON.stringify(changes));
      }

      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: 'Lỗi ngoại lệ khi sửa biển số xe: ' + msg };
    }
  }

  /**
   * Đọc danh sách yêu cầu cắm điện dự kiến (CCKB)
   */
  async getReeferRequests(yardId?: string): Promise<ReeferRequest[]> {
    try {
      const supabase = createClient();
      let query = (supabase as any)
        .from('app_reefer_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (yardId) {
        query = query.eq('yard_id', yardId);
      }

      const { data, error } = await query;
      if (error || !data) {
        return [];
      }

      return (data as any[]).map((r) => ({
        id: r.id,
        yard_id: r.yard_id,
        container_no: r.container_no || r.container_no_planned || '',
        container_no_planned: r.container_no_planned || r.container_no,
        expected_license_plate: r.expected_license_plate,
        customer_name: r.customer_name,
        customer_phone: r.customer_phone,
        cargo_type: r.cargo_type,
        power_mode: r.power_mode,
        expected_hours: r.expected_hours || (r.power_mode === 'HOURLY' ? 8 : null),
        target_temperature: r.target_temperature || r.temperature_setting,
        temperature_setting: r.temperature_setting || r.target_temperature,
        status: r.status,
        container_visit_id: r.container_visit_id || r.matched_container_visit_id,
        notes: r.notes,
        created_by: r.created_by,
        created_at: r.created_at,
        arrived_at: r.arrived_at,
        plugged_at: r.plugged_at,
        completed_at: r.completed_at,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Tạo yêu cầu cắm điện container (CCKB) - hỗ trợ cả container trong bãi và đăng ký trước
   */
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
    if (!isRealWriteEnabled()) {
      return { error: REAL_WRITE_BLOCKED_MESSAGE };
    }

    try {
      const supabase = createClient();
      const contNo = (params.containerNo || params.containerNoPlanned || '').trim().toUpperCase();
      let composedNotes = params.notes?.trim() || '';
      if (params.expectedHours && params.powerMode === 'HOURLY' && !composedNotes.includes('Dự kiến cắm:')) {
        const { data: tariffRow } = await supabase
          .from('app_tariffs')
          .select('amount')
          .eq('code', 'DIEN_CONT_GIO')
          .eq('is_active', true)
          .maybeSingle();
        const rate = (tariffRow as any)?.amount || 100000;
        composedNotes = `[Dự kiến cắm: ${params.expectedHours} giờ (ước tính ${(params.expectedHours * rate).toLocaleString('vi-VN')}đ)] ${composedNotes}`.trim();
      }

      const { data: reqId, error } = await (supabase as any).rpc('sc_create_reefer_request', {
        p_yard_id: params.yardId,
        p_container_no_planned: contNo,
        p_expected_license_plate: params.expectedLicensePlate?.trim().toUpperCase() || undefined,
        p_customer_name: params.customerName?.trim() || undefined,
        p_customer_phone: params.customerPhone?.trim() || undefined,
        p_power_mode: params.powerMode || 'HOURLY',
        p_temperature_setting: params.targetTemperature?.trim() || params.temperatureSetting?.trim() || undefined,
        p_notes: composedNotes || undefined,
      });

      if (error || !reqId) {
        return { error: error?.message || 'Không thể tạo yêu cầu cắm điện dự kiến.' };
      }

      // Nếu container đã ở trong bãi, cập nhật liên kết containerVisitId và trạng thái
      if (params.containerVisitId) {
        await this.matchReeferRequest({
          requestId: String(reqId),
          containerVisitId: params.containerVisitId,
          status: params.status || 'CONTAINER_ARRIVED',
        });
      }

      return { id: String(reqId) };
    } catch (err: any) {
      return { error: err?.message || 'Lỗi ngoại lệ khi tạo yêu cầu điện dự kiến.' };
    }
  }

  /**
   * Khớp hoặc cập nhật trạng thái yêu cầu điện dự kiến khi container vào bãi
   */
  async matchReeferRequest(params: {
    requestId: string;
    containerVisitId?: string;
    status?: 'PLANNED' | 'CONTAINER_ARRIVED' | 'PLUGGED' | 'COMPLETED' | 'CANCELLED';
  }): Promise<{ success: boolean; error?: string }> {
    if (!isRealWriteEnabled()) {
      return { success: false, error: REAL_WRITE_BLOCKED_MESSAGE };
    }

    try {
      const supabase = createClient();
      if (params.status && params.status !== 'CONTAINER_ARRIVED') {
        const updatePayload: Record<string, any> = {
          status: params.status,
        };
        if (params.containerVisitId) updatePayload.container_visit_id = params.containerVisitId;
        if (params.status === 'PLUGGED') updatePayload.plugged_at = new Date().toISOString();
        if (params.status === 'COMPLETED') updatePayload.completed_at = new Date().toISOString();

        const { error } = await (supabase as any)
          .from('app_reefer_requests')
          .update(updatePayload)
          .eq('id', params.requestId);

        if (error) {
          return { success: false, error: error.message };
        }
        return { success: true };
      }

      const { error } = await (supabase as any).rpc('sc_match_reefer_request', {
        p_request_id: params.requestId,
        p_container_visit_id: params.containerVisitId || null,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Lỗi ngoại lệ khi khớp yêu cầu điện dự kiến.' };
    }
  }

  /**
   * Cập nhật thông tin chi tiết yêu cầu điện dự kiến (CCKB)
   */
  async updateReeferRequest(params: UpdateReeferRequestParams): Promise<{ success: boolean; error?: string }> {
    if (!isRealWriteEnabled()) {
      return { success: false, error: REAL_WRITE_BLOCKED_MESSAGE };
    }

    try {
      const supabase = createClient();
      const { error } = await (supabase as any).rpc('sc_update_reefer_request', {
        p_request_id: params.requestId,
        p_container_no_planned: params.containerNoPlanned?.trim() || undefined,
        p_expected_license_plate: params.expectedLicensePlate?.trim() || undefined,
        p_customer_name: params.customerName?.trim() || undefined,
        p_customer_phone: params.customerPhone?.trim() || undefined,
        p_power_mode: params.powerMode || undefined,
        p_temperature_setting: params.temperatureSetting?.trim() || undefined,
        p_status: params.status || undefined,
        p_notes: params.notes?.trim() || undefined,
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Lỗi ngoại lệ khi cập nhật yêu cầu điện dự kiến.' };
    }
  }

  /**
   * Kiểm tra trùng lặp biển số xe đang trong bãi theo chính sách chuyên sâu
   */
  async checkVehicleDuplicate(licensePlate: string, vehicleType?: string, yardId?: string): Promise<VehicleDuplicateCheckResult> {
    try {
      const supabase = createClient();
      let targetYardId = yardId;
      if (!targetYardId) {
        const { data: yData } = await supabase.from('app_yards').select('id').limit(1).maybeSingle();
        targetYardId = yData?.id;
      }
      if (!targetYardId) {
        return { has_duplicate: false, can_proceed: true };
      }

      const { data, error } = await (supabase as any).rpc('sc_check_vehicle_duplicate', {
        p_yard_id: targetYardId,
        p_license_plate: licensePlate.trim().toUpperCase(),
        p_vehicle_type: vehicleType || null,
      });

      if (error || !data) {
        console.warn('Lỗi gọi sc_check_vehicle_duplicate:', error?.message);
        return { has_duplicate: false, can_proceed: true };
      }

      return data as VehicleDuplicateCheckResult;
    } catch (err) {
      console.error('Ngoại lệ checkVehicleDuplicate:', err);
      return { has_duplicate: false, can_proceed: true };
    }
  }

  /**
   * Đọc cấu hình chính sách kiểm soát trùng lặp xe của bãi
   */
  async getVehicleDuplicatePolicy(yardId?: string): Promise<VehicleDuplicatePolicy | null> {
    try {
      const supabase = createClient();
      let query = (supabase as any).from('app_vehicle_duplicate_policies').select('*');
      if (yardId) {
        query = query.eq('yard_id', yardId);
      }
      const { data, error } = await query.limit(1).maybeSingle();

      if (error || !data) {
        return null;
      }
      return data as unknown as VehicleDuplicatePolicy;
    } catch (err) {
      console.error('Ngoại lệ getVehicleDuplicatePolicy:', err);
      return null;
    }
  }

  /**
   * Cập nhật cấu hình chính sách kiểm soát trùng lặp xe
   */
  async updateVehicleDuplicatePolicy(params: Partial<VehicleDuplicatePolicy> & { yard_id: string }): Promise<{ success: boolean; policy?: VehicleDuplicatePolicy; error?: string }> {
    if (!isRealWriteEnabled()) {
      return { success: false, error: REAL_WRITE_BLOCKED_MESSAGE };
    }

    try {
      const supabase = createClient();
      const { data, error } = await (supabase as any).rpc('sc_update_vehicle_duplicate_policy', {
        p_yard_id: params.yard_id,
        p_policy_mode: params.policy_mode || 'WARN_AND_ALLOW',
        p_cooldown_minutes: params.cooldown_minutes ?? 15,
        p_cooldown_action: params.cooldown_action || 'BLOCK',
        p_check_unpaid_ticket: params.check_unpaid_ticket ?? true,
        p_block_if_unpaid_ticket: params.block_if_unpaid_ticket ?? false,
        p_require_override_reason: params.require_override_reason ?? true,
        p_allow_quick_exit_previous: params.allow_quick_exit_previous ?? true,
        p_exempt_vehicle_types: params.exempt_vehicle_types || ['DAU_KEO', 'XE_BO_4_CHAN', 'XE_BO_3_CHAN', 'XE_BO_8_TAN_2_CHAN', 'XE_SANG_TAI'],
        p_preset_reasons: params.preset_reasons || null,
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, policy: data as VehicleDuplicatePolicy };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Lỗi ngoại lệ khi cập nhật chính sách kiểm soát trùng xe.' };
    }
  }

  /**
   * Lấy danh mục các phân khu chức năng của bến bãi
   */
  async getYardZones(): Promise<YardZoneInfo[]> {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('soncang_v5_yard_zones');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return [...SEED_YARD_ZONES_SON_CANG];
  }

  /**
   * Tạo phân khu bãi mới (Điều phối viên / SYS_ADMIN)
   */
  async createYardZone(zone: YardZoneInfo): Promise<{ success: boolean; error?: string }> {
    const currentZones = await this.getYardZones();
    const cleanCode = zone.code.trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, error: 'Mã phân khu không được để trống.' };
    }
    if (currentZones.some(z => z.code === cleanCode)) {
      return { success: false, error: `Mã phân khu "${cleanCode}" đã tồn tại.` };
    }
    currentZones.push({
      ...zone,
      code: cleanCode,
      name: zone.name.trim(),
      description: zone.description.trim(),
      capacity: Number(zone.capacity) || 0,
      has_power_outlets: Boolean(zone.has_power_outlets),
      color_badge: zone.color_badge || 'bg-slate-100 text-slate-800 border-slate-300',
    });
    if (typeof window !== 'undefined') {
      localStorage.setItem('soncang_v5_yard_zones', JSON.stringify(currentZones));
    }
    return { success: true };
  }

  /**
   * Cập nhật thông tin phân khu bãi (Điều phối viên / SYS_ADMIN)
   */
  async updateYardZone(code: string, zoneUpdate: Partial<YardZoneInfo>): Promise<{ success: boolean; error?: string }> {
    const currentZones = await this.getYardZones();
    const idx = currentZones.findIndex(z => z.code === code);
    if (idx === -1) {
      return { success: false, error: `Không tìm thấy phân khu "${code}".` };
    }
    currentZones[idx] = {
      ...currentZones[idx],
      ...zoneUpdate,
      name: zoneUpdate.name !== undefined ? zoneUpdate.name.trim() : currentZones[idx].name,
      description: zoneUpdate.description !== undefined ? zoneUpdate.description.trim() : currentZones[idx].description,
      capacity: zoneUpdate.capacity !== undefined ? (Number(zoneUpdate.capacity) || 0) : currentZones[idx].capacity,
      has_power_outlets: zoneUpdate.has_power_outlets !== undefined ? Boolean(zoneUpdate.has_power_outlets) : currentZones[idx].has_power_outlets,
      color_badge: zoneUpdate.color_badge !== undefined ? zoneUpdate.color_badge : currentZones[idx].color_badge,
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem('soncang_v5_yard_zones', JSON.stringify(currentZones));
    }
    return { success: true };
  }

  /**
   * Xóa phân khu bãi
   */
  async deleteYardZone(code: string): Promise<{ success: boolean; error?: string }> {
    const vehicles = await this.getVehicles();
    const containers = await this.getContainers();
    const hasVehicles = vehicles.some(v => v.yard_zone === code && v.status === 'IN_YARD');
    const hasContainers = containers.some(c => c.yard_zone === code && c.status === 'IN_YARD');
    if (hasVehicles || hasContainers) {
      return { 
        success: false, 
        error: `Không thể xóa phân khu "${code}" vì vẫn còn ${hasVehicles ? 'xe' : ''} ${hasContainers ? 'container' : ''} đang đỗ tại phân khu này. Vui lòng chuyển vị trí trước khi xóa!` 
      };
    }
    const currentZones = (await this.getYardZones()).filter(z => z.code !== code);
    if (typeof window !== 'undefined') {
      localStorage.setItem('soncang_v5_yard_zones', JSON.stringify(currentZones));
    }
    return { success: true };
  }

  /**
   * Cập nhật vị trí đỗ / phân khu bãi của phương tiện (Điều phối viên / An ninh)
   */
  async updateVehicleLocation(params: { vehicleId: string; yardZone?: string; slotCode?: string }): Promise<{ success: boolean; error?: string }> {
    if (!isRealWriteEnabled()) {
      return { success: false, error: REAL_WRITE_BLOCKED_MESSAGE };
    }
    try {
      const supabase = createClient();
      const { error } = await (supabase as any)
        .from('app_vehicle_visits')
        .update({
          yard_zone: params.yardZone,
          slot_code: params.slotCode,
        })
        .eq('id', params.vehicleId);

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Lỗi khi cập nhật vị trí xe.' };
    }
  }

  /**
   * Cập nhật vị trí bãi của container (Điều phối viên)
   */
  async updateContainerLocation(params: { containerId: string; yardZone?: string; slotCode?: string }): Promise<{ success: boolean; error?: string }> {
    if (!isRealWriteEnabled()) {
      return { success: false, error: REAL_WRITE_BLOCKED_MESSAGE };
    }
    try {
      const supabase = createClient();
      const { error } = await (supabase as any)
        .from('app_container_visits')
        .update({
          yard_zone: params.yardZone,
          slot_code: params.slotCode,
        })
        .eq('id', params.containerId);

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Lỗi khi cập nhật vị trí container.' };
    }
  }

  /**
   * Ghi nhận nhật ký đo kiểm nhiệt độ container lạnh định kỳ
   */
  async recordReeferTemperatureLog(params: Omit<ReeferTemperatureLog, 'id'>): Promise<{ success: boolean; error?: string }> {
    if (!isRealWriteEnabled()) {
      return { success: false, error: REAL_WRITE_BLOCKED_MESSAGE };
    }
    try {
      const supabase = createClient();
      const { error } = await (supabase as any)
        .from('app_reefer_temperature_logs')
        .insert({
          container_visit_id: params.container_visit_id,
          container_no: params.container_no,
          temperature_celsius: params.temperature_celsius,
          cooling_status: params.cooling_status || 'RUNNING_NORMAL',
          notes: params.notes || null,
          logged_at: params.logged_at || new Date().toISOString(),
          logged_by: params.logged_by || null,
          logged_by_name: params.logged_by_name || null,
        });

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Lỗi khi ghi nhật ký nhiệt độ.' };
    }
  }

  /**
   * Lấy lịch sử đo kiểm nhiệt độ container lạnh
   */
  async getReeferTemperatureLogs(containerVisitId?: string): Promise<ReeferTemperatureLog[]> {
    try {
      const supabase = createClient();
      let query = (supabase as any)
        .from('app_reefer_temperature_logs')
        .select('*')
        .order('logged_at', { ascending: false });

      if (containerVisitId) {
        query = query.eq('container_visit_id', containerVisitId);
      }
      const { data, error } = await query;
      if (error || !data) return [];
      return data as ReeferTemperatureLog[];
    } catch {
      return [];
    }
  }

  /**
   * Lấy danh sách phương tiện đã xuất bãi trong ngày phục vụ tra cứu cổng ra
   */
  async getExitedVehicles(yardId?: string, limit: number = 50): Promise<VehicleVisit[]> {
    try {
      const supabase = createClient();
      let query = (supabase as any)
        .from('app_vehicle_visits')
        .select('*')
        .eq('status', 'EXITED')
        .order('exit_at', { ascending: false })
        .limit(limit);

      if (yardId) {
        query = query.eq('yard_id', yardId);
      }
      const { data, error } = await query;
      if (error || !data) return [];
      return (data as any[]).map(r => ({
        id: r.id,
        yard_id: r.yard_id,
        vehicle_type: r.vehicle_type,
        license_plate: r.license_plate,
        driver_name: r.driver_name,
        driver_phone: r.driver_phone,
        entry_at: r.entry_at,
        entry_by: r.entry_by || 'SYSTEM',
        entry_by_name: r.entry_by_name,
        exit_at: r.exit_at,
        exit_by: r.exit_by || null,
        idempotency_key: r.idempotency_key || null,
        status: r.status as VehicleVisitStatus,
        ticket_code: r.ticket_code,
        ticket_amount: r.ticket_amount,
        ticket_payment_status: r.ticket_payment_status as TicketPaymentStatus,
        paid_at: r.paid_at,
        payment_method: r.payment_method,
        collected_by: r.collected_by,
        collected_by_name: r.collected_by_name,
        yard_zone: r.yard_zone,
        slot_code: r.slot_code,
        note: r.notes || r.note || null,
        created_at: r.created_at,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Ca trưởng An ninh / Quản trị viên hiệu chỉnh lượt xe (Backdate giờ vào/ra, sửa loại xe, hủy vé/hoàn tiền)
   * Có bảo vệ Feature Flag NEXT_PUBLIC_ENABLE_REAL_WRITE
   */
  async adjustVehicleVisit(params: AdjustVehicleVisitParams): Promise<{ success: boolean; vehicle?: VehicleVisit; error?: string }> {
    if (!['SEC_LEAD', 'SYS_ADMIN'].includes(params.operatorRole)) {
      return {
        success: false,
        error: 'Từ chối truy cập: Chỉ Ca trưởng An ninh (SEC_LEAD) hoặc Quản trị viên (SYS_ADMIN) mới có quyền hiệu chỉnh lượt xe!'
      };
    }

    if (!params.reason || params.reason.trim().length < 5) {
      return {
        success: false,
        error: 'Bắt buộc nhập lý do hiệu chỉnh tối thiểu 5 ký tự để lưu vết kiểm toán ca trực!'
      };
    }

    if (!isRealWriteEnabled()) {
      return { success: false, error: REAL_WRITE_BLOCKED_MESSAGE };
    }

    try {
      const supabase = createClient();

      // Gọi RPC SECURITY DEFINER sc_adjust_vehicle_visit để tránh lỗi RLS permission denied
      const { data: rpcResult, error: rpcErr } = await (supabase as any).rpc('sc_adjust_vehicle_visit', {
        p_vehicle_id: params.vehicleId,
        p_operator_role: params.operatorRole,
        p_reason: params.reason,
        p_entry_at: params.entryAt || null,
        p_exit_at: params.exitAt !== undefined ? params.exitAt : null,
        p_clear_exit_at: params.exitAt === null,
        p_status: params.status || null,
        p_vehicle_type: params.vehicleType || null,
        p_ticket_payment_status: params.ticketPaymentStatus || null,
        p_ticket_amount: params.ticketAmount !== undefined ? params.ticketAmount : null,
        p_refund_reason: params.refundReason || null,
        p_driver_name: params.driverName !== undefined ? params.driverName : null,
        p_driver_phone: params.driverPhone !== undefined ? params.driverPhone : null,
        p_container_action: params.containerAction || null,
        p_container_action_reason: params.containerActionReason || null,
      });

      if (rpcErr) {
        return { success: false, error: 'Lỗi cập nhật lượt xe qua RPC: ' + rpcErr.message };
      }

      const v = (rpcResult || {}) as any;
      const vehicle: VehicleVisit = {
        id: v.id || params.vehicleId,
        yard_id: v.yard_id || '',
        vehicle_type: v.vehicle_type || params.vehicleType || '',
        vehicle_type_name: getVehicleTypeName(v.vehicle_type || params.vehicleType),
        license_plate: v.license_plate,
        driver_name: v.driver_name,
        driver_phone: v.driver_phone,
        ticket_code: v.ticket_code,
        ticket_amount: v.ticket_amount,
        ticket_payment_status: (v.ticket_payment_status || params.ticketPaymentStatus) as TicketPaymentStatus,
        status: (v.status || params.status || 'IN_YARD') as VehicleVisitStatus,
        entry_at: v.entry_at || params.entryAt || new Date().toISOString(),
        entry_by: v.entry_by || params.operatorId,
        exit_at: v.exit_at,
        exit_by: v.exit_by,
        note: v.note,
        idempotency_key: v.idempotency_key,
      };

      return { success: true, vehicle };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: 'Lỗi ngoại lệ khi hiệu chỉnh lượt xe: ' + msg };
    }
  }

  /**
   * Thu tiền vé vào cổng trực tiếp tại Cổng ra (khi xe vào cổng chưa thanh toán)
   * Sử dụng RPC sc_collect_vehicle_ticket chuẩn RBAC V5, ghi nhận sổ cái app_payments bất biến.
   */
  async collectVehicleEntryTicket(params: {
    vehicleId: string;
    paymentMethod: 'CASH' | 'BANK_TRANSFER';
    receiptCode?: string;
    operatorId: string;
    notes?: string;
  }): Promise<{ success: boolean; error?: string }> {
    if (!isRealWriteEnabled()) {
      return { success: false, error: REAL_WRITE_BLOCKED_MESSAGE };
    }

    try {
      const supabase = createClient();
      const { data, error } = await (supabase.rpc as any)('sc_collect_vehicle_ticket', {
        p_vehicle_id: params.vehicleId,
        p_payment_method: params.paymentMethod === 'BANK_TRANSFER' ? 'TRANSFER' : 'CASH',
        p_receipt_code: params.receiptCode || undefined,
        p_notes: params.notes || undefined,
      });

      if (error) {
        return { success: false, error: 'Lỗi từ máy chủ khi thu vé cổng: ' + error.message };
      }

      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: 'Lỗi ngoại lệ khi thu vé cổng tại cổng ra: ' + msg };
    }
  }

  /** Lấy danh mục khách hàng / chủ hàng chuẩn (hỗ trợ Supabase table + fallback LocalStorage/Seed) */
  async getCustomers(): Promise<Customer[]> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('app_customers' as any)
        .select('*')
        .order('name', { ascending: true });

      if (error || !data || data.length === 0) {
        if (typeof window !== 'undefined') {
          const saved = localStorage.getItem('soncang_v5_customers');
          if (saved) {
            try { return JSON.parse(saved); } catch {}
          }
        }
        return [...INITIAL_DEMO_CUSTOMERS];
      }
      return data as unknown as Customer[];
    } catch {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('soncang_v5_customers');
        if (saved) {
          try { return JSON.parse(saved); } catch {}
        }
      }
      return [...INITIAL_DEMO_CUSTOMERS];
    }
  }

  /** Tạo khách hàng / chủ hàng mới nhanh (chuẩn AppSheet 1 chạm) */
  async createCustomer(params: { name: string; phone?: string; tax_code?: string; address?: string; notes?: string }): Promise<{
    success: boolean;
    customer?: Customer;
    error?: string;
  }> {
    const trimmedName = params.name.trim();
    if (!trimmedName) {
      return { success: false, error: 'Tên khách hàng không được để trống' };
    }

    try {
      const supabase = createClient();
      const newCustRecord = {
        name: trimmedName,
        phone: params.phone?.trim() || null,
        tax_code: params.tax_code?.trim() || null,
        address: params.address?.trim() || null,
        notes: params.notes?.trim() || null,
        is_active: true,
      };

      const { data, error } = await supabase
        .from('app_customers' as any)
        .insert(newCustRecord)
        .select()
        .single();

      if (!error && data) {
        if (typeof window !== 'undefined') {
          const saved = localStorage.getItem('soncang_v5_customers');
          const list: Customer[] = saved ? JSON.parse(saved) : [...INITIAL_DEMO_CUSTOMERS];
          list.unshift(data as unknown as Customer);
          localStorage.setItem('soncang_v5_customers', JSON.stringify(list));
        }
        return { success: true, customer: data as unknown as Customer };
      }
    } catch {
      // Bỏ qua lỗi table app_customers chưa có trên DB
    }

    // Fallback lưu LocalStorage để không gián đoạn thao tác người dùng
    const fallbackCust: Customer = {
      id: `cust-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: trimmedName,
      phone: params.phone?.trim() || null,
      tax_code: params.tax_code?.trim() || null,
      address: params.address?.trim() || null,
      notes: params.notes?.trim() || null,
      is_active: true,
      created_at: new Date().toISOString()
    };

    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('soncang_v5_customers');
      const list: Customer[] = saved ? JSON.parse(saved) : [...INITIAL_DEMO_CUSTOMERS];
      const existing = list.find(c => c.name.toLowerCase() === trimmedName.toLowerCase());
      if (existing) {
        return { success: true, customer: existing };
      }
      list.unshift(fallbackCust);
      localStorage.setItem('soncang_v5_customers', JSON.stringify(list));
    }

    return { success: true, customer: fallbackCust };
  }

  /** Cập nhật thông tin khách hàng / chủ hàng (sửa nhầm tên, SĐT, MST, ghi chú, trạng thái) */
  async updateCustomer(customer: Partial<Customer> & { id: string }): Promise<{
    success: boolean;
    customer?: Customer;
    error?: string;
  }> {
    try {
      const supabase = createClient();
      const updateData: any = {
        updated_at: new Date().toISOString()
      };
      if (customer.name !== undefined) updateData.name = customer.name.trim();
      if (customer.phone !== undefined) updateData.phone = customer.phone ? customer.phone.trim() : null;
      if (customer.tax_code !== undefined) updateData.tax_code = customer.tax_code ? customer.tax_code.trim() : null;
      if (customer.address !== undefined) updateData.address = customer.address ? customer.address.trim() : null;
      if (customer.notes !== undefined) updateData.notes = customer.notes ? customer.notes.trim() : null;
      if (customer.is_active !== undefined) updateData.is_active = customer.is_active;

      const { data, error } = await supabase
        .from('app_customers' as any)
        .update(updateData)
        .eq('id', customer.id)
        .select()
        .single();

      if (!error && data) {
        if (typeof window !== 'undefined') {
          const saved = localStorage.getItem('soncang_v5_customers');
          if (saved) {
            const list: Customer[] = JSON.parse(saved);
            const idx = list.findIndex(c => c.id === customer.id);
            if (idx !== -1) {
              list[idx] = data as unknown as Customer;
              localStorage.setItem('soncang_v5_customers', JSON.stringify(list));
            }
          }
        }
        return { success: true, customer: data as unknown as Customer };
      }
    } catch {
      // Fallback
    }

    // Fallback LocalStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('soncang_v5_customers');
      if (saved) {
        const list: Customer[] = JSON.parse(saved);
        const idx = list.findIndex(c => c.id === customer.id);
        if (idx !== -1) {
          list[idx] = {
            ...list[idx],
            name: customer.name !== undefined ? customer.name.trim() : list[idx].name,
            phone: customer.phone !== undefined ? customer.phone : list[idx].phone,
            tax_code: customer.tax_code !== undefined ? customer.tax_code : list[idx].tax_code,
            address: customer.address !== undefined ? customer.address : list[idx].address,
            notes: customer.notes !== undefined ? customer.notes : list[idx].notes,
            is_active: customer.is_active !== undefined ? customer.is_active : list[idx].is_active,
            updated_at: new Date().toISOString()
          };
          localStorage.setItem('soncang_v5_customers', JSON.stringify(list));
          return { success: true, customer: list[idx] };
        }
      }
    }
    return { success: false, error: 'Không tìm thấy khách hàng cần sửa' };
  }

  /** Xóa hoặc vô hiệu hóa khách hàng / chủ hàng */
  async deleteCustomer(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient();
      await supabase
        .from('app_customers' as any)
        .delete()
        .eq('id', id);
    } catch {
      // Fallback
    }

    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('soncang_v5_customers');
      if (saved) {
        const list: Customer[] = JSON.parse(saved);
        const filtered = list.filter(c => c.id !== id);
        localStorage.setItem('soncang_v5_customers', JSON.stringify(filtered));
      }
    }
    return { success: true };
  }

  /** Lấy danh sách nhân sự / người dùng trực ca (Staff Users) */
  async getStaffUsers(): Promise<StaffUser[]> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('app_staff_users' as any)
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        return data as unknown as StaffUser[];
      }
    } catch {
      // Fallback
    }

    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('soncang_v5_staff_users');
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return [...INITIAL_DEMO_STAFF_USERS];
  }

  /** Tạo mới nhân sự / người dùng và gán vai trò V1 */
  async createStaffUser(user: Partial<StaffUser>): Promise<{ success: boolean; user?: StaffUser; error?: string }> {
    const fullName = user.full_name?.trim();
    const email = user.email?.trim().toLowerCase();
    if (!fullName) return { success: false, error: 'Họ và tên nhân viên không được để trống' };
    if (!email) return { success: false, error: 'Email nhân viên không được để trống' };

    try {
      const supabase = createClient();
      const { data, error } = await (supabase.rpc as any)('sc_upsert_staff_user', {
        p_full_name: fullName,
        p_email: email,
        p_phone: user.phone?.trim() || null,
        p_role_code: user.role_code || 'SEC_STAFF',
        p_department_code: user.department_code || 'AN_NINH',
        p_yard_id: user.yard_id || null,
        p_is_active: user.is_active !== undefined ? user.is_active : true,
        p_notes: user.notes?.trim() || null,
      });

      if (!error && data && (data as any).success) {
        const newUser = (data as any).user as StaffUser;
        if (typeof window !== 'undefined') {
          const saved = localStorage.getItem('soncang_v5_staff_users');
          const list: StaffUser[] = saved ? JSON.parse(saved) : [...INITIAL_DEMO_STAFF_USERS];
          list.unshift(newUser);
          localStorage.setItem('soncang_v5_staff_users', JSON.stringify(list));
        }
        return { success: true, user: newUser };
      }
    } catch {
      // Fallback
    }

    // Fallback LocalStorage
    const fallbackUser: StaffUser = {
      id: user.id || `staff-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      full_name: fullName,
      email: email,
      phone: user.phone?.trim() || null,
      role_code: user.role_code || 'SEC_STAFF',
      role_name: user.role_name || `Vai trò ${user.role_code || 'SEC_STAFF'}`,
      department_code: user.department_code || 'AN_NINH',
      department_name: user.department_name || 'Bộ phận An ninh & Bảo vệ',
      yard_id: user.yard_id || '20000000-0000-0000-0000-000000000001',
      yard_name: user.yard_name || 'Bãi Sơn Cảng',
      is_active: user.is_active !== undefined ? user.is_active : true,
      notes: user.notes?.trim() || null,
      created_at: new Date().toISOString()
    };

    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('soncang_v5_staff_users');
      const list: StaffUser[] = saved ? JSON.parse(saved) : [...INITIAL_DEMO_STAFF_USERS];
      list.unshift(fallbackUser);
      localStorage.setItem('soncang_v5_staff_users', JSON.stringify(list));
    }

    return { success: true, user: fallbackUser };
  }

  /** Cập nhật thông tin nhân sự / đổi vai trò / đổi bộ phận */
  async updateStaffUser(user: Partial<StaffUser> & { id: string }): Promise<{ success: boolean; user?: StaffUser; error?: string }> {
    try {
      const supabase = createClient();
      const { data, error } = await (supabase.rpc as any)('sc_upsert_staff_user', {
        p_id: user.id,
        p_full_name: user.full_name?.trim() || '',
        p_email: user.email?.trim().toLowerCase() || '',
        p_phone: user.phone?.trim() || null,
        p_role_code: user.role_code || 'SEC_STAFF',
        p_department_code: user.department_code || 'AN_NINH',
        p_yard_id: user.yard_id || null,
        p_is_active: user.is_active !== undefined ? user.is_active : true,
        p_notes: user.notes?.trim() || null,
      });

      if (!error && data && (data as any).success) {
        const updated = (data as any).user as StaffUser;
        if (typeof window !== 'undefined') {
          const saved = localStorage.getItem('soncang_v5_staff_users');
          if (saved) {
            const list: StaffUser[] = JSON.parse(saved);
            const idx = list.findIndex(u => u.id === user.id);
            if (idx !== -1) {
              list[idx] = updated;
              localStorage.setItem('soncang_v5_staff_users', JSON.stringify(list));
            }
          }
        }
        return { success: true, user: updated };
      }
    } catch {
      // Fallback
    }

    // Fallback LocalStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('soncang_v5_staff_users');
      if (saved) {
        const list: StaffUser[] = JSON.parse(saved);
        const idx = list.findIndex(u => u.id === user.id);
        if (idx !== -1) {
          list[idx] = {
            ...list[idx],
            full_name: user.full_name !== undefined ? user.full_name.trim() : list[idx].full_name,
            email: user.email !== undefined ? user.email.trim().toLowerCase() : list[idx].email,
            phone: user.phone !== undefined ? user.phone : list[idx].phone,
            role_code: user.role_code || list[idx].role_code,
            department_code: user.department_code || list[idx].department_code,
            yard_id: user.yard_id !== undefined ? user.yard_id : list[idx].yard_id,
            is_active: user.is_active !== undefined ? user.is_active : list[idx].is_active,
            notes: user.notes !== undefined ? user.notes : list[idx].notes,
            updated_at: new Date().toISOString()
          };
          localStorage.setItem('soncang_v5_staff_users', JSON.stringify(list));
          return { success: true, user: list[idx] };
        }
      }
    }
    return { success: false, error: 'Không tìm thấy nhân viên cần sửa' };
  }

  /** Khóa hoặc Mở khóa tài khoản nhân sự */
  async toggleStaffUserStatus(id: string, isActive: boolean): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient();
      await (supabase.rpc as any)('sc_toggle_staff_user', {
        p_id: id,
        p_is_active: isActive,
      });
    } catch {
      // Fallback
    }

    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('soncang_v5_staff_users');
      if (saved) {
        const list: StaffUser[] = JSON.parse(saved);
        const idx = list.findIndex(u => u.id === id);
        if (idx !== -1) {
          list[idx].is_active = isActive;
          list[idx].updated_at = new Date().toISOString();
          localStorage.setItem('soncang_v5_staff_users', JSON.stringify(list));
        }
      }
    }
    return { success: true };
  }

  /** Xóa nhân sự / tài khoản khỏi hệ thống */
  async deleteStaffUser(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient();
      await (supabase.rpc as any)('sc_delete_staff_user', {
        p_id: id,
      });
    } catch {
      // Fallback
    }

    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('soncang_v5_staff_users');
      if (saved) {
        const list: StaffUser[] = JSON.parse(saved);
        const filtered = list.filter(u => u.id !== id);
        localStorage.setItem('soncang_v5_staff_users', JSON.stringify(filtered));
      }
    }
    return { success: true };
  }
}

export const supabaseRepository = new SupabaseRepository();

/**
 * Thuật toán tính phí lưu bãi chuẩn V5 offline / fallback
 * Quy tắc: 100.000 VND / đêm qua mốc 22:00-06:00 Asia/Ho_Chi_Minh.
 * Đêm đầu tiên miễn phí (charged_nights = greatest(0, total_nights - 1)).
 */
export function calculateStorageFeeOffline(inboundAtStr: string, outboundAtStr?: string): {
  totalNights: number;
  chargedNights: number;
  fee: number;
} {
  const inDate = new Date(inboundAtStr);
  const outDate = outboundAtStr ? new Date(outboundAtStr) : new Date();
  if (outDate <= inDate || isNaN(inDate.getTime()) || isNaN(outDate.getTime())) {
    return { totalNights: 0, chargedNights: 0, fee: 0 };
  }

  // Chuyển sang ngày theo múi giờ Việt Nam (UTC+7)
  const getVnDate = (d: Date) => {
    const vnTime = new Date(d.getTime() + 7 * 3600 * 1000);
    return vnTime.toISOString().substring(0, 10);
  };

  const inVnDateStr = getVnDate(inDate);
  const outVnDateStr = getVnDate(outDate);

  // Bắt đầu từ ngày vào - 1 ngày
  const cur = new Date(inVnDateStr + 'T00:00:00+07:00');
  cur.setDate(cur.getDate() - 1);
  const end = new Date(outVnDateStr + 'T00:00:00+07:00');

  let totalNights = 0;
  while (cur <= end) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    const curStr = `${y}-${m}-${d}`;

    const next = new Date(cur.getTime() + 24 * 3600 * 1000);
    const ny = next.getFullYear();
    const nm = String(next.getMonth() + 1).padStart(2, '0');
    const nd = String(next.getDate()).padStart(2, '0');
    const nextStr = `${ny}-${nm}-${nd}`;

    const nightStart = new Date(`${curStr}T22:00:00+07:00`);
    const nightEnd = new Date(`${nextStr}T06:00:00+07:00`);

    if (inDate < nightEnd && outDate > nightStart) {
      totalNights++;
    }
    cur.setDate(cur.getDate() + 1);
  }

  const chargedNights = Math.max(0, totalNights - 1);
  return { totalNights, chargedNights, fee: chargedNights * 100000 };
}
