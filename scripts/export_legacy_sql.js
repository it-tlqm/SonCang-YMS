const fs = require('fs');
const path = require('path');

const vehicles = JSON.parse(fs.readFileSync('data/legacy_appsheet/legacy_vehicles.json', 'utf-8'));
const containers = JSON.parse(fs.readFileSync('data/legacy_appsheet/legacy_containers.json', 'utf-8'));

let sql = '-- =============================================================================\n';
sql += '-- SCRIPT BACKUP DỮ LIỆU LỊCH SỬ TỪ GOOGLE APPSHEET — BẾN BÃI SƠN CẢNG\n';
sql += '-- Nguồn: docs/Xe-ra-vao_SC.xlsx (Trích xuất ngày 16/10/2026)\n';
sql += '-- Số lượng: 360 lượt xe, 304 lượt container\n';
sql += '-- Phục vụ: Lưu trữ dự phòng (Backup) & Tra cứu đối soát lịch sử (Legacy Audit)\n';
sql += '-- =============================================================================\n\n';

sql += '-- 1. BẢNG LƯU TRỮ XE LỊCH SỬ APPSHEET\n';
sql += 'CREATE TABLE IF NOT EXISTS legacy_appsheet_vehicles (\n';
sql += '    id SERIAL PRIMARY KEY,\n';
sql += '    legacy_id VARCHAR(50) UNIQUE NOT NULL,\n';
sql += '    license_plate VARCHAR(30) NOT NULL,\n';
sql += '    vehicle_type VARCHAR(50),\n';
sql += '    entry_time TIMESTAMPTZ,\n';
sql += '    entry_by VARCHAR(100),\n';
sql += '    exit_time TIMESTAMPTZ,\n';
sql += '    exit_by VARCHAR(100),\n';
sql += '    inbound_container_no VARCHAR(30),\n';
sql += '    inbound_container_id VARCHAR(50),\n';
sql += '    outbound_container_no VARCHAR(30),\n';
sql += '    outbound_container_id VARCHAR(50),\n';
sql += '    ticket_amount_payable NUMERIC(15,2) DEFAULT 0,\n';
sql += '    ticket_status VARCHAR(50),\n';
sql += '    ticket_payment_method VARCHAR(50),\n';
sql += '    vehicle_status VARCHAR(30),\n';
sql += '    storage_fee_confirmed VARCHAR(50),\n';
sql += '    storage_fee_note TEXT,\n';
sql += '    note TEXT,\n';
sql += '    created_at TIMESTAMPTZ DEFAULT NOW()\n';
sql += ');\n\n';

sql += '-- 2. BẢNG LƯU TRỮ CONTAINER LỊCH SỬ APPSHEET\n';
sql += 'CREATE TABLE IF NOT EXISTS legacy_appsheet_containers (\n';
sql += '    id SERIAL PRIMARY KEY,\n';
sql += '    legacy_id VARCHAR(50) UNIQUE NOT NULL,\n';
sql += '    container_no VARCHAR(30) NOT NULL,\n';
sql += '    inbound_vehicle_id VARCHAR(50),\n';
sql += '    entry_time TIMESTAMPTZ,\n';
sql += '    entry_by VARCHAR(100),\n';
sql += '    outbound_vehicle_id VARCHAR(50),\n';
sql += '    exit_time TIMESTAMPTZ,\n';
sql += '    exit_by VARCHAR(100),\n';
sql += '    night_count INT DEFAULT 0,\n';
sql += '    tariff_rate_night NUMERIC(15,2) DEFAULT 100000,\n';
sql += '    storage_amount_payable NUMERIC(15,2) DEFAULT 0,\n';
sql += '    storage_status VARCHAR(50),\n';
sql += '    storage_payment_method VARCHAR(50),\n';
sql += '    container_status VARCHAR(30),\n';
sql += '    cargo_status VARCHAR(50),\n';
sql += '    note TEXT,\n';
sql += '    created_at TIMESTAMPTZ DEFAULT NOW()\n';
sql += ');\n\n';

function esc(val) {
  if (val === null || val === undefined) return 'NULL';
  return "'" + String(val).replace(/'/g, "''") + "'";
}

sql += '-- 3. DỮ LIỆU VEHICLES (' + vehicles.length + ' bản ghi)\n';
for (const v of vehicles) {
  sql += `INSERT INTO legacy_appsheet_vehicles (legacy_id, license_plate, vehicle_type, entry_time, entry_by, exit_time, exit_by, inbound_container_no, inbound_container_id, outbound_container_no, outbound_container_id, ticket_amount_payable, ticket_status, ticket_payment_method, vehicle_status, storage_fee_confirmed, storage_fee_note, note) VALUES (${esc(v.legacy_id)}, ${esc(v.license_plate)}, ${esc(v.vehicle_type)}, ${esc(v.entry_time_iso)}, ${esc(v.entry_by)}, ${esc(v.exit_time_iso)}, ${esc(v.exit_by)}, ${esc(v.inbound_container_no)}, ${esc(v.inbound_container_id)}, ${esc(v.outbound_container_no)}, ${esc(v.outbound_container_id)}, ${v.ticket_amount_payable}, ${esc(v.ticket_status)}, ${esc(v.ticket_payment_method)}, ${esc(v.vehicle_status)}, ${esc(v.storage_fee_confirmed)}, ${esc(v.storage_fee_note)}, ${esc(v.note)}) ON CONFLICT (legacy_id) DO NOTHING;\n`;
}

sql += '\n-- 4. DỮ LIỆU CONTAINERS (' + containers.length + ' bản ghi)\n';
for (const c of containers) {
  sql += `INSERT INTO legacy_appsheet_containers (legacy_id, container_no, inbound_vehicle_id, entry_time, entry_by, outbound_vehicle_id, exit_time, exit_by, night_count, tariff_rate_night, storage_amount_payable, storage_status, storage_payment_method, container_status, cargo_status, note) VALUES (${esc(c.legacy_id)}, ${esc(c.container_no)}, ${esc(c.inbound_vehicle_id)}, ${esc(c.entry_time_iso)}, ${esc(c.entry_by)}, ${esc(c.outbound_vehicle_id)}, ${esc(c.exit_time_iso)}, ${esc(c.exit_by)}, ${c.night_count}, ${c.tariff_rate_night}, ${c.storage_amount_payable}, ${esc(c.storage_status)}, ${esc(c.storage_payment_method)}, ${esc(c.container_status)}, ${esc(c.cargo_status)}, ${esc(c.note)}) ON CONFLICT (legacy_id) DO NOTHING;\n`;
}

fs.writeFileSync('data/legacy_appsheet/legacy_appsheet_backup.sql', sql, 'utf-8');
console.log('[OK] SQL file generated: data/legacy_appsheet/legacy_appsheet_backup.sql (' + Math.round(sql.length / 1024) + ' KB)');
