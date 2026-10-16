-- ==============================================================================
-- Migration 029: Cập nhật hàm tính cước điện Container: Thời lượng thực tế (phút) & Làm tròn tiền cước đến 5.000đ
-- Sơn Cảng YMS — Quyết định chốt từ Chủ dự án ngày 16/10/2026:
-- "K CÒN LÀM TRÒN 15P B CHỈ LÀM CHỌN SAU CHO ĐẾN 5K THÔI"
-- 1. Bỏ làm tròn 15 phút (v_billable_minutes tính theo phút thực tế: CEIL(seconds / 60.0)).
-- 2. Làm tròn cước đến bội số 5.000đ, tối thiểu 5.000đ khi cắm điện thực tế (> 0s).
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.sc_calculate_reefer_fee(
  p_duration_seconds integer,
  p_hourly_rate numeric(12, 2) DEFAULT 35000
) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_billable_minutes integer;
  v_raw_amount numeric(12, 4);
  v_amount numeric(12, 2);
BEGIN
  -- Nếu thời lượng <= 0 (ca 0 giây hoặc lỗi nhập giờ): giữ cờ cần xử lý
  IF p_duration_seconds IS NULL OR p_duration_seconds <= 0 THEN
    RETURN jsonb_build_object(
      'is_valid', false,
      'duration_seconds', coalesce(p_duration_seconds, 0),
      'billable_minutes', 0,
      'amount', 0,
      'notes', 'Thời lượng không hợp lệ hoặc 0 giây; cần xác minh thực tế'
    );
  END IF;

  -- 1. Thời lượng tính cước: Số phút thực tế (làm tròn lên phút: CEIL(seconds / 60.0))
  v_billable_minutes := ceil(p_duration_seconds::numeric / 60.0)::integer;

  -- 2. Cước thô theo giờ
  v_raw_amount := (v_billable_minutes::numeric / 60.0) * p_hourly_rate;

  -- 3. Làm tròn đến bội số 5.000đ: ROUND(raw / 5000.0) * 5000, tối thiểu 5.000đ cho phiên có cắm điện
  v_amount := round(v_raw_amount / 5000.0) * 5000;
  IF v_amount < 5000 THEN
    v_amount := 5000;
  END IF;

  RETURN jsonb_build_object(
    'is_valid', true,
    'duration_seconds', p_duration_seconds,
    'billable_minutes', v_billable_minutes,
    'amount', v_amount,
    'notes', NULL
  );
END;
$$;
