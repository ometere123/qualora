export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type VerdictType =
  | "approved"
  | "approved_with_warning"
  | "quarantine_dataset"
  | "reject_proposed_fix"
  | "requires_human_review"
  | "needs_more_evidence"

export type SeverityType = "low" | "medium" | "high" | "critical"

export type CaseStatus =
  | "draft"
  | "evidence_attached"
  | "submitted_to_genlayer"
  | "pending_consensus"
  | "verdict_received"
  | "closed"

export type BusinessCriticality = "low" | "medium" | "high" | "critical"

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          email: string
          display_name: string | null
          role: string
          onboarding_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email: string
          display_name?: string | null
          role?: string
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>
      }
      wallets: {
        Row: {
          id: string
          user_id: string
          address: string
          encrypted_private_key: string
          encryption_version: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          address: string
          encrypted_private_key: string
          encryption_version?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["wallets"]["Insert"]>
      }
      wallet_key_wraps: {
        Row: {
          id: string
          wallet_id: string
          user_id: string
          method: string
          encrypted_wallet_key: string
          salt: string
          kdf_params: Json
          created_at: string
        }
        Insert: {
          id?: string
          wallet_id: string
          user_id: string
          method: string
          encrypted_wallet_key: string
          salt: string
          kdf_params: Json
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["wallet_key_wraps"]["Insert"]>
      }
      workspaces: {
        Row: {
          id: string
          user_id: string
          name: string
          organisation_name: string | null
          data_function: string | null
          data_environment: string | null
          primary_dataset_type: string | null
          governance_role: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          organisation_name?: string | null
          data_function?: string | null
          data_environment?: string | null
          primary_dataset_type?: string | null
          governance_role?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["workspaces"]["Insert"]>
      }
      datasets: {
        Row: {
          id: string
          user_id: string
          workspace_id: string
          name: string
          domain: string | null
          owner_name: string | null
          source_system: string | null
          refresh_cadence: string | null
          downstream_consumers: string | null
          business_criticality: BusinessCriticality
          schema_summary: string | null
          expected_primary_key: string | null
          quality_expectations: string | null
          governance_status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          workspace_id: string
          name: string
          domain?: string | null
          owner_name?: string | null
          source_system?: string | null
          refresh_cadence?: string | null
          downstream_consumers?: string | null
          business_criticality?: BusinessCriticality
          schema_summary?: string | null
          expected_primary_key?: string | null
          quality_expectations?: string | null
          governance_status?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["datasets"]["Insert"]>
      }
      governance_cases: {
        Row: {
          id: string
          user_id: string
          workspace_id: string
          dataset_id: string
          issue_type: string
          affected_columns: string | null
          missingness_summary: string | null
          duplication_summary: string | null
          schema_drift_summary: string | null
          freshness_summary: string | null
          invalid_values_summary: string | null
          historical_baseline_summary: string | null
          downstream_impact: string | null
          proposed_fix: string | null
          analyst_notes: string | null
          candidate_outcome_a: string | null
          candidate_outcome_b: string | null
          candidate_outcome_c: string | null
          status: CaseStatus
          submitted_to_genlayer_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          workspace_id: string
          dataset_id: string
          issue_type: string
          affected_columns?: string | null
          missingness_summary?: string | null
          duplication_summary?: string | null
          schema_drift_summary?: string | null
          freshness_summary?: string | null
          invalid_values_summary?: string | null
          historical_baseline_summary?: string | null
          downstream_impact?: string | null
          proposed_fix?: string | null
          analyst_notes?: string | null
          candidate_outcome_a?: string | null
          candidate_outcome_b?: string | null
          candidate_outcome_c?: string | null
          status?: CaseStatus
          submitted_to_genlayer_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["governance_cases"]["Insert"]>
      }
      evidence_files: {
        Row: {
          id: string
          user_id: string
          governance_case_id: string
          file_url: string
          file_path: string
          file_bucket: string
          file_type: string
          file_size: number
          evidence_hash: string
          uploaded_by: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          governance_case_id: string
          file_url: string
          file_path: string
          file_bucket: string
          file_type: string
          file_size: number
          evidence_hash: string
          uploaded_by: string
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["evidence_files"]["Insert"]>
      }
      data_snapshots: {
        Row: {
          id: string
          user_id: string
          governance_case_id: string
          source_type: string
          source_url: string | null
          snapshot_json: Json
          snapshot_hash: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          governance_case_id: string
          source_type: string
          source_url?: string | null
          snapshot_json: Json
          snapshot_hash: string
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["data_snapshots"]["Insert"]>
      }
      genlayer_governance_verdicts: {
        Row: {
          id: string
          user_id: string
          governance_case_id: string
          contract_address: string
          transaction_hash: string
          case_id_on_chain: string
          verdict: VerdictType
          dataset_action: string
          severity: SeverityType
          confidence_label: string
          selected_outcome: string | null
          reasoning_summary: string
          evidence_digest: string | null
          fix_assessment: string | null
          downstream_risk: string | null
          consensus_status: string
          consensus_timestamp: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          governance_case_id: string
          contract_address: string
          transaction_hash: string
          case_id_on_chain: string
          verdict: VerdictType
          dataset_action: string
          severity: SeverityType
          confidence_label: string
          selected_outcome?: string | null
          reasoning_summary: string
          evidence_digest?: string | null
          fix_assessment?: string | null
          downstream_risk?: string | null
          consensus_status: string
          consensus_timestamp?: string | null
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["genlayer_governance_verdicts"]["Insert"]>
      }
      recovery_audit_logs: {
        Row: {
          id: string
          user_id: string
          wallet_id: string
          action: string
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          wallet_id: string
          action: string
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["recovery_audit_logs"]["Insert"]>
      }
      admin_review_notes: {
        Row: {
          id: string
          governance_case_id: string
          admin_user_id: string
          note: string
          created_at: string
        }
        Insert: {
          id?: string
          governance_case_id: string
          admin_user_id: string
          note: string
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["admin_review_notes"]["Insert"]>
      }
      contract_activity_logs: {
        Row: {
          id: string
          user_id: string
          governance_case_id: string
          contract_address: string | null
          transaction_hash: string | null
          action: string
          status: string
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          governance_case_id: string
          contract_address?: string | null
          transaction_hash?: string | null
          action: string
          status: string
          error_message?: string | null
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["contract_activity_logs"]["Insert"]>
      }
    }
  }
}
