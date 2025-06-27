export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      ml_requests: {
        Row: {
          api_endpoint: string | null
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          model_version: string | null
          processing_time_ms: number | null
          project_id: string
          request_data: Json | null
          request_id: string
          request_time: string | null
          request_type: Database["public"]["Enums"]["ml_request_type"]
          response_data: Json | null
          retry_count: number | null
          status: Database["public"]["Enums"]["ml_request_status"] | null
          user_id: string
        }
        Insert: {
          api_endpoint?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          model_version?: string | null
          processing_time_ms?: number | null
          project_id: string
          request_data?: Json | null
          request_id?: string
          request_time?: string | null
          request_type: Database["public"]["Enums"]["ml_request_type"]
          response_data?: Json | null
          retry_count?: number | null
          status?: Database["public"]["Enums"]["ml_request_status"] | null
          user_id: string
        }
        Update: {
          api_endpoint?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          model_version?: string | null
          processing_time_ms?: number | null
          project_id?: string
          request_data?: Json | null
          request_id?: string
          request_time?: string | null
          request_type?: Database["public"]["Enums"]["ml_request_type"]
          response_data?: Json | null
          retry_count?: number | null
          status?: Database["public"]["Enums"]["ml_request_status"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ml_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "ml_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["project_id"]
          },
        ]
      }
      overrides: {
        Row: {
          confidence: number | null
          created_at: string | null
          engineer_license: string | null
          is_verified: boolean | null
          member_id: string
          new_tag: string
          original_tag: string
          override_id: string
          override_reason: string | null
          override_timestamp: string | null
          project_id: string
          training_batch_id: string | null
          used_in_training: boolean | null
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          engineer_license?: string | null
          is_verified?: boolean | null
          member_id: string
          new_tag: string
          original_tag: string
          override_id?: string
          override_reason?: string | null
          override_timestamp?: string | null
          project_id: string
          training_batch_id?: string | null
          used_in_training?: boolean | null
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          engineer_license?: string | null
          is_verified?: boolean | null
          member_id?: string
          new_tag?: string
          original_tag?: string
          override_id?: string
          override_reason?: string | null
          override_timestamp?: string | null
          project_id?: string
          training_batch_id?: string | null
          used_in_training?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "overrides_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "overrides_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["project_id"]
          },
        ]
      }
      projects: {
        Row: {
          building_type: Database["public"]["Enums"]["building_type"] | null
          building_type_confidence: number | null
          created_at: string | null
          enclosure_classification:
            | Database["public"]["Enums"]["enclosure_classification"]
            | null
          exposure_category:
            | Database["public"]["Enums"]["exposure_category"]
            | null
          file_type: string | null
          geometry_summary: Json | null
          height_category: Database["public"]["Enums"]["height_category"] | null
          model_hash: string | null
          project_id: string
          project_name: string
          roof_type: Database["public"]["Enums"]["roof_type"] | null
          status: Database["public"]["Enums"]["project_status"] | null
          units_system: string | null
          updated_at: string | null
          upload_time: string | null
          user_id: string
        }
        Insert: {
          building_type?: Database["public"]["Enums"]["building_type"] | null
          building_type_confidence?: number | null
          created_at?: string | null
          enclosure_classification?:
            | Database["public"]["Enums"]["enclosure_classification"]
            | null
          exposure_category?:
            | Database["public"]["Enums"]["exposure_category"]
            | null
          file_type?: string | null
          geometry_summary?: Json | null
          height_category?:
            | Database["public"]["Enums"]["height_category"]
            | null
          model_hash?: string | null
          project_id?: string
          project_name: string
          roof_type?: Database["public"]["Enums"]["roof_type"] | null
          status?: Database["public"]["Enums"]["project_status"] | null
          units_system?: string | null
          updated_at?: string | null
          upload_time?: string | null
          user_id: string
        }
        Update: {
          building_type?: Database["public"]["Enums"]["building_type"] | null
          building_type_confidence?: number | null
          created_at?: string | null
          enclosure_classification?:
            | Database["public"]["Enums"]["enclosure_classification"]
            | null
          exposure_category?:
            | Database["public"]["Enums"]["exposure_category"]
            | null
          file_type?: string | null
          geometry_summary?: Json | null
          height_category?:
            | Database["public"]["Enums"]["height_category"]
            | null
          model_hash?: string | null
          project_id?: string
          project_name?: string
          roof_type?: Database["public"]["Enums"]["roof_type"] | null
          status?: Database["public"]["Enums"]["project_status"] | null
          units_system?: string | null
          updated_at?: string | null
          upload_time?: string | null
          user_id?: string
        }
        Relationships: []
      }
      training_logs: {
        Row: {
          created_at: string | null
          deployed_at: string | null
          deployment_status: string | null
          included_overrides: number | null
          log_id: string
          model_version: string
          performance_metrics: Json | null
          processed_by: string | null
          retrain_time: string | null
          total_training_samples: number | null
          training_duration_minutes: number | null
        }
        Insert: {
          created_at?: string | null
          deployed_at?: string | null
          deployment_status?: string | null
          included_overrides?: number | null
          log_id?: string
          model_version: string
          performance_metrics?: Json | null
          processed_by?: string | null
          retrain_time?: string | null
          total_training_samples?: number | null
          training_duration_minutes?: number | null
        }
        Update: {
          created_at?: string | null
          deployed_at?: string | null
          deployment_status?: string | null
          included_overrides?: number | null
          log_id?: string
          model_version?: string
          performance_metrics?: Json | null
          processed_by?: string | null
          retrain_time?: string | null
          total_training_samples?: number | null
          training_duration_minutes?: number | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          company: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_admin: boolean | null
          license_number: string | null
          subscription_tier: string | null
          updated_at: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_admin?: boolean | null
          license_number?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          license_number?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_uploads: {
        Row: {
          checksum: string | null
          created_at: string | null
          file_name: string
          file_size: number
          file_type: string
          parsing_accuracy: number | null
          processing_errors: Json | null
          processing_status: string | null
          project_id: string
          storage_path: string | null
          upload_id: string
          upload_timestamp: string | null
          user_id: string
        }
        Insert: {
          checksum?: string | null
          created_at?: string | null
          file_name: string
          file_size: number
          file_type: string
          parsing_accuracy?: number | null
          processing_errors?: Json | null
          processing_status?: string | null
          project_id: string
          storage_path?: string | null
          upload_id?: string
          upload_timestamp?: string | null
          user_id: string
        }
        Update: {
          checksum?: string | null
          created_at?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          parsing_accuracy?: number | null
          processing_errors?: Json | null
          processing_status?: string | null
          project_id?: string
          storage_path?: string | null
          upload_id?: string
          upload_timestamp?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_uploads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "user_uploads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["project_id"]
          },
        ]
      }
    }
    Views: {
      project_summary: {
        Row: {
          building_type: Database["public"]["Enums"]["building_type"] | null
          file_name: string | null
          file_size: number | null
          file_type: string | null
          has_materials: boolean | null
          member_count: number | null
          node_count: number | null
          override_count: number | null
          project_id: string | null
          project_name: string | null
          status: Database["public"]["Enums"]["project_status"] | null
          upload_time: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      building_type:
        | "SINGLE_GABLE_HANGAR"
        | "DOUBLE_GABLE_HANGAR"
        | "MULTI_GABLE_HANGAR"
        | "ARCH_HANGAR"
        | "TRUSS_SINGLE_GABLE"
        | "TRUSS_DOUBLE_GABLE"
        | "TRUSS_MULTI_GABLE"
        | "RIGID_FRAME_SINGLE_GABLE"
        | "RIGID_FRAME_DOUBLE_GABLE"
        | "RIGID_FRAME_MULTI_GABLE"
        | "MONO_SLOPE_BUILDING"
        | "FLAT_ROOF_BUILDING"
        | "WAREHOUSE_BUILDING"
        | "INDUSTRIAL_BUILDING"
        | "COMMERCIAL_BUILDING"
        | "OFFICE_BUILDING"
        | "RESIDENTIAL_BUILDING"
        | "MIXED_USE_BUILDING"
        | "OTHER"
      enclosure_classification: "ENCLOSED" | "PARTIALLY_ENCLOSED" | "OPEN"
      exposure_category: "A" | "B" | "C" | "D"
      height_category: "LOW_RISE" | "MID_RISE" | "HIGH_RISE"
      ml_request_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "timeout"
      ml_request_type: "building" | "member" | "load" | "classification"
      project_status:
        | "uploading"
        | "processing"
        | "completed"
        | "failed"
        | "archived"
      roof_type:
        | "FLAT"
        | "GABLE"
        | "HIP"
        | "SHED"
        | "GAMBREL"
        | "MANSARD"
        | "MONO_SLOPE"
        | "ARCH"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      building_type: [
        "SINGLE_GABLE_HANGAR",
        "DOUBLE_GABLE_HANGAR",
        "MULTI_GABLE_HANGAR",
        "ARCH_HANGAR",
        "TRUSS_SINGLE_GABLE",
        "TRUSS_DOUBLE_GABLE",
        "TRUSS_MULTI_GABLE",
        "RIGID_FRAME_SINGLE_GABLE",
        "RIGID_FRAME_DOUBLE_GABLE",
        "RIGID_FRAME_MULTI_GABLE",
        "MONO_SLOPE_BUILDING",
        "FLAT_ROOF_BUILDING",
        "WAREHOUSE_BUILDING",
        "INDUSTRIAL_BUILDING",
        "COMMERCIAL_BUILDING",
        "OFFICE_BUILDING",
        "RESIDENTIAL_BUILDING",
        "MIXED_USE_BUILDING",
        "OTHER",
      ],
      enclosure_classification: ["ENCLOSED", "PARTIALLY_ENCLOSED", "OPEN"],
      exposure_category: ["A", "B", "C", "D"],
      height_category: ["LOW_RISE", "MID_RISE", "HIGH_RISE"],
      ml_request_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "timeout",
      ],
      ml_request_type: ["building", "member", "load", "classification"],
      project_status: [
        "uploading",
        "processing",
        "completed",
        "failed",
        "archived",
      ],
      roof_type: [
        "FLAT",
        "GABLE",
        "HIP",
        "SHED",
        "GAMBREL",
        "MANSARD",
        "MONO_SLOPE",
        "ARCH",
      ],
    },
  },
} as const
