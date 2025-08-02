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
      couple_activity_log: {
        Row: {
          activity_data: Json | null
          activity_type: string
          couple_id: string
          created_at: string
          id: string
          points_awarded: number | null
          user_id: string
        }
        Insert: {
          activity_data?: Json | null
          activity_type: string
          couple_id: string
          created_at?: string
          id?: string
          points_awarded?: number | null
          user_id: string
        }
        Update: {
          activity_data?: Json | null
          activity_type?: string
          couple_id?: string
          created_at?: string
          id?: string
          points_awarded?: number | null
          user_id?: string
        }
        Relationships: []
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
          checkin_streak: number | null
          created_at: string
          disconnection_count: number | null
          id: string
          last_activity_date: string | null
          last_sync_score: number | null
          relationship_status:
            | Database["public"]["Enums"]["relationship_status"]
            | null
          story_streak: number | null
          total_relationship_days: number | null
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
          checkin_streak?: number | null
          created_at?: string
          disconnection_count?: number | null
          id?: string
          last_activity_date?: string | null
          last_sync_score?: number | null
          relationship_status?:
            | Database["public"]["Enums"]["relationship_status"]
            | null
          story_streak?: number | null
          total_relationship_days?: number | null
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
          checkin_streak?: number | null
          created_at?: string
          disconnection_count?: number | null
          id?: string
          last_activity_date?: string | null
          last_sync_score?: number | null
          relationship_status?:
            | Database["public"]["Enums"]["relationship_status"]
            | null
          story_streak?: number | null
          total_relationship_days?: number | null
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
          scheduled_date: string | null
          scheduled_time: string | null
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
          scheduled_date?: string | null
          scheduled_time?: string | null
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
          scheduled_date?: string | null
          scheduled_time?: string | null
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
      historical_sync_scores: {
        Row: {
          calculated_date: string
          checkin_points: number | null
          communication_points: number | null
          couple_id: string
          created_at: string
          factors: Json | null
          id: string
          milestone_points: number | null
          score: number
          story_points: number | null
          streak_bonus: number | null
        }
        Insert: {
          calculated_date?: string
          checkin_points?: number | null
          communication_points?: number | null
          couple_id: string
          created_at?: string
          factors?: Json | null
          id?: string
          milestone_points?: number | null
          score: number
          story_points?: number | null
          streak_bonus?: number | null
        }
        Update: {
          calculated_date?: string
          checkin_points?: number | null
          communication_points?: number | null
          couple_id?: string
          created_at?: string
          factors?: Json | null
          id?: string
          milestone_points?: number | null
          score?: number
          story_points?: number | null
          streak_bonus?: number | null
        }
        Relationships: []
      }
      important_dates: {
        Row: {
          couple_id: string
          created_at: string
          created_by: string
          date_type: string
          date_value: string
          description: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          created_by: string
          date_type?: string
          date_value: string
          description?: string | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          created_by?: string
          date_type?: string
          date_value?: string
          description?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
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
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: []
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
      partner_requests: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          requested_email: string
          requested_user_id: string | null
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          requested_email: string
          requested_user_id?: string | null
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          requested_email?: string
          requested_user_id?: string | null
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      pending_verifications: {
        Row: {
          completed_at: string | null
          created_at: string
          email: string
          expires_at: string
          first_name: string
          id: string
          last_name: string
          password_hash: string
          status: string
          user_id: string | null
          verification_token: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          first_name: string
          id?: string
          last_name: string
          password_hash: string
          status?: string
          user_id?: string | null
          verification_token: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          first_name?: string
          id?: string
          last_name?: string
          password_hash?: string
          status?: string
          user_id?: string | null
          verification_token?: string
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
      signup_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          expires_at: string
          id: string
          invitation_token: string
          invitee_email: string
          inviter_id: string
          sent_at: string
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invitation_token: string
          invitee_email: string
          inviter_id: string
          sent_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invitation_token?: string
          invitee_email?: string
          inviter_id?: string
          sent_at?: string
          status?: string
          updated_at?: string
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
          checkin_points: number | null
          communication_points: number | null
          couple_id: string
          created_at: string
          factors: Json | null
          id: string
          milestone_points: number | null
          previous_score: number | null
          score: number
          story_points: number | null
          streak_bonus: number | null
          updated_at: string
        }
        Insert: {
          calculated_date?: string
          checkin_points?: number | null
          communication_points?: number | null
          couple_id: string
          created_at?: string
          factors?: Json | null
          id?: string
          milestone_points?: number | null
          previous_score?: number | null
          score: number
          story_points?: number | null
          streak_bonus?: number | null
          updated_at?: string
        }
        Update: {
          calculated_date?: string
          checkin_points?: number | null
          communication_points?: number | null
          couple_id?: string
          created_at?: string
          factors?: Json | null
          id?: string
          milestone_points?: number | null
          previous_score?: number | null
          score?: number
          story_points?: number | null
          streak_bonus?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      user_conversation_clears: {
        Row: {
          cleared_at: string
          conversation_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          cleared_at?: string
          conversation_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          cleared_at?: string
          conversation_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_signup_invitation: {
        Args: { p_invitation_token: string; p_new_user_id: string }
        Returns: Json
      }
      calculate_enhanced_sync_score: {
        Args: { p_couple_id: string }
        Returns: number
      }
      calculate_sync_score: {
        Args: { p_couple_id: string }
        Returns: number
      }
      cleanup_expired_verifications: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_signup_invitation: {
        Args: { p_invitee_email: string; p_inviter_name?: string }
        Returns: Json
      }
      expire_old_partner_requests: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_invitation_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_relationship_insights: {
        Args: { p_couple_id: string }
        Returns: undefined
      }
      log_couple_activity: {
        Args: {
          p_couple_id: string
          p_user_id: string
          p_activity_type: string
          p_activity_data?: Json
          p_points_awarded?: number
        }
        Returns: undefined
      }
      purge_user_completely: {
        Args: { user_email: string }
        Returns: Json
      }
      update_couple_streaks: {
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
