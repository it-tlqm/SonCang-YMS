'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { SEED_VEHICLE_TYPES_V5 } from '@/lib/services/yard-service';
import { VehicleType } from '@/types/domain.types';
import { Settings, ShieldAlert, CheckCircle2, XCircle, AlertTriangle, CopyCheck } from 'lucide-react';

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
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 text-center max-w-lg mx-auto shadow-xs">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Khu vực Quản trị Hệ thống</h2>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Tài khoản <strong>{user?.roleName || 'Chưa phân vai trò'}</strong> không có quyền quản trị danh mục và biểu phí (<code>admin.billing_settings.manage</code>). Chức năng này chỉ dành cho Quản trị viên (<code>SYS_ADMIN</code>).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E3E8EF] shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold tracking-wider uppercase text-purple-700">
                Quản trị Hệ thống
              </span>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
                Danh mục Phân loại Phương tiện Vận chuyển
              </h1>
            </div>
          </div>

          <Link
            href="/admin/vehicle-duplicate"
            className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold transition-colors flex items-center space-x-1.5 shrink-0"
          >
            <CopyCheck className="w-4 h-4" />
            <span>Cấu hình trùng xe →</span>
          </Link>
        </div>

        {/* HỘP QUY ĐỊNH TÀI CHÍNH BIỂU PHÍ */}
        <div className="mt-4 p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-950 text-xs flex items-start space-x-2.5">
          <AlertTriangle className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="font-bold">Quy định quản lý giá vé:</strong>
            <p className="text-[11px] text-purple-800 mt-0.5">
              Theo quy định quản trị tài chính, việc điều chỉnh giá vé yêu cầu quy trình đề xuất và phê duyệt độc lập hai cấp. Danh mục này phục vụ tra cứu phân loại phương tiện, không áp dụng chỉnh sửa biểu phí trực tiếp tại màn hình này.
            </p>
          </div>
        </div>
      </div>

      {/* BẢNG DANH MỤC 7 LOẠI XE V5 */}
      <div className="bg-white rounded-2xl border border-[#E3E8EF] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">STT</th>
                <th className="px-4 py-3">Mã loại</th>
                <th className="px-4 py-3">Tên phương tiện</th>
                <th className="px-4 py-3">Chở Cont</th>
                <th className="px-4 py-3">Giá vé mặc định</th>
                <th className="px-4 py-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vehicleTypes.map((t, idx) => (
                <tr key={t.code} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 text-slate-400 font-semibold">{idx + 1}</td>
                  <td className="px-4 py-3 font-mono font-bold text-slate-900">{t.code}</td>
                  <td className="px-4 py-3 font-bold text-slate-800">
                    <div>{t.name}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{t.description}</div>
                  </td>
                  <td className="px-4 py-3">
                    {t.allows_container ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Cho phép</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium text-slate-400">
                        <XCircle className="w-3 h-3" />
                        <span>Không</span>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {t.default_ticket_amount === 0 ? (
                      <span className="text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px]">
                        0 đ (Miễn phí hợp lệ)
                      </span>
                    ) : t.default_ticket_amount !== null ? (
                      <span className="text-[#0A9444] font-bold text-sm">
                        {t.default_ticket_amount.toLocaleString('vi-VN')} đ
                      </span>
                    ) : (
                      <span className="text-slate-400 font-semibold italic text-[11px]">
                        Chưa thiết lập biểu phí (NULL)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Đang hoạt động
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
