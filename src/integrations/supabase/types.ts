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
      chapter_meta: {
        Row: {
          actual_hours: number
          bookmarked: boolean
          chapter_key: string
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
          id: string
          notes: string | null
          pinned: boolean
          priority: string
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
          id?: string
          notes?: string | null
          pinned?: boolean
          priority?: string
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
          id?: string
          notes?: string | null
          pinned?: boolean
          priority?: string
          subject?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          class_level: string | null
          coaching: string
          created_at: string
          daily_goal_minutes: number
          exam: string
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
          class_level?: string | null
          coaching?: string
          created_at?: string
          daily_goal_minutes?: number
          exam?: string
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
          class_level?: string | null
          coaching?: string
          created_at?: string
          daily_goal_minutes?: number
          exam?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
