-- RBAC V5 / SON CANG - DRAFT MIGRATION AND SEED (11/10/2026)
-- IMPORTANT: NOT A COMPLETE PRODUCTION SECURITY MIGRATION.
-- Review by developer before running. No auth users or default passwords are created.
-- Domain/business tables must have their OWN RLS policies and server validations.
-- This file sets up role/permission metadata, grants, settings and helper functions only.

BEGIN;

CREATE TABLE IF NOT EXISTS public.app_departments (
 code text PRIMARY KEY, display_name text NOT NULL, is_active boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS public.app_yards (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE,
 is_active boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS public.app_roles (
 code text PRIMARY KEY,
 display_name text NOT NULL,
 department_code text REFERENCES public.app_departments(code),
 seniority text NOT NULL,
 is_active boolean NOT NULL DEFAULT true,
 release_phase text NOT NULL DEFAULT 'V1',
 description text NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS public.app_permissions (
 code text PRIMARY KEY,
 module text NOT NULL,
 display_name text NOT NULL,
 source_questions text NOT NULL DEFAULT '',
 release_phase text NOT NULL DEFAULT 'V1',
 feature_key text NOT NULL DEFAULT 'CORE',
 risk_level text NOT NULL DEFAULT 'Normal',
 description text NOT NULL DEFAULT '',
 is_active boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS public.app_role_permissions (
 role_code text NOT NULL REFERENCES public.app_roles(code) ON DELETE RESTRICT,
 permission_code text NOT NULL REFERENCES public.app_permissions(code) ON DELETE RESTRICT,
 scope text NOT NULL CHECK (scope IN ('SELF','DEPARTMENT','YARD','ALL')),
 is_enabled boolean NOT NULL DEFAULT true,
 PRIMARY KEY (role_code,permission_code)
);
CREATE TABLE IF NOT EXISTS public.app_user_role_assignments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 role_code text NOT NULL REFERENCES public.app_roles(code) ON DELETE RESTRICT,
 yard_id uuid REFERENCES public.app_yards(id) ON DELETE RESTRICT,
 department_code text REFERENCES public.app_departments(code),
 valid_from timestamptz NOT NULL DEFAULT now(),
 valid_until timestamptz,
 is_active boolean NOT NULL DEFAULT true,
 created_by uuid REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (valid_until IS NULL OR valid_until > valid_from)
);
CREATE INDEX IF NOT EXISTS idx_sc_role_assign_user ON public.app_user_role_assignments(user_id,is_active);
CREATE TABLE IF NOT EXISTS public.app_feature_flags (
 feature_key text PRIMARY KEY, display_name text NOT NULL,
 is_enabled boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS public.app_settings (
 setting_key text PRIMARY KEY,
 setting_value jsonb NOT NULL,
 setting_type text NOT NULL,
 decision_status text NOT NULL,
 notes text NOT NULL DEFAULT '',
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.app_approval_policies (
 policy_code text PRIMARY KEY,
 label text NOT NULL,
 request_permission_code text,
 approve_permission_code text,
 enforce_distinct_actor boolean NOT NULL DEFAULT true,
 reason_required boolean NOT NULL DEFAULT true,
 is_enabled boolean NOT NULL DEFAULT true,
 notes text NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS public.app_approval_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 policy_code text NOT NULL REFERENCES public.app_approval_policies(policy_code),
 target_type text NOT NULL,
 target_id uuid NOT NULL,
 requested_by uuid NOT NULL REFERENCES auth.users(id),
 approved_by uuid REFERENCES auth.users(id),
 reason text NOT NULL,
 before_snapshot jsonb,
 proposed_changes jsonb,
 status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','CANCELLED')),
 created_at timestamptz NOT NULL DEFAULT now(),
 decision_at timestamptz,
 CHECK (approved_by IS NULL OR approved_by <> requested_by)
);
CREATE INDEX IF NOT EXISTS idx_sc_approval_target ON public.app_approval_requests(target_type,target_id);
CREATE TABLE IF NOT EXISTS public.app_audit_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 event_at timestamptz NOT NULL DEFAULT now(),
 actor_user_id uuid,
 action_code text NOT NULL,
 target_type text NOT NULL,
 target_id text,
 yard_id uuid,
 before_data jsonb,
 after_data jsonb,
 reason text,
 request_id text,
 device_info jsonb
);

-- Role/permission tables are not directly modifiable by a browser.
-- Administrative writes must go through properly authorized backend functions.
ALTER TABLE public.app_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_yards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_user_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_approval_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_audit_events ENABLE ROW LEVEL SECURITY;

-- PostgreSQL defaults: no RLS policies means access is denied for normal client roles.
-- Administrative screens should use trusted backend RPCs with separate permission checks.

-- Prevent accidental updates/deletes of audit log, even by privileged app code.
CREATE OR REPLACE FUNCTION public.sc_audit_immutable()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
 RAISE EXCEPTION 'audit log is immutable';
END; $$;
DROP TRIGGER IF EXISTS sc_audit_no_update_or_delete ON public.app_audit_events;
CREATE TRIGGER sc_audit_no_update_or_delete
 BEFORE UPDATE OR DELETE ON public.app_audit_events
 FOR EACH ROW EXECUTE FUNCTION public.sc_audit_immutable();

INSERT INTO public.app_departments(code,display_name) VALUES ('AN_NINH','Bộ phận An ninh') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_departments(code,display_name) VALUES ('CCKB','Bộ phận Nghiệp vụ cổng cảng kho bãi') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_departments(code,display_name) VALUES ('DIEU_PHOI','Bộ phận Điều phối') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_departments(code,display_name) VALUES ('HE_THONG','Quản trị hệ thống') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_departments(code,display_name) VALUES ('KE_TOAN','Kế toán') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_yards(name) VALUES ('Bãi Sơn Cảng') ON CONFLICT (name) DO NOTHING;
-- Seed role definitions. Do not overwrite production edits on redeploy.
INSERT INTO public.app_roles(code,display_name,department_code,seniority,is_active,release_phase,description) VALUES ('SEC_STAFF','Nhân viên An ninh','AN_NINH','Nhân viên',TRUE,'V1','Kiểm soát cổng, thu vé/phí lưu, ghi xe/cont ra, sửa mã cont có nhật ký.') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_roles(code,display_name,department_code,seniority,is_active,release_phase,description) VALUES ('SEC_LEAD','Trưởng bộ phận An ninh','AN_NINH','Trưởng bộ phận',TRUE,'V1','Toàn quyền nghiệp vụ An ninh, xem thu ca/bộ phận, xử lý ngoại lệ.') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_roles(code,display_name,department_code,seniority,is_active,release_phase,description) VALUES ('PORT_STAFF','Nhân viên Cổng cảng kho bãi','CCKB','Nhân viên',TRUE,'V1','Điện dự kiến, nhập/sửa giờ, thu điện, xác nhận tài chính/ngoại lệ có lý do.') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_roles(code,display_name,department_code,seniority,is_active,release_phase,description) VALUES ('PORT_LEAD','Trưởng bộ phận Cổng cảng kho bãi','CCKB','Trưởng bộ phận',TRUE,'V1','Duyệt điều chỉnh tiền sau thu, xem đối soát, hỗ trợ nhân viên CCKB.') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_roles(code,display_name,department_code,seniority,is_active,release_phase,description) VALUES ('DIS_STAFF','Nhân viên Điều phối','DIEU_PHOI','Nhân viên',TRUE,'V1','Cập nhật tình trạng container HÀNG/RỖNG trong bãi.') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_roles(code,display_name,department_code,seniority,is_active,release_phase,description) VALUES ('DIS_LEAD','Trưởng bộ phận Điều phối','DIEU_PHOI','Trưởng bộ phận',TRUE,'V1','Xử lý thay đổi HÀNG/RỖNG sau khi cont đã ra; xem audit BP.') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_roles(code,display_name,department_code,seniority,is_active,release_phase,description) VALUES ('SYS_ADMIN','Quản trị hệ thống','HE_THONG','Quản trị',TRUE,'V1','Quản trị tài khoản, gán quyền, bảng giá, bảo trì và ngoại lệ có audit.') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_roles(code,display_name,department_code,seniority,is_active,release_phase,description) VALUES ('ACCOUNTING_FUTURE','Kế toán (dự phòng)','KE_TOAN','Chuyên môn',FALSE,'GĐ sau','Chưa bật trong V1; lưu thông tin hóa đơn, mở rộng khi có nghiệp vụ Kế toán.') ON CONFLICT (code) DO NOTHING;
-- Seed permission/action registry: app feature code is stable, role names are never checked by frontend.
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('vehicle.visit.read','Cổng xe','Xem lượt xe trong bãi','Q01,Q03,Q25','V1','CORE','Thông thường','',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('vehicle.visit.create','Cổng xe','Tạo lượt xe/giờ vào','Q01','V1','CORE','Thông thường','',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('vehicle.visit.update_basic','Cổng xe','Sửa thông tin cơ bản của lượt xe','Q03','V1','CORE','Nhạy cảm','Biển số/loại xe; audit trước/sau; không tự viết lại số tiền đã thu.',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('vehicle.visit.time_correction.request','Cổng xe','Yêu cầu sửa giờ vào sau khi phát sinh tiền','Q03','V1','CORE','Nhạy cảm','',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('vehicle.visit.time_correction.approve','Cổng xe','Duyệt sửa giờ vào sau khi phát sinh tiền','Q03','V1','CORE','Cao','Không tự duyệt yêu cầu do mình tạo; tách điều chỉnh phí.',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('ticket.payment.collect','Vé vào','Ghi nhận thu tiền vé xe vào','Q02','V1','CORE','Tài chính','',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('ticket.lost_fee.collect','Vé vào','Ghi nhận và thu phạt mất vé','Q20','V1','CORE','Tài chính','',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('ticket.paper_number.adjust','Vé vào','Chỉnh số seri vé giấy / in vé','Q04','GĐ sau','TICKET_AUTOPRINT','Thông thường','Chưa xây theo quyết định V1; vẫn lưu thông tin số vé nếu có.',FALSE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('vehicle.visit.exit_confirm','Cổng ra','Xác nhận lượt xe thực tế ra','Q25','V1','CORE','Cao','Bắt buộc server xác thực và chặn bấm đúp; không xác nhận offline.',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('container.visit.read','Container','Xem lượt container trong bãi','Q05,Q06,Q18','V1','CORE','Thông thường','',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('container.visit.create','Container','Tạo lượt container vào và giờ vào','Q05','V1','CORE','Thông thường','',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('container.number.correct','Container','Sửa số container trên cùng ID lượt','Q06,Q35','V1','CORE','Cao','Ghi số cũ/mới, lý do, người sửa; tự cảnh báo CCKB; giữ nguyên charge/payment và ID.',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('container.number.discrepancy.view','Container','Xem cảnh báo sai số container','Q35,Q36,Q39','V1','CORE','Thông thường','',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('container.number.discrepancy.sec_ack','Container','An ninh xác nhận đã báo CCKB','Q35,Q39','V1','CORE','Thông thường','',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('container.number.discrepancy.port_reconcile','Container','CCKB đối chiếu sai số và đóng cảnh báo','Q36,Q38,Q39','V1','CORE','Nhạy cảm','',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('container.number.evidence.attach','Chứng từ','Đính kèm ảnh/video xác minh số cont','Q37','V1','CORE','Thông thường','',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('container.visit.link_request','Container','Ghép yêu cầu dự kiến vào lượt cont vào','Q34','V1','CORE','Nhạy cảm','Chỉ xác nhận thủ công, không auto-ghép từ mã gần giống.',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('container.cargo.read','Điều phối','Xem HÀNG/RỖNG','Q08,Q09','V1','CORE','Thông thường','',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('container.cargo.update','Điều phối','Cập nhật HÀNG/RỖNG khi còn trong bãi','Q08','V1','CORE','Thông thường','',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('container.cargo.post_exit.request','Điều phối','Đề nghị sửa HÀNG/RỖNG sau ra','Q09','V1','CORE','Nhạy cảm','',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('container.cargo.post_exit.approve','Điều phối','Duyệt sửa HÀNG/RỖNG sau ra','Q09','V1','CORE','Cao','',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('container.handling.record','Container','Ghi nhận hạ/xếp, vị trí khu/dãy/ô','Q07','GĐ sau','YARD_SLOT_MANAGEMENT','Thông thường','Không dùng sự kiện hạ/xếp làm căn cứ thu phí lưu container.',FALSE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('reefer.request.read','Điện dự kiến','Xem yêu cầu điện dự kiến / đang xử lý','Q10,Q31,Q33','V1','CORE','Thông thường','',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('reefer.request.create','Điện dự kiến','Tạo phiếu yêu cầu cắm/rút (kể cả cont chưa vào)','Q10,Q31','V1','CORE','Thông thường','Một phiếu/cont, nhiều phiên; không tạo GIO_CONT_VAO khi phiếu là dự kiến.',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('reefer.request.update','Điện dự kiến','Sửa thông tin yêu cầu dự kiến','Q32,Q36','V1','CORE','Thông thường','Sửa số cont/khách/loại yêu cầu có lịch sử và báo An ninh.',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('reefer.request.cancel','Điện dự kiến','Hủy phiếu điện chưa thực hiện','Q32','V1','CORE','Nhạy cảm','Hủy mềm có lịch sử; không xóa phiếu đã phát sinh điện.',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('reefer.request.alert.view','Điện dự kiến','Xem cảnh báo yêu cầu điện khi xe vào','Q33','V1','CORE','Thông thường','',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('reefer.request.match_confirm','Điện dự kiến','Xác nhận ghép phiếu dự kiến với cont thực','Q34','V1','CORE','Nhạy cảm','',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('reefer.field_work.note','Cắm điện','Ghi nhận thông tin An ninh báo cắm/rút ngoài hiện trường','Q11','V1','CORE','Thông thường','Quyền ghi chú/bằng chứng; KHÔNG biến việc bấm nút thành điều kiện bắt buộc để cắm/rút thực tế.',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('reefer.session.read','Cắm điện','Xem phiên điện/trạng thái','Q12,Q13','V1','CORE','Thông thường','',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('reefer.session.actual_start.record','Cắm điện','CCKB nhập giờ cắm thực tế','Q12','V1','CORE','Thông thường','',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('reefer.session.actual_end.record','Cắm điện','CCKB nhập giờ rút thực tế','Q13','V1','CORE','Thông thường','',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('reefer.session.time.edit_unpaid','Cắm điện','CCKB sửa giờ cắm/rút trước khi thu','Q14','V1','CORE','Nhạy cảm','',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('reefer.session.billable.override_unpaid','Cắm điện','Chỉnh thời lượng tính tiền trước khi thu','Q14','V1','CORE','Tài chính','Tự làm tròn 15 phút mặc định; nếu chỉnh thì lưu số tính tự động, số điều chỉnh và lý do.',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('reefer.session.amendment.request','Cắm điện','Đề nghị điều chỉnh giờ/tiền sau thu','Q15','V1','CORE','Tài chính','',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('reefer.session.amendment.approve','Cắm điện','Duyệt chênh lệch sau thu điện','Q16','V1','CORE','Cao','Tài khoản duyệt phải khác người đề nghị; không ghi đè tiền đã thu.',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('reefer.payment.collect','Thanh toán','Thu tiền điện từng phiên hoặc tổng hợp','Q19','V1','CORE','Tài chính','',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('reefer.payment.partial_collect','Thanh toán','Thu một phần phí điện','Q19','V1','CORE','Tài chính','',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('storage.payment.collect','Thanh toán','An ninh tính/thu phí lưu tại giờ cont ra','Q18','V1','CORE','Tài chính','Chốt dựa GIO_CONT_VAO và GIO_CONT_RA thực tế, không khóa phí lúc rút điện.',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('payment.bank_evidence.attach','Thanh toán','Đính kèm ảnh chứng từ thanh toán','Q02,Q19,Q21','V1','CORE','Thông thường','Quy định bắt buộc chứng từ có thể cấu hình riêng theo hình thức thu.',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('payment.bank.reconcile','Thanh toán','Đối soát chuyển khoản theo bộ phận','Q21','V1','CORE','Tài chính','',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('payment.post_correction.request','Thanh toán','Yêu cầu xử lý chênh lệch khi sửa mã cont đã thu','Q38','V1','CORE','Tài chính','',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('payment.post_correction.approve','Thanh toán','Duyệt chênh lệch tiền do sửa số cont','Q38','V1','CORE','Cao','',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('charge.adjust.request','Thanh toán','Gửi đề nghị miễn/giảm/điều chỉnh tiền','Q22','GĐ sau','CHARGE_DISCOUNT','Tài chính','',FALSE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('charge.adjust.approve','Thanh toán','Duyệt miễn/giảm/điều chỉnh tiền','Q22','GĐ sau','CHARGE_DISCOUNT','Cao','',FALSE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('payment.refund.request','Thanh toán','Đề nghị hoàn tiền','Q23','GĐ sau','REFUNDS','Tài chính','',FALSE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('payment.refund.approve','Thanh toán','Duyệt hoàn tiền / hủy bút toán','Q23','GĐ sau','REFUNDS','Cao','',FALSE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('exit.clearance.read','Cổng ra','Xem tình trạng tài chính và cho ra','Q24,Q25','V1','CORE','Thông thường','',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('exit.clearance.issue','Cổng ra','CCKB xác nhận điều kiện tài chính','Q24','V1','CORE','Cao','Xác nhận điện/công nợ đã biết; KHÔNG khóa phí lưu container.',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('exit.clearance.debt_exception','Cổng ra','CCKB xác nhận cho ra còn khoản chưa thu','Q24','V1','CORE','Cao','Bắt buộc lý do, hiện cảnh báo và giữ khoản còn nợ; phải kiểm tra lại nếu phí lưu mới phát sinh.',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('exit.clearance.revoke.request','Cổng ra','Đề nghị thu hồi chấp thuận xuất trước khi xe ra','Q26','V1','CORE','Nhạy cảm','',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('exit.clearance.revoke.approve','Cổng ra','Thu hồi chấp thuận cho ra trước khi thực xuất','Q26','V1','CORE','Cao','',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('exit.actual.confirm','Cổng ra','An ninh xác nhận cont/xe ra thật','Q25','V1','CORE','Cao','Server transaction và idempotency; không được tự hoàn tất nếu offline.',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('exit.reefer_state.exception','Cổng ra','CCKB ghi ngoại lệ trạng thái điện chưa cập nhật','Q24','V1','CORE','Cao','Phải có An ninh xác minh ngoài hiện trường đã rút điện, không được cho cont rời bãi khi còn kết nối điện thực tế.',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('report.revenue.read','Báo cáo','Xem doanh thu và khoản thu theo phạm vi','Q29','V1','CORE','Tài chính','',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('report.revenue.export','Báo cáo','Xuất báo cáo doanh thu theo bộ phận','Q30','V1','CORE','Tài chính','',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('audit.read','Giám sát','Xem lịch sử thao tác thuộc phạm vi','Q28','V1','CORE','Thông thường','',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('audit.export_all','Giám sát','Xuất nhật ký kiểm toán toàn hệ thống','Q30','V1','CORE','Cao','',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('tariff.read','Bảng giá','Xem giá dịch vụ theo hiệu lực','Q17','V1','CORE','Thông thường','',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('tariff.change.request','Bảng giá','Gửi đề nghị thay đổi bảng giá','Q17','V1','CORE','Tài chính','',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('tariff.change.publish','Bảng giá','Ban hành mức giá và ngày hiệu lực','Q17','V1','CORE','Cao','Thay đổi giá qua bảng tariff_versions, không sửa code/giá lịch sử.',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('admin.users.manage','Quản trị','Tạo/khóa user và gán role theo phạm vi','Q27','V1','CORE','Cao','',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('admin.roles.manage','Quản trị','Thêm/sửa tên vai trò và thành phần vai trò','Q27','V1','CORE','Cao','Vai trò tùy biến nhưng không thể tạo tính năng mới chỉ bằng cách đặt role.',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('admin.role_permissions.manage','Quản trị','Cấp/thu hồi quyền của vai trò','Q27','V1','CORE','Cao','Cấm tự động cho quyền cao hơn do seed chủ sở hữu quy định; audit và quyền bootstrap.',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('admin.billing_settings.manage','Quản trị','Quản lý tham số tính phí và chức năng mở rộng','Q17','V1','CORE','Cao','',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('admin.legacy_correct','Quản trị','Sửa dữ liệu nhập lịch sử AppSheet có audit','Q03,Q06','V1','CORE','Cao','Không chỉnh sửa trực tiếp DB; phải ghi đối chiếu lịch sử và không tạo nợ legacy chưa xác minh.',TRUE) ON CONFLICT (code) DO NOTHING;
INSERT INTO public.app_permissions(code,module,display_name,source_questions,release_phase,feature_key,risk_level,description,is_active) VALUES ('accounting.invoice.prepare','Hóa đơn','Nhập dữ liệu hóa đơn từ bộ phận Kế toán','','GĐ sau','E_INVOICE','Nhạy cảm','',FALSE) ON CONFLICT (code) DO NOTHING;
-- Default grants V1. Changes made from Admin UI must NOT be reset by reseeding.
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_STAFF','vehicle.visit.read','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_LEAD','vehicle.visit.read','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_STAFF','vehicle.visit.read','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_LEAD','vehicle.visit.read','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('DIS_STAFF','vehicle.visit.read','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('DIS_LEAD','vehicle.visit.read','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','vehicle.visit.read','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_STAFF','vehicle.visit.create','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_LEAD','vehicle.visit.create','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','vehicle.visit.create','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_STAFF','vehicle.visit.update_basic','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_LEAD','vehicle.visit.update_basic','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','vehicle.visit.update_basic','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_STAFF','vehicle.visit.time_correction.request','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_LEAD','vehicle.visit.time_correction.request','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','vehicle.visit.time_correction.request','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_LEAD','vehicle.visit.time_correction.approve','DEPARTMENT',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','vehicle.visit.time_correction.approve','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_STAFF','ticket.payment.collect','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_LEAD','ticket.payment.collect','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','ticket.payment.collect','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_STAFF','ticket.lost_fee.collect','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_LEAD','ticket.lost_fee.collect','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','ticket.lost_fee.collect','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_STAFF','vehicle.visit.exit_confirm','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_LEAD','vehicle.visit.exit_confirm','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','vehicle.visit.exit_confirm','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_STAFF','container.visit.read','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_LEAD','container.visit.read','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_STAFF','container.visit.read','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_LEAD','container.visit.read','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('DIS_STAFF','container.visit.read','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('DIS_LEAD','container.visit.read','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','container.visit.read','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_STAFF','container.visit.create','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_LEAD','container.visit.create','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','container.visit.create','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_STAFF','container.number.correct','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_LEAD','container.number.correct','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','container.number.correct','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_STAFF','container.number.discrepancy.view','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_LEAD','container.number.discrepancy.view','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_STAFF','container.number.discrepancy.view','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_LEAD','container.number.discrepancy.view','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','container.number.discrepancy.view','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_STAFF','container.number.discrepancy.sec_ack','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_LEAD','container.number.discrepancy.sec_ack','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','container.number.discrepancy.sec_ack','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_STAFF','container.number.discrepancy.port_reconcile','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_LEAD','container.number.discrepancy.port_reconcile','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','container.number.discrepancy.port_reconcile','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_STAFF','container.number.evidence.attach','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_LEAD','container.number.evidence.attach','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_STAFF','container.number.evidence.attach','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_LEAD','container.number.evidence.attach','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','container.number.evidence.attach','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_STAFF','container.visit.link_request','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_LEAD','container.visit.link_request','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_STAFF','container.visit.link_request','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_LEAD','container.visit.link_request','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','container.visit.link_request','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_STAFF','container.cargo.read','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_LEAD','container.cargo.read','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_STAFF','container.cargo.read','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_LEAD','container.cargo.read','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('DIS_STAFF','container.cargo.read','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('DIS_LEAD','container.cargo.read','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','container.cargo.read','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('DIS_STAFF','container.cargo.update','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('DIS_LEAD','container.cargo.update','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','container.cargo.update','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('DIS_STAFF','container.cargo.post_exit.request','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('DIS_LEAD','container.cargo.post_exit.request','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','container.cargo.post_exit.request','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('DIS_LEAD','container.cargo.post_exit.approve','DEPARTMENT',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','container.cargo.post_exit.approve','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_STAFF','reefer.request.read','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_LEAD','reefer.request.read','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_STAFF','reefer.request.read','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_LEAD','reefer.request.read','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('DIS_STAFF','reefer.request.read','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('DIS_LEAD','reefer.request.read','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','reefer.request.read','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_STAFF','reefer.request.create','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_LEAD','reefer.request.create','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','reefer.request.create','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_STAFF','reefer.request.update','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_LEAD','reefer.request.update','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','reefer.request.update','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_STAFF','reefer.request.cancel','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_LEAD','reefer.request.cancel','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','reefer.request.cancel','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_STAFF','reefer.request.alert.view','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_LEAD','reefer.request.alert.view','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_STAFF','reefer.request.alert.view','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_LEAD','reefer.request.alert.view','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','reefer.request.alert.view','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_STAFF','reefer.request.match_confirm','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_LEAD','reefer.request.match_confirm','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_STAFF','reefer.request.match_confirm','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_LEAD','reefer.request.match_confirm','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','reefer.request.match_confirm','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_STAFF','reefer.field_work.note','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_LEAD','reefer.field_work.note','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_STAFF','reefer.field_work.note','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_LEAD','reefer.field_work.note','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','reefer.field_work.note','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_STAFF','reefer.session.read','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_LEAD','reefer.session.read','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_STAFF','reefer.session.read','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_LEAD','reefer.session.read','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('DIS_STAFF','reefer.session.read','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('DIS_LEAD','reefer.session.read','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','reefer.session.read','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_STAFF','reefer.session.actual_start.record','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_LEAD','reefer.session.actual_start.record','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','reefer.session.actual_start.record','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_STAFF','reefer.session.actual_end.record','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_LEAD','reefer.session.actual_end.record','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','reefer.session.actual_end.record','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_STAFF','reefer.session.time.edit_unpaid','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_LEAD','reefer.session.time.edit_unpaid','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','reefer.session.time.edit_unpaid','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_STAFF','reefer.session.billable.override_unpaid','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_LEAD','reefer.session.billable.override_unpaid','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','reefer.session.billable.override_unpaid','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_STAFF','reefer.session.amendment.request','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_LEAD','reefer.session.amendment.request','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','reefer.session.amendment.request','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_LEAD','reefer.session.amendment.approve','DEPARTMENT',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','reefer.session.amendment.approve','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_STAFF','reefer.payment.collect','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_LEAD','reefer.payment.collect','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','reefer.payment.collect','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_STAFF','reefer.payment.partial_collect','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_LEAD','reefer.payment.partial_collect','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','reefer.payment.partial_collect','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_STAFF','storage.payment.collect','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_LEAD','storage.payment.collect','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','storage.payment.collect','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_STAFF','payment.bank_evidence.attach','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_LEAD','payment.bank_evidence.attach','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_STAFF','payment.bank_evidence.attach','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_LEAD','payment.bank_evidence.attach','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','payment.bank_evidence.attach','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_LEAD','payment.bank.reconcile','DEPARTMENT',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_LEAD','payment.bank.reconcile','DEPARTMENT',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','payment.bank.reconcile','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_STAFF','payment.post_correction.request','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_LEAD','payment.post_correction.request','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_LEAD','payment.post_correction.request','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','payment.post_correction.request','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_LEAD','payment.post_correction.approve','DEPARTMENT',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','payment.post_correction.approve','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_STAFF','exit.clearance.read','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_LEAD','exit.clearance.read','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_STAFF','exit.clearance.read','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_LEAD','exit.clearance.read','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('DIS_STAFF','exit.clearance.read','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('DIS_LEAD','exit.clearance.read','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','exit.clearance.read','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_STAFF','exit.clearance.issue','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_LEAD','exit.clearance.issue','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','exit.clearance.issue','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_STAFF','exit.clearance.debt_exception','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_LEAD','exit.clearance.debt_exception','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','exit.clearance.debt_exception','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_STAFF','exit.clearance.revoke.request','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_LEAD','exit.clearance.revoke.request','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','exit.clearance.revoke.request','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_LEAD','exit.clearance.revoke.approve','DEPARTMENT',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','exit.clearance.revoke.approve','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_STAFF','exit.actual.confirm','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_LEAD','exit.actual.confirm','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','exit.actual.confirm','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_STAFF','exit.reefer_state.exception','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_LEAD','exit.reefer_state.exception','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','exit.reefer_state.exception','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_STAFF','report.revenue.read','SELF',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_LEAD','report.revenue.read','DEPARTMENT',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_STAFF','report.revenue.read','SELF',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_LEAD','report.revenue.read','DEPARTMENT',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','report.revenue.read','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_LEAD','report.revenue.export','DEPARTMENT',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_LEAD','report.revenue.export','DEPARTMENT',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','report.revenue.export','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_LEAD','audit.read','DEPARTMENT',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_LEAD','audit.read','DEPARTMENT',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('DIS_LEAD','audit.read','DEPARTMENT',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','audit.read','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','audit.export_all','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_STAFF','tariff.read','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SEC_LEAD','tariff.read','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_STAFF','tariff.read','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_LEAD','tariff.read','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('DIS_STAFF','tariff.read','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('DIS_LEAD','tariff.read','YARD',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','tariff.read','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('PORT_LEAD','tariff.change.request','DEPARTMENT',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','tariff.change.request','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','tariff.change.publish','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','admin.users.manage','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','admin.roles.manage','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','admin.role_permissions.manage','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','admin.billing_settings.manage','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
INSERT INTO public.app_role_permissions(role_code,permission_code,scope,is_enabled) VALUES ('SYS_ADMIN','admin.legacy_correct','ALL',TRUE) ON CONFLICT (role_code,permission_code) DO NOTHING;
-- Feature flags. FUTURE permissions are registered but inactive and have no grants.
INSERT INTO public.app_feature_flags(feature_key,display_name,is_enabled) VALUES ('CORE','CORE',TRUE) ON CONFLICT (feature_key) DO NOTHING;
INSERT INTO public.app_feature_flags(feature_key,display_name,is_enabled) VALUES ('TICKET_AUTOPRINT','TICKET_AUTOPRINT',FALSE) ON CONFLICT (feature_key) DO NOTHING;
INSERT INTO public.app_feature_flags(feature_key,display_name,is_enabled) VALUES ('YARD_SLOT_MANAGEMENT','YARD_SLOT_MANAGEMENT',FALSE) ON CONFLICT (feature_key) DO NOTHING;
INSERT INTO public.app_feature_flags(feature_key,display_name,is_enabled) VALUES ('CHARGE_DISCOUNT','CHARGE_DISCOUNT',FALSE) ON CONFLICT (feature_key) DO NOTHING;
INSERT INTO public.app_feature_flags(feature_key,display_name,is_enabled) VALUES ('REFUNDS','REFUNDS',FALSE) ON CONFLICT (feature_key) DO NOTHING;
INSERT INTO public.app_feature_flags(feature_key,display_name,is_enabled) VALUES ('E_INVOICE','E_INVOICE',FALSE) ON CONFLICT (feature_key) DO NOTHING;
INSERT INTO public.app_settings(setting_key,setting_value,setting_type,decision_status,notes) VALUES ('ELECTRIC_ROUNDING_MINUTES','15'::jsonb,'Cấu hình','Đã chốt','Làm tròn lên bội 15 phút theo từng phiên điện; mặc định do server tính.') ON CONFLICT (setting_key) DO NOTHING;
INSERT INTO public.app_settings(setting_key,setting_value,setting_type,decision_status,notes) VALUES ('ELECTRIC_RATE_HOURLY_VND','100000'::jsonb,'Bảng giá','Đã chốt','Mã DIEN_CONT_GIO; quản lý phiên bản giá trong DB.') ON CONFLICT (setting_key) DO NOTHING;
INSERT INTO public.app_settings(setting_key,setting_value,setting_type,decision_status,notes) VALUES ('ELECTRIC_RATE_CONTINUOUS_VND','100000'::jsonb,'Bảng giá','Đã chốt','Mã DIEN_CONT_LIEN_TUC; cấu hình độc lập dù giá hiện giống nhau.') ON CONFLICT (setting_key) DO NOTHING;
INSERT INTO public.app_settings(setting_key,setting_value,setting_type,decision_status,notes) VALUES ('STORAGE_RATE_NIGHT_VND','100000'::jsonb,'Bảng giá','Đã chốt','Phí lưu chỉ tính khi cont thực tế ra.') ON CONFLICT (setting_key) DO NOTHING;
INSERT INTO public.app_settings(setting_key,setting_value,setting_type,decision_status,notes) VALUES ('STORAGE_FREE_NIGHTS','1'::jsonb,'Cấu hình','Đã chốt','01 đêm miễn phí theo chính sách hiện tại.') ON CONFLICT (setting_key) DO NOTHING;
INSERT INTO public.app_settings(setting_key,setting_value,setting_type,decision_status,notes) VALUES ('STORAGE_NIGHT_START','"22:00"'::jsonb,'Cấu hình','Đã chốt','Mốc đêm 22h; giờ địa phương Asia/Ho_Chi_Minh.') ON CONFLICT (setting_key) DO NOTHING;
INSERT INTO public.app_settings(setting_key,setting_value,setting_type,decision_status,notes) VALUES ('STORAGE_NIGHT_END','"06:00"'::jsonb,'Cấu hình','Đã chốt','Mốc kết thúc đêm 06h hôm sau.') ON CONFLICT (setting_key) DO NOTHING;
INSERT INTO public.app_settings(setting_key,setting_value,setting_type,decision_status,notes) VALUES ('ALLOW_EXIT_WITH_DEBT','true'::jsonb,'Cờ nghiệp vụ','Đã chốt','CCKB xác nhận có lý do, giữ nợ; không tự miễn khoản thu.') ON CONFLICT (setting_key) DO NOTHING;
INSERT INTO public.app_settings(setting_key,setting_value,setting_type,decision_status,notes) VALUES ('PLANNED_REEFER_REQUEST_ENABLED','true'::jsonb,'Cờ tính năng','Đã chốt','Cho CCKB tạo phiếu cont chưa vào; cảnh báo An ninh khi container tới.') ON CONFLICT (setting_key) DO NOTHING;
INSERT INTO public.app_settings(setting_key,setting_value,setting_type,decision_status,notes) VALUES ('CONTAINER_NUMBER_CORRECTION_ENABLED','true'::jsonb,'Cờ tính năng','Đã chốt','An ninh sửa mã có lịch sử và thông báo CCKB.') ON CONFLICT (setting_key) DO NOTHING;
INSERT INTO public.app_settings(setting_key,setting_value,setting_type,decision_status,notes) VALUES ('ALLOW_REEFER_RETRO_ENTRY','true'::jsonb,'Cờ tính năng','Đã chốt','Cho phép nhập giờ cắm/rút thực tế sau khi An ninh báo qua Zalo.') ON CONFLICT (setting_key) DO NOTHING;
INSERT INTO public.app_settings(setting_key,setting_value,setting_type,decision_status,notes) VALUES ('ACCOUNTING_MODULE_ENABLED','false'::jsonb,'Cờ tính năng','GĐ sau','V1 chưa phát hành hóa đơn; Kế toán ở trạng thái dự phòng.') ON CONFLICT (setting_key) DO NOTHING;
INSERT INTO public.app_settings(setting_key,setting_value,setting_type,decision_status,notes) VALUES ('TICKET_AUTOPRINT_ENABLED','false'::jsonb,'Cờ tính năng','GĐ sau','Vé giấy hiện vẫn có nghiệp vụ, chưa làm chức năng in tự động.') ON CONFLICT (setting_key) DO NOTHING;
INSERT INTO public.app_settings(setting_key,setting_value,setting_type,decision_status,notes) VALUES ('CHARGE_DISCOUNT_ENABLED','false'::jsonb,'Cờ tính năng','GĐ sau','Không triển khai miễn/giảm toàn phần trong V1.') ON CONFLICT (setting_key) DO NOTHING;
INSERT INTO public.app_settings(setting_key,setting_value,setting_type,decision_status,notes) VALUES ('REFUND_MODULE_ENABLED','false'::jsonb,'Cờ tính năng','GĐ sau','Không triển khai hoàn tiền/hủy ghi thu toàn phần trong V1.') ON CONFLICT (setting_key) DO NOTHING;
INSERT INTO public.app_settings(setting_key,setting_value,setting_type,decision_status,notes) VALUES ('YARD_SLOT_MANAGEMENT_ENABLED','false'::jsonb,'Cờ tính năng','GĐ sau','Vị trí khu/dãy/ô dự phòng, không gắn logic phí lưu.') ON CONFLICT (setting_key) DO NOTHING;
INSERT INTO public.app_settings(setting_key,setting_value,setting_type,decision_status,notes) VALUES ('BANK_TRANSFER_PROOF_REQUIRED','"configurable"'::jsonb,'Quy định thu','Cần UAT','Không mặc định bắt buộc mọi chứng từ, do file trả lời V1 cho phép triển khai dần.') ON CONFLICT (setting_key) DO NOTHING;
INSERT INTO public.app_settings(setting_key,setting_value,setting_type,decision_status,notes) VALUES ('PRICE_SNAPSHOT_AT','"configurable"'::jsonb,'Quy định giá','Cần UAT','Cần thống nhất khi đổi giá giữa phiên; không tự động đổi các phiên đã thu.') ON CONFLICT (setting_key) DO NOTHING;
INSERT INTO public.app_settings(setting_key,setting_value,setting_type,decision_status,notes) VALUES ('SHARED_GATE_KIOSK_MODE','"configurable"'::jsonb,'Truy cập','Cần UAT','Phải ghi nhân viên thực thu/thực xác nhận, không chỉ ghi user chung tại bốt.') ON CONFLICT (setting_key) DO NOTHING;
INSERT INTO public.app_settings(setting_key,setting_value,setting_type,decision_status,notes) VALUES ('OFFLINE_GATE_EXIT_ALLOWED','false'::jsonb,'An toàn','Đã chốt','Không tự xác nhận thành công ra cổng khi mất Internet.') ON CONFLICT (setting_key) DO NOTHING;
INSERT INTO public.app_approval_policies(policy_code,label,request_permission_code,approve_permission_code,enforce_distinct_actor,reason_required,is_enabled,notes) VALUES ('AP01','Sửa giờ điện/chênh tiền SAU khi thu','reefer.session.amendment.request','reefer.session.amendment.approve',TRUE,TRUE,TRUE,'Giữ giao dịch đã thu; tạo điều chỉnh công nợ/hoàn trả, không ghi đè.') ON CONFLICT (policy_code) DO NOTHING;
INSERT INTO public.app_approval_policies(policy_code,label,request_permission_code,approve_permission_code,enforce_distinct_actor,reason_required,is_enabled,notes) VALUES ('AP02','Sửa giờ điện TRƯỚC khi thu','reefer.session.time.edit_unpaid',NULL,FALSE,TRUE,TRUE,'Ghi trước/sau, lý do, giờ thực tế khác giờ nhập.') ON CONFLICT (policy_code) DO NOTHING;
INSERT INTO public.app_approval_policies(policy_code,label,request_permission_code,approve_permission_code,enforce_distinct_actor,reason_required,is_enabled,notes) VALUES ('AP03','Điều chỉnh thời lượng điện trước thu','reefer.session.billable.override_unpaid',NULL,FALSE,TRUE,TRUE,'Lưu số tự tính làm tròn 15p và số sửa tay, hiện chênh lệch.') ON CONFLICT (policy_code) DO NOTHING;
INSERT INTO public.app_approval_policies(policy_code,label,request_permission_code,approve_permission_code,enforce_distinct_actor,reason_required,is_enabled,notes) VALUES ('AP04','Sửa số cont SAU đã thu','container.number.correct','payment.post_correction.approve',FALSE,TRUE,TRUE,'Sửa mã ngay có audit/CCKB nhận cảnh báo. Chỉ sửa TIỀN chênh sau thu mới phải duyệt.') ON CONFLICT (policy_code) DO NOTHING;
INSERT INTO public.app_approval_policies(policy_code,label,request_permission_code,approve_permission_code,enforce_distinct_actor,reason_required,is_enabled,notes) VALUES ('AP05','Chỉnh HÀNG/RỖNG SAU cont ra','container.cargo.post_exit.request','container.cargo.post_exit.approve',TRUE,TRUE,TRUE,'Không cấp sửa sau ra trực tiếp cho NV/An ninh.') ON CONFLICT (policy_code) DO NOTHING;
INSERT INTO public.app_approval_policies(policy_code,label,request_permission_code,approve_permission_code,enforce_distinct_actor,reason_required,is_enabled,notes) VALUES ('AP06','CCKB cho xuất còn công nợ','exit.clearance.debt_exception',NULL,FALSE,TRUE,TRUE,'Không xóa công nợ; thời điểm An ninh xác nhận cont ra vẫn tính tiền lưu mới.') ON CONFLICT (policy_code) DO NOTHING;
INSERT INTO public.app_approval_policies(policy_code,label,request_permission_code,approve_permission_code,enforce_distinct_actor,reason_required,is_enabled,notes) VALUES ('AP07','Có tiền lưu phát sinh ngay cửa ra','storage.payment.collect','exit.clearance.debt_exception',FALSE,TRUE,TRUE,'Cảnh báo/đồng bộ lại số phí lưu tại giờ thực ra, không khóa tiền trước khi ra.') ON CONFLICT (policy_code) DO NOTHING;
INSERT INTO public.app_approval_policies(policy_code,label,request_permission_code,approve_permission_code,enforce_distinct_actor,reason_required,is_enabled,notes) VALUES ('AP08','Trạng thái PWA Đang cắm nhưng ngoài hiện trường đã rút','exit.reefer_state.exception',NULL,FALSE,TRUE,TRUE,'Không cho phép xuất khi cont thực tế vẫn đang nối điện; lưu giải trình khi dữ liệu app chưa cập nhật.') ON CONFLICT (policy_code) DO NOTHING;
INSERT INTO public.app_approval_policies(policy_code,label,request_permission_code,approve_permission_code,enforce_distinct_actor,reason_required,is_enabled,notes) VALUES ('AP09','Thu hồi CCKB đã xác nhận cho ra','exit.clearance.revoke.request','exit.clearance.revoke.approve',TRUE,TRUE,TRUE,'Chỉ thu hồi trước khi xác nhận ra thực tế; sau ra dùng sửa lịch sử.') ON CONFLICT (policy_code) DO NOTHING;
INSERT INTO public.app_approval_policies(policy_code,label,request_permission_code,approve_permission_code,enforce_distinct_actor,reason_required,is_enabled,notes) VALUES ('AP10','Bảng giá thay đổi','tariff.change.request','tariff.change.publish',FALSE,TRUE,TRUE,'Lưu phiên bản giá/hiệu lực; không thay tiền của lịch sử.') ON CONFLICT (policy_code) DO NOTHING;
INSERT INTO public.app_approval_policies(policy_code,label,request_permission_code,approve_permission_code,enforce_distinct_actor,reason_required,is_enabled,notes) VALUES ('AP11','Hoàn tiền / miễn giảm','payment.refund.request','payment.refund.approve',FALSE,TRUE,FALSE,'Các quyền seed chưa cấp cho ai, cờ tính năng tắt.') ON CONFLICT (policy_code) DO NOTHING;
INSERT INTO public.app_approval_policies(policy_code,label,request_permission_code,approve_permission_code,enforce_distinct_actor,reason_required,is_enabled,notes) VALUES ('AP12','Đăng nhập bốt An ninh dùng chung thiết bị','admin.users.manage',NULL,FALSE,TRUE,TRUE,'Ưu tiên đăng nhập cá nhân; nếu chế độ bốt thì phải xác minh người trực/phiên, không gắn mọi khoản thu vào email dùng chung.') ON CONFLICT (policy_code) DO NOTHING;

-- Exact privilege resolver for RLS policies. p_row_* MUST originate from the real database row;
-- never trust yard/department/owner fields supplied by the browser for authorizing mutations.
CREATE OR REPLACE FUNCTION public.sc_can(
 p_permission_code text,
 p_row_yard_id uuid DEFAULT NULL,
 p_row_department_code text DEFAULT NULL,
 p_row_owner_id uuid DEFAULT NULL
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS (
   SELECT 1
   FROM public.app_user_role_assignments ura
   JOIN public.app_roles r ON r.code=ura.role_code AND r.is_active
   JOIN public.app_role_permissions rp ON rp.role_code=r.code AND rp.is_enabled
   JOIN public.app_permissions p ON p.code=rp.permission_code AND p.is_active
   JOIN public.app_feature_flags f ON f.feature_key=p.feature_key AND f.is_enabled
   WHERE ura.user_id=auth.uid()
     AND ura.is_active
     AND ura.valid_from<=now()
     AND (ura.valid_until IS NULL OR ura.valid_until>now())
     AND p.code=p_permission_code
     AND (
       rp.scope='ALL'
       OR (rp.scope='YARD' AND p_row_yard_id IS NOT NULL AND ura.yard_id=p_row_yard_id)
       OR (rp.scope='DEPARTMENT' AND p_row_yard_id IS NOT NULL AND ura.yard_id=p_row_yard_id AND p_row_department_code IS NOT NULL AND ura.department_code=p_row_department_code)
       OR (rp.scope='SELF' AND p_row_yard_id IS NOT NULL AND ura.yard_id=p_row_yard_id AND p_row_owner_id IS NOT NULL AND p_row_owner_id=auth.uid())
     )
 );
$$;
REVOKE ALL ON FUNCTION public.sc_can(text,uuid,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sc_can(text,uuid,text,uuid) TO authenticated;

-- UI can see effective permission codes for menu rendering, but mutations always validate server-side.
CREATE OR REPLACE FUNCTION public.sc_my_permissions()
RETURNS TABLE(permission_code text, scope text, yard_id uuid, department_code text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT DISTINCT p.code, rp.scope, ura.yard_id, ura.department_code
 FROM public.app_user_role_assignments ura
 JOIN public.app_roles r ON r.code=ura.role_code AND r.is_active
 JOIN public.app_role_permissions rp ON rp.role_code=r.code AND rp.is_enabled
 JOIN public.app_permissions p ON p.code=rp.permission_code AND p.is_active
 JOIN public.app_feature_flags f ON f.feature_key=p.feature_key AND f.is_enabled
 WHERE ura.user_id=auth.uid() AND ura.is_active
  AND ura.valid_from<=now() AND (ura.valid_until IS NULL OR ura.valid_until>now());
$$;
REVOKE ALL ON FUNCTION public.sc_my_permissions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sc_my_permissions() TO authenticated;

COMMIT;

-- NEXT STEPS FOR DEVELOPER (do not skip):
-- 1. Bootstrap the first SYS_ADMIN account through a controlled authenticated migration,
--    not by shipping a common password/email in the repository.
-- 2. Implement protected admin RPC/API for editing app_role_permissions and assignments;
--    do not grant direct UPDATE/INSERT/DELETE to authenticated browser users.
-- 3. Implement domain-table RLS policies using sc_can(permission, REAL_ROW.yard_id,
--    REAL_ROW.department_code, REAL_ROW.owner_id) where applicable.
-- 4. Server-side exit/financial transactions must validate cash state, reefer status,
--    latest storage charge and finance clearance under row locks/idempotency.
-- 5. Require actor authentication and append audit log on all sensitive mutations.
-- 6. Test authority revocation, concurrent logins, multi-role, staff vs manager, and kiosk.

