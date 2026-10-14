export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      app_approval_policies: {
        Row: {
          approve_permission_code: string | null
          enforce_distinct_actor: boolean
          is_enabled: boolean
          label: string
          notes: string
          policy_code: string
          reason_required: boolean
          request_permission_code: string | null
        }
        Insert: {
          approve_permission_code?: string | null
          enforce_distinct_actor?: boolean
          is_enabled?: boolean
          label: string
          notes?: string
          policy_code: string
          reason_required?: boolean
          request_permission_code?: string | null
        }
        Update: {
          approve_permission_code?: string | null
          enforce_distinct_actor?: boolean
          is_enabled?: boolean
          label?: string
          notes?: string
          policy_code?: string
          reason_required?: boolean
          request_permission_code?: string | null
        }
        Relationships: []
      }
      app_approval_requests: {
        Row: {
          approved_by: string | null
          before_snapshot: Json | null
          created_at: string
          decision_at: string | null
          department_code: string | null
          id: string
          policy_code: string
          proposed_changes: Json | null
          reason: string
          requested_by: string
          status: string
          target_id: string
          target_type: string
          yard_id: string | null
        }
        Insert: {
          approved_by?: string | null
          before_snapshot?: Json | null
          created_at?: string
          decision_at?: string | null
          department_code?: string | null
          id?: string
          policy_code: string
          proposed_changes?: Json | null
          reason: string
          requested_by: string
          status?: string
          target_id: string
          target_type: string
          yard_id?: string | null
        }
        Update: {
          approved_by?: string | null
          before_snapshot?: Json | null
          created_at?: string
          decision_at?: string | null
          department_code?: string | null
          id?: string
          policy_code?: string
          proposed_changes?: Json | null
          reason?: string
          requested_by?: string
          status?: string
          target_id?: string
          target_type?: string
          yard_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_approval_requests_department_code_fkey"
            columns: ["department_code"]
            isOneToOne: false
            referencedRelation: "app_departments"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "app_approval_requests_policy_code_fkey"
            columns: ["policy_code"]
            isOneToOne: false
            referencedRelation: "app_approval_policies"
            referencedColumns: ["policy_code"]
          },
          {
            foreignKeyName: "app_approval_requests_yard_id_fkey"
            columns: ["yard_id"]
            isOneToOne: false
            referencedRelation: "app_yards"
            referencedColumns: ["id"]
          },
        ]
      }
      app_audit_events: {
        Row: {
          action_code: string
          actor_user_id: string | null
          after_data: Json | null
          before_data: Json | null
          department_code: string | null
          device_info: Json | null
          event_at: string
          id: number
          reason: string | null
          request_id: string | null
          target_id: string | null
          target_type: string
          yard_id: string | null
        }
        Insert: {
          action_code: string
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          department_code?: string | null
          device_info?: Json | null
          event_at?: string
          id?: never
          reason?: string | null
          request_id?: string | null
          target_id?: string | null
          target_type: string
          yard_id?: string | null
        }
        Update: {
          action_code?: string
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          department_code?: string | null
          device_info?: Json | null
          event_at?: string
          id?: never
          reason?: string | null
          request_id?: string | null
          target_id?: string | null
          target_type?: string
          yard_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_audit_events_department_code_fkey"
            columns: ["department_code"]
            isOneToOne: false
            referencedRelation: "app_departments"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "app_audit_events_yard_id_fkey"
            columns: ["yard_id"]
            isOneToOne: false
            referencedRelation: "app_yards"
            referencedColumns: ["id"]
          },
        ]
      }
      app_cash_settlement_items: {
        Row: {
          created_at: string
          id: string
          payment_id: string
          payment_method: string
          settled_amount: number
          settlement_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payment_id: string
          payment_method?: string
          settled_amount?: number
          settlement_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payment_id?: string
          payment_method?: string
          settled_amount?: number
          settlement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_cash_settlement_items_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "app_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_cash_settlement_items_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "app_cash_settlements"
            referencedColumns: ["id"]
          },
        ]
      }
      app_cash_settlements: {
        Row: {
          collector_id: string | null
          collector_name: string
          created_at: string
          difference_amount: number
          difference_reason: string | null
          handover_dept: string
          handover_person_name: string
          id: string
          notes: string | null
          period_from: string
          period_to: string
          settlement_code: string
          status: string
          total_cash_counted: number
          total_cash_expected: number
          total_transfer_amount: number
          updated_at: string
          yard_id: string | null
        }
        Insert: {
          collector_id?: string | null
          collector_name: string
          created_at?: string
          difference_amount?: number
          difference_reason?: string | null
          handover_dept: string
          handover_person_name: string
          id?: string
          notes?: string | null
          period_from: string
          period_to: string
          settlement_code: string
          status?: string
          total_cash_counted?: number
          total_cash_expected?: number
          total_transfer_amount?: number
          updated_at?: string
          yard_id?: string | null
        }
        Update: {
          collector_id?: string | null
          collector_name?: string
          created_at?: string
          difference_amount?: number
          difference_reason?: string | null
          handover_dept?: string
          handover_person_name?: string
          id?: string
          notes?: string | null
          period_from?: string
          period_to?: string
          settlement_code?: string
          status?: string
          total_cash_counted?: number
          total_cash_expected?: number
          total_transfer_amount?: number
          updated_at?: string
          yard_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_cash_settlements_yard_id_fkey"
            columns: ["yard_id"]
            isOneToOne: false
            referencedRelation: "app_yards"
            referencedColumns: ["id"]
          },
        ]
      }
      app_charges: {
        Row: {
          amount: number
          charge_type: string
          container_visit_id: string | null
          created_at: string
          id: string
          invoice_id: string | null
          invoice_status: string
          notes: string | null
          paid_amount: number
          reefer_session_id: string | null
          status: string
          tariff_id: string | null
          updated_at: string
          vehicle_visit_id: string | null
          yard_id: string
        }
        Insert: {
          amount: number
          charge_type: string
          container_visit_id?: string | null
          created_at?: string
          id?: string
          invoice_id?: string | null
          invoice_status?: string
          notes?: string | null
          paid_amount?: number
          reefer_session_id?: string | null
          status?: string
          tariff_id?: string | null
          updated_at?: string
          vehicle_visit_id?: string | null
          yard_id: string
        }
        Update: {
          amount?: number
          charge_type?: string
          container_visit_id?: string | null
          created_at?: string
          id?: string
          invoice_id?: string | null
          invoice_status?: string
          notes?: string | null
          paid_amount?: number
          reefer_session_id?: string | null
          status?: string
          tariff_id?: string | null
          updated_at?: string
          vehicle_visit_id?: string | null
          yard_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_charges_container_visit_id_fkey"
            columns: ["container_visit_id"]
            isOneToOne: false
            referencedRelation: "app_container_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_charges_reefer_session_id_fkey"
            columns: ["reefer_session_id"]
            isOneToOne: false
            referencedRelation: "app_reefer_power_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_charges_tariff_id_fkey"
            columns: ["tariff_id"]
            isOneToOne: false
            referencedRelation: "app_tariffs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_charges_vehicle_visit_id_fkey"
            columns: ["vehicle_visit_id"]
            isOneToOne: false
            referencedRelation: "app_vehicle_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_charges_yard_id_fkey"
            columns: ["yard_id"]
            isOneToOne: false
            referencedRelation: "app_yards"
            referencedColumns: ["id"]
          },
        ]
      }
      app_container_number_changes: {
        Row: {
          changed_at: string
          changed_by: string
          container_visit_id: string
          created_at: string
          evidence_url: string | null
          id: number
          new_number: string
          notified_cckb: boolean
          old_number: string
          reason: string
          reconcile_notes: string | null
          reconciled_at: string | null
          reconciled_by: string | null
          sec_ack_at: string | null
          sec_ack_by: string | null
          yard_id: string
        }
        Insert: {
          changed_at?: string
          changed_by: string
          container_visit_id: string
          created_at?: string
          evidence_url?: string | null
          id?: never
          new_number: string
          notified_cckb?: boolean
          old_number: string
          reason: string
          reconcile_notes?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          sec_ack_at?: string | null
          sec_ack_by?: string | null
          yard_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          container_visit_id?: string
          created_at?: string
          evidence_url?: string | null
          id?: never
          new_number?: string
          notified_cckb?: boolean
          old_number?: string
          reason?: string
          reconcile_notes?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          sec_ack_at?: string | null
          sec_ack_by?: string | null
          yard_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_container_number_changes_container_visit_id_fkey"
            columns: ["container_visit_id"]
            isOneToOne: false
            referencedRelation: "app_container_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_container_number_changes_yard_id_fkey"
            columns: ["yard_id"]
            isOneToOne: false
            referencedRelation: "app_yards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_change_container_yard"
            columns: ["container_visit_id", "yard_id"]
            isOneToOne: false
            referencedRelation: "app_container_visits"
            referencedColumns: ["id", "yard_id"]
          },
        ]
      }
      app_container_visits: {
        Row: {
          cargo_status: string
          cargo_status_updated_at: string | null
          cargo_status_updated_by: string | null
          clearance_notes: string | null
          clearance_status: string
          cleared_at: string | null
          cleared_by: string | null
          container_no_current: string
          container_no_original: string
          container_size: string | null
          container_type: string | null
          created_at: string
          created_by: string
          id: string
          idempotency_key: string | null
          inbound_at: string
          inbound_vehicle_visit_id: string | null
          is_legacy_import: boolean
          legacy_import_notes: string | null
          outbound_at: string | null
          outbound_vehicle_visit_id: string | null
          plug_socket_code: string | null
          status: string
          storage_fee_amount: number
          storage_fee_payment_status: string
          storage_nights_charged: number
          updated_at: string
          yard_id: string
        }
        Insert: {
          cargo_status?: string
          cargo_status_updated_at?: string | null
          cargo_status_updated_by?: string | null
          clearance_notes?: string | null
          clearance_status?: string
          cleared_at?: string | null
          cleared_by?: string | null
          container_no_current: string
          container_no_original: string
          container_size?: string | null
          container_type?: string | null
          created_at?: string
          created_by: string
          id?: string
          idempotency_key?: string | null
          inbound_at?: string
          inbound_vehicle_visit_id?: string | null
          is_legacy_import?: boolean
          legacy_import_notes?: string | null
          outbound_at?: string | null
          outbound_vehicle_visit_id?: string | null
          plug_socket_code?: string | null
          status?: string
          storage_fee_amount?: number
          storage_fee_payment_status?: string
          storage_nights_charged?: number
          updated_at?: string
          yard_id: string
        }
        Update: {
          cargo_status?: string
          cargo_status_updated_at?: string | null
          cargo_status_updated_by?: string | null
          clearance_notes?: string | null
          clearance_status?: string
          cleared_at?: string | null
          cleared_by?: string | null
          container_no_current?: string
          container_no_original?: string
          container_size?: string | null
          container_type?: string | null
          created_at?: string
          created_by?: string
          id?: string
          idempotency_key?: string | null
          inbound_at?: string
          inbound_vehicle_visit_id?: string | null
          is_legacy_import?: boolean
          legacy_import_notes?: string | null
          outbound_at?: string | null
          outbound_vehicle_visit_id?: string | null
          plug_socket_code?: string | null
          status?: string
          storage_fee_amount?: number
          storage_fee_payment_status?: string
          storage_nights_charged?: number
          updated_at?: string
          yard_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_container_visits_inbound_vehicle_visit_id_fkey"
            columns: ["inbound_vehicle_visit_id"]
            isOneToOne: false
            referencedRelation: "app_vehicle_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_container_visits_outbound_vehicle_visit_id_fkey"
            columns: ["outbound_vehicle_visit_id"]
            isOneToOne: false
            referencedRelation: "app_vehicle_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_container_visits_yard_id_fkey"
            columns: ["yard_id"]
            isOneToOne: false
            referencedRelation: "app_yards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_container_inbound_vehicle_yard"
            columns: ["inbound_vehicle_visit_id", "yard_id"]
            isOneToOne: false
            referencedRelation: "app_vehicle_visits"
            referencedColumns: ["id", "yard_id"]
          },
          {
            foreignKeyName: "fk_container_outbound_vehicle_yard"
            columns: ["outbound_vehicle_visit_id", "yard_id"]
            isOneToOne: false
            referencedRelation: "app_vehicle_visits"
            referencedColumns: ["id", "yard_id"]
          },
        ]
      }
      app_customers: {
        Row: {
          address: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          tax_code: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          tax_code?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          tax_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      app_departments: {
        Row: {
          code: string
          display_name: string
          is_active: boolean
        }
        Insert: {
          code: string
          display_name: string
          is_active?: boolean
        }
        Update: {
          code?: string
          display_name?: string
          is_active?: boolean
        }
        Relationships: []
      }
      app_feature_flags: {
        Row: {
          display_name: string
          feature_key: string
          is_enabled: boolean
        }
        Insert: {
          display_name: string
          feature_key: string
          is_enabled?: boolean
        }
        Update: {
          display_name?: string
          feature_key?: string
          is_enabled?: boolean
        }
        Relationships: []
      }
      app_invoices: {
        Row: {
          buyer_address: string
          buyer_email: string | null
          buyer_name: string
          buyer_phone: string | null
          charge_ids: string[] | null
          created_at: string
          created_by: string
          e_invoice_no: string | null
          id: string
          id_card_no: string | null
          invoice_code: string
          invoice_issued_at: string | null
          invoice_type: string
          notes: string | null
          payment_status: string
          status: string
          subtotal_amount: number
          tax_code: string | null
          total_amount: number
          updated_at: string
          vat_amount: number
          vat_rate: number
          yard_id: string | null
        }
        Insert: {
          buyer_address: string
          buyer_email?: string | null
          buyer_name: string
          buyer_phone?: string | null
          charge_ids?: string[] | null
          created_at?: string
          created_by: string
          e_invoice_no?: string | null
          id?: string
          id_card_no?: string | null
          invoice_code: string
          invoice_issued_at?: string | null
          invoice_type: string
          notes?: string | null
          payment_status?: string
          status?: string
          subtotal_amount?: number
          tax_code?: string | null
          total_amount?: number
          updated_at?: string
          vat_amount?: number
          vat_rate?: number
          yard_id?: string | null
        }
        Update: {
          buyer_address?: string
          buyer_email?: string | null
          buyer_name?: string
          buyer_phone?: string | null
          charge_ids?: string[] | null
          created_at?: string
          created_by?: string
          e_invoice_no?: string | null
          id?: string
          id_card_no?: string | null
          invoice_code?: string
          invoice_issued_at?: string | null
          invoice_type?: string
          notes?: string | null
          payment_status?: string
          status?: string
          subtotal_amount?: number
          tax_code?: string | null
          total_amount?: number
          updated_at?: string
          vat_amount?: number
          vat_rate?: number
          yard_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_invoices_yard_id_fkey"
            columns: ["yard_id"]
            isOneToOne: false
            referencedRelation: "app_yards"
            referencedColumns: ["id"]
          },
        ]
      }
      app_payments: {
        Row: {
          charge_id: string
          collected_at: string
          collected_by: string
          collector_dept: string
          id: string
          idempotency_key: string | null
          notes: string | null
          payment_amount: number
          payment_method: string
          receipt_code: string | null
          yard_id: string
        }
        Insert: {
          charge_id: string
          collected_at?: string
          collected_by: string
          collector_dept: string
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          payment_amount: number
          payment_method?: string
          receipt_code?: string | null
          yard_id: string
        }
        Update: {
          charge_id?: string
          collected_at?: string
          collected_by?: string
          collector_dept?: string
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          payment_amount?: number
          payment_method?: string
          receipt_code?: string | null
          yard_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_payments_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "app_charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_payments_yard_id_fkey"
            columns: ["yard_id"]
            isOneToOne: false
            referencedRelation: "app_yards"
            referencedColumns: ["id"]
          },
        ]
      }
      app_permissions: {
        Row: {
          code: string
          description: string
          display_name: string
          feature_key: string
          is_active: boolean
          module: string
          release_phase: string
          risk_level: string
          source_questions: string
        }
        Insert: {
          code: string
          description?: string
          display_name: string
          feature_key?: string
          is_active?: boolean
          module: string
          release_phase?: string
          risk_level?: string
          source_questions?: string
        }
        Update: {
          code?: string
          description?: string
          display_name?: string
          feature_key?: string
          is_active?: boolean
          module?: string
          release_phase?: string
          risk_level?: string
          source_questions?: string
        }
        Relationships: []
      }
      app_power_sockets: {
        Row: {
          amperage: string
          created_at: string
          id: string
          is_active: boolean
          notes: string | null
          phase: string
          socket_code: string
          socket_name: string
          status: string
          updated_at: string
          voltage: string
          yard_id: string | null
          zone_code: string
        }
        Insert: {
          amperage?: string
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          phase?: string
          socket_code: string
          socket_name: string
          status?: string
          updated_at?: string
          voltage?: string
          yard_id?: string | null
          zone_code?: string
        }
        Update: {
          amperage?: string
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          phase?: string
          socket_code?: string
          socket_name?: string
          status?: string
          updated_at?: string
          voltage?: string
          yard_id?: string | null
          zone_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_power_sockets_yard_id_fkey"
            columns: ["yard_id"]
            isOneToOne: false
            referencedRelation: "app_yards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_power_sockets_zone_code_fkey"
            columns: ["zone_code"]
            isOneToOne: false
            referencedRelation: "app_yard_zones"
            referencedColumns: ["code"]
          },
        ]
      }
      app_reefer_power_sessions: {
        Row: {
          applied_hourly_rate: number
          billable_minutes: number | null
          container_visit_id: string
          created_at: string
          id: string
          notes: string | null
          paid_at: string | null
          paid_by: string | null
          payment_status: string
          plug_socket_code: string | null
          plugged_in_at: string
          plugged_in_by: string
          power_status: string
          raw_duration_seconds: number | null
          total_power_amount: number | null
          unplugged_at: string | null
          unplugged_by: string | null
          updated_at: string
          yard_id: string
        }
        Insert: {
          applied_hourly_rate?: number
          billable_minutes?: number | null
          container_visit_id: string
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_status?: string
          plug_socket_code?: string | null
          plugged_in_at?: string
          plugged_in_by: string
          power_status?: string
          raw_duration_seconds?: number | null
          total_power_amount?: number | null
          unplugged_at?: string | null
          unplugged_by?: string | null
          updated_at?: string
          yard_id: string
        }
        Update: {
          applied_hourly_rate?: number
          billable_minutes?: number | null
          container_visit_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_status?: string
          plug_socket_code?: string | null
          plugged_in_at?: string
          plugged_in_by?: string
          power_status?: string
          raw_duration_seconds?: number | null
          total_power_amount?: number | null
          unplugged_at?: string | null
          unplugged_by?: string | null
          updated_at?: string
          yard_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_reefer_power_sessions_container_visit_id_fkey"
            columns: ["container_visit_id"]
            isOneToOne: false
            referencedRelation: "app_container_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_reefer_power_sessions_yard_id_fkey"
            columns: ["yard_id"]
            isOneToOne: false
            referencedRelation: "app_yards"
            referencedColumns: ["id"]
          },
        ]
      }
      app_reefer_requests: {
        Row: {
          container_no_planned: string
          created_at: string
          created_by: string
          customer_name: string
          customer_phone: string | null
          expected_license_plate: string | null
          id: string
          matched_container_visit_id: string | null
          notes: string | null
          plug_socket_code: string | null
          power_mode: string
          status: string
          temperature_setting: string | null
          updated_at: string
          yard_id: string
        }
        Insert: {
          container_no_planned: string
          created_at?: string
          created_by: string
          customer_name: string
          customer_phone?: string | null
          expected_license_plate?: string | null
          id?: string
          matched_container_visit_id?: string | null
          notes?: string | null
          plug_socket_code?: string | null
          power_mode?: string
          status?: string
          temperature_setting?: string | null
          updated_at?: string
          yard_id: string
        }
        Update: {
          container_no_planned?: string
          created_at?: string
          created_by?: string
          customer_name?: string
          customer_phone?: string | null
          expected_license_plate?: string | null
          id?: string
          matched_container_visit_id?: string | null
          notes?: string | null
          plug_socket_code?: string | null
          power_mode?: string
          status?: string
          temperature_setting?: string | null
          updated_at?: string
          yard_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_reefer_requests_matched_container_visit_id_fkey"
            columns: ["matched_container_visit_id"]
            isOneToOne: false
            referencedRelation: "app_container_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_reefer_requests_yard_id_fkey"
            columns: ["yard_id"]
            isOneToOne: false
            referencedRelation: "app_yards"
            referencedColumns: ["id"]
          },
        ]
      }
      app_role_permissions: {
        Row: {
          is_enabled: boolean
          permission_code: string
          role_code: string
          scope: string
        }
        Insert: {
          is_enabled?: boolean
          permission_code: string
          role_code: string
          scope: string
        }
        Update: {
          is_enabled?: boolean
          permission_code?: string
          role_code?: string
          scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_role_permissions_permission_code_fkey"
            columns: ["permission_code"]
            isOneToOne: false
            referencedRelation: "app_permissions"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "app_role_permissions_role_code_fkey"
            columns: ["role_code"]
            isOneToOne: false
            referencedRelation: "app_roles"
            referencedColumns: ["code"]
          },
        ]
      }
      app_roles: {
        Row: {
          code: string
          department_code: string | null
          description: string
          display_name: string
          is_active: boolean
          release_phase: string
          seniority: string
        }
        Insert: {
          code: string
          department_code?: string | null
          description?: string
          display_name: string
          is_active?: boolean
          release_phase?: string
          seniority: string
        }
        Update: {
          code?: string
          department_code?: string | null
          description?: string
          display_name?: string
          is_active?: boolean
          release_phase?: string
          seniority?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_roles_department_code_fkey"
            columns: ["department_code"]
            isOneToOne: false
            referencedRelation: "app_departments"
            referencedColumns: ["code"]
          },
        ]
      }
      app_settings: {
        Row: {
          decision_status: string
          notes: string
          setting_key: string
          setting_type: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          decision_status: string
          notes?: string
          setting_key: string
          setting_type: string
          setting_value: Json
          updated_at?: string
        }
        Update: {
          decision_status?: string
          notes?: string
          setting_key?: string
          setting_type?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      app_staff_users: {
        Row: {
          auth_user_id: string | null
          created_at: string
          department_code: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          must_change_password: boolean
          notes: string | null
          password_reset_at: string | null
          phone: string | null
          role_code: string
          temp_password_hint: string | null
          updated_at: string
          yard_id: string | null
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          department_code: string
          email: string
          full_name: string
          id?: string
          is_active?: boolean
          must_change_password?: boolean
          notes?: string | null
          password_reset_at?: string | null
          phone?: string | null
          role_code: string
          temp_password_hint?: string | null
          updated_at?: string
          yard_id?: string | null
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          department_code?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          must_change_password?: boolean
          notes?: string | null
          password_reset_at?: string | null
          phone?: string | null
          role_code?: string
          temp_password_hint?: string | null
          updated_at?: string
          yard_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_staff_users_department_code_fkey"
            columns: ["department_code"]
            isOneToOne: false
            referencedRelation: "app_departments"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "app_staff_users_role_code_fkey"
            columns: ["role_code"]
            isOneToOne: false
            referencedRelation: "app_roles"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "app_staff_users_yard_id_fkey"
            columns: ["yard_id"]
            isOneToOne: false
            referencedRelation: "app_yards"
            referencedColumns: ["id"]
          },
        ]
      }
      app_tariffs: {
        Row: {
          amount: number
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          unit: string
          updated_at: string
          valid_from: string
          valid_to: string | null
          version: number
        }
        Insert: {
          amount: number
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          unit: string
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
          version?: number
        }
        Update: {
          amount?: number
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          unit?: string
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
          version?: number
        }
        Relationships: []
      }
      app_user_role_assignments: {
        Row: {
          created_at: string
          created_by: string | null
          department_code: string | null
          id: string
          is_active: boolean
          role_code: string
          user_id: string
          valid_from: string
          valid_until: string | null
          yard_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department_code?: string | null
          id?: string
          is_active?: boolean
          role_code: string
          user_id: string
          valid_from?: string
          valid_until?: string | null
          yard_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department_code?: string | null
          id?: string
          is_active?: boolean
          role_code?: string
          user_id?: string
          valid_from?: string
          valid_until?: string | null
          yard_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_user_role_assignments_department_code_fkey"
            columns: ["department_code"]
            isOneToOne: false
            referencedRelation: "app_departments"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "app_user_role_assignments_role_code_fkey"
            columns: ["role_code"]
            isOneToOne: false
            referencedRelation: "app_roles"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "app_user_role_assignments_yard_id_fkey"
            columns: ["yard_id"]
            isOneToOne: false
            referencedRelation: "app_yards"
            referencedColumns: ["id"]
          },
        ]
      }
      app_vehicle_duplicate_policies: {
        Row: {
          allow_quick_exit_previous: boolean
          block_if_unpaid_ticket: boolean
          check_unpaid_ticket: boolean
          cooldown_action: string
          cooldown_minutes: number
          created_at: string
          exempt_vehicle_types: string[]
          id: string
          policy_mode: string
          preset_reasons: Json
          require_override_reason: boolean
          updated_at: string
          updated_by: string | null
          yard_id: string
        }
        Insert: {
          allow_quick_exit_previous?: boolean
          block_if_unpaid_ticket?: boolean
          check_unpaid_ticket?: boolean
          cooldown_action?: string
          cooldown_minutes?: number
          created_at?: string
          exempt_vehicle_types?: string[]
          id?: string
          policy_mode?: string
          preset_reasons?: Json
          require_override_reason?: boolean
          updated_at?: string
          updated_by?: string | null
          yard_id: string
        }
        Update: {
          allow_quick_exit_previous?: boolean
          block_if_unpaid_ticket?: boolean
          check_unpaid_ticket?: boolean
          cooldown_action?: string
          cooldown_minutes?: number
          created_at?: string
          exempt_vehicle_types?: string[]
          id?: string
          policy_mode?: string
          preset_reasons?: Json
          require_override_reason?: boolean
          updated_at?: string
          updated_by?: string | null
          yard_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_vehicle_duplicate_policies_yard_id_fkey"
            columns: ["yard_id"]
            isOneToOne: true
            referencedRelation: "app_yards"
            referencedColumns: ["id"]
          },
        ]
      }
      app_vehicle_plate_changes: {
        Row: {
          changed_at: string
          changed_by: string | null
          changed_by_name: string | null
          id: string
          new_license_plate: string
          old_license_plate: string
          reason: string
          vehicle_visit_id: string
          yard_id: string | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          changed_by_name?: string | null
          id?: string
          new_license_plate: string
          old_license_plate: string
          reason: string
          vehicle_visit_id: string
          yard_id?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          changed_by_name?: string | null
          id?: string
          new_license_plate?: string
          old_license_plate?: string
          reason?: string
          vehicle_visit_id?: string
          yard_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_vehicle_plate_changes_vehicle_visit_id_fkey"
            columns: ["vehicle_visit_id"]
            isOneToOne: false
            referencedRelation: "app_vehicle_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_vehicle_plate_changes_yard_id_fkey"
            columns: ["yard_id"]
            isOneToOne: false
            referencedRelation: "app_yards"
            referencedColumns: ["id"]
          },
        ]
      }
      app_vehicle_types: {
        Row: {
          allows_container: boolean
          code: string
          created_at: string
          default_ticket_amount: number | null
          description: string | null
          display_name: string
          is_active: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          allows_container?: boolean
          code: string
          created_at?: string
          default_ticket_amount?: number | null
          description?: string | null
          display_name: string
          is_active?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          allows_container?: boolean
          code?: string
          created_at?: string
          default_ticket_amount?: number | null
          description?: string | null
          display_name?: string
          is_active?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      app_vehicle_visits: {
        Row: {
          created_at: string
          driver_name: string | null
          driver_phone: string | null
          duplicate_override_by: string | null
          duplicate_override_reason: string | null
          entry_at: string
          entry_by: string
          exit_at: string | null
          exit_by: string | null
          id: string
          idempotency_key: string | null
          is_duplicate_entry: boolean
          license_plate: string | null
          note: string | null
          previous_visit_id: string | null
          status: string
          ticket_amount: number
          ticket_code: string | null
          ticket_payment_status: string
          updated_at: string
          vehicle_type: string
          yard_id: string
        }
        Insert: {
          created_at?: string
          driver_name?: string | null
          driver_phone?: string | null
          duplicate_override_by?: string | null
          duplicate_override_reason?: string | null
          entry_at?: string
          entry_by: string
          exit_at?: string | null
          exit_by?: string | null
          id?: string
          idempotency_key?: string | null
          is_duplicate_entry?: boolean
          license_plate?: string | null
          note?: string | null
          previous_visit_id?: string | null
          status?: string
          ticket_amount?: number
          ticket_code?: string | null
          ticket_payment_status?: string
          updated_at?: string
          vehicle_type: string
          yard_id: string
        }
        Update: {
          created_at?: string
          driver_name?: string | null
          driver_phone?: string | null
          duplicate_override_by?: string | null
          duplicate_override_reason?: string | null
          entry_at?: string
          entry_by?: string
          exit_at?: string | null
          exit_by?: string | null
          id?: string
          idempotency_key?: string | null
          is_duplicate_entry?: boolean
          license_plate?: string | null
          note?: string | null
          previous_visit_id?: string | null
          status?: string
          ticket_amount?: number
          ticket_code?: string | null
          ticket_payment_status?: string
          updated_at?: string
          vehicle_type?: string
          yard_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_vehicle_visits_previous_visit_id_fkey"
            columns: ["previous_visit_id"]
            isOneToOne: false
            referencedRelation: "app_vehicle_visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_vehicle_visits_vehicle_type_fkey"
            columns: ["vehicle_type"]
            isOneToOne: false
            referencedRelation: "app_vehicle_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "app_vehicle_visits_yard_id_fkey"
            columns: ["yard_id"]
            isOneToOne: false
            referencedRelation: "app_yards"
            referencedColumns: ["id"]
          },
        ]
      }
      app_yard_billing_settings: {
        Row: {
          created_at: string
          empty_in_loaded_out_surcharge_amount: number | null
          empty_in_loaded_out_surcharge_enabled: boolean
          id: string
          updated_at: string
          updated_by: string | null
          yard_id: string
        }
        Insert: {
          created_at?: string
          empty_in_loaded_out_surcharge_amount?: number | null
          empty_in_loaded_out_surcharge_enabled?: boolean
          id?: string
          updated_at?: string
          updated_by?: string | null
          yard_id: string
        }
        Update: {
          created_at?: string
          empty_in_loaded_out_surcharge_amount?: number | null
          empty_in_loaded_out_surcharge_enabled?: boolean
          id?: string
          updated_at?: string
          updated_by?: string | null
          yard_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_yard_billing_settings_yard_id_fkey"
            columns: ["yard_id"]
            isOneToOne: true
            referencedRelation: "app_yards"
            referencedColumns: ["id"]
          },
        ]
      }
      app_yard_zones: {
        Row: {
          capacity: number
          code: string
          color_badge: string
          created_at: string
          description: string | null
          has_power_outlets: boolean
          name: string
          power_outlets_count: number
          updated_at: string
          yard_id: string | null
        }
        Insert: {
          capacity?: number
          code: string
          color_badge?: string
          created_at?: string
          description?: string | null
          has_power_outlets?: boolean
          name: string
          power_outlets_count?: number
          updated_at?: string
          yard_id?: string | null
        }
        Update: {
          capacity?: number
          code?: string
          color_badge?: string
          created_at?: string
          description?: string | null
          has_power_outlets?: boolean
          name?: string
          power_outlets_count?: number
          updated_at?: string
          yard_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_yard_zones_yard_id_fkey"
            columns: ["yard_id"]
            isOneToOne: false
            referencedRelation: "app_yards"
            referencedColumns: ["id"]
          },
        ]
      }
      app_yards: {
        Row: {
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      sc_accounting_collect_debt: {
        Args: {
          p_charge_id: string
          p_notes?: string
          p_payment_amount: number
          p_payment_method?: string
          p_receipt_code?: string
        }
        Returns: Json
      }
      sc_ack_container_number_discrepancy: {
        Args: { p_change_id: number }
        Returns: undefined
      }
      sc_adjust_vehicle_visit: {
        Args: {
          p_clear_exit_at?: boolean
          p_container_action?: string
          p_container_action_reason?: string
          p_driver_name?: string
          p_driver_phone?: string
          p_entry_at?: string
          p_exit_at?: string
          p_operator_role: string
          p_payment_method?: string
          p_reason: string
          p_refund_reason?: string
          p_status?: string
          p_ticket_amount?: number
          p_ticket_payment_status?: string
          p_vehicle_id: string
          p_vehicle_type?: string
        }
        Returns: Json
      }
      sc_admin_reset_staff_password: {
        Args: {
          p_must_change?: boolean
          p_new_password_hint: string
          p_reason: string
          p_staff_id: string
        }
        Returns: Json
      }
      sc_approve_exit_clearance: {
        Args: {
          p_allow_debt?: boolean
          p_container_visit_id: string
          p_notes?: string
        }
        Returns: Json
      }
      sc_approve_request: {
        Args: { p_reason?: string; p_request_id: string }
        Returns: boolean
      }
      sc_calculate_reefer_fee: {
        Args: { p_duration_seconds: number; p_hourly_rate?: number }
        Returns: Json
      }
      sc_calculate_storage_fee: {
        Args: { p_inbound_at: string; p_outbound_at?: string }
        Returns: Json
      }
      sc_can: {
        Args: {
          p_permission_code: string
          p_row_department_code?: string
          p_row_owner_id?: string
          p_row_yard_id?: string
        }
        Returns: boolean
      }
      sc_check_vehicle_duplicate: {
        Args: {
          p_license_plate: string
          p_vehicle_type?: string
          p_yard_id: string
        }
        Returns: Json
      }
      sc_collect_payment: {
        Args: {
          p_amount: number
          p_charge_id: string
          p_idempotency_key?: string
          p_notes?: string
          p_payment_method?: string
          p_receipt_code?: string
        }
        Returns: Json
      }
      sc_collect_vehicle_ticket: {
        Args: {
          p_notes?: string
          p_payment_method?: string
          p_receipt_code?: string
          p_vehicle_id: string
        }
        Returns: Json
      }
      sc_confirm_cash_settlement: {
        Args: {
          p_difference_reason?: string
          p_handover_dept: string
          p_handover_person_name: string
          p_notes?: string
          p_payment_ids?: string[]
          p_period_from: string
          p_period_to: string
          p_total_cash_counted: number
        }
        Returns: Json
      }
      sc_confirm_physical_exit: {
        Args: {
          p_container_visit_id: string
          p_notes?: string
          p_outbound_vehicle_id?: string
          p_paid_at_gate?: boolean
          p_payment_method?: string
          p_receipt_code?: string
        }
        Returns: Json
      }
      sc_confirm_vehicle_only_exit: {
        Args: { p_notes?: string; p_vehicle_visit_id: string }
        Returns: Json
      }
      sc_correct_container_number: {
        Args: {
          p_container_visit_id: string
          p_evidence_url?: string
          p_new_container_no: string
          p_reason: string
        }
        Returns: number
      }
      sc_create_approval_request: {
        Args: {
          p_before_snapshot?: Json
          p_department_code?: string
          p_policy_code: string
          p_proposed_changes?: Json
          p_reason?: string
          p_target_id: string
          p_target_type: string
          p_yard_id?: string
        }
        Returns: string
      }
      sc_create_container_visit: {
        Args: {
          p_container_no: string
          p_container_size?: string
          p_container_type?: string
          p_idempotency_key?: string
          p_inbound_vehicle_visit_id: string
          p_yard_id: string
        }
        Returns: string
      }
      sc_create_or_update_invoice: {
        Args: {
          p_buyer_address: string
          p_buyer_email?: string
          p_buyer_name: string
          p_buyer_phone?: string
          p_charge_ids?: string[]
          p_created_by?: string
          p_id_card_no?: string
          p_invoice_type: string
          p_notes?: string
          p_tax_code?: string
          p_vat_rate?: number
        }
        Returns: Json
      }
      sc_create_reefer_request: {
        Args: {
          p_container_no_planned: string
          p_customer_name?: string
          p_customer_phone?: string
          p_expected_license_plate?: string
          p_notes?: string
          p_power_mode?: string
          p_temperature_setting?: string
          p_yard_id: string
        }
        Returns: string
      }
      sc_create_vehicle_and_container_visit_atomic:
        | {
            Args: {
              p_cargo_status?: string
              p_container_no?: string
              p_container_size?: string
              p_container_type?: string
              p_driver_name?: string
              p_driver_phone?: string
              p_has_container?: boolean
              p_idempotency_key?: string
              p_license_plate: string
              p_note?: string
              p_ticket_code?: string
              p_vehicle_type: string
              p_yard_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_cargo_status?: string
              p_close_previous_visit?: boolean
              p_container_no?: string
              p_container_size?: string
              p_container_type?: string
              p_driver_name?: string
              p_driver_phone?: string
              p_duplicate_reason?: string
              p_has_container?: boolean
              p_idempotency_key?: string
              p_license_plate: string
              p_note?: string
              p_override_duplicate?: boolean
              p_ticket_code?: string
              p_vehicle_type: string
              p_yard_id: string
            }
            Returns: Json
          }
      sc_create_vehicle_visit:
        | {
            Args: {
              p_driver_name?: string
              p_driver_phone?: string
              p_idempotency_key?: string
              p_license_plate?: string
              p_note?: string
              p_ticket_code?: string
              p_vehicle_type: string
              p_yard_id: string
            }
            Returns: string
          }
        | {
            Args: {
              p_close_previous_visit?: boolean
              p_driver_name?: string
              p_driver_phone?: string
              p_duplicate_reason?: string
              p_idempotency_key?: string
              p_license_plate?: string
              p_note?: string
              p_override_duplicate?: boolean
              p_ticket_code?: string
              p_vehicle_type: string
              p_yard_id: string
            }
            Returns: string
          }
      sc_delete_staff_user: { Args: { p_id: string }; Returns: Json }
      sc_issue_invoice: {
        Args: {
          p_e_invoice_no: string
          p_invoice_id: string
          p_issued_at?: string
          p_notes?: string
        }
        Returns: Json
      }
      sc_log_audit_event: {
        Args: {
          p_action_code: string
          p_after_data?: Json
          p_before_data?: Json
          p_department_code?: string
          p_device_info?: Json
          p_reason?: string
          p_request_id?: string
          p_target_id: string
          p_target_type: string
          p_yard_id?: string
        }
        Returns: number
      }
      sc_manage_vehicle_type: {
        Args: {
          p_allows_container?: boolean
          p_code: string
          p_default_ticket_amount?: number
          p_description?: string
          p_display_name?: string
          p_is_active?: boolean
          p_sort_order?: number
        }
        Returns: undefined
      }
      sc_match_reefer_request: {
        Args: { p_container_visit_id: string; p_request_id: string }
        Returns: boolean
      }
      sc_my_permissions: {
        Args: never
        Returns: {
          department_code: string
          permission_code: string
          scope: string
          yard_id: string
        }[]
      }
      sc_plug_in_reefer: {
        Args: {
          p_container_visit_id: string
          p_notes?: string
          p_plugged_in_at?: string
          p_yard_id: string
        }
        Returns: string
      }
      sc_reconcile_container_number_discrepancy: {
        Args: { p_change_id: number; p_reconcile_notes: string }
        Returns: undefined
      }
      sc_record_completed_reefer_session: {
        Args: {
          p_container_visit_id: string
          p_notes?: string
          p_plugged_in_at: string
          p_unplugged_at: string
          p_yard_id: string
        }
        Returns: Json
      }
      sc_reject_request: {
        Args: { p_reason: string; p_request_id: string }
        Returns: boolean
      }
      sc_set_socket_status: {
        Args: { p_notes?: string; p_socket_code: string; p_status: string }
        Returns: Json
      }
      sc_toggle_role_permission: {
        Args: {
          p_is_enabled: boolean
          p_permission_code: string
          p_role_code: string
          p_scope?: string
        }
        Returns: Json
      }
      sc_toggle_staff_user: {
        Args: { p_id: string; p_is_active: boolean }
        Returns: Json
      }
      sc_unplug_reefer: {
        Args: {
          p_notes?: string
          p_session_id: string
          p_unplugged_at?: string
        }
        Returns: Json
      }
      sc_update_container_cargo: {
        Args: { p_cargo_status: string; p_container_visit_id: string }
        Returns: undefined
      }
      sc_update_reefer_request: {
        Args: {
          p_container_no_planned?: string
          p_customer_name?: string
          p_customer_phone?: string
          p_expected_license_plate?: string
          p_notes?: string
          p_power_mode?: string
          p_request_id: string
          p_status?: string
          p_temperature_setting?: string
        }
        Returns: Json
      }
      sc_update_tariff: {
        Args: { p_amount: number; p_code: string; p_reason: string }
        Returns: Json
      }
      sc_update_vehicle_duplicate_policy: {
        Args: {
          p_allow_quick_exit_previous: boolean
          p_block_if_unpaid_ticket: boolean
          p_check_unpaid_ticket: boolean
          p_cooldown_action: string
          p_cooldown_minutes: number
          p_exempt_vehicle_types: string[]
          p_policy_mode: string
          p_preset_reasons?: Json
          p_require_override_reason: boolean
          p_yard_id: string
        }
        Returns: Json
      }
      sc_update_vehicle_visit_basic: {
        Args: {
          p_driver_name: string
          p_driver_phone: string
          p_license_plate: string
          p_note: string
          p_vehicle_visit_id: string
        }
        Returns: undefined
      }
      sc_upsert_role: {
        Args: {
          p_code: string
          p_department_code?: string
          p_description?: string
          p_is_active?: boolean
          p_name: string
        }
        Returns: Json
      }
      sc_upsert_staff_user: {
        Args: {
          p_department_code?: string
          p_email?: string
          p_full_name?: string
          p_id?: string
          p_is_active?: boolean
          p_notes?: string
          p_phone?: string
          p_role_code?: string
          p_yard_id?: string
        }
        Returns: Json
      }
      sc_user_change_password_audit: {
        Args: { p_email: string; p_reason?: string }
        Returns: Json
      }
      sc_verify_reefer_session_zalo: {
        Args: {
          p_adjusted_plugged_in_at?: string
          p_adjusted_unplugged_at?: string
          p_session_id: string
          p_status?: string
          p_verification_notes?: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
