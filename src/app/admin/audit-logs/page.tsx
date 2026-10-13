'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { 
  History, 
  ShieldAlert, 
  Search, 
  RefreshCw, 
  ArrowLeft, 
  Filter, 
  Calendar, 
  User, 
  FileText,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Layers,
  Truck,
  Zap,
  Receipt
} from 'lucide-react';

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

export default function AuditLogsAdminPage() {
  const { user, role, can, authMode } = useAuth();

  // Kiểm tra quyền kiểm toán / quản trị
  const isAllowed = role === 'SYS_ADMIN' || can('admin.roles.manage') || can('report.revenue.read');

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  useEffect(() => {
    let isMounted = true;

    // Tổng hợp logs từ các sự kiện trong LocalStorage / DB
    const loadLogs = () => {
      const generatedLogs: AuditLogEntry[] = [];

      // 1. Lịch sử đổi biển số xe
      try {
        const plateChangesRaw = localStorage.getItem('soncang_v5_demo_plate_changes');
        if (plateChangesRaw) {
          const list = JSON.parse(plateChangesRaw);
          list.forEach((item: any) => {
            generatedLogs.push({
              id: `log-plate-${item.id}`,
              event_name: 'vehicle.plate.correct',
              category: 'VEHICLE',
              actor_name: item.changed_by_name || 'Nhân viên An ninh',
              actor_role: 'SEC_STAFF',
              target_id: item.vehicle_visit_id,
              target_label: `Biển số xe: ${item.new_plate}`,
              description: `Đổi biển số xe từ [${item.old_plate}] sang [${item.new_plate}]`,
              old_value: item.old_plate,
              new_value: item.new_plate,
              reason: item.reason,
              occurred_at: item.changed_at,
            });
          });
        }
      } catch {
        // ignore
      }

      // 2. Lịch sử đổi số container
      try {
        const contChangesRaw = localStorage.getItem('soncang_v5_demo_number_changes');
        if (contChangesRaw) {
          const list = JSON.parse(contChangesRaw);
          list.forEach((item: any) => {
            generatedLogs.push({
              id: `log-cont-${item.id}`,
              event_name: 'container.number.correct',
              category: 'CONTAINER',
              actor_name: item.operator_name || 'Nhân viên bến bãi',
              actor_role: 'SEC_STAFF',
              target_id: item.container_visit_id,
              target_label: `Container: ${item.new_number}`,
              description: `Sửa số container từ [${item.old_number}] sang [${item.new_number}]`,
              old_value: item.old_number,
              new_value: item.new_number,
              reason: item.reason,
              occurred_at: item.created_at,
            });
          });
        }
      } catch {
        // ignore
      }

      // 3. Mẫu log hệ thống chuẩn cho audit trail
      if (generatedLogs.length === 0) {
        generatedLogs.push(
          {
            id: 'log-seed-1',
            event_name: 'ticket.payment.collect',
            category: 'PAYMENT',
            actor_name: 'Nhân viên An ninh Cổng UAT',
            actor_role: 'SEC_STAFF',
            target_id: 'veh-001',
            target_label: 'Vé xe: 14C-123.45',
            description: 'Thu tiền vé xe vào cổng trực tiếp tại bốt gác (250.000 đ - Tiền mặt)',
            new_value: '250.000 đ',
            reason: 'Thu vé lượt phương tiện vào bãi',
            occurred_at: new Date(Date.now() - 3600000 * 2).toISOString(),
          },
          {
            id: 'log-seed-2',
            event_name: 'reefer.session.actual_start.record',
            category: 'REEFER',
            actor_name: 'Nhân viên Thương vụ CCKB',
            actor_role: 'PORT_STAFF',
            target_id: 'reefer-001',
            target_label: 'Container: TCLU1234567',
            description: 'Ghi nhận cắm điện container lạnh tại trạm cấp nguồn bãi',
            new_value: 'PLUGGED',
            reason: 'Bảo quản container lạnh theo yêu cầu chủ hàng',
            occurred_at: new Date(Date.now() - 3600000 * 4).toISOString(),
          },
          {
            id: 'log-seed-3',
            event_name: 'exit.clearance.debt_exception',
            category: 'CLEARANCE',
            actor_name: 'Trưởng bộ phận CCKB',
            actor_role: 'PORT_LEAD',
            target_id: 'cont-002',
            target_label: 'Container: FSCU9876543',
            description: 'Duyệt điều kiện xuất bãi diện bảo lãnh công nợ (AP07)',
            new_value: 'CLEARED_WITH_DEBT',
            reason: 'Bảo lãnh thanh toán chuyển khoản cuối tháng theo Hợp đồng số 12/2026/TLQM',
            occurred_at: new Date(Date.now() - 3600000 * 6).toISOString(),
          }
        );
      }

      // Sắp xếp thời gian giảm dần
      generatedLogs.sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());

      if (isMounted) {
        setLogs(generatedLogs);
        setIsLoading(false);
      }
    };

    loadLogs();
    return () => { isMounted = false; };
  }, []);

  if (!isAllowed) {
    return (
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 text-center max-w-lg mx-auto shadow-xs mt-10">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Khu vực Nhật ký Kiểm toán</h2>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Tài khoản <strong>{user?.fullName || user?.roleName}</strong> không có quyền truy cập nhật ký kiểm toán. Chức năng này chỉ dành cho Quản trị viên và Lãnh đạo bộ phận.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 text-xs font-bold text-white bg-[#223873] hover:bg-[#1a2c5a] rounded-xl transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Về trang Tổng quan</span>
        </Link>
      </div>
    );
  }

  const filteredLogs = logs.filter((item) => {
    const matchesSearch =
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.target_label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.actor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.reason && item.reason.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getCategoryBadge = (cat: AuditLogEntry['category']) => {
    switch (cat) {
      case 'VEHICLE':
        return <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200 font-bold text-[10px]">Phương tiện</span>;
      case 'CONTAINER':
        return <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200 font-bold text-[10px]">Container</span>;
      case 'PAYMENT':
        return <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200 font-bold text-[10px]">Tài chính</span>;
      case 'REEFER':
        return <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200 font-bold text-[10px]">Điện cont</span>;
      case 'CLEARANCE':
        return <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-200 font-bold text-[10px]">Duyệt xuất</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold text-[10px]">Hệ thống</span>;
    }
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg p-4 border border-slate-300 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded bg-slate-100 border border-slate-300 text-slate-800 flex items-center justify-center font-bold">
              <History className="w-5 h-5 text-slate-700" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-slate-500">
                Kiểm toán & Đối soát Vận hành
              </span>
              <h1 className="text-base sm:text-lg font-bold uppercase tracking-tight text-slate-900">
                Nhật ký Kiểm toán Toàn bãi (Audit Trail)
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/users"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-300 bg-slate-50 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <span>Xem Nhân sự & Quyền →</span>
            </Link>
          </div>
        </div>

        {/* THÔNG BÁO BẤT BIẾN NHẬT KÝ */}
        <div className="mt-3 p-3 rounded bg-slate-50 border border-slate-300 text-slate-800 text-xs flex items-start space-x-2.5">
          <Lock className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">Quy tắc Nhật ký Bất biến (Append-only Log):</strong>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Mọi hành động nhạy cảm (sửa số container, sửa biển số xe, thu tiền, duyệt nợ, cắm/rút điện) đều được ghi nhận vĩnh viễn kèm danh tính người thực hiện, thời gian thực tế và lý do. Dữ liệu audit không thể bị chỉnh sửa hay xóa bỏ.
            </p>
          </div>
        </div>
      </div>

      {/* BỘ LỌC VÀ BẢNG LOGS */}
      <div className="bg-white rounded-lg border border-slate-300 shadow-sm p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo nội dung, biển số, mã cont, lý do..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(['ALL', 'VEHICLE', 'CONTAINER', 'PAYMENT', 'REEFER', 'CLEARANCE'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors whitespace-nowrap cursor-pointer border ${
                  categoryFilter === cat
                    ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {cat === 'ALL' && 'Tất cả'}
                {cat === 'VEHICLE' && 'Phương tiện'}
                {cat === 'CONTAINER' && 'Container'}
                {cat === 'PAYMENT' && 'Tài chính'}
                {cat === 'REEFER' && 'Điện cont'}
                {cat === 'CLEARANCE' && 'Duyệt xuất'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded border border-slate-300">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-3 py-2.5">Thời gian</th>
                <th className="px-3 py-2.5">Phân loại</th>
                <th className="px-3 py-2.5">Người thực hiện</th>
                <th className="px-3 py-2.5">Đối tượng tác động</th>
                <th className="px-3 py-2.5">Nội dung chi tiết</th>
                <th className="px-3 py-2.5">Căn cứ / Lý do</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Không có nhật ký kiểm toán nào phù hợp điều kiện tìm kiếm.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap font-mono">
                      <div>{new Date(log.occurred_at).toLocaleTimeString('vi-VN')}</div>
                      <div className="text-[10px] text-slate-400">{new Date(log.occurred_at).toLocaleDateString('vi-VN')}</div>
                    </td>

                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {getCategoryBadge(log.category)}
                    </td>

                    <td className="px-3 py-2.5">
                      <div className="font-semibold text-slate-900">{log.actor_name}</div>
                      <div className="text-[10px] font-mono text-slate-500">{log.actor_role}</div>
                    </td>

                    <td className="px-3 py-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {log.target_label}
                    </td>

                    <td className="px-3 py-2.5">
                      <div className="text-slate-800">{log.description}</div>
                      {log.old_value && log.new_value && (
                        <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                          <span className="line-through text-rose-600">{log.old_value}</span>
                          {' → '}
                          <span className="font-bold text-emerald-700">{log.new_value}</span>
                        </div>
                      )}
                    </td>

                    <td className="px-3 py-2.5 text-slate-600 italic">
                      {log.reason || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
