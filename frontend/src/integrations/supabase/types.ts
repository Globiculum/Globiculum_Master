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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          created_at: string
          id: string
          message: string
          priority: Database["public"]["Enums"]["alert_priority"]
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          priority?: Database["public"]["Enums"]["alert_priority"]
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          priority?: Database["public"]["Enums"]["alert_priority"]
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          assessment_data: Json
          completed_at: string
          created_at: string
          deleted_at: string | null
          id: string
          status: string
          student_profile_id: string
          user_id: string
        }
        Insert: {
          assessment_data: Json
          completed_at?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          status?: string
          student_profile_id: string
          user_id: string
        }
        Update: {
          assessment_data?: Json
          completed_at?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          status?: string
          student_profile_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      cultural_modules: {
        Row: {
          completed: boolean
          created_at: string
          description: string | null
          id: string
          module_type: string
          progress_percentage: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          description?: string | null
          id?: string
          module_type: string
          progress_percentage?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          description?: string | null
          id?: string
          module_type?: string
          progress_percentage?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cultural_modules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_alignments: {
        Row: {
          alignment_score: number
          created_at: string
          gap_type: string | null
          id: string
          notes: string | null
          source_curriculum: string
          source_node_id: string
          target_curriculum: string
          target_node_id: string
        }
        Insert: {
          alignment_score: number
          created_at?: string
          gap_type?: string | null
          id?: string
          notes?: string | null
          source_curriculum: string
          source_node_id: string
          target_curriculum: string
          target_node_id: string
        }
        Update: {
          alignment_score?: number
          created_at?: string
          gap_type?: string | null
          id?: string
          notes?: string | null
          source_curriculum?: string
          source_node_id?: string
          target_curriculum?: string
          target_node_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_alignments_source_node_id_fkey"
            columns: ["source_node_id"]
            isOneToOne: false
            referencedRelation: "curriculum_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_alignments_target_node_id_fkey"
            columns: ["target_node_id"]
            isOneToOne: false
            referencedRelation: "curriculum_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_edges: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          relationship_type: string
          source_node_id: string
          target_node_id: string
          weight: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          relationship_type: string
          source_node_id: string
          target_node_id: string
          weight?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          relationship_type?: string
          source_node_id?: string
          target_node_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_edges_source_node_id_fkey"
            columns: ["source_node_id"]
            isOneToOne: false
            referencedRelation: "curriculum_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_edges_target_node_id_fkey"
            columns: ["target_node_id"]
            isOneToOne: false
            referencedRelation: "curriculum_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_embeddings: {
        Row: {
          content_hash: string | null
          created_at: string
          embedding: string | null
          embedding_model: string
          id: string
          node_id: string
          updated_at: string
        }
        Insert: {
          content_hash?: string | null
          created_at?: string
          embedding?: string | null
          embedding_model?: string
          id?: string
          node_id: string
          updated_at?: string
        }
        Update: {
          content_hash?: string | null
          created_at?: string
          embedding?: string | null
          embedding_model?: string
          id?: string
          node_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_embeddings_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: true
            referencedRelation: "curriculum_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_nodes: {
        Row: {
          created_at: string
          curriculum_system: string | null
          description: string | null
          grade_level_max: number | null
          grade_level_min: number | null
          id: string
          metadata: Json | null
          name: string
          node_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          curriculum_system?: string | null
          description?: string | null
          grade_level_max?: number | null
          grade_level_min?: number | null
          id?: string
          metadata?: Json | null
          name: string
          node_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          curriculum_system?: string | null
          description?: string | null
          grade_level_max?: number | null
          grade_level_min?: number | null
          id?: string
          metadata?: Json | null
          name?: string
          node_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      data_access_logs: {
        Row: {
          access_type: string
          accessed_user_id: string | null
          created_at: string
          id: string
          ip_address: unknown
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          access_type: string
          accessed_user_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          access_type?: string
          accessed_user_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      data_deletion_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          processed_by: string | null
          reason: string | null
          requested_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          processed_by?: string | null
          reason?: string | null
          requested_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          processed_by?: string | null
          reason?: string | null
          requested_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      diagnostic_results: {
        Row: {
          assessment_id: string | null
          created_at: string
          diagnostic_type: string
          gap_areas: string[] | null
          id: string
          overall_score: number
          readiness_level: string
          recommendations: string[] | null
          strength_areas: string[] | null
          student_profile_id: string
          subject_scores: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          assessment_id?: string | null
          created_at?: string
          diagnostic_type?: string
          gap_areas?: string[] | null
          id?: string
          overall_score?: number
          readiness_level?: string
          recommendations?: string[] | null
          strength_areas?: string[] | null
          student_profile_id: string
          subject_scores?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          assessment_id?: string | null
          created_at?: string
          diagnostic_type?: string
          gap_areas?: string[] | null
          id?: string
          overall_score?: number
          readiness_level?: string
          recommendations?: string[] | null
          strength_areas?: string[] | null
          student_profile_id?: string
          subject_scores?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_results_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostic_results_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostic_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      encryption_keys: {
        Row: {
          active: boolean
          algorithm: string
          created_at: string
          expires_at: string | null
          id: string
          key_identifier: string
          purpose: string
          rotated_at: string | null
        }
        Insert: {
          active?: boolean
          algorithm?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          key_identifier: string
          purpose: string
          rotated_at?: string | null
        }
        Update: {
          active?: boolean
          algorithm?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          key_identifier?: string
          purpose?: string
          rotated_at?: string | null
        }
        Relationships: []
      }
      feedback: {
        Row: {
          content: string | null
          created_at: string
          deleted_at: string | null
          feedback_type: string
          id: string
          metadata: Json | null
          rating: number | null
          report_id: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          feedback_type: string
          id?: string
          metadata?: Json | null
          rating?: number | null
          report_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          feedback_type?: string
          id?: string
          metadata?: Json | null
          rating?: number | null
          report_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "saved_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gap_reports: {
        Row: {
          assessment_id: string
          created_at: string
          deleted_at: string | null
          gaps_identified: string[] | null
          id: string
          mastery_percentage: number
          recommendations: string[] | null
          subject: Database["public"]["Enums"]["subject_name"]
          updated_at: string
          user_id: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          deleted_at?: string | null
          gaps_identified?: string[] | null
          id?: string
          mastery_percentage?: number
          recommendations?: string[] | null
          subject: Database["public"]["Enums"]["subject_name"]
          updated_at?: string
          user_id: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          deleted_at?: string | null
          gaps_identified?: string[] | null
          id?: string
          mastery_percentage?: number
          recommendations?: string[] | null
          subject?: Database["public"]["Enums"]["subject_name"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gap_reports_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gap_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      guardian_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          guardian_email: string
          id: string
          parent_user_id: string
          status: string
          student_profile_id: string
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          guardian_email: string
          id?: string
          parent_user_id: string
          status?: string
          student_profile_id: string
          token?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          guardian_email?: string
          id?: string
          parent_user_id?: string
          status?: string
          student_profile_id?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardian_invitations_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      guardian_relationships: {
        Row: {
          access_level: string
          created_at: string
          expires_at: string | null
          guardian_user_id: string
          id: string
          relationship_type: string
          student_user_id: string
          updated_at: string
          verified: boolean
          verified_at: string | null
        }
        Insert: {
          access_level?: string
          created_at?: string
          expires_at?: string | null
          guardian_user_id: string
          id?: string
          relationship_type: string
          student_user_id: string
          updated_at?: string
          verified?: boolean
          verified_at?: string | null
        }
        Update: {
          access_level?: string
          created_at?: string
          expires_at?: string | null
          guardian_user_id?: string
          id?: string
          relationship_type?: string
          student_user_id?: string
          updated_at?: string
          verified?: boolean
          verified_at?: string | null
        }
        Relationships: []
      }
      learning_pathways: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          due_date: string | null
          id: string
          resources: Json | null
          status: string
          subject: Database["public"]["Enums"]["subject_name"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          resources?: Json | null
          status?: string
          subject: Database["public"]["Enums"]["subject_name"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          resources?: Json | null
          status?: string
          subject?: Database["public"]["Enums"]["subject_name"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_pathways_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      progress_stats: {
        Row: {
          active_weeks: number
          created_at: string
          id: string
          overall_mastery: number
          topics_completed: number
          updated_at: string
          user_id: string
        }
        Insert: {
          active_weeks?: number
          created_at?: string
          id?: string
          overall_mastery?: number
          topics_completed?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          active_weeks?: number
          created_at?: string
          id?: string
          overall_mastery?: number
          topics_completed?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          name: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      report_artifacts: {
        Row: {
          artifact_type: string
          created_at: string
          deleted_at: string | null
          file_name: string
          file_size: number | null
          id: string
          metadata: Json | null
          mime_type: string | null
          report_id: string
          storage_path: string
          user_id: string
        }
        Insert: {
          artifact_type: string
          created_at?: string
          deleted_at?: string | null
          file_name: string
          file_size?: number | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          report_id: string
          storage_path: string
          user_id: string
        }
        Update: {
          artifact_type?: string
          created_at?: string
          deleted_at?: string | null
          file_name?: string
          file_size?: number | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          report_id?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_artifacts_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "saved_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_artifacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_reports: {
        Row: {
          analysis_data: Json
          created_at: string
          deleted_at: string | null
          form_data: Json
          id: string
          prev_report_id: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_data: Json
          created_at?: string
          deleted_at?: string | null
          form_data: Json
          id?: string
          prev_report_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_data?: Json
          created_at?: string
          deleted_at?: string | null
          form_data?: Json
          id?: string
          prev_report_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_reports_prev_report_id_fkey"
            columns: ["prev_report_id"]
            isOneToOne: false
            referencedRelation: "saved_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          meeting_link: string | null
          notes: string | null
          scheduled_at: string
          session_type: Database["public"]["Enums"]["session_type"]
          status: Database["public"]["Enums"]["session_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          meeting_link?: string | null
          notes?: string | null
          scheduled_at: string
          session_type: Database["public"]["Enums"]["session_type"]
          status?: Database["public"]["Enums"]["session_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          meeting_link?: string | null
          notes?: string | null
          scheduled_at?: string
          session_type?: Database["public"]["Enums"]["session_type"]
          status?: Database["public"]["Enums"]["session_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_reports: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          report_id: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          report_id: string
          token?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          report_id?: string
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_reports_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "saved_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      student_profiles: {
        Row: {
          age: number
          created_at: string
          current_country: string
          current_grade: string
          curriculum_analysis: Json | null
          deleted_at: string | null
          id: string
          previous_curriculum: Database["public"]["Enums"]["curriculum_type"]
          student_name: string
          target_curriculum: Database["public"]["Enums"]["curriculum_type"]
          transition_timeline: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age: number
          created_at?: string
          current_country: string
          current_grade: string
          curriculum_analysis?: Json | null
          deleted_at?: string | null
          id?: string
          previous_curriculum: Database["public"]["Enums"]["curriculum_type"]
          student_name: string
          target_curriculum: Database["public"]["Enums"]["curriculum_type"]
          transition_timeline?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number
          created_at?: string
          current_country?: string
          current_grade?: string
          curriculum_analysis?: Json | null
          deleted_at?: string | null
          id?: string
          previous_curriculum?: Database["public"]["Enums"]["curriculum_type"]
          student_name?: string
          target_curriculum?: Database["public"]["Enums"]["curriculum_type"]
          transition_timeline?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_sessions: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          scheduled_at: string
          session_type: Database["public"]["Enums"]["tutor_session_type"]
          status: Database["public"]["Enums"]["tutor_session_status"]
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          scheduled_at: string
          session_type: Database["public"]["Enums"]["tutor_session_type"]
          status?: Database["public"]["Enums"]["tutor_session_status"]
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          scheduled_at?: string
          session_type?: Database["public"]["Enums"]["tutor_session_type"]
          status?: Database["public"]["Enums"]["tutor_session_status"]
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_consents: {
        Row: {
          consent_type: string
          created_at: string
          granted: boolean
          granted_at: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
          revoked_at: string | null
          updated_at: string
          user_agent: string | null
          user_id: string
          version: string
        }
        Insert: {
          consent_type: string
          created_at?: string
          granted?: boolean
          granted_at?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          revoked_at?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id: string
          version?: string
        }
        Update: {
          consent_type?: string
          created_at?: string
          granted?: boolean
          granted_at?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          revoked_at?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      validation_rules: {
        Row: {
          active: boolean
          conditions: Json
          created_at: string
          error_message: string
          id: string
          rule_name: string
          rule_type: string
          severity: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          conditions: Json
          created_at?: string
          error_message: string
          id?: string
          rule_name: string
          rule_type: string
          severity?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          conditions?: Json
          created_at?: string
          error_message?: string
          id?: string
          rule_name?: string
          rule_type?: string
          severity?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      find_curriculum_gaps: {
        Args: {
          grade_level?: number
          source_curriculum_param: string
          target_curriculum_param: string
        }
        Returns: {
          alignment_score: number
          gap_type: string
          notes: string
          source_topic: string
          target_topic: string
        }[]
      }
      get_prerequisites: {
        Args: { topic_node_id: string }
        Returns: {
          depth: number
          prerequisite_id: string
          prerequisite_name: string
          prerequisite_type: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      search_curriculum_semantic: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          curriculum_system: string
          node_id: string
          node_name: string
          node_type: string
          similarity: number
        }[]
      }
      soft_delete: {
        Args: { record_id: string; table_name: string }
        Returns: boolean
      }
      traverse_curriculum_graph: {
        Args: {
          max_depth?: number
          relationship_types?: string[]
          start_node_id: string
        }
        Returns: {
          depth: number
          name: string
          node_id: string
          node_type: string
          path: string[]
        }[]
      }
    }
    Enums: {
      alert_priority: "low" | "medium" | "high" | "urgent"
      app_role: "admin" | "moderator" | "student" | "parent"
      curriculum_type: "US" | "Indian" | "IB" | "Other"
      session_status: "scheduled" | "completed" | "cancelled"
      session_type: "tutoring" | "counseling" | "live_class"
      subject_name:
        | "Math"
        | "Science"
        | "English"
        | "Social Studies"
        | "Hindi"
        | "Sanskrit"
        | "Computer Science"
        | "Other"
      tutor_session_status: "pending" | "confirmed" | "cancelled"
      tutor_session_type: "diagnostic" | "tutoring" | "consultation"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      alert_priority: ["low", "medium", "high", "urgent"],
      app_role: ["admin", "moderator", "student", "parent"],
      curriculum_type: ["US", "Indian", "IB", "Other"],
      session_status: ["scheduled", "completed", "cancelled"],
      session_type: ["tutoring", "counseling", "live_class"],
      subject_name: [
        "Math",
        "Science",
        "English",
        "Social Studies",
        "Hindi",
        "Sanskrit",
        "Computer Science",
        "Other",
      ],
      tutor_session_status: ["pending", "confirmed", "cancelled"],
      tutor_session_type: ["diagnostic", "tutoring", "consultation"],
    },
  },
} as const
