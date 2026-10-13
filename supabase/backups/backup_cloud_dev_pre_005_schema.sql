


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."sc_ack_container_number_discrepancy"("p_change_id" bigint) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_actor_id uuid;
  v_change record;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập. Yêu cầu xác thực người dùng.';
  END IF;

  SELECT * INTO v_change 
  FROM public.app_container_number_changes 
  WHERE id = p_change_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy bản ghi sửa số container: %', p_change_id;
  END IF;

  IF NOT public.sc_can('container.number.discrepancy.sec_ack', v_change.yard_id) THEN
    RAISE EXCEPTION 'Permission Denied: Không có quyền xác nhận báo CCKB tại bãi này.';
  END IF;

  -- M004-R1-08: Kiểm tra chống ghi đè
  IF v_change.sec_ack_at IS NOT NULL THEN
    RAISE EXCEPTION 'Bản ghi này đã được An ninh xác nhận báo CCKB trước đó vào lúc %.', v_change.sec_ack_at;
  END IF;

  UPDATE public.app_container_number_changes
  SET sec_ack_at = clock_timestamp(),
      sec_ack_by = v_actor_id
  WHERE id = p_change_id;

  PERFORM public.sc_log_audit_event(
    'container.number.discrepancy.sec_ack', 'app_container_number_changes', p_change_id::text,
    v_change.yard_id, 'AN_NINH', NULL, 
    jsonb_build_object('sec_ack_by', v_actor_id, 'sec_ack_at', clock_timestamp()), 
    'An ninh xác nhận đã báo CCKB sai lệch số'
  );
END;
$$;


ALTER FUNCTION "public"."sc_ack_container_number_discrepancy"("p_change_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sc_approve_request"("p_request_id" "uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_req record;
  v_pol record;
  v_actor_id uuid;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập. Yêu cầu xác thực người dùng.';
  END IF;

  SELECT * INTO v_req FROM public.app_approval_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Yêu cầu phê duyệt không tồn tại: %', p_request_id;
  END IF;

  IF v_req.status <> 'PENDING' THEN
    RAISE EXCEPTION 'Yêu cầu không ở trạng thái chờ duyệt (status: %).', v_req.status;
  END IF;

  SELECT * INTO v_pol FROM public.app_approval_policies WHERE policy_code = v_req.policy_code;
  IF NOT FOUND OR v_pol.is_enabled = false THEN
    RAISE EXCEPTION 'Chính sách phê duyệt không hợp lệ hoặc đã bị vô hiệu hóa: %', v_req.policy_code;
  END IF;

  -- Kiểm tra nguyên tắc bốn mắt (Four-Eyes)
  IF v_pol.enforce_distinct_actor AND v_req.requested_by = v_actor_id THEN
    RAISE EXCEPTION 'Four-Eyes Violation: Người yêu cầu không được phép tự phê duyệt đề xuất của chính mình.';
  END IF;

  -- Fail-closed: Chính sách phải có mã quyền duyệt hợp lệ (SC-R2-02)
  IF v_pol.approve_permission_code IS NULL THEN
    RAISE EXCEPTION 'Chính sách % là tác vụ một bước / không áp dụng phê duyệt qua RPC sc_approve_request. Thao tác bị từ chối.', v_req.policy_code;
  END IF;

  -- Kiểm tra quyền phê duyệt có kèm context yard_id và department_code của request (SC-R2-03)
  IF NOT public.sc_can(v_pol.approve_permission_code, v_req.yard_id, v_req.department_code) THEN
    RAISE EXCEPTION 'Permission Denied: Không có quyền phê duyệt (%) cho chính sách % tại phạm vi bãi/bộ phận tương ứng.', v_pol.approve_permission_code, v_pol.policy_code;
  END IF;

  UPDATE public.app_approval_requests
  SET status = 'APPROVED',
      approved_by = v_actor_id,
      decision_at = clock_timestamp()
  WHERE id = p_request_id;

  -- Ghi nhận audit event với context bãi và bộ phận
  PERFORM public.sc_log_audit_event(
    'approval.request.approve', 'app_approval_requests', p_request_id::text,
    v_req.yard_id, v_req.department_code, to_jsonb(v_req), 
    jsonb_build_object('status', 'APPROVED', 'approved_by', v_actor_id, 'decision_at', clock_timestamp()),
    COALESCE(p_reason, 'Phê duyệt yêu cầu theo chính sách ' || v_pol.policy_code)
  );

  RETURN true;
END;
$$;


ALTER FUNCTION "public"."sc_approve_request"("p_request_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sc_audit_immutable"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  RAISE EXCEPTION 'Audit log is immutable. Cấm sửa hoặc xóa nhật ký kiểm toán hệ thống.';
END;
$$;


ALTER FUNCTION "public"."sc_audit_immutable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sc_can"("p_permission_code" "text", "p_row_yard_id" "uuid" DEFAULT NULL::"uuid", "p_row_department_code" "text" DEFAULT NULL::"text", "p_row_owner_id" "uuid" DEFAULT NULL::"uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.app_user_role_assignments ura
    JOIN public.app_roles r 
      ON r.code = ura.role_code 
     AND r.is_active = true
    JOIN public.app_role_permissions rp 
      ON rp.role_code = r.code 
     AND rp.is_enabled = true
    JOIN public.app_permissions p 
      ON p.code = rp.permission_code 
     AND p.is_active = true
    JOIN public.app_feature_flags f 
      ON f.feature_key = p.feature_key 
     AND f.is_enabled = true
    WHERE ura.user_id = auth.uid()
      AND ura.is_active = true
      AND ura.valid_from <= now()
      AND (ura.valid_until IS NULL OR ura.valid_until > now())
      AND p.code = p_permission_code
      AND (
        -- Scope 1: Toàn quyền hệ thống
        rp.scope = 'ALL'
        -- Scope 2: Phạm vi toàn Bãi Sơn Cảng
        OR (rp.scope = 'YARD' 
            AND p_row_yard_id IS NOT NULL 
            AND ura.yard_id = p_row_yard_id)
        -- Scope 3: Phạm vi cùng Bộ phận trong Bãi
        OR (rp.scope = 'DEPARTMENT' 
            AND p_row_yard_id IS NOT NULL 
            AND ura.yard_id = p_row_yard_id 
            AND p_row_department_code IS NOT NULL 
            AND ura.department_code = p_row_department_code)
        -- Scope 4: Phạm vi Cá nhân trực tiếp phụ trách / thu tiền
        OR (rp.scope = 'SELF' 
            AND p_row_yard_id IS NOT NULL 
            AND ura.yard_id = p_row_yard_id 
            AND p_row_owner_id IS NOT NULL 
            AND p_row_owner_id = auth.uid())
      )
  );
$$;


ALTER FUNCTION "public"."sc_can"("p_permission_code" "text", "p_row_yard_id" "uuid", "p_row_department_code" "text", "p_row_owner_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sc_correct_container_number"("p_container_visit_id" "uuid", "p_new_container_no" "text", "p_reason" "text", "p_evidence_url" "text" DEFAULT NULL::"text") RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_actor_id uuid;
  v_cont record;
  v_clean_new_no text;
  v_old_no text;
  v_dup_in_yard_count integer;
  v_change_id bigint;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập. Yêu cầu xác thực người dùng.';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'Lý do sửa số container là bắt buộc (tối thiểu 3 ký tự).';
  END IF;

  -- Khóa dòng container mục tiêu
  SELECT * INTO v_cont 
  FROM public.app_container_visits 
  WHERE id = p_container_visit_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy lượt container: %', p_container_visit_id;
  END IF;

  IF NOT public.sc_can('container.number.correct', v_cont.yard_id) THEN
    RAISE EXCEPTION 'Permission Denied: Không có quyền sửa số container tại bãi tương ứng.';
  END IF;

  v_clean_new_no := upper(trim(p_new_container_no));
  IF v_clean_new_no IS NULL OR length(v_clean_new_no) < 4 THEN
    RAISE EXCEPTION 'Số container mới không hợp lệ: %', p_new_container_no;
  END IF;

  IF v_clean_new_no = v_cont.container_no_current THEN
    RAISE EXCEPTION 'Số container mới phải khác số container hiện tại (%).', v_cont.container_no_current;
  END IF;

  -- M004-R1-11: Cảnh báo nếu số mới trùng với một container khác đang IN_YARD
  SELECT count(*) INTO v_dup_in_yard_count
  FROM public.app_container_visits
  WHERE yard_id = v_cont.yard_id 
    AND container_no_current = v_clean_new_no 
    AND status = 'IN_YARD'
    AND id <> p_container_visit_id;

  IF v_dup_in_yard_count > 0 THEN
    RAISE EXCEPTION 'Cảnh báo trùng số container: Số container mới (%) hiện đang thuộc một lượt container khác đang ở trong bãi (IN_YARD). Không thể sửa trùng lặp.', v_clean_new_no;
  END IF;

  v_old_no := v_cont.container_no_current;

  -- Cập nhật số container hiện hành trên cùng UUID (giữ nguyên khóa chính, khóa ngoại, không sửa tiền)
  -- M004-R2-06: Bắt ngoại lệ unique_violation khi hai request sửa số đồng thời
  BEGIN
    UPDATE public.app_container_visits
    SET container_no_current = v_clean_new_no,
        updated_at = clock_timestamp()
    WHERE id = p_container_visit_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Cảnh báo trùng số container: Số container mới (%) hiện đang thuộc một lượt container khác đang ở trong bãi (IN_YARD). Không thể sửa trùng lặp.', v_clean_new_no;
  END;

  -- Thêm bản ghi lịch sử sửa số bất biến (append-only)
  INSERT INTO public.app_container_number_changes (
    container_visit_id, yard_id, old_number, new_number,
    reason, evidence_url, changed_by, notified_cckb
  ) VALUES (
    p_container_visit_id, v_cont.yard_id, v_old_no, v_clean_new_no,
    trim(p_reason), trim(p_evidence_url), v_actor_id, true
  ) RETURNING id INTO v_change_id;

  -- Ghi nhận Audit Event với dữ liệu trước và sau
  PERFORM public.sc_log_audit_event(
    'container.number.correct', 'app_container_visits', p_container_visit_id::text,
    v_cont.yard_id, 'AN_NINH', 
    jsonb_build_object('container_no_current', v_old_no), 
    jsonb_build_object('container_no_current', v_clean_new_no, 'change_id', v_change_id), 
    trim(p_reason)
  );

  RETURN v_change_id;
END;
$$;


ALTER FUNCTION "public"."sc_correct_container_number"("p_container_visit_id" "uuid", "p_new_container_no" "text", "p_reason" "text", "p_evidence_url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sc_create_approval_request"("p_policy_code" "text", "p_target_type" "text", "p_target_id" "uuid", "p_yard_id" "uuid" DEFAULT NULL::"uuid", "p_department_code" "text" DEFAULT NULL::"text", "p_reason" "text" DEFAULT ''::"text", "p_before_snapshot" "jsonb" DEFAULT NULL::"jsonb", "p_proposed_changes" "jsonb" DEFAULT NULL::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_actor_id uuid;
  v_pol record;
  v_req_id uuid;
  v_user_yard uuid;
  v_user_dept text;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập. Yêu cầu xác thực người dùng.';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Lý do yêu cầu phê duyệt không được để trống.';
  END IF;

  SELECT * INTO v_pol FROM public.app_approval_policies WHERE policy_code = p_policy_code;
  IF NOT FOUND OR v_pol.is_enabled = false THEN
    RAISE EXCEPTION 'Chính sách phê duyệt không hợp lệ hoặc đã bị vô hiệu hóa: %', p_policy_code;
  END IF;

  -- Fail-closed: Chỉ chính sách có quy trình duyệt hai bước (approve_permission_code IS NOT NULL) mới tạo approval request (SC-R2-02)
  IF v_pol.approve_permission_code IS NULL THEN
    RAISE EXCEPTION 'Chính sách % là tác vụ một bước, không áp dụng tạo yêu cầu phê duyệt hai bước.', p_policy_code;
  END IF;

  -- Tự động lấy yard_id và department_code từ assignment của user nếu chưa truyền
  IF p_yard_id IS NULL OR p_department_code IS NULL THEN
    SELECT ura.yard_id, ura.department_code 
    INTO v_user_yard, v_user_dept
    FROM public.app_user_role_assignments ura
    WHERE ura.user_id = v_actor_id AND ura.is_active = true
    ORDER BY ura.created_at DESC
    LIMIT 1;

    p_yard_id := COALESCE(p_yard_id, v_user_yard);
    p_department_code := COALESCE(p_department_code, v_user_dept);
  END IF;

  -- Kiểm tra quyền tạo đề xuất với context phạm vi (SC-R2-03)
  IF v_pol.request_permission_code IS NOT NULL AND NOT public.sc_can(v_pol.request_permission_code, p_yard_id, p_department_code) THEN
    RAISE EXCEPTION 'Permission Denied: Không có quyền tạo đề xuất (%) cho chính sách % tại phạm vi bãi/bộ phận tương ứng.', v_pol.request_permission_code, p_policy_code;
  END IF;

  -- Fail-closed Guard (SC-R3-05): Chặn tạo phê duyệt dựa hoàn toàn trên target/snapshot do client tự khai báo
  -- Bắt buộc đối chiếu bản ghi mục tiêu từ Database. Trong Phase 1B chưa có Domain Schema, khóa an toàn luồng này.
  RAISE EXCEPTION 'Target Verification Required: Bảng nghiệp vụ mục tiêu (%) chưa tồn tại trong Phase 1B (phụ thuộc Phase 1C). Không chấp nhận hồ sơ tự khai báo từ client.', p_target_type;

  INSERT INTO public.app_approval_requests (
    policy_code, target_type, target_id, yard_id, department_code,
    requested_by, reason, before_snapshot, proposed_changes, status
  ) VALUES (
    p_policy_code, p_target_type, p_target_id, p_yard_id, p_department_code,
    v_actor_id, p_reason, p_before_snapshot, p_proposed_changes, 'PENDING'
  ) RETURNING id INTO v_req_id;

  -- Ghi nhận audit event nội bộ
  PERFORM public.sc_log_audit_event(
    'approval.request.create', 'app_approval_requests', v_req_id::text,
    p_yard_id, p_department_code, NULL, 
    jsonb_build_object('policy_code', p_policy_code, 'target_type', p_target_type, 'target_id', p_target_id, 'status', 'PENDING'),
    p_reason
  );

  RETURN v_req_id;
END;
$$;


ALTER FUNCTION "public"."sc_create_approval_request"("p_policy_code" "text", "p_target_type" "text", "p_target_id" "uuid", "p_yard_id" "uuid", "p_department_code" "text", "p_reason" "text", "p_before_snapshot" "jsonb", "p_proposed_changes" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sc_create_container_visit"("p_yard_id" "uuid", "p_container_no" "text", "p_inbound_vehicle_visit_id" "uuid", "p_container_size" "text" DEFAULT NULL::"text", "p_container_type" "text" DEFAULT 'RF'::"text", "p_idempotency_key" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_actor_id uuid;
  v_cont_id uuid;
  v_clean_no text;
  v_clean_idem text;
  v_veh record;
  v_allows_container boolean;
  v_linked_cont_count integer;
  v_dup_in_yard_count integer;
  v_yard_active boolean;
  v_existing_cont record;
  v_new_row record;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập. Yêu cầu xác thực người dùng.';
  END IF;

  -- M004-R3-07: Kiểm tra Bãi tồn tại và hoạt động (nhất quán với lượt xe)
  SELECT is_active INTO v_yard_active FROM public.app_yards WHERE id = p_yard_id;
  IF NOT FOUND OR v_yard_active = false THEN
    RAISE EXCEPTION 'Bãi không hợp lệ hoặc đang bị vô hiệu hóa: %', p_yard_id;
  END IF;

  IF NOT public.sc_can('container.visit.create', p_yard_id) THEN
    RAISE EXCEPTION 'Permission Denied: Không có quyền tạo lượt container tại bãi tương ứng.';
  END IF;

  v_clean_no := upper(trim(p_container_no));
  IF v_clean_no IS NULL OR length(v_clean_no) < 4 THEN
    RAISE EXCEPTION 'Số container không hợp lệ: %', p_container_no;
  END IF;

  v_clean_idem := NULLIF(trim(p_idempotency_key), '');

  -- M004-R3-04: Xử lý Idempotency chống tạo trùng do double-click / network retry
  IF v_clean_idem IS NOT NULL THEN
    SELECT * INTO v_existing_cont 
    FROM public.app_container_visits 
    WHERE yard_id = p_yard_id AND idempotency_key = v_clean_idem;

    IF FOUND THEN
      -- Nếu cùng thông tin toàn bộ payload: trả về ID cũ (idempotent replay an toàn)
      IF v_existing_cont.container_no_current = v_clean_no AND 
         v_existing_cont.inbound_vehicle_visit_id = p_inbound_vehicle_visit_id AND
         coalesce(v_existing_cont.container_size, '') = coalesce(trim(p_container_size), '') AND
         coalesce(v_existing_cont.container_type, '') = coalesce(trim(p_container_type), '') THEN
        RETURN v_existing_cont.id;
      ELSE
        RAISE EXCEPTION 'Idempotency key % đã được sử dụng với thông tin lượt container khác.', v_clean_idem;
      END IF;
    END IF;
  END IF;

  -- M004-R1-11: Kiểm tra phát hiện trùng số container đang ở trạng thái IN_YARD trong cùng bãi
  SELECT count(*) INTO v_dup_in_yard_count
  FROM public.app_container_visits
  WHERE yard_id = p_yard_id 
    AND container_no_current = v_clean_no 
    AND status = 'IN_YARD';

  IF v_dup_in_yard_count > 0 THEN
    RAISE EXCEPTION 'Cảnh báo trùng số container: Container % hiện đang có một lượt lưu bãi khác ở trạng thái IN_YARD trong cùng bãi. Không tự động gộp lượt. Vui lòng xác minh thực tế.', v_clean_no;
  END IF;

  -- Kiểm tra xe vào bắt buộc phải truyền và tồn tại
  IF p_inbound_vehicle_visit_id IS NULL THEN
    RAISE EXCEPTION 'Lượt xe vào là bắt buộc khi tạo container vào cổng.';
  END IF;

  SELECT * INTO v_veh 
  FROM public.app_vehicle_visits 
  WHERE id = p_inbound_vehicle_visit_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy lượt xe vào: %', p_inbound_vehicle_visit_id;
  END IF;

  IF v_veh.yard_id <> p_yard_id THEN
    RAISE EXCEPTION 'Xe vào và container không cùng bãi. Xe bãi: %, Cont bãi: %', v_veh.yard_id, p_yard_id;
  END IF;

  IF v_veh.status <> 'IN_YARD' THEN
    RAISE EXCEPTION 'Xe đưa container vào phải đang ở trong bãi (IN_YARD). Trạng thái xe hiện tại: %', v_veh.status;
  END IF;

  -- M004-R2-07 & M004-R3-09: Kiểm tra loại xe được phép chở/kéo container theo cấu hình danh mục app_vehicle_types (Generic error description)
  SELECT allows_container INTO v_allows_container
  FROM public.app_vehicle_types
  WHERE code = v_veh.vehicle_type;

  IF v_allows_container IS NOT TRUE THEN
    RAISE EXCEPTION 'Loại phương tiện % không được phép tiếp nhận container vào bãi theo cấu hình danh mục phương tiện.', v_veh.vehicle_type;
  END IF;

  -- M004-R1-09: BẢO TOÀN QUY TẮC VẬN HÀNH V1 TẠI TẦNG RPC (Preserve V1 Baseline):
  -- Theo V1: Mỗi lượt xe chỉ liên kết tối đa 1 container. Chặn xe đã từng gắn container không bị CANCELLED.
  SELECT count(*) INTO v_linked_cont_count
  FROM public.app_container_visits
  WHERE inbound_vehicle_visit_id = p_inbound_vehicle_visit_id 
    AND status <> 'CANCELLED';

  IF v_linked_cont_count >= 1 THEN
    RAISE EXCEPTION 'Quy tắc vận hành V1 hiện hành: Mỗi lượt xe chỉ tiếp nhận tối đa 1 container. Thao tác tiếp nhận nhiều container trên cùng một lượt xe chưa được phê duyệt UAT.';
  END IF;

  -- M004-R1-04: cargo_status LUÔN khởi tạo 'CHUA_XAC_DINH', không cho An ninh truyền vào
  -- M004-R1-06: is_legacy_import LUÔN khởi tạo false, không nhận từ client
  -- M004-R2-06 & M004-R3-04: Bắt ngoại lệ unique_violation khi hai request chạy đồng thời
  BEGIN
    INSERT INTO public.app_container_visits (
      yard_id, container_no_current, container_no_original, container_size,
      container_type, inbound_vehicle_visit_id, cargo_status, is_legacy_import,
      legacy_import_notes, created_by, status, idempotency_key
    ) VALUES (
      p_yard_id, v_clean_no, v_clean_no, p_container_size,
      p_container_type, p_inbound_vehicle_visit_id, 'CHUA_XAC_DINH', false,
      NULL, v_actor_id, 'IN_YARD', v_clean_idem
    ) RETURNING id INTO v_cont_id;
  EXCEPTION WHEN unique_violation THEN
    -- Nếu bị trùng idempotency_key
    IF v_clean_idem IS NOT NULL THEN
      SELECT * INTO v_existing_cont 
      FROM public.app_container_visits 
      WHERE yard_id = p_yard_id AND idempotency_key = v_clean_idem;

      IF FOUND AND v_existing_cont.container_no_current = v_clean_no AND 
         v_existing_cont.inbound_vehicle_visit_id = p_inbound_vehicle_visit_id AND
         coalesce(v_existing_cont.container_size, '') = coalesce(trim(p_container_size), '') AND
         coalesce(v_existing_cont.container_type, '') = coalesce(trim(p_container_type), '') THEN
        RETURN v_existing_cont.id;
      ELSE
        RAISE EXCEPTION 'Idempotency key % đã được sử dụng với thông tin lượt container khác.', v_clean_idem;
      END IF;
    ELSE
      -- Nếu trùng uq_container_visits_active_number_yard
      RAISE EXCEPTION 'Cảnh báo trùng số container: Container % hiện đang có một lượt lưu bãi khác ở trạng thái IN_YARD trong cùng bãi. Không tự động gộp lượt. Vui lòng xác minh thực tế.', v_clean_no;
    END IF;
  END;

  SELECT * INTO v_new_row FROM public.app_container_visits WHERE id = v_cont_id;

  -- Ghi nhận Audit Event
  PERFORM public.sc_log_audit_event(
    'container.visit.create', 'app_container_visits', v_cont_id::text,
    p_yard_id, 'AN_NINH', NULL, to_jsonb(v_new_row), 'Tạo lượt container vào bãi'
  );

  RETURN v_cont_id;
END;
$$;


ALTER FUNCTION "public"."sc_create_container_visit"("p_yard_id" "uuid", "p_container_no" "text", "p_inbound_vehicle_visit_id" "uuid", "p_container_size" "text", "p_container_type" "text", "p_idempotency_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sc_create_vehicle_visit"("p_yard_id" "uuid", "p_vehicle_type" "text", "p_license_plate" "text" DEFAULT NULL::"text", "p_driver_name" "text" DEFAULT NULL::"text", "p_driver_phone" "text" DEFAULT NULL::"text", "p_ticket_code" "text" DEFAULT NULL::"text", "p_note" "text" DEFAULT NULL::"text", "p_idempotency_key" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_actor_id uuid;
  v_visit_id uuid;
  v_clean_plate text;
  v_clean_idem text;
  v_yard_active boolean;
  v_ticket_price numeric(12, 2);
  v_payment_status text;
  v_vtype record;
  v_existing_veh record;
  v_new_row record;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập. Yêu cầu xác thực người dùng.';
  END IF;

  -- Kiểm tra Bãi tồn tại và hoạt động
  SELECT is_active INTO v_yard_active FROM public.app_yards WHERE id = p_yard_id;
  IF NOT FOUND OR v_yard_active = false THEN
    RAISE EXCEPTION 'Bãi không hợp lệ hoặc đang bị vô hiệu hóa: %', p_yard_id;
  END IF;

  -- Kiểm tra quyền tạo lượt xe
  IF NOT public.sc_can('vehicle.visit.create', p_yard_id) THEN
    RAISE EXCEPTION 'Permission Denied: Không có quyền tạo lượt xe vào tại bãi tương ứng.';
  END IF;

  v_clean_plate := NULLIF(trim(p_license_plate), '');
  v_clean_idem := NULLIF(trim(p_idempotency_key), '');

  -- M004-R3-04: Xử lý Idempotency chống tạo trùng do double-click / network retry
  IF v_clean_idem IS NOT NULL THEN
    SELECT * INTO v_existing_veh 
    FROM public.app_vehicle_visits 
    WHERE yard_id = p_yard_id AND idempotency_key = v_clean_idem;

    IF FOUND THEN
      -- Nếu cùng thông tin toàn bộ payload: trả về ID cũ (idempotent replay an toàn)
      IF v_existing_veh.vehicle_type = p_vehicle_type AND 
         coalesce(v_existing_veh.license_plate, '') = coalesce(v_clean_plate, '') AND
         coalesce(v_existing_veh.driver_name, '') = coalesce(trim(p_driver_name), '') AND
         coalesce(v_existing_veh.driver_phone, '') = coalesce(trim(p_driver_phone), '') AND
         coalesce(v_existing_veh.ticket_code, '') = coalesce(trim(p_ticket_code), '') AND
         coalesce(v_existing_veh.note, '') = coalesce(trim(p_note), '') THEN
        RETURN v_existing_veh.id;
      ELSE
        RAISE EXCEPTION 'Idempotency key % đã được sử dụng với thông tin lượt xe khác.', v_clean_idem;
      END IF;
    END IF;
  END IF;

  -- Kiểm tra loại xe tồn tại trong danh mục app_vehicle_types
  SELECT * INTO v_vtype FROM public.app_vehicle_types WHERE code = p_vehicle_type;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Loại xe không tồn tại trong danh mục: %', p_vehicle_type;
  END IF;

  IF v_vtype.is_active = false THEN
    RAISE EXCEPTION 'Loại xe % đang bị vô hiệu hóa, không thể tiếp nhận vào bãi.', p_vehicle_type;
  END IF;

  -- M004-R2-10 & Quyết định Người dùng: Chặn xe chưa được thiết lập giá, không tự động miễn phí
  IF v_vtype.default_ticket_amount IS NULL THEN
    RAISE EXCEPTION 'Loại xe % chưa được thiết lập biểu phí hợp lệ. Không thể tiếp nhận hoặc tự động miễn phí.', p_vehicle_type;
  END IF;

  -- Kiểm tra tính hợp lệ của biển số
  IF p_vehicle_type <> 'XE_BO_3_BANH' AND v_clean_plate IS NULL THEN
    RAISE EXCEPTION 'Biển số xe là bắt buộc đối với loại xe %.', p_vehicle_type;
  END IF;

  -- Xác định giá vé server-side từ danh mục phương tiện (không tin client)
  v_ticket_price := v_vtype.default_ticket_amount;

  v_payment_status := CASE 
    WHEN v_ticket_price = 0 THEN 'EXEMPT'
    ELSE 'UNPAID'
  END;

  BEGIN
    INSERT INTO public.app_vehicle_visits (
      yard_id, license_plate, vehicle_type, driver_name, driver_phone,
      ticket_code, ticket_amount, ticket_payment_status, note, entry_by, status,
      idempotency_key
    ) VALUES (
      p_yard_id, v_clean_plate, p_vehicle_type, trim(p_driver_name), trim(p_driver_phone),
      trim(p_ticket_code), v_ticket_price, v_payment_status, trim(p_note), v_actor_id, 'IN_YARD',
      v_clean_idem
    ) RETURNING id INTO v_visit_id;
  EXCEPTION WHEN unique_violation THEN
    -- Nếu bị trùng idempotency_key do 2 request chạy đồng thời cùng thời điểm
    IF v_clean_idem IS NOT NULL THEN
      SELECT * INTO v_existing_veh 
      FROM public.app_vehicle_visits 
      WHERE yard_id = p_yard_id AND idempotency_key = v_clean_idem;

      IF FOUND AND v_existing_veh.vehicle_type = p_vehicle_type AND 
         coalesce(v_existing_veh.license_plate, '') = coalesce(v_clean_plate, '') AND
         coalesce(v_existing_veh.driver_name, '') = coalesce(trim(p_driver_name), '') AND
         coalesce(v_existing_veh.driver_phone, '') = coalesce(trim(p_driver_phone), '') AND
         coalesce(v_existing_veh.ticket_code, '') = coalesce(trim(p_ticket_code), '') AND
         coalesce(v_existing_veh.note, '') = coalesce(trim(p_note), '') THEN
        RETURN v_existing_veh.id;
      ELSE
        RAISE EXCEPTION 'Idempotency key % đã được sử dụng với thông tin lượt xe khác.', v_clean_idem;
      END IF;
    ELSE
      RAISE;
    END IF;
  END;

  SELECT * INTO v_new_row FROM public.app_vehicle_visits WHERE id = v_visit_id;

  -- Ghi nhận Audit Event
  PERFORM public.sc_log_audit_event(
    'vehicle.visit.create', 'app_vehicle_visits', v_visit_id::text,
    p_yard_id, 'AN_NINH', NULL, to_jsonb(v_new_row), 'Tạo lượt xe vào bãi'
  );

  RETURN v_visit_id;
END;
$$;


ALTER FUNCTION "public"."sc_create_vehicle_visit"("p_yard_id" "uuid", "p_vehicle_type" "text", "p_license_plate" "text", "p_driver_name" "text", "p_driver_phone" "text", "p_ticket_code" "text", "p_note" "text", "p_idempotency_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sc_log_audit_event"("p_action_code" "text", "p_target_type" "text", "p_target_id" "text" DEFAULT NULL::"text", "p_yard_id" "uuid" DEFAULT NULL::"uuid", "p_department_code" "text" DEFAULT NULL::"text", "p_before_data" "jsonb" DEFAULT NULL::"jsonb", "p_after_data" "jsonb" DEFAULT NULL::"jsonb", "p_reason" "text" DEFAULT NULL::"text", "p_request_id" "text" DEFAULT NULL::"text", "p_device_info" "jsonb" DEFAULT NULL::"jsonb") RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_id bigint;
  v_actor_id uuid;
  v_user_dept text;
  v_user_yard uuid;
BEGIN
  v_actor_id := auth.uid();
  
  -- Tự động lấy yard và department từ assignment của actor nếu không truyền
  IF v_actor_id IS NOT NULL AND (p_yard_id IS NULL OR p_department_code IS NULL) THEN
    SELECT ura.yard_id, ura.department_code 
    INTO v_user_yard, v_user_dept
    FROM public.app_user_role_assignments ura
    WHERE ura.user_id = v_actor_id AND ura.is_active = true
    ORDER BY ura.created_at DESC
    LIMIT 1;
    
    p_yard_id := COALESCE(p_yard_id, v_user_yard);
    p_department_code := COALESCE(p_department_code, v_user_dept);
  END IF;

  INSERT INTO public.app_audit_events (
    event_at, actor_user_id, action_code, target_type, target_id,
    yard_id, department_code, before_data, after_data, reason,
    request_id, device_info
  ) VALUES (
    clock_timestamp(), v_actor_id, p_action_code, p_target_type, p_target_id,
    p_yard_id, p_department_code, p_before_data, p_after_data, p_reason,
    p_request_id, p_device_info
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;


ALTER FUNCTION "public"."sc_log_audit_event"("p_action_code" "text", "p_target_type" "text", "p_target_id" "text", "p_yard_id" "uuid", "p_department_code" "text", "p_before_data" "jsonb", "p_after_data" "jsonb", "p_reason" "text", "p_request_id" "text", "p_device_info" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sc_manage_vehicle_type"("p_code" "text", "p_display_name" "text" DEFAULT NULL::"text", "p_description" "text" DEFAULT NULL::"text", "p_allows_container" boolean DEFAULT NULL::boolean, "p_default_ticket_amount" numeric DEFAULT NULL::numeric, "p_is_active" boolean DEFAULT NULL::boolean, "p_sort_order" integer DEFAULT NULL::integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_actor_id uuid;
  v_clean_code text;
  v_old_row record;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập. Yêu cầu xác thực người dùng.';
  END IF;

  IF NOT public.sc_can('admin.billing_settings.manage', NULL) THEN
    RAISE EXCEPTION 'Permission Denied: Yêu cầu quyền admin.billing_settings.manage để quản lý danh mục loại phương tiện.';
  END IF;

  v_clean_code := upper(trim(p_code));
  IF v_clean_code IS NULL OR length(v_clean_code) < 2 THEN
    RAISE EXCEPTION 'Mã loại phương tiện không hợp lệ: %', p_code;
  END IF;

  SELECT * INTO v_old_row FROM public.app_vehicle_types WHERE code = v_clean_code;

  -- M004-R3-03: Kiểm soát tài chính theo AP10 Four-Eyes:
  -- Tuyệt đối không cho phép thay đổi giá vé của loại xe đã tồn tại qua RPC danh mục này
  IF v_old_row.code IS NOT NULL AND p_default_ticket_amount IS NOT NULL AND p_default_ticket_amount IS DISTINCT FROM v_old_row.default_ticket_amount THEN
    RAISE EXCEPTION 'Việc thay đổi giá vé yêu cầu quy trình phê duyệt bảng giá AP10 (Four-Eyes). Không được phép thay đổi giá trực tiếp qua danh mục loại xe.';
  END IF;

  -- M004-R3-03: Đối với loại xe mới, chưa cho phép tự ấn định giá không qua AP10
  IF v_old_row.code IS NULL AND p_default_ticket_amount IS NOT NULL THEN
    RAISE EXCEPTION 'Thiết lập biểu phí cho loại xe mới yêu cầu quy trình phê duyệt bảng giá AP10. Loại xe mới tạo sẽ có trạng thái chưa có giá cho đến khi ban hành biểu phí.';
  END IF;

  IF v_old_row.code IS NOT NULL THEN
    -- M004-R3-02: CẬP NHẬT LOẠI XE ĐÃ CÓ (PATCH SEMANTICS) — Bảo toàn các trường không truyền
    UPDATE public.app_vehicle_types
    SET display_name = CASE WHEN p_display_name IS NOT NULL AND length(trim(p_display_name)) > 0 THEN trim(p_display_name) ELSE v_old_row.display_name END,
        description = CASE WHEN p_description IS NOT NULL THEN trim(p_description) ELSE v_old_row.description END,
        allows_container = COALESCE(p_allows_container, v_old_row.allows_container),
        is_active = COALESCE(p_is_active, v_old_row.is_active),
        sort_order = COALESCE(p_sort_order, v_old_row.sort_order),
        updated_at = clock_timestamp()
    WHERE code = v_clean_code;
  ELSE
    -- TẠO LOẠI XE MỚI: Bắt buộc display_name không được để trống
    IF p_display_name IS NULL OR length(trim(p_display_name)) = 0 THEN
      RAISE EXCEPTION 'Tên hiển thị loại phương tiện không được để trống khi tạo mới.';
    END IF;

    INSERT INTO public.app_vehicle_types (
      code, display_name, description, allows_container,
      default_ticket_amount, is_active, sort_order, updated_at
    ) VALUES (
      v_clean_code, trim(p_display_name), trim(p_description),
      COALESCE(p_allows_container, false), NULL,
      COALESCE(p_is_active, true), COALESCE(p_sort_order, 0), clock_timestamp()
    );
  END IF;

  PERFORM public.sc_log_audit_event(
    'vehicle_type.manage', 'app_vehicle_types', v_clean_code,
    NULL, 'HE_THONG', to_jsonb(v_old_row),
    jsonb_build_object(
      'code', v_clean_code,
      'display_name', trim(p_display_name),
      'allows_container', p_allows_container,
      'is_active', p_is_active
    ),
    'Quản lý cấu hình danh mục loại phương tiện'
  );
END;
$$;


ALTER FUNCTION "public"."sc_manage_vehicle_type"("p_code" "text", "p_display_name" "text", "p_description" "text", "p_allows_container" boolean, "p_default_ticket_amount" numeric, "p_is_active" boolean, "p_sort_order" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sc_my_permissions"() RETURNS TABLE("permission_code" "text", "scope" "text", "yard_id" "uuid", "department_code" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT DISTINCT p.code, rp.scope, ura.yard_id, ura.department_code
  FROM public.app_user_role_assignments ura
  JOIN public.app_roles r 
    ON r.code = ura.role_code 
   AND r.is_active = true
  JOIN public.app_role_permissions rp 
    ON rp.role_code = r.code 
   AND rp.is_enabled = true
  JOIN public.app_permissions p 
    ON p.code = rp.permission_code 
   AND p.is_active = true
  JOIN public.app_feature_flags f 
    ON f.feature_key = p.feature_key 
   AND f.is_enabled = true
  WHERE ura.user_id = auth.uid()
    AND ura.is_active = true
    AND ura.valid_from <= now()
    AND (ura.valid_until IS NULL OR ura.valid_until > now());
$$;


ALTER FUNCTION "public"."sc_my_permissions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sc_reconcile_container_number_discrepancy"("p_change_id" bigint, "p_reconcile_notes" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_actor_id uuid;
  v_change record;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập. Yêu cầu xác thực người dùng.';
  END IF;

  IF p_reconcile_notes IS NULL OR length(trim(p_reconcile_notes)) < 3 THEN
    RAISE EXCEPTION 'Ghi chú đối soát của CCKB là bắt buộc (tối thiểu 3 ký tự).';
  END IF;

  SELECT * INTO v_change 
  FROM public.app_container_number_changes 
  WHERE id = p_change_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy bản ghi sửa số container: %', p_change_id;
  END IF;

  IF NOT public.sc_can('container.number.discrepancy.port_reconcile', v_change.yard_id) THEN
    RAISE EXCEPTION 'Permission Denied: Chỉ bộ phận CCKB (PORT_STAFF, PORT_LEAD) hoặc Quản trị mới có quyền đối soát sai số container tại bãi này.';
  END IF;

  -- M004-R1-08: Kiểm tra chống ghi đè
  IF v_change.reconciled_at IS NOT NULL THEN
    RAISE EXCEPTION 'Bản ghi này đã được CCKB đối soát trước đó vào lúc %.', v_change.reconciled_at;
  END IF;

  UPDATE public.app_container_number_changes
  SET reconciled_at = clock_timestamp(),
      reconciled_by = v_actor_id,
      reconcile_notes = trim(p_reconcile_notes)
  WHERE id = p_change_id;

  PERFORM public.sc_log_audit_event(
    'container.number.discrepancy.port_reconcile', 'app_container_number_changes', p_change_id::text,
    v_change.yard_id, 'CCKB', NULL, 
    jsonb_build_object('reconciled_by', v_actor_id, 'reconcile_notes', p_reconcile_notes), 
    'CCKB đối soát sai lệch số container'
  );
END;
$$;


ALTER FUNCTION "public"."sc_reconcile_container_number_discrepancy"("p_change_id" bigint, "p_reconcile_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sc_reject_request"("p_request_id" "uuid", "p_reason" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_req record;
  v_pol record;
  v_actor_id uuid;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập. Yêu cầu xác thực người dùng.';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Bắt buộc phải nhập lý do từ chối yêu cầu.';
  END IF;

  SELECT * INTO v_req FROM public.app_approval_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Yêu cầu phê duyệt không tồn tại: %', p_request_id;
  END IF;

  IF v_req.status <> 'PENDING' THEN
    RAISE EXCEPTION 'Yêu cầu không ở trạng thái chờ duyệt (status: %).', v_req.status;
  END IF;

  SELECT * INTO v_pol FROM public.app_approval_policies WHERE policy_code = v_req.policy_code;
  IF NOT FOUND OR v_pol.is_enabled = false THEN
    RAISE EXCEPTION 'Chính sách phê duyệt không hợp lệ hoặc đã bị vô hiệu hóa: %', v_req.policy_code;
  END IF;

  -- Fail-closed: Chính sách phải có mã quyền duyệt hợp lệ (SC-R2-02)
  IF v_pol.approve_permission_code IS NULL THEN
    RAISE EXCEPTION 'Chính sách % là tác vụ một bước / không áp dụng xử lý qua RPC sc_reject_request. Thao tác bị từ chối.', v_req.policy_code;
  END IF;

  -- Kiểm tra quyền từ chối có kèm context yard_id và department_code của request (SC-R2-03)
  IF NOT public.sc_can(v_pol.approve_permission_code, v_req.yard_id, v_req.department_code) THEN
    RAISE EXCEPTION 'Permission Denied: Không có quyền xử lý/từ chối yêu cầu (%) cho chính sách % tại phạm vi bãi/bộ phận tương ứng.', v_pol.approve_permission_code, v_pol.policy_code;
  END IF;

  UPDATE public.app_approval_requests
  SET status = 'REJECTED',
      approved_by = v_actor_id,
      decision_at = clock_timestamp()
  WHERE id = p_request_id;

  -- Ghi nhận audit event với context bãi và bộ phận
  PERFORM public.sc_log_audit_event(
    'approval.request.reject', 'app_approval_requests', p_request_id::text,
    v_req.yard_id, v_req.department_code, to_jsonb(v_req), 
    jsonb_build_object('status', 'REJECTED', 'rejected_by', v_actor_id, 'decision_at', clock_timestamp(), 'reject_reason', p_reason),
    p_reason
  );

  RETURN true;
END;
$$;


ALTER FUNCTION "public"."sc_reject_request"("p_request_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sc_trg_audit_role_perms"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.sc_log_audit_event(
      'system.role_permissions.grant', 'app_role_permissions', NEW.role_code || ':' || NEW.permission_code,
      NULL, NULL, NULL, to_jsonb(NEW),
      'Cấp quyền cho vai trò'
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.sc_log_audit_event(
      'system.role_permissions.update', 'app_role_permissions', NEW.role_code || ':' || NEW.permission_code,
      NULL, NULL, to_jsonb(OLD), to_jsonb(NEW),
      'Cập nhật quyền của vai trò'
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.sc_log_audit_event(
      'system.role_permissions.revoke', 'app_role_permissions', OLD.role_code || ':' || OLD.permission_code,
      NULL, NULL, to_jsonb(OLD), NULL,
      'Thu hồi quyền của vai trò'
    );
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."sc_trg_audit_role_perms"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sc_trg_audit_user_roles"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.sc_log_audit_event(
      'system.role.assign', 'app_user_role_assignments', NEW.id::text,
      NEW.yard_id, NEW.department_code, NULL, to_jsonb(NEW),
      'Gán vai trò người dùng'
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.sc_log_audit_event(
      'system.role.update_assignment', 'app_user_role_assignments', NEW.id::text,
      NEW.yard_id, NEW.department_code, to_jsonb(OLD), to_jsonb(NEW),
      'Cập nhật gán vai trò người dùng'
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.sc_log_audit_event(
      'system.role.revoke', 'app_user_role_assignments', OLD.id::text,
      OLD.yard_id, OLD.department_code, to_jsonb(OLD), NULL,
      'Thu hồi vai trò người dùng'
    );
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."sc_trg_audit_user_roles"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sc_trg_container_number_changes_immutable"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Lịch sử sửa số container là bất biến (append-only). Nghiêm cấm xóa bản ghi.';
  ELSIF TG_OP = 'UPDATE' THEN
    -- Cấm tuyệt đối thay đổi các trường dữ liệu lịch sử cốt lõi và chứng cứ ban đầu (NULL-safe qua IS DISTINCT FROM)
    IF NEW.id IS DISTINCT FROM OLD.id OR
       NEW.container_visit_id IS DISTINCT FROM OLD.container_visit_id OR
       NEW.yard_id IS DISTINCT FROM OLD.yard_id OR
       NEW.old_number IS DISTINCT FROM OLD.old_number OR
       NEW.new_number IS DISTINCT FROM OLD.new_number OR
       NEW.reason IS DISTINCT FROM OLD.reason OR
       NEW.evidence_url IS DISTINCT FROM OLD.evidence_url OR
       NEW.changed_by IS DISTINCT FROM OLD.changed_by OR
       NEW.changed_at IS DISTINCT FROM OLD.changed_at OR
       NEW.notified_cckb IS DISTINCT FROM OLD.notified_cckb OR
       NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Dữ liệu lịch sử sửa số container và chứng cứ là bất biến. Không được phép chỉnh sửa các thông tin gốc.';
    END IF;

    -- Kiểm soát chuyển trạng thái 1 chiều của An ninh (chống ghi đè hoặc xóa về NULL)
    IF OLD.sec_ack_at IS NOT NULL AND (
       NEW.sec_ack_at IS DISTINCT FROM OLD.sec_ack_at OR 
       NEW.sec_ack_by IS DISTINCT FROM OLD.sec_ack_by
    ) THEN
      RAISE EXCEPTION 'Thông tin xác nhận của An ninh đã được ghi nhận trước đó, không được phép sửa đổi hoặc xóa bỏ.';
    END IF;

    -- Ràng buộc cặp An ninh: nếu có sec_ack_at thì sec_ack_by bắt buộc không được NULL
    IF NEW.sec_ack_at IS NOT NULL AND NEW.sec_ack_by IS NULL THEN
      RAISE EXCEPTION 'Thông tin xác nhận của An ninh không hợp lệ: thiếu sec_ack_by.';
    END IF;

    -- Kiểm soát chuyển trạng thái 1 chiều của CCKB (chống ghi đè hoặc xóa về NULL)
    IF OLD.reconciled_at IS NOT NULL AND (
       NEW.reconciled_at IS DISTINCT FROM OLD.reconciled_at OR 
       NEW.reconciled_by IS DISTINCT FROM OLD.reconciled_by OR 
       NEW.reconcile_notes IS DISTINCT FROM OLD.reconcile_notes
    ) THEN
      RAISE EXCEPTION 'Thông tin đối soát của CCKB đã được ghi nhận trước đó, không được phép sửa đổi hoặc xóa bỏ.';
    END IF;

    -- Ràng buộc cặp CCKB: nếu có reconciled_at thì reconciled_by và reconcile_notes bắt buộc không được NULL
    IF NEW.reconciled_at IS NOT NULL AND (NEW.reconciled_by IS NULL OR NEW.reconcile_notes IS NULL) THEN
      RAISE EXCEPTION 'Thông tin đối soát của CCKB không hợp lệ: thiếu reconciled_by hoặc reconcile_notes.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sc_trg_container_number_changes_immutable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sc_trg_touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sc_trg_touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sc_update_container_cargo"("p_container_visit_id" "uuid", "p_cargo_status" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_actor_id uuid;
  v_cont record;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập. Yêu cầu xác thực người dùng.';
  END IF;

  IF p_cargo_status NOT IN ('HANG', 'RONG') THEN
    RAISE EXCEPTION 'Trạng thái HÀNG/RỖNG không hợp lệ: %. Chỉ chấp nhận HANG hoặc RONG.', p_cargo_status;
  END IF;

  SELECT * INTO v_cont 
  FROM public.app_container_visits 
  WHERE id = p_container_visit_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy lượt container: %', p_container_visit_id;
  END IF;

  IF NOT public.sc_can('container.cargo.update', v_cont.yard_id) THEN
    RAISE EXCEPTION 'Permission Denied: Chỉ bộ phận Điều phối (DIS_STAFF, DIS_LEAD) hoặc Quản trị mới có quyền cập nhật HÀNG/RỖNG tại bãi này.';
  END IF;

  -- M004-R1-12: Kiểm soát trạng thái nghiêm ngặt
  IF v_cont.status = 'EXITED' THEN
    RAISE EXCEPTION 'Container đã xuất bãi (EXITED). Sửa trạng thái HÀNG/RỖNG sau khi xuất bãi yêu cầu quy trình phê duyệt AP05 (container.cargo.post_exit.request/approve).';
  ELSIF v_cont.status = 'CANCELLED' THEN
    RAISE EXCEPTION 'Không thể cập nhật HÀNG/RỖNG cho container đã bị hủy (CANCELLED).';
  ELSIF v_cont.status <> 'IN_YARD' THEN
    RAISE EXCEPTION 'Chỉ được phép cập nhật HÀNG/RỖNG khi container đang trong bãi (IN_YARD). Trạng thái hiện tại: %', v_cont.status;
  END IF;

  UPDATE public.app_container_visits
  SET cargo_status = p_cargo_status,
      cargo_status_updated_at = clock_timestamp(),
      cargo_status_updated_by = v_actor_id,
      updated_at = clock_timestamp()
  WHERE id = p_container_visit_id;

  -- Ghi nhận Audit Event
  PERFORM public.sc_log_audit_event(
    'container.cargo.update', 'app_container_visits', p_container_visit_id::text,
    v_cont.yard_id, 'DIEU_PHOI', 
    jsonb_build_object('cargo_status', v_cont.cargo_status), 
    jsonb_build_object('cargo_status', p_cargo_status), 
    'Cập nhật trạng thái HÀNG/RỖNG container'
  );
END;
$$;


ALTER FUNCTION "public"."sc_update_container_cargo"("p_container_visit_id" "uuid", "p_cargo_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sc_update_vehicle_visit_basic"("p_vehicle_visit_id" "uuid", "p_license_plate" "text", "p_driver_name" "text", "p_driver_phone" "text", "p_note" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_actor_id uuid;
  v_veh record;
  v_clean_plate text;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập. Yêu cầu xác thực người dùng.';
  END IF;

  SELECT * INTO v_veh 
  FROM public.app_vehicle_visits 
  WHERE id = p_vehicle_visit_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy lượt xe: %', p_vehicle_visit_id;
  END IF;

  IF NOT public.sc_can('vehicle.visit.update_basic', v_veh.yard_id) THEN
    RAISE EXCEPTION 'Permission Denied: Không có quyền sửa thông tin cơ bản xe tại bãi này.';
  END IF;

  IF v_veh.status <> 'IN_YARD' THEN
    RAISE EXCEPTION 'Chỉ được phép sửa thông tin khi lượt xe đang trong bãi (IN_YARD). Trạng thái hiện tại: %', v_veh.status;
  END IF;

  v_clean_plate := NULLIF(trim(p_license_plate), '');
  IF v_veh.vehicle_type <> 'XE_BO_3_BANH' AND v_clean_plate IS NULL THEN
    RAISE EXCEPTION 'Biển số xe là bắt buộc đối với loại xe %.', v_veh.vehicle_type;
  END IF;

  UPDATE public.app_vehicle_visits
  SET license_plate = v_clean_plate,
      driver_name = trim(p_driver_name),
      driver_phone = trim(p_driver_phone),
      note = trim(p_note),
      updated_at = clock_timestamp()
  WHERE id = p_vehicle_visit_id;

  -- Ghi nhận Audit Event
  PERFORM public.sc_log_audit_event(
    'vehicle.visit.update_basic', 'app_vehicle_visits', p_vehicle_visit_id::text,
    v_veh.yard_id, 'AN_NINH', to_jsonb(v_veh), 
    jsonb_build_object('license_plate', v_clean_plate, 'driver_name', p_driver_name, 'driver_phone', p_driver_phone, 'note', p_note),
    'Cập nhật thông tin cơ bản lượt xe'
  );
END;
$$;


ALTER FUNCTION "public"."sc_update_vehicle_visit_basic"("p_vehicle_visit_id" "uuid", "p_license_plate" "text", "p_driver_name" "text", "p_driver_phone" "text", "p_note" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."app_approval_policies" (
    "policy_code" "text" NOT NULL,
    "label" "text" NOT NULL,
    "request_permission_code" "text",
    "approve_permission_code" "text",
    "enforce_distinct_actor" boolean DEFAULT true NOT NULL,
    "reason_required" boolean DEFAULT true NOT NULL,
    "is_enabled" boolean DEFAULT true NOT NULL,
    "notes" "text" DEFAULT ''::"text" NOT NULL
);


ALTER TABLE "public"."app_approval_policies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_approval_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "policy_code" "text" NOT NULL,
    "target_type" "text" NOT NULL,
    "target_id" "uuid" NOT NULL,
    "yard_id" "uuid",
    "department_code" "text",
    "requested_by" "uuid" NOT NULL,
    "approved_by" "uuid",
    "reason" "text" NOT NULL,
    "before_snapshot" "jsonb",
    "proposed_changes" "jsonb",
    "status" "text" DEFAULT 'PENDING'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "decision_at" timestamp with time zone,
    CONSTRAINT "app_approval_requests_status_check" CHECK (("status" = ANY (ARRAY['PENDING'::"text", 'APPROVED'::"text", 'REJECTED'::"text", 'CANCELLED'::"text"]))),
    CONSTRAINT "chk_approval_reason_not_empty" CHECK (("length"(TRIM(BOTH FROM "reason")) > 0)),
    CONSTRAINT "chk_approval_status_lifecycle" CHECK (((("status" = 'PENDING'::"text") AND ("approved_by" IS NULL) AND ("decision_at" IS NULL)) OR (("status" = ANY (ARRAY['APPROVED'::"text", 'REJECTED'::"text"])) AND ("approved_by" IS NOT NULL) AND ("decision_at" IS NOT NULL)) OR (("status" = 'CANCELLED'::"text") AND ("decision_at" IS NOT NULL)))),
    CONSTRAINT "chk_four_eyes_actor" CHECK ((("approved_by" IS NULL) OR ("approved_by" <> "requested_by")))
);


ALTER TABLE "public"."app_approval_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_audit_events" (
    "id" bigint NOT NULL,
    "event_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "actor_user_id" "uuid",
    "action_code" "text" NOT NULL,
    "target_type" "text" NOT NULL,
    "target_id" "text",
    "yard_id" "uuid",
    "department_code" "text",
    "before_data" "jsonb",
    "after_data" "jsonb",
    "reason" "text",
    "request_id" "text",
    "device_info" "jsonb"
);


ALTER TABLE "public"."app_audit_events" OWNER TO "postgres";


ALTER TABLE "public"."app_audit_events" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."app_audit_events_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."app_container_number_changes" (
    "id" bigint NOT NULL,
    "container_visit_id" "uuid" NOT NULL,
    "yard_id" "uuid" NOT NULL,
    "old_number" "text" NOT NULL,
    "new_number" "text" NOT NULL,
    "reason" "text" NOT NULL,
    "evidence_url" "text",
    "changed_by" "uuid" NOT NULL,
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notified_cckb" boolean DEFAULT true NOT NULL,
    "sec_ack_at" timestamp with time zone,
    "sec_ack_by" "uuid",
    "reconciled_at" timestamp with time zone,
    "reconciled_by" "uuid",
    "reconcile_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ck_change_new_no_not_empty" CHECK (("length"(TRIM(BOTH FROM "new_number")) > 0)),
    CONSTRAINT "ck_change_numbers_differ" CHECK ((TRIM(BOTH FROM "old_number") <> TRIM(BOTH FROM "new_number"))),
    CONSTRAINT "ck_change_old_no_not_empty" CHECK (("length"(TRIM(BOTH FROM "old_number")) > 0)),
    CONSTRAINT "ck_change_reason_not_empty" CHECK (("length"(TRIM(BOTH FROM "reason")) >= 3))
);


ALTER TABLE "public"."app_container_number_changes" OWNER TO "postgres";


ALTER TABLE "public"."app_container_number_changes" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."app_container_number_changes_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."app_container_visits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "yard_id" "uuid" NOT NULL,
    "container_no_current" "text" NOT NULL,
    "container_no_original" "text" NOT NULL,
    "container_size" "text",
    "container_type" "text" DEFAULT 'RF'::"text",
    "inbound_vehicle_visit_id" "uuid",
    "inbound_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "outbound_vehicle_visit_id" "uuid",
    "outbound_at" timestamp with time zone,
    "status" "text" DEFAULT 'IN_YARD'::"text" NOT NULL,
    "cargo_status" "text" DEFAULT 'CHUA_XAC_DINH'::"text" NOT NULL,
    "cargo_status_updated_at" timestamp with time zone,
    "cargo_status_updated_by" "uuid",
    "is_legacy_import" boolean DEFAULT false NOT NULL,
    "legacy_import_notes" "text",
    "idempotency_key" "text",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "app_container_visits_cargo_status_check" CHECK (("cargo_status" = ANY (ARRAY['HANG'::"text", 'RONG'::"text", 'CHUA_XAC_DINH'::"text"]))),
    CONSTRAINT "app_container_visits_container_size_check" CHECK ((("container_size" IS NULL) OR ("container_size" = ANY (ARRAY['20'::"text", '40'::"text", '45'::"text", 'OTHER'::"text"])))),
    CONSTRAINT "app_container_visits_status_check" CHECK (("status" = ANY (ARRAY['IN_YARD'::"text", 'EXITED'::"text", 'CANCELLED'::"text"]))),
    CONSTRAINT "ck_container_idempotency_clean" CHECK ((("idempotency_key" IS NULL) OR ("length"(TRIM(BOTH FROM "idempotency_key")) > 0))),
    CONSTRAINT "ck_container_no_not_empty" CHECK ((("length"(TRIM(BOTH FROM "container_no_current")) > 0) AND ("length"(TRIM(BOTH FROM "container_no_original")) > 0))),
    CONSTRAINT "ck_container_outbound_after_inbound" CHECK ((("outbound_at" IS NULL) OR ("outbound_at" >= "inbound_at"))),
    CONSTRAINT "ck_container_status_outbound" CHECK (((("status" = 'EXITED'::"text") AND ("outbound_at" IS NOT NULL)) OR (("status" <> 'EXITED'::"text") AND ("outbound_at" IS NULL))))
);


ALTER TABLE "public"."app_container_visits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_departments" (
    "code" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."app_departments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_feature_flags" (
    "feature_key" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "is_enabled" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."app_feature_flags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_permissions" (
    "code" "text" NOT NULL,
    "module" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "source_questions" "text" DEFAULT ''::"text" NOT NULL,
    "release_phase" "text" DEFAULT 'V1'::"text" NOT NULL,
    "feature_key" "text" DEFAULT 'CORE'::"text" NOT NULL,
    "risk_level" "text" DEFAULT 'Thông thường'::"text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."app_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_role_permissions" (
    "role_code" "text" NOT NULL,
    "permission_code" "text" NOT NULL,
    "scope" "text" NOT NULL,
    "is_enabled" boolean DEFAULT true NOT NULL,
    CONSTRAINT "app_role_permissions_scope_check" CHECK (("scope" = ANY (ARRAY['SELF'::"text", 'DEPARTMENT'::"text", 'YARD'::"text", 'ALL'::"text"])))
);


ALTER TABLE "public"."app_role_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_roles" (
    "code" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "department_code" "text",
    "seniority" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "release_phase" "text" DEFAULT 'V1'::"text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL
);


ALTER TABLE "public"."app_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_settings" (
    "setting_key" "text" NOT NULL,
    "setting_value" "jsonb" NOT NULL,
    "setting_type" "text" NOT NULL,
    "decision_status" "text" NOT NULL,
    "notes" "text" DEFAULT ''::"text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."app_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_user_role_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role_code" "text" NOT NULL,
    "yard_id" "uuid",
    "department_code" "text",
    "valid_from" timestamp with time zone DEFAULT "now"() NOT NULL,
    "valid_until" timestamp with time zone,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_valid_time_window" CHECK ((("valid_until" IS NULL) OR ("valid_until" > "valid_from")))
);


ALTER TABLE "public"."app_user_role_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_vehicle_types" (
    "code" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "description" "text",
    "allows_container" boolean DEFAULT false NOT NULL,
    "default_ticket_amount" numeric(12,2),
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "app_vehicle_types_default_ticket_amount_check" CHECK ((("default_ticket_amount" IS NULL) OR ("default_ticket_amount" >= (0)::numeric))),
    CONSTRAINT "ck_vehicle_type_code_clean" CHECK ((("code" = "upper"(TRIM(BOTH FROM "code"))) AND ("length"("code") >= 2))),
    CONSTRAINT "ck_vehicle_type_name_not_empty" CHECK (("length"(TRIM(BOTH FROM "display_name")) > 0))
);


ALTER TABLE "public"."app_vehicle_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_vehicle_visits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "yard_id" "uuid" NOT NULL,
    "license_plate" "text",
    "vehicle_type" "text" NOT NULL,
    "driver_name" "text",
    "driver_phone" "text",
    "entry_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "entry_by" "uuid" NOT NULL,
    "exit_at" timestamp with time zone,
    "exit_by" "uuid",
    "status" "text" DEFAULT 'IN_YARD'::"text" NOT NULL,
    "ticket_code" "text",
    "ticket_amount" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "ticket_payment_status" "text" DEFAULT 'UNPAID'::"text" NOT NULL,
    "idempotency_key" "text",
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "app_vehicle_visits_status_check" CHECK (("status" = ANY (ARRAY['IN_YARD'::"text", 'EXITED'::"text", 'CANCELLED'::"text"]))),
    CONSTRAINT "app_vehicle_visits_ticket_amount_check" CHECK (("ticket_amount" >= (0)::numeric)),
    CONSTRAINT "app_vehicle_visits_ticket_payment_status_check" CHECK (("ticket_payment_status" = ANY (ARRAY['UNPAID'::"text", 'PAID'::"text", 'EXEMPT'::"text", 'CANCELLED'::"text"]))),
    CONSTRAINT "ck_vehicle_exit_after_entry" CHECK ((("exit_at" IS NULL) OR ("exit_at" >= "entry_at"))),
    CONSTRAINT "ck_vehicle_idempotency_clean" CHECK ((("idempotency_key" IS NULL) OR ("length"(TRIM(BOTH FROM "idempotency_key")) > 0))),
    CONSTRAINT "ck_vehicle_license_plate_clean" CHECK ((("license_plate" IS NULL) OR ("length"(TRIM(BOTH FROM "license_plate")) > 0))),
    CONSTRAINT "ck_vehicle_status_exit" CHECK (((("status" = 'EXITED'::"text") AND ("exit_at" IS NOT NULL) AND ("exit_by" IS NOT NULL)) OR (("status" <> 'EXITED'::"text") AND ("exit_at" IS NULL) AND ("exit_by" IS NULL))))
);


ALTER TABLE "public"."app_vehicle_visits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_yards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."app_yards" OWNER TO "postgres";


ALTER TABLE ONLY "public"."app_approval_policies"
    ADD CONSTRAINT "app_approval_policies_pkey" PRIMARY KEY ("policy_code");



ALTER TABLE ONLY "public"."app_approval_requests"
    ADD CONSTRAINT "app_approval_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_audit_events"
    ADD CONSTRAINT "app_audit_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_container_number_changes"
    ADD CONSTRAINT "app_container_number_changes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_container_visits"
    ADD CONSTRAINT "app_container_visits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_departments"
    ADD CONSTRAINT "app_departments_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."app_feature_flags"
    ADD CONSTRAINT "app_feature_flags_pkey" PRIMARY KEY ("feature_key");



ALTER TABLE ONLY "public"."app_permissions"
    ADD CONSTRAINT "app_permissions_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."app_role_permissions"
    ADD CONSTRAINT "app_role_permissions_pkey" PRIMARY KEY ("role_code", "permission_code");



ALTER TABLE ONLY "public"."app_roles"
    ADD CONSTRAINT "app_roles_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."app_settings"
    ADD CONSTRAINT "app_settings_pkey" PRIMARY KEY ("setting_key");



ALTER TABLE ONLY "public"."app_user_role_assignments"
    ADD CONSTRAINT "app_user_role_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_vehicle_types"
    ADD CONSTRAINT "app_vehicle_types_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."app_vehicle_visits"
    ADD CONSTRAINT "app_vehicle_visits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_yards"
    ADD CONSTRAINT "app_yards_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."app_yards"
    ADD CONSTRAINT "app_yards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_container_visits"
    ADD CONSTRAINT "uq_container_visit_yard" UNIQUE ("id", "yard_id");



ALTER TABLE ONLY "public"."app_vehicle_visits"
    ADD CONSTRAINT "uq_vehicle_visit_yard" UNIQUE ("id", "yard_id");



CREATE INDEX "idx_container_num_changes_visit" ON "public"."app_container_number_changes" USING "btree" ("container_visit_id", "created_at" DESC);



CREATE INDEX "idx_container_num_changes_yard" ON "public"."app_container_number_changes" USING "btree" ("yard_id", "created_at" DESC);



CREATE INDEX "idx_container_visits_inbound_veh" ON "public"."app_container_visits" USING "btree" ("inbound_vehicle_visit_id");



CREATE INDEX "idx_container_visits_no_current" ON "public"."app_container_visits" USING "btree" ("container_no_current");



CREATE INDEX "idx_container_visits_outbound_veh" ON "public"."app_container_visits" USING "btree" ("outbound_vehicle_visit_id") WHERE ("outbound_vehicle_visit_id" IS NOT NULL);



CREATE INDEX "idx_container_visits_yard_status" ON "public"."app_container_visits" USING "btree" ("yard_id", "status");



CREATE INDEX "idx_sc_approval_target" ON "public"."app_approval_requests" USING "btree" ("target_type", "target_id");



CREATE INDEX "idx_sc_audit_event_time" ON "public"."app_audit_events" USING "btree" ("event_at" DESC);



CREATE INDEX "idx_sc_audit_scope" ON "public"."app_audit_events" USING "btree" ("yard_id", "department_code", "event_at" DESC);



CREATE INDEX "idx_sc_role_assign_user_active" ON "public"."app_user_role_assignments" USING "btree" ("user_id", "is_active");



CREATE INDEX "idx_vehicle_visits_entry_at" ON "public"."app_vehicle_visits" USING "btree" ("entry_at" DESC);



CREATE INDEX "idx_vehicle_visits_license_plate" ON "public"."app_vehicle_visits" USING "btree" ("license_plate") WHERE ("license_plate" IS NOT NULL);



CREATE INDEX "idx_vehicle_visits_yard_status" ON "public"."app_vehicle_visits" USING "btree" ("yard_id", "status");



CREATE UNIQUE INDEX "uq_container_visits_active_number_yard" ON "public"."app_container_visits" USING "btree" ("yard_id", "upper"("btrim"("container_no_current"))) WHERE ("status" = 'IN_YARD'::"text");



CREATE UNIQUE INDEX "uq_container_visits_idempotency" ON "public"."app_container_visits" USING "btree" ("yard_id", "idempotency_key") WHERE ("idempotency_key" IS NOT NULL);



CREATE UNIQUE INDEX "uq_vehicle_visits_idempotency" ON "public"."app_vehicle_visits" USING "btree" ("yard_id", "idempotency_key") WHERE ("idempotency_key" IS NOT NULL);



CREATE OR REPLACE TRIGGER "trg_audit_role_perms" AFTER INSERT OR DELETE OR UPDATE ON "public"."app_role_permissions" FOR EACH ROW EXECUTE FUNCTION "public"."sc_trg_audit_role_perms"();



CREATE OR REPLACE TRIGGER "trg_audit_user_roles" AFTER INSERT OR DELETE OR UPDATE ON "public"."app_user_role_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."sc_trg_audit_user_roles"();



CREATE OR REPLACE TRIGGER "trg_container_number_changes_immutable" BEFORE DELETE OR UPDATE ON "public"."app_container_number_changes" FOR EACH ROW EXECUTE FUNCTION "public"."sc_trg_container_number_changes_immutable"();



CREATE OR REPLACE TRIGGER "trg_sc_audit_immutable" BEFORE DELETE OR UPDATE ON "public"."app_audit_events" FOR EACH ROW EXECUTE FUNCTION "public"."sc_audit_immutable"();



CREATE OR REPLACE TRIGGER "trg_touch_container_visits" BEFORE UPDATE ON "public"."app_container_visits" FOR EACH ROW EXECUTE FUNCTION "public"."sc_trg_touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_touch_vehicle_types" BEFORE UPDATE ON "public"."app_vehicle_types" FOR EACH ROW EXECUTE FUNCTION "public"."sc_trg_touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_touch_vehicle_visits" BEFORE UPDATE ON "public"."app_vehicle_visits" FOR EACH ROW EXECUTE FUNCTION "public"."sc_trg_touch_updated_at"();



ALTER TABLE ONLY "public"."app_approval_requests"
    ADD CONSTRAINT "app_approval_requests_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."app_approval_requests"
    ADD CONSTRAINT "app_approval_requests_department_code_fkey" FOREIGN KEY ("department_code") REFERENCES "public"."app_departments"("code") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."app_approval_requests"
    ADD CONSTRAINT "app_approval_requests_policy_code_fkey" FOREIGN KEY ("policy_code") REFERENCES "public"."app_approval_policies"("policy_code") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."app_approval_requests"
    ADD CONSTRAINT "app_approval_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."app_approval_requests"
    ADD CONSTRAINT "app_approval_requests_yard_id_fkey" FOREIGN KEY ("yard_id") REFERENCES "public"."app_yards"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."app_audit_events"
    ADD CONSTRAINT "app_audit_events_department_code_fkey" FOREIGN KEY ("department_code") REFERENCES "public"."app_departments"("code") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."app_audit_events"
    ADD CONSTRAINT "app_audit_events_yard_id_fkey" FOREIGN KEY ("yard_id") REFERENCES "public"."app_yards"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."app_container_number_changes"
    ADD CONSTRAINT "app_container_number_changes_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."app_container_number_changes"
    ADD CONSTRAINT "app_container_number_changes_container_visit_id_fkey" FOREIGN KEY ("container_visit_id") REFERENCES "public"."app_container_visits"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."app_container_number_changes"
    ADD CONSTRAINT "app_container_number_changes_reconciled_by_fkey" FOREIGN KEY ("reconciled_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."app_container_number_changes"
    ADD CONSTRAINT "app_container_number_changes_sec_ack_by_fkey" FOREIGN KEY ("sec_ack_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."app_container_number_changes"
    ADD CONSTRAINT "app_container_number_changes_yard_id_fkey" FOREIGN KEY ("yard_id") REFERENCES "public"."app_yards"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."app_container_visits"
    ADD CONSTRAINT "app_container_visits_cargo_status_updated_by_fkey" FOREIGN KEY ("cargo_status_updated_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."app_container_visits"
    ADD CONSTRAINT "app_container_visits_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."app_container_visits"
    ADD CONSTRAINT "app_container_visits_inbound_vehicle_visit_id_fkey" FOREIGN KEY ("inbound_vehicle_visit_id") REFERENCES "public"."app_vehicle_visits"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."app_container_visits"
    ADD CONSTRAINT "app_container_visits_outbound_vehicle_visit_id_fkey" FOREIGN KEY ("outbound_vehicle_visit_id") REFERENCES "public"."app_vehicle_visits"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."app_container_visits"
    ADD CONSTRAINT "app_container_visits_yard_id_fkey" FOREIGN KEY ("yard_id") REFERENCES "public"."app_yards"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."app_role_permissions"
    ADD CONSTRAINT "app_role_permissions_permission_code_fkey" FOREIGN KEY ("permission_code") REFERENCES "public"."app_permissions"("code") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."app_role_permissions"
    ADD CONSTRAINT "app_role_permissions_role_code_fkey" FOREIGN KEY ("role_code") REFERENCES "public"."app_roles"("code") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."app_roles"
    ADD CONSTRAINT "app_roles_department_code_fkey" FOREIGN KEY ("department_code") REFERENCES "public"."app_departments"("code") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."app_user_role_assignments"
    ADD CONSTRAINT "app_user_role_assignments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."app_user_role_assignments"
    ADD CONSTRAINT "app_user_role_assignments_department_code_fkey" FOREIGN KEY ("department_code") REFERENCES "public"."app_departments"("code") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."app_user_role_assignments"
    ADD CONSTRAINT "app_user_role_assignments_role_code_fkey" FOREIGN KEY ("role_code") REFERENCES "public"."app_roles"("code") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."app_user_role_assignments"
    ADD CONSTRAINT "app_user_role_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."app_user_role_assignments"
    ADD CONSTRAINT "app_user_role_assignments_yard_id_fkey" FOREIGN KEY ("yard_id") REFERENCES "public"."app_yards"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."app_vehicle_visits"
    ADD CONSTRAINT "app_vehicle_visits_entry_by_fkey" FOREIGN KEY ("entry_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."app_vehicle_visits"
    ADD CONSTRAINT "app_vehicle_visits_exit_by_fkey" FOREIGN KEY ("exit_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."app_vehicle_visits"
    ADD CONSTRAINT "app_vehicle_visits_vehicle_type_fkey" FOREIGN KEY ("vehicle_type") REFERENCES "public"."app_vehicle_types"("code") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."app_vehicle_visits"
    ADD CONSTRAINT "app_vehicle_visits_yard_id_fkey" FOREIGN KEY ("yard_id") REFERENCES "public"."app_yards"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."app_container_number_changes"
    ADD CONSTRAINT "fk_change_container_yard" FOREIGN KEY ("container_visit_id", "yard_id") REFERENCES "public"."app_container_visits"("id", "yard_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."app_container_visits"
    ADD CONSTRAINT "fk_container_inbound_vehicle_yard" FOREIGN KEY ("inbound_vehicle_visit_id", "yard_id") REFERENCES "public"."app_vehicle_visits"("id", "yard_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."app_container_visits"
    ADD CONSTRAINT "fk_container_outbound_vehicle_yard" FOREIGN KEY ("outbound_vehicle_visit_id", "yard_id") REFERENCES "public"."app_vehicle_visits"("id", "yard_id") ON DELETE RESTRICT;



ALTER TABLE "public"."app_approval_policies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."app_approval_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."app_audit_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."app_container_number_changes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."app_container_visits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."app_departments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."app_feature_flags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."app_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."app_role_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."app_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."app_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."app_user_role_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."app_vehicle_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."app_vehicle_visits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."app_yards" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "p_approval_policies_read" ON "public"."app_approval_policies" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "p_approval_read" ON "public"."app_approval_requests" FOR SELECT TO "authenticated" USING ((("requested_by" = "auth"."uid"()) OR ("approved_by" = "auth"."uid"()) OR "public"."sc_can"('audit.export_all'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."app_approval_policies" "ap"
  WHERE (("ap"."policy_code" = "app_approval_requests"."policy_code") AND ("ap"."approve_permission_code" IS NOT NULL) AND "public"."sc_can"("ap"."approve_permission_code", "app_approval_requests"."yard_id", "app_approval_requests"."department_code"))))));



CREATE POLICY "p_assignments_admin_manage" ON "public"."app_user_role_assignments" TO "authenticated" USING ("public"."sc_can"('admin.users.manage'::"text")) WITH CHECK ("public"."sc_can"('admin.users.manage'::"text"));



CREATE POLICY "p_assignments_self_read" ON "public"."app_user_role_assignments" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."sc_can"('admin.users.manage'::"text")));



CREATE POLICY "p_audit_select" ON "public"."app_audit_events" FOR SELECT TO "authenticated" USING (("public"."sc_can"('audit.export_all'::"text") OR "public"."sc_can"('audit.read'::"text", "yard_id", "department_code")));



CREATE POLICY "p_container_number_changes_select" ON "public"."app_container_number_changes" FOR SELECT TO "authenticated" USING ("public"."sc_can"('container.number.discrepancy.view'::"text", "yard_id"));



CREATE POLICY "p_container_visits_select" ON "public"."app_container_visits" FOR SELECT TO "authenticated" USING ("public"."sc_can"('container.visit.read'::"text", "yard_id"));



CREATE POLICY "p_departments_read" ON "public"."app_departments" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "p_feature_flags_read" ON "public"."app_feature_flags" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "p_permissions_read" ON "public"."app_permissions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "p_role_permissions_admin_read" ON "public"."app_role_permissions" FOR SELECT TO "authenticated" USING ("public"."sc_can"('admin.role_permissions.manage'::"text"));



CREATE POLICY "p_role_permissions_admin_write" ON "public"."app_role_permissions" TO "authenticated" USING ("public"."sc_can"('admin.role_permissions.manage'::"text")) WITH CHECK ("public"."sc_can"('admin.role_permissions.manage'::"text"));



CREATE POLICY "p_roles_read" ON "public"."app_roles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "p_settings_read" ON "public"."app_settings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "p_vehicle_types_select" ON "public"."app_vehicle_types" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "p_vehicle_visits_select" ON "public"."app_vehicle_visits" FOR SELECT TO "authenticated" USING ("public"."sc_can"('vehicle.visit.read'::"text", "yard_id"));



CREATE POLICY "p_yards_read" ON "public"."app_yards" FOR SELECT TO "authenticated" USING (true);





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































REVOKE ALL ON FUNCTION "public"."sc_ack_container_number_discrepancy"("p_change_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sc_ack_container_number_discrepancy"("p_change_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sc_ack_container_number_discrepancy"("p_change_id" bigint) TO "service_role";



REVOKE ALL ON FUNCTION "public"."sc_approve_request"("p_request_id" "uuid", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sc_approve_request"("p_request_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."sc_approve_request"("p_request_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sc_approve_request"("p_request_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."sc_audit_immutable"() TO "anon";
GRANT ALL ON FUNCTION "public"."sc_audit_immutable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sc_audit_immutable"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."sc_can"("p_permission_code" "text", "p_row_yard_id" "uuid", "p_row_department_code" "text", "p_row_owner_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sc_can"("p_permission_code" "text", "p_row_yard_id" "uuid", "p_row_department_code" "text", "p_row_owner_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."sc_can"("p_permission_code" "text", "p_row_yard_id" "uuid", "p_row_department_code" "text", "p_row_owner_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sc_can"("p_permission_code" "text", "p_row_yard_id" "uuid", "p_row_department_code" "text", "p_row_owner_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."sc_correct_container_number"("p_container_visit_id" "uuid", "p_new_container_no" "text", "p_reason" "text", "p_evidence_url" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sc_correct_container_number"("p_container_visit_id" "uuid", "p_new_container_no" "text", "p_reason" "text", "p_evidence_url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sc_correct_container_number"("p_container_visit_id" "uuid", "p_new_container_no" "text", "p_reason" "text", "p_evidence_url" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."sc_create_approval_request"("p_policy_code" "text", "p_target_type" "text", "p_target_id" "uuid", "p_yard_id" "uuid", "p_department_code" "text", "p_reason" "text", "p_before_snapshot" "jsonb", "p_proposed_changes" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sc_create_approval_request"("p_policy_code" "text", "p_target_type" "text", "p_target_id" "uuid", "p_yard_id" "uuid", "p_department_code" "text", "p_reason" "text", "p_before_snapshot" "jsonb", "p_proposed_changes" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."sc_create_approval_request"("p_policy_code" "text", "p_target_type" "text", "p_target_id" "uuid", "p_yard_id" "uuid", "p_department_code" "text", "p_reason" "text", "p_before_snapshot" "jsonb", "p_proposed_changes" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sc_create_approval_request"("p_policy_code" "text", "p_target_type" "text", "p_target_id" "uuid", "p_yard_id" "uuid", "p_department_code" "text", "p_reason" "text", "p_before_snapshot" "jsonb", "p_proposed_changes" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."sc_create_container_visit"("p_yard_id" "uuid", "p_container_no" "text", "p_inbound_vehicle_visit_id" "uuid", "p_container_size" "text", "p_container_type" "text", "p_idempotency_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sc_create_container_visit"("p_yard_id" "uuid", "p_container_no" "text", "p_inbound_vehicle_visit_id" "uuid", "p_container_size" "text", "p_container_type" "text", "p_idempotency_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sc_create_container_visit"("p_yard_id" "uuid", "p_container_no" "text", "p_inbound_vehicle_visit_id" "uuid", "p_container_size" "text", "p_container_type" "text", "p_idempotency_key" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."sc_create_vehicle_visit"("p_yard_id" "uuid", "p_vehicle_type" "text", "p_license_plate" "text", "p_driver_name" "text", "p_driver_phone" "text", "p_ticket_code" "text", "p_note" "text", "p_idempotency_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sc_create_vehicle_visit"("p_yard_id" "uuid", "p_vehicle_type" "text", "p_license_plate" "text", "p_driver_name" "text", "p_driver_phone" "text", "p_ticket_code" "text", "p_note" "text", "p_idempotency_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sc_create_vehicle_visit"("p_yard_id" "uuid", "p_vehicle_type" "text", "p_license_plate" "text", "p_driver_name" "text", "p_driver_phone" "text", "p_ticket_code" "text", "p_note" "text", "p_idempotency_key" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."sc_log_audit_event"("p_action_code" "text", "p_target_type" "text", "p_target_id" "text", "p_yard_id" "uuid", "p_department_code" "text", "p_before_data" "jsonb", "p_after_data" "jsonb", "p_reason" "text", "p_request_id" "text", "p_device_info" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sc_log_audit_event"("p_action_code" "text", "p_target_type" "text", "p_target_id" "text", "p_yard_id" "uuid", "p_department_code" "text", "p_before_data" "jsonb", "p_after_data" "jsonb", "p_reason" "text", "p_request_id" "text", "p_device_info" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."sc_log_audit_event"("p_action_code" "text", "p_target_type" "text", "p_target_id" "text", "p_yard_id" "uuid", "p_department_code" "text", "p_before_data" "jsonb", "p_after_data" "jsonb", "p_reason" "text", "p_request_id" "text", "p_device_info" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."sc_manage_vehicle_type"("p_code" "text", "p_display_name" "text", "p_description" "text", "p_allows_container" boolean, "p_default_ticket_amount" numeric, "p_is_active" boolean, "p_sort_order" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sc_manage_vehicle_type"("p_code" "text", "p_display_name" "text", "p_description" "text", "p_allows_container" boolean, "p_default_ticket_amount" numeric, "p_is_active" boolean, "p_sort_order" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sc_manage_vehicle_type"("p_code" "text", "p_display_name" "text", "p_description" "text", "p_allows_container" boolean, "p_default_ticket_amount" numeric, "p_is_active" boolean, "p_sort_order" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."sc_my_permissions"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sc_my_permissions"() TO "anon";
GRANT ALL ON FUNCTION "public"."sc_my_permissions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sc_my_permissions"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."sc_reconcile_container_number_discrepancy"("p_change_id" bigint, "p_reconcile_notes" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sc_reconcile_container_number_discrepancy"("p_change_id" bigint, "p_reconcile_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sc_reconcile_container_number_discrepancy"("p_change_id" bigint, "p_reconcile_notes" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."sc_reject_request"("p_request_id" "uuid", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sc_reject_request"("p_request_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."sc_reject_request"("p_request_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sc_reject_request"("p_request_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."sc_trg_audit_role_perms"() TO "anon";
GRANT ALL ON FUNCTION "public"."sc_trg_audit_role_perms"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sc_trg_audit_role_perms"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sc_trg_audit_user_roles"() TO "anon";
GRANT ALL ON FUNCTION "public"."sc_trg_audit_user_roles"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sc_trg_audit_user_roles"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sc_trg_container_number_changes_immutable"() TO "anon";
GRANT ALL ON FUNCTION "public"."sc_trg_container_number_changes_immutable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sc_trg_container_number_changes_immutable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sc_trg_touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."sc_trg_touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sc_trg_touch_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."sc_update_container_cargo"("p_container_visit_id" "uuid", "p_cargo_status" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sc_update_container_cargo"("p_container_visit_id" "uuid", "p_cargo_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sc_update_container_cargo"("p_container_visit_id" "uuid", "p_cargo_status" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."sc_update_vehicle_visit_basic"("p_vehicle_visit_id" "uuid", "p_license_plate" "text", "p_driver_name" "text", "p_driver_phone" "text", "p_note" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sc_update_vehicle_visit_basic"("p_vehicle_visit_id" "uuid", "p_license_plate" "text", "p_driver_name" "text", "p_driver_phone" "text", "p_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sc_update_vehicle_visit_basic"("p_vehicle_visit_id" "uuid", "p_license_plate" "text", "p_driver_name" "text", "p_driver_phone" "text", "p_note" "text") TO "service_role";


















GRANT ALL ON TABLE "public"."app_approval_policies" TO "anon";
GRANT ALL ON TABLE "public"."app_approval_policies" TO "authenticated";
GRANT ALL ON TABLE "public"."app_approval_policies" TO "service_role";



GRANT SELECT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."app_approval_requests" TO "anon";
GRANT SELECT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."app_approval_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."app_approval_requests" TO "service_role";



GRANT ALL ON TABLE "public"."app_audit_events" TO "anon";
GRANT ALL ON TABLE "public"."app_audit_events" TO "authenticated";
GRANT ALL ON TABLE "public"."app_audit_events" TO "service_role";



GRANT ALL ON SEQUENCE "public"."app_audit_events_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."app_audit_events_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."app_audit_events_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."app_container_number_changes" TO "service_role";
GRANT SELECT ON TABLE "public"."app_container_number_changes" TO "authenticated";



GRANT ALL ON SEQUENCE "public"."app_container_number_changes_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."app_container_number_changes_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."app_container_number_changes_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."app_container_visits" TO "service_role";
GRANT SELECT ON TABLE "public"."app_container_visits" TO "authenticated";



GRANT ALL ON TABLE "public"."app_departments" TO "anon";
GRANT ALL ON TABLE "public"."app_departments" TO "authenticated";
GRANT ALL ON TABLE "public"."app_departments" TO "service_role";



GRANT ALL ON TABLE "public"."app_feature_flags" TO "anon";
GRANT ALL ON TABLE "public"."app_feature_flags" TO "authenticated";
GRANT ALL ON TABLE "public"."app_feature_flags" TO "service_role";



GRANT ALL ON TABLE "public"."app_permissions" TO "anon";
GRANT ALL ON TABLE "public"."app_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."app_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."app_role_permissions" TO "anon";
GRANT ALL ON TABLE "public"."app_role_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."app_role_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."app_roles" TO "anon";
GRANT ALL ON TABLE "public"."app_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."app_roles" TO "service_role";



GRANT ALL ON TABLE "public"."app_settings" TO "anon";
GRANT ALL ON TABLE "public"."app_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."app_settings" TO "service_role";



GRANT ALL ON TABLE "public"."app_user_role_assignments" TO "anon";
GRANT ALL ON TABLE "public"."app_user_role_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."app_user_role_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."app_vehicle_types" TO "service_role";
GRANT SELECT ON TABLE "public"."app_vehicle_types" TO "authenticated";



GRANT ALL ON TABLE "public"."app_vehicle_visits" TO "service_role";
GRANT SELECT ON TABLE "public"."app_vehicle_visits" TO "authenticated";



GRANT ALL ON TABLE "public"."app_yards" TO "anon";
GRANT ALL ON TABLE "public"."app_yards" TO "authenticated";
GRANT ALL ON TABLE "public"."app_yards" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































