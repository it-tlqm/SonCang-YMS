-- ==============================================================================
-- MIGRATION 019: THU HỒI QUYỀN TẠO YÊU CẦU & CẮM/RÚT ĐIỆN CỦA AN NINH (SEC_STAFF, SEC_LEAD)
-- Nguồn & Lý do:
--   1. Phản hồi thực tế từ Chủ dự án: An ninh (SEC_STAFF, SEC_LEAD) là bộ phận gác cổng/bảo vệ,
--      tuyệt đối KHÔNG có quyền tạo yêu cầu cắm điện thương vụ hoặc ghi nhận cắm/rút điện.
--   2. Nghiệp vụ Điện Container hoàn toàn thuộc về Bộ phận Thương vụ Cảng Cạn (CCKB) và Quản trị viên (SYS_ADMIN).
--   3. An ninh chỉ có quyền:
--      - reefer.session.read (Xem danh sách phiên cắm điện)
--      - reefer.request.read (Xem yêu cầu cắm điện để đối soát)
--      - reefer.field_work.note (Ghi nhận nhật ký nhiệt độ cont lạnh hiện trường)
--      - reefer.request.alert.view, reefer.request.match_confirm (Xem cảnh báo cont đến)
-- ==============================================================================

DELETE FROM public.app_role_permissions
WHERE role_code IN ('SEC_STAFF', 'SEC_LEAD')
  AND permission_code IN (
    'reefer.session.actual_start.record',
    'reefer.session.actual_end.record',
    'reefer.request.create',
    'reefer.request.update',
    'reefer.request.cancel'
  );

-- Đảm bảo trạng thái is_enabled = FALSE nếu còn tồn tại
UPDATE public.app_role_permissions
SET is_enabled = FALSE
WHERE role_code IN ('SEC_STAFF', 'SEC_LEAD')
  AND permission_code IN (
    'reefer.session.actual_start.record',
    'reefer.session.actual_end.record',
    'reefer.request.create',
    'reefer.request.update',
    'reefer.request.cancel'
  );
