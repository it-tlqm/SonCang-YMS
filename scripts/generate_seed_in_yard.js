const fs = require('fs');
const path = require('path');

const vehiclesRaw = JSON.parse(fs.readFileSync('data/legacy_appsheet/legacy_vehicles.json', 'utf-8'));
const containersRaw = JSON.parse(fs.readFileSync('data/legacy_appsheet/legacy_containers.json', 'utf-8'));

const inYardVehicles = vehiclesRaw.filter(v => v.vehicle_status === 'IN_YARD');
const inYardContainers = containersRaw.filter(c => c.container_status === 'IN_YARD');

function legacyIdToVehicleUUID(legacyId) {
  return `c5a00000-0000-4000-a000-${legacyId.toLowerCase().padStart(12, '0')}`;
}

function legacyIdToContainerUUID(legacyId) {
  return `c5b00000-0000-4000-a000-${legacyId.toLowerCase().padStart(12, '0')}`;
}

function getTypeName(code) {
  switch(code) {
    case 'CONT_LANH': return 'Xe container lạnh/khô';
    case 'DAU_KEO': return 'Xe đầu kéo không cont';
    case 'XE_BO_4_CHAN': return 'Xe bơ 4 chân';
    case 'XE_BO_3_CHAN': return 'Xe bơ 3 chân';
    case 'XE_BO_8_TAN_2_CHAN': return 'Xe bơ 8 tấn (2 chân)';
    case 'XE_BO_3_BANH': return 'Xe bò 3 bánh';
    case 'XE_SANG_TAI': return 'Xe sang tải';
    default: return code;
  }
}

const mappedVehicles = inYardVehicles.map(v => ({
  id: legacyIdToVehicleUUID(v.legacy_id),
  yard_id: 'fe83bb2b-833e-412c-aed4-b9a781a6decd',
  license_plate: v.license_plate,
  vehicle_type: v.vehicle_type,
  vehicle_type_name: getTypeName(v.vehicle_type),
  driver_name: null,
  driver_phone: null,
  ticket_code: `TK-${v.legacy_id.toUpperCase()}`,
  ticket_amount: v.ticket_amount_payable,
  ticket_payment_status: v.ticket_status === 'Đã thu' ? 'PAID' : (v.ticket_amount_payable === 0 ? 'EXEMPT' : 'UNPAID'),
  status: 'IN_YARD',
  entry_at: v.entry_time_iso || new Date().toISOString(),
  entry_by: 'ffdbbd4d-4939-4594-901d-c0c30d162594',
  entry_by_name: 'An Ninh Sơn Cảng',
  exit_at: null,
  exit_by: null,
  note: v.note ? `[AppSheet Import] ${v.note}` : '[AppSheet Import]',
  idempotency_key: `APPSHEET-V-${v.legacy_id}`,
  plate_changes_count: 0
}));

const inYardVehSet = new Set(inYardVehicles.map(v => v.legacy_id));

const mappedContainers = inYardContainers.map(c => {
  let inboundVehId = null;
  let inboundPlate = null;
  if (c.inbound_vehicle_id) {
    inboundVehId = legacyIdToVehicleUUID(c.inbound_vehicle_id);
    const matchedV = vehiclesRaw.find(v => v.legacy_id === c.inbound_vehicle_id);
    if (matchedV) inboundPlate = matchedV.license_plate;
  }
  return {
    id: legacyIdToContainerUUID(c.legacy_id),
    yard_id: 'fe83bb2b-833e-412c-aed4-b9a781a6decd',
    container_no_current: c.container_no,
    container_no_original: c.container_no,
    container_size: '40',
    container_type: 'RF',
    inbound_vehicle_visit_id: inboundVehId,
    inbound_license_plate: inboundPlate,
    inbound_at: c.entry_time_iso || new Date().toISOString(),
    outbound_vehicle_visit_id: null,
    outbound_at: null,
    status: 'IN_YARD',
    cargo_status: c.cargo_status === 'HÀNG' ? 'HANG' : (c.cargo_status === 'RỖNG' ? 'RONG' : 'CHUA_XAC_DINH'),
    cargo_status_updated_at: c.entry_time_iso || new Date().toISOString(),
    cargo_status_updated_by: 'ffdbbd4d-4939-4594-901d-c0c30d162594',
    is_legacy_import: true,
    legacy_import_notes: `Số đêm lưu: ${c.night_count} | Tiền lưu gốc: ${c.storage_amount_payable.toLocaleString('vi-VN')} đ`,
    clearance_status: 'PENDING',
    storage_fee_amount: c.storage_amount_payable,
    storage_nights_charged: c.night_count,
    storage_fee_payment_status: c.storage_status === 'Đã thu' ? 'PAID' : 'UNPAID',
    plug_socket_code: null,
    created_by: 'ffdbbd4d-4939-4594-901d-c0c30d162594',
    created_at: c.entry_time_iso || new Date().toISOString(),
    updated_at: c.entry_time_iso || new Date().toISOString()
  };
});

let tsCode = `import { VehicleVisit, ContainerVisit } from '@/types/domain.types';\n\n`;
tsCode += `/**\n * 70 xe đang ở bãi thực tế từ AppSheet\n */\n`;
tsCode += `export const SEED_IN_YARD_VEHICLES: VehicleVisit[] = ${JSON.stringify(mappedVehicles, null, 2)};\n\n`;
tsCode += `/**\n * 65 container đang lưu bãi thực tế từ AppSheet\n */\n`;
tsCode += `export const SEED_IN_YARD_CONTAINERS: ContainerVisit[] = ${JSON.stringify(mappedContainers, null, 2)};\n`;

fs.writeFileSync('src/data/seed-in-yard-data.ts', tsCode, 'utf-8');
console.log('✓ Generated src/data/seed-in-yard-data.ts with 70 vehicles and 65 containers!');
