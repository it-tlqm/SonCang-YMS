export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      app_departments: {
        Row: {
          code: string;
          display_name: string;
          is_active: boolean;
        };
        Insert: {
          code: string;
          display_name: string;
          is_active?: boolean;
        };
        Update: {
          code?: string;
          display_name?: string;
          is_active?: boolean;
        };
      };
      app_yards: {
        Row: {
          id: string;
          name: string;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          name: string;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          name?: string;
          is_active?: boolean;
        };
      };
      app_roles: {
        Row: {
          code: string;
          display_name: string;
          department_code: string | null;
          seniority: string;
          is_active: boolean;
          release_phase: string;
          description: string;
        };
        Insert: {
          code: string;
          display_name: string;
          department_code?: string | null;
          seniority: string;
          is_active?: boolean;
          release_phase?: string;
          description?: string;
        };
        Update: {
          code?: string;
          display_name?: string;
          department_code?: string | null;
          seniority?: string;
          is_active?: boolean;
          release_phase?: string;
          description?: string;
        };
      };
      app_permissions: {
        Row: {
          code: string;
          module: string;
          display_name: string;
          source_questions: string;
          release_phase: string;
          feature_key: string;
          risk_level: string;
          description: string;
          is_active: boolean;
        };
        Insert: {
          code: string;
          module: string;
          display_name: string;
          source_questions?: string;
          release_phase?: string;
          feature_key?: string;
          risk_level?: string;
          description?: string;
          is_active?: boolean;
        };
        Update: {
          code?: string;
          module?: string;
          display_name?: string;
          source_questions?: string;
          release_phase?: string;
          feature_key?: string;
          risk_level?: string;
          description?: string;
          is_active?: boolean;
        };
      };
      app_role_permissions: {
        Row: {
          role_code: string;
          permission_code: string;
          scope: 'SELF' | 'DEPARTMENT' | 'YARD' | 'ALL';
          is_enabled: boolean;
        };
        Insert: {
          role_code: string;
          permission_code: string;
          scope: 'SELF' | 'DEPARTMENT' | 'YARD' | 'ALL';
          is_enabled?: boolean;
        };
        Update: {
          role_code?: string;
          permission_code?: string;
          scope?: 'SELF' | 'DEPARTMENT' | 'YARD' | 'ALL';
          is_enabled?: boolean;
        };
      };
      app_user_role_assignments: {
        Row: {
          id: string;
          user_id: string;
          role_code: string;
          yard_id: string | null;
          department_code: string | null;
          valid_from: string;
          valid_until: string | null;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role_code: string;
          yard_id?: string | null;
          department_code?: string | null;
          valid_from?: string;
          valid_until?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role_code?: string;
          yard_id?: string | null;
          department_code?: string | null;
          valid_from?: string;
          valid_until?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
      };
      app_approval_policies: {
        Row: {
          policy_code: string;
          label: string;
          request_permission_code: string | null;
          approve_permission_code: string | null;
          enforce_distinct_actor: boolean;
          reason_required: boolean;
          is_enabled: boolean;
          notes: string;
        };
        Insert: {
          policy_code: string;
          label: string;
          request_permission_code?: string | null;
          approve_permission_code?: string | null;
          enforce_distinct_actor?: boolean;
          reason_required?: boolean;
          is_enabled?: boolean;
          notes?: string;
        };
        Update: {
          policy_code?: string;
          label?: string;
          request_permission_code?: string | null;
          approve_permission_code?: string | null;
          enforce_distinct_actor?: boolean;
          reason_required?: boolean;
          is_enabled?: boolean;
          notes?: string;
        };
      };
      app_approval_requests: {
        Row: {
          id: string;
          policy_code: string;
          target_type: string;
          target_id: string;
          yard_id: string | null;
          department_code: string | null;
          requested_by: string;
          approved_by: string | null;
          reason: string;
          before_snapshot: Json | null;
          proposed_changes: Json | null;
          status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
          created_at: string;
          decision_at: string | null;
        };
        Insert: {
          id?: string;
          policy_code: string;
          target_type: string;
          target_id: string;
          yard_id?: string | null;
          department_code?: string | null;
          requested_by: string;
          approved_by?: string | null;
          reason: string;
          before_snapshot?: Json | null;
          proposed_changes?: Json | null;
          status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
          created_at?: string;
          decision_at?: string | null;
        };
        Update: {
          id?: string;
          policy_code?: string;
          target_type?: string;
          target_id?: string;
          yard_id?: string | null;
          department_code?: string | null;
          requested_by?: string;
          approved_by?: string | null;
          reason?: string;
          before_snapshot?: Json | null;
          proposed_changes?: Json | null;
          status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
          created_at?: string;
          decision_at?: string | null;
        };
      };
      app_feature_flags: {
        Row: {
          feature_key: string;
          display_name: string;
          is_enabled: boolean;
        };
        Insert: {
          feature_key: string;
          display_name: string;
          is_enabled?: boolean;
        };
        Update: {
          feature_key?: string;
          display_name?: string;
          is_enabled?: boolean;
        };
      };
      app_settings: {
        Row: {
          setting_key: string;
          setting_value: Json;
          setting_type: string;
          decision_status: string;
          notes: string;
          updated_at: string;
        };
        Insert: {
          setting_key: string;
          setting_value: Json;
          setting_type: string;
          decision_status: string;
          notes?: string;
          updated_at?: string;
        };
        Update: {
          setting_key?: string;
          setting_value?: Json;
          setting_type?: string;
          decision_status?: string;
          notes?: string;
          updated_at?: string;
        };
      };
      app_audit_events: {
        Row: {
          id: number;
          event_at: string;
          actor_user_id: string | null;
          action_code: string;
          target_type: string;
          target_id: string | null;
          yard_id: string | null;
          department_code: string | null;
          before_data: Json | null;
          after_data: Json | null;
          reason: string | null;
          request_id: string | null;
          device_info: Json | null;
        };
        Insert: {
          id?: never;
          event_at?: string;
          actor_user_id?: string | null;
          action_code: string;
          target_type: string;
          target_id?: string | null;
          yard_id?: string | null;
          department_code?: string | null;
          before_data?: Json | null;
          after_data?: Json | null;
          reason?: string | null;
          request_id?: string | null;
          device_info?: Json | null;
        };
        Update: {
          id?: never;
          event_at?: string;
          actor_user_id?: string | null;
          action_code?: string;
          target_type?: string;
          target_id?: string | null;
          yard_id?: string | null;
          department_code?: string | null;
          before_data?: Json | null;
          after_data?: Json | null;
          reason?: string | null;
          request_id?: string | null;
          device_info?: Json | null;
        };
      };
      app_vehicle_types: {
        Row: {
          code: string;
          display_name: string;
          description: string | null;
          allows_container: boolean;
          default_ticket_amount: number | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          code: string;
          display_name: string;
          description?: string | null;
          allows_container?: boolean;
          default_ticket_amount?: number | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          code?: string;
          display_name?: string;
          description?: string | null;
          allows_container?: boolean;
          default_ticket_amount?: number | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      app_vehicle_visits: {
        Row: {
          id: string;
          yard_id: string;
          license_plate: string | null;
          vehicle_type: string;
          driver_name: string | null;
          driver_phone: string | null;
          entry_at: string;
          entry_by: string;
          exit_at: string | null;
          exit_by: string | null;
          status: 'IN_YARD' | 'EXITED' | 'CANCELLED';
          ticket_code: string | null;
          ticket_amount: number;
          ticket_payment_status: 'UNPAID' | 'PAID' | 'EXEMPT' | 'CANCELLED';
          note: string | null;
          idempotency_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          yard_id: string;
          license_plate?: string | null;
          vehicle_type: string;
          driver_name?: string | null;
          driver_phone?: string | null;
          entry_at?: string;
          entry_by: string;
          exit_at?: string | null;
          exit_by?: string | null;
          status?: 'IN_YARD' | 'EXITED' | 'CANCELLED';
          ticket_code?: string | null;
          ticket_amount?: number;
          ticket_payment_status?: 'UNPAID' | 'PAID' | 'EXEMPT' | 'CANCELLED';
          note?: string | null;
          idempotency_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          yard_id?: string;
          license_plate?: string | null;
          vehicle_type?: string;
          driver_name?: string | null;
          driver_phone?: string | null;
          entry_at?: string;
          entry_by?: string;
          exit_at?: string | null;
          exit_by?: string | null;
          status?: 'IN_YARD' | 'EXITED' | 'CANCELLED';
          ticket_code?: string | null;
          ticket_amount?: number;
          ticket_payment_status?: 'UNPAID' | 'PAID' | 'EXEMPT' | 'CANCELLED';
          note?: string | null;
          idempotency_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      app_container_visits: {
        Row: {
          id: string;
          yard_id: string;
          container_no_current: string;
          container_no_original: string;
          container_size: string | null;
          container_type: string | null;
          inbound_vehicle_visit_id: string | null;
          inbound_at: string;
          outbound_vehicle_visit_id: string | null;
          outbound_at: string | null;
          status: 'IN_YARD' | 'EXITED' | 'CANCELLED';
          cargo_status: 'HANG' | 'RONG' | 'CHUA_XAC_DINH';
          cargo_status_updated_at: string | null;
          cargo_status_updated_by: string | null;
          is_legacy_import: boolean;
          legacy_import_notes: string | null;
          idempotency_key: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          yard_id: string;
          container_no_current: string;
          container_no_original: string;
          container_size?: string | null;
          container_type?: string | null;
          inbound_vehicle_visit_id?: string | null;
          inbound_at?: string;
          outbound_vehicle_visit_id?: string | null;
          outbound_at?: string | null;
          status?: 'IN_YARD' | 'EXITED' | 'CANCELLED';
          cargo_status?: 'HANG' | 'RONG' | 'CHUA_XAC_DINH';
          cargo_status_updated_at?: string | null;
          cargo_status_updated_by?: string | null;
          is_legacy_import?: boolean;
          legacy_import_notes?: string | null;
          idempotency_key?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          yard_id?: string;
          container_no_current?: string;
          container_no_original?: string;
          container_size?: string | null;
          container_type?: string | null;
          inbound_vehicle_visit_id?: string | null;
          inbound_at?: string;
          outbound_vehicle_visit_id?: string | null;
          outbound_at?: string | null;
          status?: 'IN_YARD' | 'EXITED' | 'CANCELLED';
          cargo_status?: 'HANG' | 'RONG' | 'CHUA_XAC_DINH';
          cargo_status_updated_at?: string | null;
          cargo_status_updated_by?: string | null;
          is_legacy_import?: boolean;
          legacy_import_notes?: string | null;
          idempotency_key?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      app_container_number_changes: {
        Row: {
          id: number;
          container_visit_id: string;
          yard_id: string;
          old_number: string;
          new_number: string;
          reason: string;
          evidence_url: string | null;
          changed_by: string;
          changed_at: string;
          notified_cckb: boolean;
          sec_ack_at: string | null;
          sec_ack_by: string | null;
          reconciled_at: string | null;
          reconciled_by: string | null;
          reconcile_notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: never;
          container_visit_id: string;
          yard_id: string;
          old_number: string;
          new_number: string;
          reason: string;
          evidence_url?: string | null;
          changed_by: string;
          changed_at?: string;
          notified_cckb?: boolean;
          sec_ack_at?: string | null;
          sec_ack_by?: string | null;
          reconciled_at?: string | null;
          reconciled_by?: string | null;
          reconcile_notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: never;
          container_visit_id?: string;
          yard_id?: string;
          old_number?: string;
          new_number?: string;
          reason?: string;
          evidence_url?: string | null;
          changed_by?: string;
          changed_at?: string;
          notified_cckb?: boolean;
          sec_ack_at?: string | null;
          sec_ack_by?: string | null;
          reconciled_at?: string | null;
          reconciled_by?: string | null;
          reconcile_notes?: string | null;
          created_at?: string;
        };
      };
    };
    Functions: {
      sc_can: {
        Args: {
          p_permission_code: string;
          p_row_yard_id?: string | null;
          p_row_department_code?: string | null;
          p_row_owner_id?: string | null;
        };
        Returns: boolean;
      };
      sc_my_permissions: {
        Args: Record<PropertyKey, never>;
        Returns: {
          permission_code: string;
          scope: 'SELF' | 'DEPARTMENT' | 'YARD' | 'ALL';
          yard_id: string | null;
          department_code: string | null;
        }[];
      };
      sc_create_approval_request: {
        Args: {
          p_policy_code: string;
          p_target_type: string;
          p_target_id: string;
          p_yard_id?: string | null;
          p_department_code?: string | null;
          p_reason?: string;
          p_before_snapshot?: Json | null;
          p_proposed_changes?: Json | null;
        };
        Returns: string;
      };
      sc_approve_request: {
        Args: {
          p_request_id: string;
          p_reason?: string | null;
        };
        Returns: boolean;
      };
      sc_reject_request: {
        Args: {
          p_request_id: string;
          p_reason: string;
        };
        Returns: boolean;
      };
      sc_manage_vehicle_type: {
        Args: {
          p_code: string;
          p_display_name?: string | null;
          p_description?: string | null;
          p_allows_container?: boolean | null;
          p_default_ticket_amount?: number | null;
          p_is_active?: boolean | null;
          p_sort_order?: number | null;
        };
        Returns: void;
      };
      sc_create_vehicle_visit: {
        Args: {
          p_yard_id: string;
          p_vehicle_type: string;
          p_license_plate?: string | null;
          p_driver_name?: string | null;
          p_driver_phone?: string | null;
          p_ticket_code?: string | null;
          p_note?: string | null;
          p_idempotency_key?: string | null;
        };
        Returns: string;
      };
      sc_update_vehicle_visit_basic: {
        Args: {
          p_vehicle_visit_id: string;
          p_license_plate: string;
          p_driver_name: string;
          p_driver_phone: string;
          p_note: string;
        };
        Returns: void;
      };
      sc_create_container_visit: {
        Args: {
          p_yard_id: string;
          p_container_no: string;
          p_inbound_vehicle_visit_id: string;
          p_container_size?: string | null;
          p_container_type?: string;
          p_idempotency_key?: string | null;
        };
        Returns: string;
      };
      sc_correct_container_number: {
        Args: {
          p_container_visit_id: string;
          p_new_container_no: string;
          p_reason: string;
          p_evidence_url?: string | null;
        };
        Returns: number;
      };
      sc_update_container_cargo: {
        Args: {
          p_container_visit_id: string;
          p_cargo_status: 'HANG' | 'RONG';
        };
        Returns: void;
      };
      sc_ack_container_number_discrepancy: {
        Args: {
          p_change_id: number;
        };
        Returns: void;
      };
      sc_reconcile_container_number_discrepancy: {
        Args: {
          p_change_id: number;
          p_reconcile_notes: string;
        };
        Returns: void;
      };
    };
  };
}
