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
        Relationships: [
          {
            foreignKeyName: "api_usage_tracking_api_source_id_fkey"
            columns: ["api_source_id"]
            isOneToOne: false
            referencedRelation: "event_api_sources"
            referencedColumns: ["id"]
          },
        ]
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
      event_api_sources: {
        Row: {
          api_key_name: string | null
          api_type: string
          avg_response_time_ms: number | null
          base_url: string | null
          cost_per_request: number | null
          created_at: string
          current_daily_usage: number | null
          current_monthly_usage: number | null
          daily_quota: number | null
          id: string
          is_active: boolean | null
          last_error_at: string | null
          last_error_message: string | null
          last_used_at: string | null
          monthly_quota: number | null
          platform_name: string
          priority: number | null
          regions_covered: Json | null
          success_rate: number | null
          supported_regions: string[] | null
        }
        Insert: {
          api_key_name?: string | null
          api_type: string
          avg_response_time_ms?: number | null
          base_url?: string | null
          cost_per_request?: number | null
          created_at?: string
          current_daily_usage?: number | null
          current_monthly_usage?: number | null
          daily_quota?: number | null
          id?: string
          is_active?: boolean | null
          last_error_at?: string | null
          last_error_message?: string | null
          last_used_at?: string | null
          monthly_quota?: number | null
          platform_name: string
          priority?: number | null
          regions_covered?: Json | null
          success_rate?: number | null
          supported_regions?: string[] | null
        }
        Update: {
          api_key_name?: string | null
          api_type?: string
          avg_response_time_ms?: number | null
          base_url?: string | null
          cost_per_request?: number | null
          created_at?: string
          current_daily_usage?: number | null
          current_monthly_usage?: number | null
          daily_quota?: number | null
          id?: string
          is_active?: boolean | null
          last_error_at?: string | null
          last_error_message?: string | null
          last_used_at?: string | null
          monthly_quota?: number | null
          platform_name?: string
          priority?: number | null
          regions_covered?: Json | null
          success_rate?: number | null
          supported_regions?: string[] | null
        }
        Relationships: []
      }
      event_duplicates: {
        Row: {
          created_at: string | null
          detection_method: string | null
          duplicate_event_id: string | null
          id: string
          master_event_id: string | null
          similarity_score: number | null
        }
        Insert: {
          created_at?: string | null
          detection_method?: string | null
          duplicate_event_id?: string | null
          id?: string
          master_event_id?: string | null
          similarity_score?: number | null
        }
        Update: {
          created_at?: string | null
          detection_method?: string | null
          duplicate_event_id?: string | null
          id?: string
          master_event_id?: string | null
          similarity_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_duplicates_duplicate_event_id_fkey"
            columns: ["duplicate_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_duplicates_master_event_id_fkey"
            columns: ["master_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          api_source_id: string | null
          category: string | null
          city: string | null
          country: string | null
          created_at: string
          description: string | null
          event_date: string
          event_time: string | null
          expires_at: string
          external_event_id: string | null
          id: string
          image_url: string | null
          last_updated: string | null
          latitude: number | null
          location_address: string | null
          location_name: string
          longitude: number | null
          organizer: string | null
          price_range: string | null
          region: string | null
          source_platform: string
          source_url: string | null
          tags: string[] | null
          ticket_url: string | null
          title: string
          unique_hash: string
          updated_at: string
          venue_details: Json | null
        }
        Insert: {
          api_source_id?: string | null
          category?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          event_date: string
          event_time?: string | null
          expires_at?: string
          external_event_id?: string | null
          id?: string
          image_url?: string | null
          last_updated?: string | null
          latitude?: number | null
          location_address?: string | null
          location_name: string
          longitude?: number | null
          organizer?: string | null
          price_range?: string | null
          region?: string | null
          source_platform: string
          source_url?: string | null
          tags?: string[] | null
          ticket_url?: string | null
          title: string
          unique_hash: string
          updated_at?: string
          venue_details?: Json | null
        }
        Update: {
          api_source_id?: string | null
          category?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          event_date?: string
          event_time?: string | null
          expires_at?: string
          external_event_id?: string | null
          id?: string
          image_url?: string | null
          last_updated?: string | null
          latitude?: number | null
          location_address?: string | null
          location_name?: string
          longitude?: number | null
          organizer?: string | null
          price_range?: string | null
          region?: string | null
          source_platform?: string
          source_url?: string | null
          tags?: string[] | null
          ticket_url?: string | null
          title?: string
          unique_hash?: string
          updated_at?: string
          venue_details?: Json | null
        }
        Relationships: []
      }
      events_regional_cache: {
        Row: {
          cache_key: string
          city: string | null
          country: string
          created_at: string | null
          event_count: number | null
          id: string
          last_scraped_at: string | null
          next_scrape_at: string | null
          region: string | null
          scraping_status: string | null
        }
        Insert: {
          cache_key: string
          city?: string | null
          country: string
          created_at?: string | null
          event_count?: number | null
          id?: string
          last_scraped_at?: string | null
          next_scrape_at?: string | null
          region?: string | null
          scraping_status?: string | null
        }
        Update: {
          cache_key?: string
          city?: string | null
          country?: string
          created_at?: string | null
          event_count?: number | null
          id?: string
          last_scraped_at?: string | null
          next_scrape_at?: string | null
          region?: string | null
          scraping_status?: string | null
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
      location_event_cache: {
        Row: {
          created_at: string
          event_count: number | null
          id: string
          last_fetched_at: string
          latitude: number
          location_hash: string
          longitude: number
          next_fetch_at: string
          search_radius: number
          source_platforms: string[] | null
        }
        Insert: {
          created_at?: string
          event_count?: number | null
          id?: string
          last_fetched_at?: string
          latitude: number
          location_hash: string
          longitude: number
          next_fetch_at?: string
          search_radius?: number
          source_platforms?: string[] | null
        }
        Update: {
          created_at?: string
          event_count?: number | null
          id?: string
          last_fetched_at?: string
          latitude?: number
          location_hash?: string
          longitude?: number
          next_fetch_at?: string
          search_radius?: number
          source_platforms?: string[] | null
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
      user_event_interactions: {
        Row: {
          created_at: string
          event_id: string | null
          id: string
          interaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          id?: string
          interaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string | null
          id?: string
          interaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_event_interactions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
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
      check_user_quota: {
        Args: { p_user_id: string; p_estimated_cost?: number }
        Returns: Json
      }
      cleanup_demo_connection: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      cleanup_expired_events: {
        Args: Record<PropertyKey, never>
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
      get_personalized_events: {
        Args: {
          p_user_id: string
          p_latitude: number
          p_longitude: number
          p_radius?: number
          p_limit?: number
        }
        Returns: {
          id: string
          title: string
          description: string
          event_date: string
          event_time: string
          location_name: string
          location_address: string
          latitude: number
          longitude: number
          category: string
          price_range: string
          organizer: string
          source_url: string
          source_platform: string
          image_url: string
          tags: string[]
          distance_km: number
          relevance_score: number
        }[]
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
      update_couple_streaks: {
        Args: { p_couple_id: string }
        Returns: undefined
      }
      update_user_quota_usage: {
        Args: { p_user_id: string; p_cost_increase: number }
        Returns: undefined
      }
      user_has_partner: {
        Args: { p_user_id: string }
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
