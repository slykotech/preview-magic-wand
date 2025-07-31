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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      ai_coach_messages: {
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
            foreignKeyName: "ai_coach_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_coach_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_coach_sessions: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          couple_id: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      couple_preferences: {
        Row: {
          couple_id: string
          created_at: string
          id: string
          love_languages: Json | null
          notification_time: string | null
          relationship_goals: Json | null
          reminder_frequency: string | null
          updated_at: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          id?: string
          love_languages?: Json | null
          notification_time?: string | null
          relationship_goals?: Json | null
          reminder_frequency?: string | null
          updated_at?: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          id?: string
          love_languages?: Json | null
          notification_time?: string | null
          relationship_goals?: Json | null
          reminder_frequency?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      couples: {
        Row: {
          anniversary_date: string | null
          created_at: string
          id: string
          relationship_status:
            | Database["public"]["Enums"]["relationship_status"]
            | null
          updated_at: string
          user1_id: string
          user1_nickname_for_user1: string | null
          user1_nickname_for_user2: string | null
          user2_id: string
          user2_nickname_for_user1: string | null
          user2_nickname_for_user2: string | null
        }
        Insert: {
          anniversary_date?: string | null
          created_at?: string
          id?: string
          relationship_status?:
            | Database["public"]["Enums"]["relationship_status"]
            | null
          updated_at?: string
          user1_id: string
          user1_nickname_for_user1?: string | null
          user1_nickname_for_user2?: string | null
          user2_id: string
          user2_nickname_for_user1?: string | null
          user2_nickname_for_user2?: string | null
        }
        Update: {
          anniversary_date?: string | null
          created_at?: string
          id?: string
          relationship_status?:
            | Database["public"]["Enums"]["relationship_status"]
            | null
          updated_at?: string
          user1_id?: string
          user1_nickname_for_user1?: string | null
          user1_nickname_for_user2?: string | null
          user2_id?: string
          user2_nickname_for_user1?: string | null
          user2_nickname_for_user2?: string | null
        }
        Relationships: []
      }
      daily_checkins: {
        Row: {
          checkin_date: string
          couple_id: string
          created_at: string
          energy_level: number | null
          gratitude: string | null
          id: string
          mood: Database["public"]["Enums"]["mood_type"]
          notes: string | null
          relationship_feeling: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          checkin_date?: string
          couple_id: string
          created_at?: string
          energy_level?: number | null
          gratitude?: string | null
          id?: string
          mood: Database["public"]["Enums"]["mood_type"]
          notes?: string | null
          relationship_feeling?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          checkin_date?: string
          couple_id?: string
          created_at?: string
          energy_level?: number | null
          gratitude?: string | null
          id?: string
          mood?: Database["public"]["Enums"]["mood_type"]
          notes?: string | null
          relationship_feeling?: string | null
          updated_at?: string
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
          category: string | null
          completed_date: string | null
          couple_id: string
          created_at: string
          created_by: string
          description: string | null
          estimated_cost: string | null
          estimated_duration: string | null
          id: string
          is_completed: boolean | null
          location: string | null
          notes: string | null
          rating: number | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          completed_date?: string | null
          couple_id: string
          created_at?: string
          created_by: string
          description?: string | null
          estimated_cost?: string | null
          estimated_duration?: string | null
          id?: string
          is_completed?: boolean | null
          location?: string | null
          notes?: string | null
          rating?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          completed_date?: string | null
          couple_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          estimated_cost?: string | null
          estimated_duration?: string | null
          id?: string
          is_completed?: boolean | null
          location?: string | null
          notes?: string | null
          rating?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "date_ideas_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      memories: {
        Row: {
          couple_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          image_url: string | null
          is_favorite: boolean | null
          memory_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_favorite?: boolean | null
          memory_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_favorite?: boolean | null
          memory_date?: string | null
          title?: string
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
      memory_images: {
        Row: {
          created_at: string
          file_name: string | null
          id: string
          image_url: string
          memory_id: string
          upload_order: number | null
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          id?: string
          image_url: string
          memory_id: string
          upload_order?: number | null
        }
        Update: {
          created_at?: string
          file_name?: string | null
          id?: string
          image_url?: string
          memory_id?: string
          upload_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "memory_images_memory_id_fkey"
            columns: ["memory_id"]
            isOneToOne: false
            referencedRelation: "memories"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean | null
          message_text: string
          message_type: string | null
          sender_id: string
          updated_at: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          message_text: string
          message_type?: string | null
          sender_id: string
          updated_at?: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          message_text?: string
          message_type?: string | null
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: string | null
          couple_id: string
          created_at: string
          created_by: string
          id: string
          is_favorite: boolean | null
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          couple_id: string
          created_at?: string
          created_by: string
          id?: string
          is_favorite?: boolean | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          couple_id?: string
          created_at?: string
          created_by?: string
          id?: string
          is_favorite?: boolean | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      relationship_insights: {
        Row: {
          couple_id: string
          created_at: string
          description: string
          expires_at: string | null
          id: string
          insight_type: string
          is_read: boolean | null
          priority: number | null
          title: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          description: string
          expires_at?: string | null
          id?: string
          insight_type: string
          is_read?: boolean | null
          priority?: number | null
          title: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          description?: string
          expires_at?: string | null
          id?: string
          insight_type?: string
          is_read?: boolean | null
          priority?: number | null
          title?: string
        }
        Relationships: []
      }
      stories: {
        Row: {
          caption: string | null
          couple_id: string
          created_at: string
          expires_at: string
          id: string
          image_url: string
          user_id: string
          view_count: number | null
        }
        Insert: {
          caption?: string | null
          couple_id: string
          created_at?: string
          expires_at?: string
          id?: string
          image_url: string
          user_id: string
          view_count?: number | null
        }
        Update: {
          caption?: string | null
          couple_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          image_url?: string
          user_id?: string
          view_count?: number | null
        }
        Relationships: []
      }
      story_responses: {
        Row: {
          created_at: string
          id: string
          response_text: string
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          response_text: string
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          response_text?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_responses_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_views: {
        Row: {
          id: string
          story_id: string
          viewed_at: string
          viewer_id: string
        }
        Insert: {
          id?: string
          story_id: string
          viewed_at?: string
          viewer_id: string
        }
        Update: {
          id?: string
          story_id?: string
          viewed_at?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_scores: {
        Row: {
          calculated_date: string
          couple_id: string
          created_at: string
          factors: Json | null
          id: string
          score: number
          updated_at: string
        }
        Insert: {
          calculated_date?: string
          couple_id: string
          created_at?: string
          factors?: Json | null
          id?: string
          score: number
          updated_at?: string
        }
        Update: {
          calculated_date?: string
          couple_id?: string
          created_at?: string
          factors?: Json | null
          id?: string
          score?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_sync_score: {
        Args: { p_couple_id: string }
        Returns: number
      }
      generate_relationship_insights: {
        Args: { p_couple_id: string }
        Returns: undefined
      }
    }
    Enums: {
      mood_type:
        | "excited"
        | "happy"
        | "content"
        | "anxious"
        | "sad"
        | "stressed"
      relationship_status: "dating" | "engaged" | "married" | "partnered"
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
      mood_type: ["excited", "happy", "content", "anxious", "sad", "stressed"],
      relationship_status: ["dating", "engaged", "married", "partnered"],
    },
  },
} as const
