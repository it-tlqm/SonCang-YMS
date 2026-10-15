'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { SEED_VEHICLE_TYPES_V5 } from '@/lib/services/yard-service';
import { VehicleType } from '@/types/domain.types';
import { Settings, ShieldAlert, CheckCircle2, XCircle, AlertCircle, CopyCheck, ArrowLeft, Truck } from 'lucide-react';
import { WorkspaceHeader } from '@/components/workspace/workspace-header';
import { StatusBadge } from '@/components/workspace/status-badge';

export default function VehicleTypesAdminPage() {
  const { user, can, repository } = useAuth();

  // Kiểm tra quyền quản trị tham số biểu phí theo RBAC V5 (admin.billing_settings.manage)
  const isAllowed = can('admin.billing_settings.manage');

  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>(() => SEED_VEHICLE_TYPES_V5);

  useEffect(() => {
    let isMounted = true;
    repository.getVehicleTypes().then((types) => {
      if (isMounted && types.length > 0) {
        setVehicleTypes(types);
      }
    });
    return () => { isMounted = false; };
  }, [repository]);

  if (!isAllowed) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-[#FFFFFF]">
        <div className="bg-white rounded-xl p-6 sm:p-8 border border-[#E5E9F0] text-center max-w-md w-full shadow-xs">
          <ShieldAlert className="w-10 h-10 text-[#D92D20] mx-auto mb-3" />
          <h2 className="text-base font-semibold text-[#17202E]">Giới hạn quyền truy cập</h2>
          <p className="text-xs text-[#667085] mt-2 leading-relaxed">
            Tài khoản của bạn không có quyền quản trị danh mục và biểu phí bến bãi. Chức năng này chỉ dành cho Quản trị viên hệ thống.
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

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-white">
      {/* 1. WORKSPACE HEADER */}
      <WorkspaceHeader
        title="Danh mục Phân loại Phương tiện"
        subtitle="7 nhóm phương tiện cơ sở tính giá vé và quy định chở container bến bãi"
        icon={Settings}
        badge={
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#F5F7FA] text-[#667085] border border-[#E5E9F0]">
            7 loại phương tiện
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/admin/tariffs"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E9F0] text-xs font-medium text-[#17202E] hover:bg-[#F8F9FB] transition-colors"
            >
              <span>Biểu phí dịch vụ</span>
            </Link>
            <Link
              href="/admin/vehicle-duplicate"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F8F9FB] border border-[#E5E9F0] text-xs font-semibold text-[#326DD8] hover:bg-[#F1F4F8] transition-colors"
            >
              <CopyCheck className="w-3.5 h-3.5" />
              <span>Chính sách trùng xe</span>
            </Link>
          </div>
        }
      />

      <div className="p-4 sm:p-5 space-y-4 max-w-5xl">
        {/* Financial rule notice */}
        <div className="p-3.5 rounded-lg bg-[#F8F9FB] border border-[#E5E9F0] text-xs flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-[#326DD8] shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold text-[#17202E]">Quy định quản lý giá vé và phân loại:</span>
            <p className="text-[12px] text-[#667085] mt-0.5">
              Việc điều chỉnh giá vé yêu cầu quy trình đề xuất và phê duyệt độc lập hai cấp. Danh mục này phục vụ tra cứu phân loại phương tiện, không áp dụng chỉnh sửa biểu phí trực tiếp tại màn hình này.
            </p>
          </div>
        </div>

        {/* BẢNG DANH MỤC 7 LOẠI XE */}
        <div className="bg-white rounded-lg border border-[#E5E9F0] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E5E9F0] bg-[#F8F9FB] flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#17202E]">
              Danh sách nhóm phương tiện ({vehicleTypes.length})
            </h2>
            <span className="text-[11px] text-[#667085]">Tiêu chuẩn phân loại bến bãi V5</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9FB] border-b border-[#E5E9F0] text-[#667085] font-semibold">
                <tr>
                  <th className="px-4 py-2.5 w-12 text-center">STT</th>
                  <th className="px-4 py-2.5">Mã phân loại</th>
                  <th className="px-4 py-2.5">Tên phương tiện</th>
                  <th className="px-4 py-2.5">Chở Container</th>
                  <th className="px-4 py-2.5">Giá vé mặc định</th>
                  <th className="px-4 py-2.5 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E9F0]">
                {vehicleTypes.map((t, idx) => (
                  <tr key={t.code} className="hover:bg-[#F8F9FB] transition-colors">
                    <td className="px-4 py-3 text-[#98A2B3] text-center font-mono">{idx + 1}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-[#17202E]">{t.code}</td>
                    <td className="px-4 py-3 font-medium text-[#17202E]">
                      <div>{t.name}</div>
                      <div className="text-[11px] text-[#667085] font-normal">{t.description}</div>
                    </td>
                    <td className="px-4 py-3">
                      {t.allows_container ? (
                        <StatusBadge variant="success" label="Cho phép" />
                      ) : (
                        <span className="text-[11px] text-[#98A2B3] font-medium">Không chở cont</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {t.default_ticket_amount === 0 ? (
                        <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-medium bg-[#EFF8FF] text-[#326DD8] border border-[#B2DDFF]">
                          0 đ (Miễn phí hợp lệ)
                        </span>
                      ) : t.default_ticket_amount !== null ? (
                        <span className="text-[#0A9444] font-semibold font-mono text-xs">
                          {t.default_ticket_amount.toLocaleString('vi-VN')} đ
                        </span>
                      ) : (
                        <span className="text-[#98A2B3] italic text-[11px]">
                          Chưa thiết lập biểu phí
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge variant="success" label="Hoạt động" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
