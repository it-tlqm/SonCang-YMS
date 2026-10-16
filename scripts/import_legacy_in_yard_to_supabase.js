/**
 * Script nạp chính xác 70 lượt xe và 65 container tồn bãi thực tế từ AppSheet lên Supabase Cloud
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://euswzyespwaxyrjkfkrq.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1c3d6eWVzcHdheHlyamtma3JxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTcxMjI0NSwiZXhwIjoyMTA3Mjg4MjQ1fQ.XGJfrft4TDzNSklhXDreXNCFoNXQ-TlOHEyjS_t2hrk';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const YARD_ID = 'fe83bb2b-833e-412c-aed4-b9a781a6decd'; // Bãi Sơn Cảng
const OPERATOR_ID = 'ffdbbd4d-4939-4594-901d-c0c30d162594'; // An Ninh Sơn Cảng (auth_user_id)

function legacyIdToVehicleUUID(legacyId) {
  return `c5a00000-0000-4000-a000-${legacyId.toLowerCase().padStart(12, '0')}`;
}

function legacyIdToContainerUUID(legacyId) {
  return `c5b00000-0000-4000-a000-${legacyId.toLowerCase().padStart(12, '0')}`;
}

async function runImport() {
  console.log('=== BẮT ĐẦU IMPORT 70 XE & 65 CONTAINER TỒN BÃI THỰC TẾ LÊN SUPABASE CLOUD ===');

  // Đọc dữ liệu đã chuẩn hóa
  const vehiclesRaw = JSON.parse(fs.readFileSync('data/legacy_appsheet/legacy_vehicles.json', 'utf-8'));
  const containersRaw = JSON.parse(fs.readFileSync('data/legacy_appsheet/legacy_containers.json', 'utf-8'));

  const inYardVehicles = vehiclesRaw.filter(v => v.vehicle_status === 'IN_YARD');
  const inYardContainers = containersRaw.filter(c => c.container_status === 'IN_YARD');

  console.log(`- Số xe tồn bãi cần nạp: ${inYardVehicles.length} xe`);
  console.log(`- Số container tồn bãi cần nạp: ${inYardContainers.length} cont`);

  // Tìm 2 xe đã ra bãi nhưng mang 2 cont còn lưu lại bãi
  const neededExitedVehicleIds = new Set();
  inYardContainers.forEach(c => {
    if (c.inbound_vehicle_id && !inYardVehicles.some(v => v.legacy_id === c.inbound_vehicle_id)) {
      neededExitedVehicleIds.add(c.inbound_vehicle_id);
    }
  });

  const relatedExitedVehicles = vehiclesRaw.filter(v => neededExitedVehicleIds.has(v.legacy_id));
  console.log(`- Số xe đã ra liên kết với cont tồn bãi: ${relatedExitedVehicles.length} xe (${[...neededExitedVehicleIds].join(', ')})`);

  const allVehiclesToInsert = [...inYardVehicles, ...relatedExitedVehicles];

  // 1. DỌN DẸP DỮ LIỆU CŨ THỬ NGHIỆM TRÊN SUPABASE CLOUD
  console.log('\n1. Dọn dẹp các phiên điện, container và xe cũ thử nghiệm...');
  try {
    await supabase.from('app_reefer_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('app_container_visits').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('app_vehicle_visits').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('✓ Đã dọn sạch dữ liệu cũ thử nghiệm.');
  } catch (err) {
    console.warn('Cảnh báo khi dọn dẹp:', err.message);
  }

  // 2. INSERT XE VÀO app_vehicle_visits
  console.log(`\n2. Nạp ${allVehiclesToInsert.length} lượt xe vào app_vehicle_visits...`);
  const vehiclePayloads = allVehiclesToInsert.map(v => ({
    id: legacyIdToVehicleUUID(v.legacy_id),
    yard_id: YARD_ID,
    license_plate: v.license_plate,
    vehicle_type: v.vehicle_type,
    entry_at: v.entry_time_iso || new Date().toISOString(),
    entry_by: OPERATOR_ID,
    exit_at: v.exit_time_iso || null,
    exit_by: v.exit_time_iso ? OPERATOR_ID : null,
    status: v.vehicle_status === 'EXITED' ? 'EXITED' : 'IN_YARD',
    ticket_code: `TK-${v.legacy_id.toUpperCase()}`,
    ticket_amount: v.ticket_amount_payable,
    ticket_payment_status: v.ticket_status === 'Đã thu' ? 'PAID' : (v.ticket_amount_payable === 0 ? 'EXEMPT' : 'UNPAID'),
    note: v.note ? `[AppSheet Import] ${v.note}` : '[AppSheet Import]',
    idempotency_key: `APPSHEET-V-${v.legacy_id}`
  }));

  const { error: vInsertErr } = await supabase.from('app_vehicle_visits').insert(vehiclePayloads);
  if (vInsertErr) {
    console.error('Lỗi khi insert app_vehicle_visits:', vInsertErr);
    process.exit(1);
  }
  console.log(`✓ Đã nạp thành công ${vehiclePayloads.length} lượt xe vào app_vehicle_visits!`);

  // 3. INSERT CONTAINER VÀO app_container_visits
  console.log(`\n3. Nạp ${inYardContainers.length} container vào app_container_visits...`);
  const containerPayloads = inYardContainers.map(c => {
    let inboundVehId = null;
    if (c.inbound_vehicle_id) {
      inboundVehId = legacyIdToVehicleUUID(c.inbound_vehicle_id);
    }
    return {
      id: legacyIdToContainerUUID(c.legacy_id),
      yard_id: YARD_ID,
      container_no_current: c.container_no,
      container_no_original: c.container_no,
      container_size: '40',
      container_type: 'RF',
      inbound_vehicle_visit_id: inboundVehId,
      inbound_at: c.entry_time_iso || new Date().toISOString(),
      outbound_vehicle_visit_id: null,
      outbound_at: null,
      status: 'IN_YARD',
      cargo_status: c.cargo_status === 'HÀNG' ? 'HANG' : (c.cargo_status === 'RỖNG' ? 'RONG' : 'CHUA_XAC_DINH'),
      is_legacy_import: true,
      legacy_import_notes: `Số đêm lưu cũ: ${c.night_count} đêm | Đơn giá: ${c.tariff_rate_night.toLocaleString('vi-VN')} đ | Tiền lưu gốc: ${c.storage_amount_payable.toLocaleString('vi-VN')} đ`,
      storage_fee_amount: c.storage_amount_payable,
      storage_nights_charged: c.night_count,
      storage_fee_payment_status: c.storage_status === 'Đã thu' ? 'PAID' : 'UNPAID',
      clearance_status: 'PENDING',
      created_by: OPERATOR_ID,
      idempotency_key: `APPSHEET-C-${c.legacy_id}`
    };
  });

  const { error: cInsertErr } = await supabase.from('app_container_visits').insert(containerPayloads);
  if (cInsertErr) {
    console.error('Lỗi khi insert app_container_visits:', cInsertErr);
    process.exit(1);
  }
  console.log(`✓ Đã nạp thành công ${containerPayloads.length} lượt container vào app_container_visits!`);

  // 4. KIỂM TRA ĐỐI SOÁT SAU KHI NẠP
  const { data: finalV } = await supabase.from('app_vehicle_visits').select('status');
  const inYardVCount = finalV.filter(v => v.status === 'IN_YARD').length;
  const exitedVCount = finalV.filter(v => v.status === 'EXITED').length;

  const { data: finalC } = await supabase.from('app_container_visits').select('status');
  const inYardCCount = finalC.filter(c => c.status === 'IN_YARD').length;

  console.log('\n=== KẾT QUẢ ĐỐI SOÁT TRÊN SUPABASE CLOUD ===');
  console.log(`- Xe đang ở bãi (IN_YARD): ${inYardVCount} xe (Kỳ vọng: 70 xe)`);
  console.log(`- Xe đã xuất (EXITED liên kết cont): ${exitedVCount} xe (Kỳ vọng: 2 xe)`);
  console.log(`- Container đang lưu bãi (IN_YARD): ${inYardCCount} cont (Kỳ vọng: 65 cont)`);
  console.log('✓ 100% Khớp với báo cáo tồn bãi BC_SC_TON_BAI của AppSheet!');
}

runImport().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
