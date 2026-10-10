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
  public: {
    Tables: {
      mission_events: {
        Row: {
          client_key: string
          created_at: string
          description: string
          event_type: string
          id: string
          mission_minute: number
          player_decision: string | null
          resource_impact: Json
          run_id: string
          severity: string
          title: string
        }
        Insert: {
          client_key: string
          created_at?: string
          description?: string
          event_type: string
          id?: string
          mission_minute?: number
          player_decision?: string | null
          resource_impact?: Json
          run_id: string
          severity?: string
          title: string
        }
        Update: {
          client_key?: string
          created_at?: string
          description?: string
          event_type?: string
          id?: string
          mission_minute?: number
          player_decision?: string | null
          resource_impact?: Json
          run_id?: string
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_events_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "mission_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_runs: {
        Row: {
          difficulty: string
          ended_at: string | null
          final_outcome: string | null
          id: string
          mission_id: string
          player_token: string
          score: number
          started_at: string
          status: string
          summary: Json | null
          updated_at: string
        }
        Insert: {
          difficulty?: string
          ended_at?: string | null
          final_outcome?: string | null
          id?: string
          mission_id: string
          player_token: string
          score?: number
          started_at?: string
          status?: string
          summary?: Json | null
          updated_at?: string
        }
        Update: {
          difficulty?: string
          ended_at?: string | null
          final_outcome?: string | null
          id?: string
          mission_id?: string
          player_token?: string
          score?: number
          started_at?: string
          status?: string
          summary?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_runs_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_tasks: {
        Row: {
          created_at: string
          description: string
          id: string
          mission_id: string
          priority: number
          required_resources: Json
          target: string
          task_type: string
          title: string
          xp: number
        }
        Insert: {
          created_at?: string
          description?: string
          id: string
          mission_id: string
          priority: number
          required_resources?: Json
          target: string
          task_type: string
          title: string
          xp?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          mission_id?: string
          priority?: number
          required_resources?: Json
          target?: string
          task_type?: string
          title?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "mission_tasks_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      missions: {
        Row: {
          created_at: string
          difficulty: string
          environment: string
          id: string
          name: string
          status: string
        }
        Insert: {
          created_at?: string
          difficulty?: string
          environment: string
          id: string
          name: string
          status?: string
        }
        Update: {
          created_at?: string
          difficulty?: string
          environment?: string
          id?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
      resource_snapshots: {
        Row: {
          created_at: string
          crew_stability: number
          food: number
          id: string
          life_support: number
          mission_minute: number
          power: number
          radiation_safety: number
          run_id: string
          water: number
        }
        Insert: {
          created_at?: string
          crew_stability: number
          food: number
          id?: string
          life_support: number
          mission_minute: number
          power: number
          radiation_safety: number
          run_id: string
          water: number
        }
        Update: {
          created_at?: string
          crew_stability?: number
          food?: number
          id?: string
          life_support?: number
          mission_minute?: number
          power?: number
          radiation_safety?: number
          run_id?: string
          water?: number
        }
        Relationships: [
          {
            foreignKeyName: "resource_snapshots_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "mission_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      task_completions: {
        Row: {
          completed_at: string
          id: string
          mission_minute: number
          player_action: string | null
          run_id: string
          status: string
          task_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          mission_minute?: number
          player_action?: string | null
          run_id: string
          status?: string
          task_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          mission_minute?: number
          player_action?: string | null
          run_id?: string
          status?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_completions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "mission_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_completions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "mission_tasks"
            referencedColumns: ["id"]
          },
        ]
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
