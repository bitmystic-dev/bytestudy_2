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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_personalization: {
        Row: {
          completed_at: string | null
          created_at: string
          data: Json
          skipped: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          data?: Json
          skipped?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          data?: Json
          skipped?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      allen_credentials: {
        Row: {
          created_at: string
          form_id: string
          password: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          form_id: string
          password: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          form_id?: string
          password?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      allen_sync_state: {
        Row: {
          created_at: string
          homework_cursor: Json
          last_error: string | null
          last_status: string | null
          last_sync_at: string | null
          tests_cursor: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          homework_cursor?: Json
          last_error?: string | null
          last_status?: string | null
          last_sync_at?: string | null
          tests_cursor?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          homework_cursor?: Json
          last_error?: string | null
          last_status?: string | null
          last_sync_at?: string | null
          tests_cursor?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chapter_customizations: {
        Row: {
          class_level: number
          items: Json
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          class_level: number
          items?: Json
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          class_level?: number
          items?: Json
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chapter_meta: {
        Row: {
          actual_hours: number
          bookmarked: boolean
          chapter_key: string
          checkpoints: Json
          completion: number
          confidence: number
          dpp_progress: number
          estimated_hours: number
          last_studied: string | null
          module_progress: number
          next_revision: string | null
          notes: string
          override_name: string | null
          pinned: boolean
          pyq_progress: number
          revision_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_hours?: number
          bookmarked?: boolean
          chapter_key: string
          checkpoints?: Json
          completion?: number
          confidence?: number
          dpp_progress?: number
          estimated_hours?: number
          last_studied?: string | null
          module_progress?: number
          next_revision?: string | null
          notes?: string
          override_name?: string | null
          pinned?: boolean
          pyq_progress?: number
          revision_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_hours?: number
          bookmarked?: boolean
          chapter_key?: string
          checkpoints?: Json
          completion?: number
          confidence?: number
          dpp_progress?: number
          estimated_hours?: number
          last_studied?: string | null
          module_progress?: number
          next_revision?: string | null
          notes?: string
          override_name?: string | null
          pinned?: boolean
          pyq_progress?: number
          revision_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      focus_sessions: {
        Row: {
          chapter_key: string | null
          created_at: string
          duration_sec: number
          ended_at: string
          id: string
          mode: string
          started_at: string
          subject: string | null
          user_id: string
        }
        Insert: {
          chapter_key?: string | null
          created_at?: string
          duration_sec: number
          ended_at: string
          id?: string
          mode?: string
          started_at: string
          subject?: string | null
          user_id: string
        }
        Update: {
          chapter_key?: string | null
          created_at?: string
          duration_sec?: number
          ended_at?: string
          id?: string
          mode?: string
          started_at?: string
          subject?: string | null
          user_id?: string
        }
        Relationships: []
      }
      missions: {
        Row: {
          chapter_key: string | null
          completed: boolean
          completed_at: string | null
          created_at: string
          due_date: string | null
          external_id: string | null
          id: string
          notes: string | null
          pinned: boolean
          priority: string
          source: string
          subject: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter_key?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          external_id?: string | null
          id?: string
          notes?: string | null
          pinned?: boolean
          priority?: string
          source?: string
          subject: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          chapter_key?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          external_id?: string | null
          id?: string
          notes?: string | null
          pinned?: boolean
          priority?: string
          source?: string
          subject?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          admin_rights: boolean
          class_level: string | null
          coaching: string
          created_at: string
          daily_goal_minutes: number
          exam: string
          institute_tests_pattern: string
          name: string
          onboarded: boolean
          sleep_time: string
          target_year: number | null
          updated_at: string
          user_id: string
          wake_time: string
          weekly_off_day: number
        }
        Insert: {
          admin_rights?: boolean
          class_level?: string | null
          coaching?: string
          created_at?: string
          daily_goal_minutes?: number
          exam?: string
          institute_tests_pattern?: string
          name?: string
          onboarded?: boolean
          sleep_time?: string
          target_year?: number | null
          updated_at?: string
          user_id: string
          wake_time?: string
          weekly_off_day?: number
        }
        Update: {
          admin_rights?: boolean
          class_level?: string | null
          coaching?: string
          created_at?: string
          daily_goal_minutes?: number
          exam?: string
          institute_tests_pattern?: string
          name?: string
          onboarded?: boolean
          sleep_time?: string
          target_year?: number | null
          updated_at?: string
          user_id?: string
          wake_time?: string
          weekly_off_day?: number
        }
        Relationships: []
      }
      tests: {
        Row: {
          created_at: string
          external_id: string | null
          id: string
          max_score: number | null
          name: string
          notes: string
          score: number | null
          source: string
          status: string
          subjects: string[]
          syllabus: string
          test_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          external_id?: string | null
          id?: string
          max_score?: number | null
          name: string
          notes?: string
          score?: number | null
          source?: string
          status?: string
          subjects?: string[]
          syllabus?: string
          test_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          external_id?: string | null
          id?: string
          max_score?: number | null
          name?: string
          notes?: string
          score?: number | null
          source?: string
          status?: string
          subjects?: string[]
          syllabus?: string
          test_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: { _user_id: string }; Returns: boolean }
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
  public: {
    Enums: {},
  },
} as const
