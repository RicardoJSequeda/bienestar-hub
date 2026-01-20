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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean
          message: string | null
          severity: string
          target_role: Database["public"]["Enums"]["app_role"] | null
          target_user_id: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          message?: string | null
          severity?: string
          target_role?: Database["public"]["Enums"]["app_role"] | null
          target_user_id?: string | null
          title: string
          type: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          message?: string | null
          severity?: string
          target_role?: Database["public"]["Enums"]["app_role"] | null
          target_user_id?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      demand_stats: {
        Row: {
          approval_rate: number | null
          avg_loan_duration_hours: number | null
          category_id: string | null
          created_at: string
          day_of_week: number | null
          hour_of_day: number | null
          id: string
          period_end: string
          period_start: string
          request_count: number
          resource_id: string | null
        }
        Insert: {
          approval_rate?: number | null
          avg_loan_duration_hours?: number | null
          category_id?: string | null
          created_at?: string
          day_of_week?: number | null
          hour_of_day?: number | null
          id?: string
          period_end: string
          period_start: string
          request_count?: number
          resource_id?: string | null
        }
        Update: {
          approval_rate?: number | null
          avg_loan_duration_hours?: number | null
          category_id?: string | null
          created_at?: string
          day_of_week?: number | null
          hour_of_day?: number | null
          id?: string
          period_end?: string
          period_start?: string
          request_count?: number
          resource_id?: string | null
        }
        Relationships: []
      }
      event_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      event_enrollments: {
        Row: {
          attendance_registered_at: string | null
          attendance_registered_by: string | null
          attended: boolean
          enrolled_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          attendance_registered_at?: string | null
          attendance_registered_by?: string | null
          attended?: boolean
          enrolled_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          attendance_registered_at?: string | null
          attendance_registered_by?: string | null
          attended?: boolean
          enrolled_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_enrollments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string
          id: string
          image_url: string | null
          is_active: boolean
          location: string | null
          max_participants: number | null
          start_date: string
          title: string
          updated_at: string
          wellness_hours: number
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          location?: string | null
          max_participants?: number | null
          start_date: string
          title: string
          updated_at?: string
          wellness_hours?: number
        }
        Update: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          location?: string | null
          max_participants?: number | null
          start_date?: string
          title?: string
          updated_at?: string
          wellness_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "events_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "event_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          admin_notes: string | null
          approved_at: string | null
          approved_by: string | null
          auto_approved: boolean | null
          created_at: string
          created_by_admin: boolean | null
          damage_evidence_url: string | null
          damage_notes: string | null
          delivered_at: string | null
          due_date: string | null
          id: string
          pickup_deadline: string | null
          queue_position: number | null
          requested_at: string
          resource_id: string
          returned_at: string | null
          status: Database["public"]["Enums"]["loan_status"]
          trust_score_at_request: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          auto_approved?: boolean | null
          created_at?: string
          created_by_admin?: boolean | null
          damage_evidence_url?: string | null
          damage_notes?: string | null
          delivered_at?: string | null
          due_date?: string | null
          id?: string
          pickup_deadline?: string | null
          queue_position?: number | null
          requested_at?: string
          resource_id: string
          returned_at?: string | null
          status?: Database["public"]["Enums"]["loan_status"]
          trust_score_at_request?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          auto_approved?: boolean | null
          created_at?: string
          created_by_admin?: boolean | null
          damage_evidence_url?: string | null
          damage_notes?: string | null
          delivered_at?: string | null
          due_date?: string | null
          id?: string
          pickup_deadline?: string | null
          queue_position?: number | null
          requested_at?: string
          resource_id?: string
          returned_at?: string | null
          status?: Database["public"]["Enums"]["loan_status"]
          trust_score_at_request?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loans_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          major: string | null
          student_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          major?: string | null
          student_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          major?: string | null
          student_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      resource_categories: {
        Row: {
          base_wellness_hours: number
          created_at: string
          description: string | null
          hourly_factor: number
          icon: string | null
          id: string
          is_low_risk: boolean | null
          max_loan_days: number | null
          max_per_student: number | null
          name: string
          requires_approval: boolean | null
        }
        Insert: {
          base_wellness_hours?: number
          created_at?: string
          description?: string | null
          hourly_factor?: number
          icon?: string | null
          id?: string
          is_low_risk?: boolean | null
          max_loan_days?: number | null
          max_per_student?: number | null
          name: string
          requires_approval?: boolean | null
        }
        Update: {
          base_wellness_hours?: number
          created_at?: string
          description?: string | null
          hourly_factor?: number
          icon?: string | null
          id?: string
          is_low_risk?: boolean | null
          max_loan_days?: number | null
          max_per_student?: number | null
          name?: string
          requires_approval?: boolean | null
        }
        Relationships: []
      }
      resource_queue: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          notified_at: string | null
          position: number
          requested_at: string
          resource_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          notified_at?: string | null
          position: number
          requested_at?: string
          resource_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          notified_at?: string | null
          position?: number
          requested_at?: string
          resource_id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          notes: string | null
          status: Database["public"]["Enums"]["resource_status"]
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          notes?: string | null
          status?: Database["public"]["Enums"]["resource_status"]
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["resource_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "resource_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      student_scores: {
        Row: {
          blocked_reason: string | null
          blocked_until: string | null
          created_at: string
          damages: number
          events_attended: number
          id: string
          is_blocked: boolean
          late_returns: number
          losses: number
          on_time_returns: number
          total_loans: number
          trust_score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          blocked_reason?: string | null
          blocked_until?: string | null
          created_at?: string
          damages?: number
          events_attended?: number
          id?: string
          is_blocked?: boolean
          late_returns?: number
          losses?: number
          on_time_returns?: number
          total_loans?: number
          trust_score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          blocked_reason?: string | null
          blocked_until?: string | null
          created_at?: string
          damages?: number
          events_attended?: number
          id?: string
          is_blocked?: boolean
          late_returns?: number
          losses?: number
          on_time_returns?: number
          total_loans?: number
          trust_score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wellness_hours: {
        Row: {
          awarded_at: string
          awarded_by: string | null
          description: string | null
          hours: number
          id: string
          source_id: string
          source_type: Database["public"]["Enums"]["wellness_source_type"]
          user_id: string
        }
        Insert: {
          awarded_at?: string
          awarded_by?: string | null
          description?: string | null
          hours: number
          id?: string
          source_id: string
          source_type: Database["public"]["Enums"]["wellness_source_type"]
          user_id: string
        }
        Update: {
          awarded_at?: string
          awarded_by?: string | null
          description?: string | null
          hours?: number
          id?: string
          source_id?: string
          source_type?: Database["public"]["Enums"]["wellness_source_type"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_trust_score: { Args: { p_user_id: string }; Returns: number }
      can_auto_approve: {
        Args: { p_resource_id: string; p_user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "student"
      loan_status:
        | "pending"
        | "approved"
        | "rejected"
        | "active"
        | "returned"
        | "overdue"
        | "lost"
        | "damaged"
        | "expired"
        | "queued"
      resource_status:
        | "available"
        | "borrowed"
        | "maintenance"
        | "reserved"
        | "retired"
      wellness_source_type: "loan" | "event"
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
      app_role: ["admin", "student"],
      loan_status: [
        "pending",
        "approved",
        "rejected",
        "active",
        "returned",
        "overdue",
        "lost",
        "damaged",
        "expired",
        "queued",
      ],
      resource_status: [
        "available",
        "borrowed",
        "maintenance",
        "reserved",
        "retired",
      ],
      wellness_source_type: ["loan", "event"],
    },
  },
} as const
