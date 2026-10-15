'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { 
  History, 
  ShieldAlert, 
  ArrowLeft, 
  Lock, 
  Users,
  Search,
  Filter
} from 'lucide-react';
import { WorkspaceHeader } from '@/components/workspace/workspace-header';
import { SearchInput } from '@/components/workspace/search-input';
import { StatusBadge } from '@/components/workspace/status-badge';
import { EmptyState } from '@/components/workspace/empty-state';

import { AuditLogEntry } from '@/lib/services/repository-interface';

export type { AuditLogEntry };

export default function AuditLogsAdminPage() {
  const { user, role, can, repository } = useAuth();

  // Kiểm tra quyền kiểm toán / quản trị
  const isAllowed = role === 'SYS_ADMIN' || can('admin.roles.manage') || can('report.revenue.read');

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  useEffect(() => {
    let isMounted = true;

    const loadLogs = async () => {
      setIsLoading(true);
      try {
        const data = await repository.getAuditLogs();
        if (isMounted) {
          setLogs(data);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Lỗi đọc audit logs:', err);
        if (isMounted) {
          setLogs([]);
          setIsLoading(false);
        }
      }
    };

    loadLogs();
    return () => { isMounted = false; };
  }, [repository]);

  if (!isAllowed) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-[#FFFFFF]">
        <div className="bg-white rounded-xl p-6 sm:p-8 border border-[#E5E9F0] text-center max-w-md w-full shadow-xs">
          <ShieldAlert className="w-10 h-10 text-[#D92D20] mx-auto mb-3" />
          <h2 className="text-base font-semibold text-[#17202E]">Giới hạn quyền truy cập</h2>
          <p className="text-xs text-[#667085] mt-2 leading-relaxed">
            Tài khoản của bạn không có quyền truy cập nhật ký kiểm toán. Chức năng này chỉ dành cho Quản trị viên và Lãnh đạo bộ phận.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 text-xs font-medium text-white bg-[#326DD8] hover:bg-[#2557B4] rounded-lg transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Về trang Tổng quan</span>
          </Link>
        </div>
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
        return <StatusBadge variant="info" label="Phương tiện" />;
      case 'CONTAINER':
        return <StatusBadge variant="navy" label="Container" />;
      case 'PAYMENT':
        return <StatusBadge variant="success" label="Tài chính" />;
      case 'REEFER':
        return <StatusBadge variant="warning" label="Điện cont" />;
      case 'CLEARANCE':
        return <StatusBadge variant="error" label="Duyệt xuất" />;
      default:
        return <StatusBadge variant="neutral" label="Hệ thống" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F8F9FB] min-h-[calc(100vh-210px)]">
      {/* 1. WORKSPACE HEADER */}
      <WorkspaceHeader
        title="Nhật ký Kiểm toán Toàn bãi"
        subtitle="Hệ thống lưu vết bất biến (Append-only) phục vụ đối soát, tra cứu và hậu kiểm vận hành"
        icon={History}
        badge={
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#F5F7FA] text-[#667085] border border-[#E5E9F0]">
            {logs.length} bản ghi
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/admin/users"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E9F0] text-xs font-medium text-[#17202E] hover:bg-[#F8F9FB] transition-colors"
            >
              <Users className="w-3.5 h-3.5 text-[#667085]" />
              <span>Nhân sự & Quyền</span>
            </Link>
          </div>
        }
      />

      <div className="p-4 sm:p-5 flex-1 flex flex-col space-y-4 w-full">
        {/* Notice */}
        <div className="p-3.5 rounded-lg bg-[#F8F9FB] border border-[#E5E9F0] text-xs flex items-start gap-3">
          <Lock className="w-4 h-4 text-[#326DD8] shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold text-[#17202E]">Quy tắc nhật ký kiểm toán bất biến:</span>
            <p className="text-[12px] text-[#667085] mt-0.5">
              Mọi hành động tác động dữ liệu (sửa số container, sửa biển số xe, thu tiền, duyệt nợ, cắm/rút điện) đều được ghi nhận vĩnh viễn kèm danh tính người thực hiện, thời gian thực tế và lý do.
            </p>
          </div>
        </div>

        {/* BỘ LỌC VÀ BẢNG LOGS */}
        <div className="bg-white rounded-xl border border-[#E5E9F0] flex-1 flex flex-col min-h-[540px] p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="w-full sm:w-80">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Tìm nội dung, biển số, mã cont, lý do..."
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {(['ALL', 'VEHICLE', 'CONTAINER', 'PAYMENT', 'REEFER', 'CLEARANCE'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer border ${
                    categoryFilter === cat
                      ? 'bg-[#326DD8] border-[#326DD8] text-white shadow-2xs'
                      : 'bg-[#F8F9FB] border-[#E5E9F0] text-[#667085] hover:text-[#17202E] hover:bg-[#F1F4F8]'
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

          <div className="overflow-x-auto flex-1 min-h-[500px] pb-40 rounded-lg border border-[#E5E9F0]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9FB] border-b border-[#E5E9F0] text-[#667085] font-semibold text-[11px]">
                <tr>
                  <th className="px-3.5 py-2.5">Thời gian</th>
                  <th className="px-3.5 py-2.5">Phân loại</th>
                  <th className="px-3.5 py-2.5">Người thực hiện</th>
                  <th className="px-3.5 py-2.5">Đối tượng tác động</th>
                  <th className="px-3.5 py-2.5">Nội dung chi tiết</th>
                  <th className="px-3.5 py-2.5">Căn cứ / Lý do</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E9F0]">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-[#98A2B3]">
                      Không có bản ghi nhật ký kiểm toán nào phù hợp với bộ lọc tìm kiếm.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#F8F9FB] transition-colors">
                      <td className="px-3.5 py-2.5 text-[#667085] whitespace-nowrap font-mono text-xs">
                        <div>{new Date(log.occurred_at).toLocaleTimeString('vi-VN')}</div>
                        <div className="text-[10px] text-[#98A2B3]">{new Date(log.occurred_at).toLocaleDateString('vi-VN')}</div>
                      </td>

                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        {getCategoryBadge(log.category)}
                      </td>

                      <td className="px-3.5 py-2.5">
                        <div className="font-semibold text-[#17202E]">{log.actor_name}</div>
                        <div className="text-[10px] font-mono text-[#667085]">{log.actor_role}</div>
                      </td>

                      <td className="px-3.5 py-2.5 font-mono font-bold text-[#17202E] whitespace-nowrap">
                        {log.target_label}
                      </td>

                      <td className="px-3.5 py-2.5">
                        <div className="text-[#17202E]">{log.description}</div>
                        {log.old_value && log.new_value && (
                          <div className="text-[11px] text-[#667085] mt-0.5 font-mono">
                            <span className="line-through text-[#D92D20]">{log.old_value}</span>
                            {' → '}
                            <span className="font-bold text-[#0A9444]">{log.new_value}</span>
                          </div>
                        )}
                      </td>

                      <td className="px-3.5 py-2.5 text-[#667085] italic text-[11px]">
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
    </div>
  );
}
