export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      ai_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_sessions: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      couples: {
        Row: {
          created_at: string
          id: string
          relationship_start_date: string
          status: string | null
          user1_id: string
          user2_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          relationship_start_date: string
          status?: string | null
          user1_id: string
          user2_id: string
        }
        Update: {
          created_at?: string
          id?: string
          relationship_start_date?: string
          status?: string | null
          user1_id?: string
          user2_id?: string
        }
        Relationships: []
      }
      daily_checkins: {
        Row: {
          checkin_date: string
          couple_id: string
          created_at: string
          energy_level: number | null
          id: string
          message: string | null
          mood: Database["public"]["Enums"]["mood_type"]
          relationship_satisfaction: number | null
          user_id: string
        }
        Insert: {
          checkin_date?: string
          couple_id: string
          created_at?: string
          energy_level?: number | null
          id?: string
          message?: string | null
          mood: Database["public"]["Enums"]["mood_type"]
          relationship_satisfaction?: number | null
          user_id: string
        }
        Update: {
          checkin_date?: string
          couple_id?: string
          created_at?: string
          energy_level?: number | null
          id?: string
          message?: string | null
          mood?: Database["public"]["Enums"]["mood_type"]
          relationship_satisfaction?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_checkins_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      date_ideas: {
        Row: {
          category: Database["public"]["Enums"]["date_category"]
          created_at: string
          created_by: string | null
          description: string | null
          duration_hours: number | null
          estimated_cost: string | null
          id: string
          is_public: boolean | null
          location_type: string | null
          title: string
        }
        Insert: {
          category: Database["public"]["Enums"]["date_category"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_hours?: number | null
          estimated_cost?: string | null
          id?: string
          is_public?: boolean | null
          location_type?: string | null
          title: string
        }
        Update: {
          category?: Database["public"]["Enums"]["date_category"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_hours?: number | null
          estimated_cost?: string | null
          id?: string
          is_public?: boolean | null
          location_type?: string | null
          title?: string
        }
        Relationships: []
      }
      memories: {
        Row: {
          content: string | null
          couple_id: string
          created_at: string
          created_by: string
          id: string
          image_url: string | null
          is_favorite: boolean | null
          memory_date: string | null
          tags: string[] | null
          title: string | null
          type: Database["public"]["Enums"]["memory_type"]
          updated_at: string
        }
        Insert: {
          content?: string | null
          couple_id: string
          created_at?: string
          created_by: string
          id?: string
          image_url?: string | null
          is_favorite?: boolean | null
          memory_date?: string | null
          tags?: string[] | null
          title?: string | null
          type: Database["public"]["Enums"]["memory_type"]
          updated_at?: string
        }
        Update: {
          content?: string | null
          couple_id?: string
          created_at?: string
          created_by?: string
          id?: string
          image_url?: string | null
          is_favorite?: boolean | null
          memory_date?: string | null
          tags?: string[] | null
          title?: string | null
          type?: Database["public"]["Enums"]["memory_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "memories_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      planned_dates: {
        Row: {
          couple_id: string
          created_at: string
          created_by: string
          date_idea_id: string | null
          description: string | null
          id: string
          location: string | null
          scheduled_date: string | null
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          created_by: string
          date_idea_id?: string | null
          description?: string | null
          id?: string
          location?: string | null
          scheduled_date?: string | null
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          created_by?: string
          date_idea_id?: string | null
          description?: string | null
          id?: string
          location?: string | null
          scheduled_date?: string | null
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planned_dates_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planned_dates_date_idea_id_fkey"
            columns: ["date_idea_id"]
            isOneToOne: false
            referencedRelation: "date_ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          partner_id: string | null
          relationship_start_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          partner_id?: string | null
          relationship_start_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          partner_id?: string | null
          relationship_start_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      relationship_quests: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          points: number | null
          requirements: Json | null
          title: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          points?: number | null
          requirements?: Json | null
          title: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          points?: number | null
          requirements?: Json | null
          title?: string
        }
        Relationships: []
      }
      sync_scores: {
        Row: {
          calculated_date: string
          couple_id: string
          created_at: string
          factors: Json | null
          id: string
          score: number | null
        }
        Insert: {
          calculated_date?: string
          couple_id: string
          created_at?: string
          factors?: Json | null
          id?: string
          score?: number | null
        }
        Update: {
          calculated_date?: string
          couple_id?: string
          created_at?: string
          factors?: Json | null
          id?: string
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_scores_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      user_quest_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string
          id: string
          progress: number | null
          quest_id: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          id?: string
          progress?: number | null
          quest_id: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          id?: string
          progress?: number | null
          quest_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_quest_progress_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "relationship_quests"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_sync_score: {
        Args: { couple_uuid: string }
        Returns: number
      }
    }
    Enums: {
      date_category:
        | "romantic"
        | "adventure"
        | "relaxed"
        | "creative"
        | "active"
        | "cultural"
      memory_type: "photo" | "journal" | "milestone"
      mood_type:
        | "excited"
        | "happy"
        | "content"
        | "anxious"
        | "sad"
        | "stressed"
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
      date_category: [
        "romantic",
        "adventure",
        "relaxed",
        "creative",
        "active",
        "cultural",
      ],
      memory_type: ["photo", "journal", "milestone"],
      mood_type: ["excited", "happy", "content", "anxious", "sad", "stressed"],
    },
  },
} as const
