/**
 * Service tra cứu và quản lý dữ liệu lịch sử từ Google AppSheet (Tháng 08 - Tháng 10/2026)
 * Đảm bảo dữ liệu được cách ly an toàn, phục vụ tra cứu đối soát khi có yêu cầu.
 */

import legacySummary from '../../../data/legacy_appsheet/legacy_summary.json';
import legacyVehicles from '../../../data/legacy_appsheet/legacy_vehicles.json';
import legacyContainers from '../../../data/legacy_appsheet/legacy_containers.json';

export interface LegacyVehicleRecord {
  index: number;
  legacy_id: string;
  license_plate: string;
  vehicle_type: string;
  entry_time_iso: string | null;
  entry_time_vn: string | null;
  entry_by: string | null;
  exit_time_iso: string | null;
  exit_time_vn: string | null;
  exit_by: string | null;
  inbound_container_no: string | null;
  inbound_container_id: string | null;
  outbound_container_no: string | null;
  outbound_container_id: string | null;
  ticket_amount_original: number;
  ticket_amount_payable: number;
  ticket_status: string;
  ticket_payment_method: string | null;
  ticket_paid_time_iso: string | null;
  ticket_paid_by: string | null;
  vehicle_status: 'EXITED' | 'IN_YARD';
  vehicle_status_raw: string | null;
  exit_carry_mode: string | null;
  storage_fee_confirmed: string | null;
  storage_fee_method: string | null;
  storage_fee_note: string | null;
  note: string | null;
  source: string;
}

export interface LegacyContainerRecord {
  index: number;
  legacy_id: string;
  container_no: string;
  inbound_vehicle_id: string | null;
  entry_time_iso: string | null;
  entry_time_vn: string | null;
  entry_by: string | null;
  outbound_vehicle_id: string | null;
  exit_time_iso: string | null;
  exit_time_vn: string | null;
  exit_by: string | null;
  night_count: number;
  tariff_rate_night: number;
  storage_amount_original: number;
  storage_amount_payable: number;
  storage_status: string;
  storage_payment_method: string | null;
  container_status: 'EXITED' | 'IN_YARD';
  container_status_raw: string | null;
  cargo_status: string;
  note: string | null;
  source: string;
}

export class LegacyBackupService {
  /**
   * Lấy bản tóm tắt chỉ số dữ liệu AppSheet lịch sử
   */
  static getSummary() {
    return legacySummary;
  }

  /**
   * Tra cứu danh sách xe lịch sử theo từ khóa (Biển số hoặc Số Container)
   */
  static searchVehicles(query?: string): LegacyVehicleRecord[] {
    const list = legacyVehicles as unknown as LegacyVehicleRecord[];
    if (!query || !query.trim()) return list;
    const q = query.trim().toUpperCase();
    return list.filter(v => 
      v.license_plate.includes(q) || 
      (v.inbound_container_no && v.inbound_container_no.includes(q)) ||
      (v.outbound_container_no && v.outbound_container_no.includes(q)) ||
      v.legacy_id.includes(q.toLowerCase())
    );
  }

  /**
   * Tra cứu danh sách container lịch sử theo số container
   */
  static searchContainers(query?: string): LegacyContainerRecord[] {
    const list = legacyContainers as unknown as LegacyContainerRecord[];
    if (!query || !query.trim()) return list;
    const q = query.trim().toUpperCase();
    return list.filter(c => 
      c.container_no.includes(q) || 
      c.legacy_id.includes(q.toLowerCase())
    );
  }
}
