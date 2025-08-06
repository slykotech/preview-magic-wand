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
      ai_coach_usage: {
        Row: {
          created_at: string
          id: string
          requests_count: number
          tokens_used: number
          updated_at: string
          usage_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          requests_count?: number
          tokens_used?: number
          updated_at?: string
          usage_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          requests_count?: number
          tokens_used?: number
          updated_at?: string
          usage_date?: string
          user_id?: string
        }
        Relationships: []
      }
      api_cost_config: {
        Row: {
          api_source: string
          cost_per_request: number
          free_tier_limit: number | null
          id: string
          is_active: boolean | null
          rate_limit_per_hour: number | null
          updated_at: string | null
        }
        Insert: {
          api_source: string
          cost_per_request: number
          free_tier_limit?: number | null
          id?: string
          is_active?: boolean | null
          rate_limit_per_hour?: number | null
          updated_at?: string | null
        }
        Update: {
          api_source?: string
          cost_per_request?: number
          free_tier_limit?: number | null
          id?: string
          is_active?: boolean | null
          rate_limit_per_hour?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      api_usage_logs: {
        Row: {
          api_source: string
          cost_estimate: number | null
          created_at: string | null
          endpoint: string
          error_message: string | null
          execution_time_ms: number | null
          id: string
          request_params: Json | null
          response_size: number | null
          success: boolean | null
          user_id: string | null
        }
        Insert: {
          api_source: string
          cost_estimate?: number | null
          created_at?: string | null
          endpoint: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          request_params?: Json | null
          response_size?: number | null
          success?: boolean | null
          user_id?: string | null
        }
        Update: {
          api_source?: string
          cost_estimate?: number | null
          created_at?: string | null
          endpoint?: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          request_params?: Json | null
          response_size?: number | null
          success?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      api_usage_tracking: {
        Row: {
          api_source_id: string | null
          created_at: string | null
          endpoint: string
          error_count: number | null
          id: string
          last_request_at: string | null
          requests_count: number | null
          success_count: number | null
          updated_at: string | null
        }
        Insert: {
          api_source_id?: string | null
          created_at?: string | null
          endpoint: string
          error_count?: number | null
          id?: string
          last_request_at?: string | null
          requests_count?: number | null
          success_count?: number | null
          updated_at?: string | null
        }
        Update: {
          api_source_id?: string | null
          created_at?: string | null
          endpoint?: string
          error_count?: number | null
          id?: string
          last_request_at?: string | null
          requests_count?: number | null
          success_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      card_games: {
        Row: {
          created_at: string
          description: string
          difficulty_level: string
          estimated_duration_minutes: number
          game_type: string
          id: string
          is_active: boolean
          lgbtq_inclusive: boolean
          max_players: number
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          difficulty_level?: string
          estimated_duration_minutes?: number
          game_type: string
          id?: string
          is_active?: boolean
          lgbtq_inclusive?: boolean
          max_players?: number
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          difficulty_level?: string
          estimated_duration_minutes?: number
          game_type?: string
          id?: string
          is_active?: boolean
          lgbtq_inclusive?: boolean
          max_players?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      card_responses: {
        Row: {
          card_id: string
          created_at: string
          id: string
          meaningful_response: boolean | null
          partner_rating: number | null
          response_audio_url: string | null
          response_text: string | null
          response_time_seconds: number | null
          response_video_url: string | null
          session_id: string
          user_id: string
        }
        Insert: {
          card_id: string
          created_at?: string
          id?: string
          meaningful_response?: boolean | null
          partner_rating?: number | null
          response_audio_url?: string | null
          response_text?: string | null
          response_time_seconds?: number | null
          response_video_url?: string | null
          session_id: string
          user_id: string
        }
        Update: {
          card_id?: string
          created_at?: string
          id?: string
          meaningful_response?: boolean | null
          partner_rating?: number | null
          response_audio_url?: string | null
          response_text?: string | null
          response_time_seconds?: number | null
          response_video_url?: string | null
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_card_responses_card"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "game_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_card_responses_session"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
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
      event_fetch_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          events_found: number | null
          id: string
          location_lat: number
          location_lng: number
          radius_km: number
          sources: string[]
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          events_found?: number | null
          id?: string
          location_lat: number
          location_lng: number
          radius_km?: number
          sources?: string[]
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          events_found?: number | null
          id?: string
          location_lat?: number
          location_lng?: number
          radius_km?: number
          sources?: string[]
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          end_date: string | null
          expires_at: string
          external_id: string
          id: string
          image_url: string | null
          latitude: number | null
          location: unknown | null
          location_name: string | null
          longitude: number | null
          organizer: string | null
          price: string | null
          source: string
          start_date: string
          title: string
          website_url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          expires_at?: string
          external_id: string
          id?: string
          image_url?: string | null
          latitude?: number | null
          location?: unknown | null
          location_name?: string | null
          longitude?: number | null
          organizer?: string | null
          price?: string | null
          source: string
          start_date: string
          title: string
          website_url?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          expires_at?: string
          external_id?: string
          id?: string
          image_url?: string | null
          latitude?: number | null
          location?: unknown | null
          location_name?: string | null
          longitude?: number | null
          organizer?: string | null
          price?: string | null
          source?: string
          start_date?: string
          title?: string
          website_url?: string | null
        }
        Relationships: []
      }
      game_achievements: {
        Row: {
          achievement_name: string
          achievement_type: string
          couple_id: string
          description: string
          icon_name: string
          id: string
          sync_score_bonus: number | null
          unlocked_at: string
        }
        Insert: {
          achievement_name: string
          achievement_type: string
          couple_id: string
          description: string
          icon_name: string
          id?: string
          sync_score_bonus?: number | null
          unlocked_at?: string
        }
        Update: {
          achievement_name?: string
          achievement_type?: string
          couple_id?: string
          description?: string
          icon_name?: string
          id?: string
          sync_score_bonus?: number | null
          unlocked_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_game_achievements_couple"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      game_cards: {
        Row: {
          card_number: number
          category: string
          created_at: string
          difficulty_level: string
          game_id: string
          id: string
          prompt: string
          requires_action: boolean
          requires_voice_response: boolean
          time_limit_seconds: number | null
          title: string
        }
        Insert: {
          card_number: number
          category: string
          created_at?: string
          difficulty_level?: string
          game_id: string
          id?: string
          prompt: string
          requires_action?: boolean
          requires_voice_response?: boolean
          time_limit_seconds?: number | null
          title: string
        }
        Update: {
          card_number?: number
          category?: string
          created_at?: string
          difficulty_level?: string
          game_id?: string
          id?: string
          prompt?: string
          requires_action?: boolean
          requires_voice_response?: boolean
          time_limit_seconds?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_game_cards_game"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "card_games"
            referencedColumns: ["id"]
          },
        ]
      }
      game_sessions: {
        Row: {
          completed_at: string | null
          couple_id: string
          created_at: string
          current_card_id: string | null
          game_id: string
          id: string
          player_turn: string | null
          session_data: Json | null
          started_at: string
          status: string
          total_cards_played: number
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          couple_id: string
          created_at?: string
          current_card_id?: string | null
          game_id: string
          id?: string
          player_turn?: string | null
          session_data?: Json | null
          started_at?: string
          status?: string
          total_cards_played?: number
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          couple_id?: string
          created_at?: string
          current_card_id?: string | null
          game_id?: string
          id?: string
          player_turn?: string | null
          session_data?: Json | null
          started_at?: string
          status?: string
          total_cards_played?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_game_sessions_couple"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_game_sessions_current_card"
            columns: ["current_card_id"]
            isOneToOne: false
            referencedRelation: "game_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_game_sessions_game"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "card_games"
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
      love_grants: {
        Row: {
          couple_id: string
          created_at: string
          game_session_id: string | null
          id: string
          request_text: string
          response_text: string | null
          status: string
          updated_at: string
          winner_name: string
          winner_symbol: string
          winner_user_id: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          game_session_id?: string | null
          id?: string
          request_text: string
          response_text?: string | null
          status?: string
          updated_at?: string
          winner_name: string
          winner_symbol: string
          winner_user_id: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          game_session_id?: string | null
          id?: string
          request_text?: string
          response_text?: string | null
          status?: string
          updated_at?: string
          winner_name?: string
          winner_symbol?: string
          winner_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "love_grants_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "love_grants_game_session_id_fkey"
            columns: ["game_session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
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
          invitation_context: string | null
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
          invitation_context?: string | null
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
          invitation_context?: string | null
          last_name?: string
          password_hash?: string
          status?: string
          user_id?: string | null
          verification_token?: string
        }
        Relationships: []
      }
      place_categories: {
        Row: {
          category_name: string
          created_at: string
          display_order: number | null
          google_place_types: string[]
          id: string
        }
        Insert: {
          category_name: string
          created_at?: string
          display_order?: number | null
          google_place_types: string[]
          id?: string
        }
        Update: {
          category_name?: string
          created_at?: string
          display_order?: number | null
          google_place_types?: string[]
          id?: string
        }
        Relationships: []
      }
      places: {
        Row: {
          address: string | null
          created_at: string
          google_data: Json | null
          google_place_id: string
          id: string
          is_open: boolean | null
          last_updated: string
          latitude: number
          location_context: Json | null
          longitude: number
          name: string
          opening_hours: Json | null
          phone: string | null
          photo_references: string[] | null
          place_types: string[]
          price_level: number | null
          rating: number | null
          website: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          google_data?: Json | null
          google_place_id: string
          id?: string
          is_open?: boolean | null
          last_updated?: string
          latitude: number
          location_context?: Json | null
          longitude: number
          name: string
          opening_hours?: Json | null
          phone?: string | null
          photo_references?: string[] | null
          place_types?: string[]
          price_level?: number | null
          rating?: number | null
          website?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          google_data?: Json | null
          google_place_id?: string
          id?: string
          is_open?: boolean | null
          last_updated?: string
          latitude?: number
          location_context?: Json | null
          longitude?: number
          name?: string
          opening_hours?: Json | null
          phone?: string | null
          photo_references?: string[] | null
          place_types?: string[]
          price_level?: number | null
          rating?: number | null
          website?: string | null
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
      scraping_logs: {
        Row: {
          completed_at: string | null
          error_message: string | null
          events_errors: number | null
          events_found: number | null
          events_inserted: number | null
          events_updated: number | null
          id: string
          source: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          events_errors?: number | null
          events_found?: number | null
          events_inserted?: number | null
          events_updated?: number | null
          id?: string
          source: string
          status: string
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          events_errors?: number | null
          events_found?: number | null
          events_inserted?: number | null
          events_updated?: number | null
          id?: string
          source?: string
          status?: string
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          action_type: string
          created_at: string
          details: Json | null
          id: string
          ip_address: unknown | null
          resource_id: string | null
          resource_type: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
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
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
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
      tic_toe_heart_games: {
        Row: {
          board: Json
          created_at: string
          current_player_id: string
          game_status: string
          id: string
          last_move_at: string | null
          moves_count: number
          session_id: string
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          board?: Json
          created_at?: string
          current_player_id: string
          game_status?: string
          id?: string
          last_move_at?: string | null
          moves_count?: number
          session_id: string
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          board?: Json
          created_at?: string
          current_player_id?: string
          game_status?: string
          id?: string
          last_move_at?: string | null
          moves_count?: number
          session_id?: string
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tic_toe_heart_games_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      tic_toe_moves: {
        Row: {
          created_at: string
          game_id: string
          id: string
          move_number: number
          player_id: string
          position_col: number
          position_row: number
          symbol: string
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          move_number: number
          player_id: string
          position_col: number
          position_row: number
          symbol: string
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          move_number?: number
          player_id?: string
          position_col?: number
          position_row?: number
          symbol?: string
        }
        Relationships: [
          {
            foreignKeyName: "tic_toe_moves_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "tic_toe_heart_games"
            referencedColumns: ["id"]
          },
        ]
      }
      user_api_quotas: {
        Row: {
          created_at: string | null
          daily_requests_limit: number | null
          daily_requests_used: number | null
          id: string
          monthly_cost_limit: number | null
          monthly_cost_used: number | null
          monthly_reset_date: string | null
          quota_reset_date: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          daily_requests_limit?: number | null
          daily_requests_used?: number | null
          id?: string
          monthly_cost_limit?: number | null
          monthly_cost_used?: number | null
          monthly_reset_date?: string | null
          quota_reset_date?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          daily_requests_limit?: number | null
          daily_requests_used?: number | null
          id?: string
          monthly_cost_limit?: number | null
          monthly_cost_used?: number | null
          monthly_reset_date?: string | null
          quota_reset_date?: string | null
          updated_at?: string | null
          user_id?: string | null
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
      user_event_preferences: {
        Row: {
          blacklisted_venues: string[] | null
          created_at: string
          id: string
          max_distance_km: number | null
          notification_enabled: boolean | null
          preferred_categories: string[] | null
          preferred_price_range: string | null
          preferred_times: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          blacklisted_venues?: string[] | null
          created_at?: string
          id?: string
          max_distance_km?: number | null
          notification_enabled?: boolean | null
          preferred_categories?: string[] | null
          preferred_price_range?: string | null
          preferred_times?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          blacklisted_venues?: string[] | null
          created_at?: string
          id?: string
          max_distance_km?: number | null
          notification_enabled?: boolean | null
          preferred_categories?: string[] | null
          preferred_price_range?: string | null
          preferred_times?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_location_cache: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          display_name: string
          id: string
          is_current: boolean | null
          latitude: number
          longitude: number
          search_radius: number | null
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          display_name: string
          id?: string
          is_current?: boolean | null
          latitude: number
          longitude: number
          search_radius?: number | null
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_current?: boolean | null
          latitude?: number
          longitude?: number
          search_radius?: number | null
          state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_saved_events: {
        Row: {
          couple_id: string | null
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          couple_id?: string | null
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          couple_id?: string | null
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_saved_events_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_saved_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown | null
          f_table_catalog: unknown | null
          f_table_name: unknown | null
          f_table_schema: unknown | null
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown | null
          f_table_catalog: string | null
          f_table_name: unknown | null
          f_table_schema: unknown | null
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown | null
          f_table_catalog?: string | null
          f_table_name?: unknown | null
          f_table_schema?: unknown | null
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown | null
          f_table_catalog?: string | null
          f_table_name?: unknown | null
          f_table_schema?: unknown | null
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { oldname: string; newname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { tbl: unknown; col: string }
        Returns: unknown
      }
      _postgis_pgsql_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      _postgis_scripts_pgsql_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      _postgis_selectivity: {
        Args: { tbl: unknown; att_name: string; geom: unknown; mode?: string }
        Returns: number
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_bestsrid: {
        Args: { "": unknown }
        Returns: number
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby: {
        Args:
          | { geog1: unknown; geog2: unknown }
          | { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_covers: {
        Args:
          | { geog1: unknown; geog2: unknown }
          | { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_pointoutside: {
        Args: { "": unknown }
        Returns: unknown
      }
      _st_sortablehash: {
        Args: { geom: unknown }
        Returns: number
      }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          g1: unknown
          clip?: unknown
          tolerance?: number
          return_polygons?: boolean
        }
        Returns: unknown
      }
      _st_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      accept_signup_invitation: {
        Args: { p_invitation_token: string; p_new_user_id: string }
        Returns: Json
      }
      addauth: {
        Args: { "": string }
        Returns: boolean
      }
      addgeometrycolumn: {
        Args:
          | {
              catalog_name: string
              schema_name: string
              table_name: string
              column_name: string
              new_srid_in: number
              new_type: string
              new_dim: number
              use_typmod?: boolean
            }
          | {
              schema_name: string
              table_name: string
              column_name: string
              new_srid: number
              new_type: string
              new_dim: number
              use_typmod?: boolean
            }
          | {
              table_name: string
              column_name: string
              new_srid: number
              new_type: string
              new_dim: number
              use_typmod?: boolean
            }
        Returns: string
      }
      box: {
        Args: { "": unknown } | { "": unknown }
        Returns: unknown
      }
      box2d: {
        Args: { "": unknown } | { "": unknown }
        Returns: unknown
      }
      box2d_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      box2d_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      box2df_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      box2df_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      box3d: {
        Args: { "": unknown } | { "": unknown }
        Returns: unknown
      }
      box3d_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      box3d_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      box3dtobox: {
        Args: { "": unknown }
        Returns: unknown
      }
      bytea: {
        Args: { "": unknown } | { "": unknown }
        Returns: string
      }
      calculate_enhanced_sync_score: {
        Args: { p_couple_id: string }
        Returns: number
      }
      calculate_sync_score: {
        Args: { p_couple_id: string }
        Returns: number
      }
      check_user_quota: {
        Args: { p_user_id: string; p_estimated_cost?: number }
        Returns: Json
      }
      cleanup_demo_connection: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      cleanup_expired_verifications: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_signup_invitation: {
        Args: { p_invitee_email: string; p_inviter_name?: string }
        Returns: Json
      }
      disablelongtransactions: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      dropgeometrycolumn: {
        Args:
          | {
              catalog_name: string
              schema_name: string
              table_name: string
              column_name: string
            }
          | { schema_name: string; table_name: string; column_name: string }
          | { table_name: string; column_name: string }
        Returns: string
      }
      dropgeometrytable: {
        Args:
          | { catalog_name: string; schema_name: string; table_name: string }
          | { schema_name: string; table_name: string }
          | { table_name: string }
        Returns: string
      }
      enablelongtransactions: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      equals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      expire_old_partner_requests: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      find_duplicate_event: {
        Args: {
          p_title: string
          p_event_date: string
          p_location_name: string
          p_latitude?: number
          p_longitude?: number
          p_organizer?: string
        }
        Returns: string
      }
      find_nearby_events: {
        Args: { lat: number; lng: number; radius_km?: number }
        Returns: {
          id: string
          title: string
          description: string
          start_date: string
          end_date: string
          location_name: string
          latitude: number
          longitude: number
          price: string
          organizer: string
          category: string
          website_url: string
          image_url: string
          source: string
          external_id: string
          distance_km: number
          created_at: string
        }[]
      }
      find_nearby_places: {
        Args:
          | {
              search_lat: number
              search_lng: number
              radius_km?: number
              category_filter?: string
            }
          | {
              search_lat: number
              search_lng: number
              radius_km?: number
              category_filter?: string
              city_name?: string
            }
          | {
              user_lat: number
              user_lng: number
              radius_km?: number
              category_filter?: string
            }
        Returns: {
          id: string
          google_place_id: string
          name: string
          address: string
          latitude: number
          longitude: number
          place_types: string[]
          rating: number
          price_level: number
          photo_references: string[]
          phone: string
          website: string
          opening_hours: Json
          is_open: boolean
          distance_km: number
        }[]
      }
      generate_cache_key: {
        Args: { p_country: string; p_region?: string; p_city?: string }
        Returns: string
      }
      generate_event_hash: {
        Args: {
          p_title: string
          p_event_date: string
          p_location_name: string
          p_organizer?: string
        }
        Returns: string
      }
      generate_invitation_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_relationship_insights: {
        Args: { p_couple_id: string }
        Returns: undefined
      }
      geography: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      geography_analyze: {
        Args: { "": unknown }
        Returns: boolean
      }
      geography_gist_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      geography_gist_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      geography_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      geography_send: {
        Args: { "": unknown }
        Returns: string
      }
      geography_spgist_compress_nd: {
        Args: { "": unknown }
        Returns: unknown
      }
      geography_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      geography_typmod_out: {
        Args: { "": number }
        Returns: unknown
      }
      geometry: {
        Args:
          | { "": string }
          | { "": string }
          | { "": unknown }
          | { "": unknown }
          | { "": unknown }
          | { "": unknown }
          | { "": unknown }
          | { "": unknown }
        Returns: unknown
      }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_analyze: {
        Args: { "": unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gist_compress_2d: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_gist_compress_nd: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_gist_decompress_2d: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_gist_decompress_nd: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_gist_sortsupport_2d: {
        Args: { "": unknown }
        Returns: undefined
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_hash: {
        Args: { "": unknown }
        Returns: number
      }
      geometry_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_recv: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_send: {
        Args: { "": unknown }
        Returns: string
      }
      geometry_sortsupport: {
        Args: { "": unknown }
        Returns: undefined
      }
      geometry_spgist_compress_2d: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_spgist_compress_3d: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_spgist_compress_nd: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      geometry_typmod_out: {
        Args: { "": number }
        Returns: unknown
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometrytype: {
        Args: { "": unknown } | { "": unknown }
        Returns: string
      }
      geomfromewkb: {
        Args: { "": string }
        Returns: unknown
      }
      geomfromewkt: {
        Args: { "": string }
        Returns: unknown
      }
      get_events_within_radius: {
        Args: {
          user_lat: number
          user_lng: number
          radius_km?: number
          country_filter?: string
          category_filter?: string
          limit_count?: number
        }
        Returns: {
          id: string
          title: string
          description: string
          start_date: string
          end_date: string
          venue_name: string
          venue_address: string
          city: string
          state_province: string
          country: string
          latitude: number
          longitude: number
          category: string
          subcategory: string
          tags: string[]
          price_min: number
          price_max: number
          currency_code: string
          is_free: boolean
          image_url: string
          source: string
          external_id: string
          external_url: string
          booking_url: string
          organizer_name: string
          language: string
          timezone: string
          distance_km: number
        }[]
      }
      get_proj4_from_srid: {
        Args: { "": number }
        Returns: string
      }
      gettransactionid: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      gidx_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gidx_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      hash_password: {
        Args: { password: string }
        Returns: string
      }
      json: {
        Args: { "": unknown }
        Returns: Json
      }
      jsonb: {
        Args: { "": unknown }
        Returns: Json
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
      log_security_event: {
        Args: {
          p_user_id?: string
          p_action_type?: string
          p_resource_type?: string
          p_resource_id?: string
          p_details?: Json
        }
        Returns: undefined
      }
      longtransactionsenabled: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      path: {
        Args: { "": unknown }
        Returns: unknown
      }
      pgis_asflatgeobuf_finalfn: {
        Args: { "": unknown }
        Returns: string
      }
      pgis_asgeobuf_finalfn: {
        Args: { "": unknown }
        Returns: string
      }
      pgis_asmvt_finalfn: {
        Args: { "": unknown }
        Returns: string
      }
      pgis_asmvt_serialfn: {
        Args: { "": unknown }
        Returns: string
      }
      pgis_geometry_clusterintersecting_finalfn: {
        Args: { "": unknown }
        Returns: unknown[]
      }
      pgis_geometry_clusterwithin_finalfn: {
        Args: { "": unknown }
        Returns: unknown[]
      }
      pgis_geometry_collect_finalfn: {
        Args: { "": unknown }
        Returns: unknown
      }
      pgis_geometry_makeline_finalfn: {
        Args: { "": unknown }
        Returns: unknown
      }
      pgis_geometry_polygonize_finalfn: {
        Args: { "": unknown }
        Returns: unknown
      }
      pgis_geometry_union_parallel_finalfn: {
        Args: { "": unknown }
        Returns: unknown
      }
      pgis_geometry_union_parallel_serialfn: {
        Args: { "": unknown }
        Returns: string
      }
      point: {
        Args: { "": unknown }
        Returns: unknown
      }
      polygon: {
        Args: { "": unknown }
        Returns: unknown
      }
      populate_geometry_columns: {
        Args:
          | { tbl_oid: unknown; use_typmod?: boolean }
          | { use_typmod?: boolean }
        Returns: string
      }
      postgis_addbbox: {
        Args: { "": unknown }
        Returns: unknown
      }
      postgis_constraint_dims: {
        Args: { geomschema: string; geomtable: string; geomcolumn: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomschema: string; geomtable: string; geomcolumn: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomschema: string; geomtable: string; geomcolumn: string }
        Returns: string
      }
      postgis_dropbbox: {
        Args: { "": unknown }
        Returns: unknown
      }
      postgis_extensions_upgrade: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_full_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_geos_noop: {
        Args: { "": unknown }
        Returns: unknown
      }
      postgis_geos_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_getbbox: {
        Args: { "": unknown }
        Returns: unknown
      }
      postgis_hasbbox: {
        Args: { "": unknown }
        Returns: boolean
      }
      postgis_index_supportfn: {
        Args: { "": unknown }
        Returns: unknown
      }
      postgis_lib_build_date: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_lib_revision: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_lib_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_libjson_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_liblwgeom_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_libprotobuf_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_libxml_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_noop: {
        Args: { "": unknown }
        Returns: unknown
      }
      postgis_proj_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_scripts_build_date: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_scripts_installed: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_scripts_released: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_svn_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_type_name: {
        Args: {
          geomname: string
          coord_dimension: number
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_typmod_dims: {
        Args: { "": number }
        Returns: number
      }
      postgis_typmod_srid: {
        Args: { "": number }
        Returns: number
      }
      postgis_typmod_type: {
        Args: { "": number }
        Returns: string
      }
      postgis_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_wagyu_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      purge_user_completely: {
        Args: { user_email: string }
        Returns: Json
      }
      reset_daily_quotas: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      reset_monthly_quotas: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      should_scrape_region: {
        Args: { p_country: string; p_region?: string; p_city?: string }
        Returns: boolean
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      spheroid_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      spheroid_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlength: {
        Args: { "": unknown }
        Returns: number
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dperimeter: {
        Args: { "": unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle: {
        Args:
          | { line1: unknown; line2: unknown }
          | { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
        Returns: number
      }
      st_area: {
        Args:
          | { "": string }
          | { "": unknown }
          | { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_area2d: {
        Args: { "": unknown }
        Returns: number
      }
      st_asbinary: {
        Args: { "": unknown } | { "": unknown }
        Returns: string
      }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkb: {
        Args: { "": unknown }
        Returns: string
      }
      st_asewkt: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      st_asgeojson: {
        Args:
          | { "": string }
          | { geog: unknown; maxdecimaldigits?: number; options?: number }
          | { geom: unknown; maxdecimaldigits?: number; options?: number }
          | {
              r: Record<string, unknown>
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
            }
        Returns: string
      }
      st_asgml: {
        Args:
          | { "": string }
          | {
              geog: unknown
              maxdecimaldigits?: number
              options?: number
              nprefix?: string
              id?: string
            }
          | { geom: unknown; maxdecimaldigits?: number; options?: number }
          | {
              version: number
              geog: unknown
              maxdecimaldigits?: number
              options?: number
              nprefix?: string
              id?: string
            }
          | {
              version: number
              geom: unknown
              maxdecimaldigits?: number
              options?: number
              nprefix?: string
              id?: string
            }
        Returns: string
      }
      st_ashexewkb: {
        Args: { "": unknown }
        Returns: string
      }
      st_askml: {
        Args:
          | { "": string }
          | { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
          | { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
        Returns: string
      }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: {
        Args: { geom: unknown; format?: string }
        Returns: string
      }
      st_asmvtgeom: {
        Args: {
          geom: unknown
          bounds: unknown
          extent?: number
          buffer?: number
          clip_geom?: boolean
        }
        Returns: unknown
      }
      st_assvg: {
        Args:
          | { "": string }
          | { geog: unknown; rel?: number; maxdecimaldigits?: number }
          | { geom: unknown; rel?: number; maxdecimaldigits?: number }
        Returns: string
      }
      st_astext: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      st_astwkb: {
        Args:
          | {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_z?: number
              prec_m?: number
              with_sizes?: boolean
              with_boxes?: boolean
            }
          | {
              geom: unknown
              prec?: number
              prec_z?: number
              prec_m?: number
              with_sizes?: boolean
              with_boxes?: boolean
            }
        Returns: string
      }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth: {
        Args:
          | { geog1: unknown; geog2: unknown }
          | { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_boundary: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_boundingdiagonal: {
        Args: { geom: unknown; fits?: boolean }
        Returns: unknown
      }
      st_buffer: {
        Args:
          | { geom: unknown; radius: number; options?: string }
          | { geom: unknown; radius: number; quadsegs: number }
        Returns: unknown
      }
      st_buildarea: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_centroid: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      st_cleangeometry: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_clipbybox2d: {
        Args: { geom: unknown; box: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_clusterintersecting: {
        Args: { "": unknown[] }
        Returns: unknown[]
      }
      st_collect: {
        Args: { "": unknown[] } | { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collectionextract: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_collectionhomogenize: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_concavehull: {
        Args: {
          param_geom: unknown
          param_pctconvex: number
          param_allow_holes?: boolean
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_convexhull: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_coorddim: {
        Args: { geometry: unknown }
        Returns: number
      }
      st_coveredby: {
        Args:
          | { geog1: unknown; geog2: unknown }
          | { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_covers: {
        Args:
          | { geog1: unknown; geog2: unknown }
          | { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_curvetoline: {
        Args: { geom: unknown; tol?: number; toltype?: number; flags?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { g1: unknown; tolerance?: number; flags?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_dimension: {
        Args: { "": unknown }
        Returns: number
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance: {
        Args:
          | { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
          | { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_distancesphere: {
        Args:
          | { geom1: unknown; geom2: unknown }
          | { geom1: unknown; geom2: unknown; radius: number }
        Returns: number
      }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dump: {
        Args: { "": unknown }
        Returns: Database["public"]["CompositeTypes"]["geometry_dump"][]
      }
      st_dumppoints: {
        Args: { "": unknown }
        Returns: Database["public"]["CompositeTypes"]["geometry_dump"][]
      }
      st_dumprings: {
        Args: { "": unknown }
        Returns: Database["public"]["CompositeTypes"]["geometry_dump"][]
      }
      st_dumpsegments: {
        Args: { "": unknown }
        Returns: Database["public"]["CompositeTypes"]["geometry_dump"][]
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_endpoint: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_envelope: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_equals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_expand: {
        Args:
          | { box: unknown; dx: number; dy: number }
          | { box: unknown; dx: number; dy: number; dz?: number }
          | { geom: unknown; dx: number; dy: number; dz?: number; dm?: number }
        Returns: unknown
      }
      st_exteriorring: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_flipcoordinates: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_force2d: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_force3d: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; zvalue?: number; mvalue?: number }
        Returns: unknown
      }
      st_forcecollection: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_forcecurve: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_forcepolygonccw: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_forcepolygoncw: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_forcerhr: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_forcesfs: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_generatepoints: {
        Args:
          | { area: unknown; npoints: number }
          | { area: unknown; npoints: number; seed: number }
        Returns: unknown
      }
      st_geogfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_geogfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_geographyfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_geohash: {
        Args:
          | { geog: unknown; maxchars?: number }
          | { geom: unknown; maxchars?: number }
        Returns: string
      }
      st_geomcollfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_geomcollfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_geometricmedian: {
        Args: {
          g: unknown
          tolerance?: number
          max_iter?: number
          fail_if_not_converged?: boolean
        }
        Returns: unknown
      }
      st_geometryfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_geometrytype: {
        Args: { "": unknown }
        Returns: string
      }
      st_geomfromewkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_geomfromewkt: {
        Args: { "": string }
        Returns: unknown
      }
      st_geomfromgeojson: {
        Args: { "": Json } | { "": Json } | { "": string }
        Returns: unknown
      }
      st_geomfromgml: {
        Args: { "": string }
        Returns: unknown
      }
      st_geomfromkml: {
        Args: { "": string }
        Returns: unknown
      }
      st_geomfrommarc21: {
        Args: { marc21xml: string }
        Returns: unknown
      }
      st_geomfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_geomfromtwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_geomfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_gmltosql: {
        Args: { "": string }
        Returns: unknown
      }
      st_hasarc: {
        Args: { geometry: unknown }
        Returns: boolean
      }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { size: number; cell_i: number; cell_j: number; origin?: unknown }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { size: number; bounds: unknown }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects: {
        Args:
          | { geog1: unknown; geog2: unknown }
          | { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_isclosed: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_iscollection: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_isempty: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_ispolygonccw: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_ispolygoncw: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_isring: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_issimple: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_isvalid: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_isvaliddetail: {
        Args: { geom: unknown; flags?: number }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
      }
      st_isvalidreason: {
        Args: { "": unknown }
        Returns: string
      }
      st_isvalidtrajectory: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_length: {
        Args:
          | { "": string }
          | { "": unknown }
          | { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_length2d: {
        Args: { "": unknown }
        Returns: number
      }
      st_letters: {
        Args: { letters: string; font?: Json }
        Returns: unknown
      }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { txtin: string; nprecision?: number }
        Returns: unknown
      }
      st_linefrommultipoint: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_linefromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_linefromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linemerge: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_linestringfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_linetocurve: {
        Args: { geometry: unknown }
        Returns: unknown
      }
      st_locatealong: {
        Args: { geometry: unknown; measure: number; leftrightoffset?: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          geometry: unknown
          frommeasure: number
          tomeasure: number
          leftrightoffset?: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { geometry: unknown; fromelevation: number; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_m: {
        Args: { "": unknown }
        Returns: number
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { "": unknown[] } | { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makepolygon: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { "": unknown } | { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_maximuminscribedcircle: {
        Args: { "": unknown }
        Returns: Record<string, unknown>
      }
      st_memsize: {
        Args: { "": unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_minimumboundingradius: {
        Args: { "": unknown }
        Returns: Record<string, unknown>
      }
      st_minimumclearance: {
        Args: { "": unknown }
        Returns: number
      }
      st_minimumclearanceline: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_mlinefromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_mlinefromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_mpointfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_mpointfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_mpolyfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_mpolyfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_multi: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_multilinefromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_multilinestringfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_multipointfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_multipointfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_multipolyfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_multipolygonfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_ndims: {
        Args: { "": unknown }
        Returns: number
      }
      st_node: {
        Args: { g: unknown }
        Returns: unknown
      }
      st_normalize: {
        Args: { geom: unknown }
        Returns: unknown
      }
      st_npoints: {
        Args: { "": unknown }
        Returns: number
      }
      st_nrings: {
        Args: { "": unknown }
        Returns: number
      }
      st_numgeometries: {
        Args: { "": unknown }
        Returns: number
      }
      st_numinteriorring: {
        Args: { "": unknown }
        Returns: number
      }
      st_numinteriorrings: {
        Args: { "": unknown }
        Returns: number
      }
      st_numpatches: {
        Args: { "": unknown }
        Returns: number
      }
      st_numpoints: {
        Args: { "": unknown }
        Returns: number
      }
      st_offsetcurve: {
        Args: { line: unknown; distance: number; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_orientedenvelope: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { "": unknown } | { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_perimeter2d: {
        Args: { "": unknown }
        Returns: number
      }
      st_pointfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_pointfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_pointm: {
        Args: {
          xcoordinate: number
          ycoordinate: number
          mcoordinate: number
          srid?: number
        }
        Returns: unknown
      }
      st_pointonsurface: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_points: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
          srid?: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
          mcoordinate: number
          srid?: number
        }
        Returns: unknown
      }
      st_polyfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_polyfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_polygonfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_polygonfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_polygonize: {
        Args: { "": unknown[] }
        Returns: unknown
      }
      st_project: {
        Args: { geog: unknown; distance: number; azimuth: number }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_x: number
          prec_y?: number
          prec_z?: number
          prec_m?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: string
      }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_reverse: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid: {
        Args: { geog: unknown; srid: number } | { geom: unknown; srid: number }
        Returns: unknown
      }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shiftlongitude: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; vertex_fraction: number; is_outer?: boolean }
        Returns: unknown
      }
      st_split: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_square: {
        Args: { size: number; cell_i: number; cell_j: number; origin?: unknown }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { size: number; bounds: unknown }
        Returns: Record<string, unknown>[]
      }
      st_srid: {
        Args: { geog: unknown } | { geom: unknown }
        Returns: number
      }
      st_startpoint: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_subdivide: {
        Args: { geom: unknown; maxvertices?: number; gridsize?: number }
        Returns: unknown[]
      }
      st_summary: {
        Args: { "": unknown } | { "": unknown }
        Returns: string
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          zoom: number
          x: number
          y: number
          bounds?: unknown
          margin?: number
        }
        Returns: unknown
      }
      st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_transform: {
        Args:
          | { geom: unknown; from_proj: string; to_proj: string }
          | { geom: unknown; from_proj: string; to_srid: number }
          | { geom: unknown; to_proj: string }
        Returns: unknown
      }
      st_triangulatepolygon: {
        Args: { g1: unknown }
        Returns: unknown
      }
      st_union: {
        Args:
          | { "": unknown[] }
          | { geom1: unknown; geom2: unknown }
          | { geom1: unknown; geom2: unknown; gridsize: number }
        Returns: unknown
      }
      st_voronoilines: {
        Args: { g1: unknown; tolerance?: number; extend_to?: unknown }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { g1: unknown; tolerance?: number; extend_to?: unknown }
        Returns: unknown
      }
      st_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_wkbtosql: {
        Args: { wkb: string }
        Returns: unknown
      }
      st_wkttosql: {
        Args: { "": string }
        Returns: unknown
      }
      st_wrapx: {
        Args: { geom: unknown; wrap: number; move: number }
        Returns: unknown
      }
      st_x: {
        Args: { "": unknown }
        Returns: number
      }
      st_xmax: {
        Args: { "": unknown }
        Returns: number
      }
      st_xmin: {
        Args: { "": unknown }
        Returns: number
      }
      st_y: {
        Args: { "": unknown }
        Returns: number
      }
      st_ymax: {
        Args: { "": unknown }
        Returns: number
      }
      st_ymin: {
        Args: { "": unknown }
        Returns: number
      }
      st_z: {
        Args: { "": unknown }
        Returns: number
      }
      st_zmax: {
        Args: { "": unknown }
        Returns: number
      }
      st_zmflag: {
        Args: { "": unknown }
        Returns: number
      }
      st_zmin: {
        Args: { "": unknown }
        Returns: number
      }
      text: {
        Args: { "": unknown }
        Returns: string
      }
      unlockrows: {
        Args: { "": string }
        Returns: number
      }
      update_couple_streaks: {
        Args: { p_couple_id: string }
        Returns: undefined
      }
      update_user_quota_usage: {
        Args: { p_user_id: string; p_cost_increase: number }
        Returns: undefined
      }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          schema_name: string
          table_name: string
          column_name: string
          new_srid_in: number
        }
        Returns: string
      }
      user_has_partner: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      verify_password: {
        Args: { password: string; hash: string }
        Returns: boolean
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
      geometry_dump: {
        path: number[] | null
        geom: unknown | null
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown | null
      }
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
