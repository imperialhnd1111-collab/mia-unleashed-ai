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
      ai_logs: {
        Row: {
          action: string
          created_at: string | null
          creator_id: string
          duration_ms: number | null
          fan_id: string | null
          id: string
          input_data: Json | null
          model_used: string | null
          output_data: Json | null
          tokens_used: number | null
        }
        Insert: {
          action: string
          created_at?: string | null
          creator_id: string
          duration_ms?: number | null
          fan_id?: string | null
          id?: string
          input_data?: Json | null
          model_used?: string | null
          output_data?: Json | null
          tokens_used?: number | null
        }
        Update: {
          action?: string
          created_at?: string | null
          creator_id?: string
          duration_ms?: number | null
          fan_id?: string | null
          id?: string
          input_data?: Json | null
          model_used?: string | null
          output_data?: Json | null
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_logs_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_logs_fan_id_fkey"
            columns: ["fan_id"]
            isOneToOne: false
            referencedRelation: "fans"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          created_at: string | null
          creator_id: string
          event_data: Json | null
          event_type: string
          fan_id: string | null
          id: string
          revenue: number | null
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          event_data?: Json | null
          event_type: string
          fan_id?: string | null
          id?: string
          revenue?: number | null
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          event_data?: Json | null
          event_type?: string
          fan_id?: string | null
          id?: string
          revenue?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_fan_id_fkey"
            columns: ["fan_id"]
            isOneToOne: false
            referencedRelation: "fans"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string | null
          creator_id: string
          description: string | null
          has_payment_button: boolean | null
          id: string
          media_url: string | null
          message_template: string
          name: string
          payment_data: Json | null
          revenue_generated: number | null
          scheduled_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["campaign_status"] | null
          target_audience: Json | null
          total_converted: number | null
          total_opened: number | null
          total_sent: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          description?: string | null
          has_payment_button?: boolean | null
          id?: string
          media_url?: string | null
          message_template: string
          name: string
          payment_data?: Json | null
          revenue_generated?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"] | null
          target_audience?: Json | null
          total_converted?: number | null
          total_opened?: number | null
          total_sent?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          description?: string | null
          has_payment_button?: boolean | null
          id?: string
          media_url?: string | null
          message_template?: string
          name?: string
          payment_data?: Json | null
          revenue_generated?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"] | null
          target_audience?: Json | null
          total_converted?: number | null
          total_opened?: number | null
          total_sent?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_posts: {
        Row: {
          caption: string | null
          content_item_id: string | null
          created_at: string | null
          creator_id: string
          engagement: Json | null
          id: string
          media_url: string | null
          post_type: Database["public"]["Enums"]["content_type"] | null
          published_at: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["content_status"] | null
          telegram_message_id: string | null
        }
        Insert: {
          caption?: string | null
          content_item_id?: string | null
          created_at?: string | null
          creator_id: string
          engagement?: Json | null
          id?: string
          media_url?: string | null
          post_type?: Database["public"]["Enums"]["content_type"] | null
          published_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["content_status"] | null
          telegram_message_id?: string | null
        }
        Update: {
          caption?: string | null
          content_item_id?: string | null
          created_at?: string | null
          creator_id?: string
          engagement?: Json | null
          id?: string
          media_url?: string | null
          post_type?: Database["public"]["Enums"]["content_type"] | null
          published_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["content_status"] | null
          telegram_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_posts_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_posts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      content_items: {
        Row: {
          content_type: Database["public"]["Enums"]["content_type"]
          created_at: string | null
          creator_id: string
          description: string | null
          file_url: string | null
          id: string
          is_premium: boolean | null
          metadata: Json | null
          price: number | null
          published_at: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["content_status"] | null
          tags: string[] | null
          telegram_message_id: string | null
          thumbnail_url: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          content_type: Database["public"]["Enums"]["content_type"]
          created_at?: string | null
          creator_id: string
          description?: string | null
          file_url?: string | null
          id?: string
          is_premium?: boolean | null
          metadata?: Json | null
          price?: number | null
          published_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["content_status"] | null
          tags?: string[] | null
          telegram_message_id?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          content_type?: Database["public"]["Enums"]["content_type"]
          created_at?: string | null
          creator_id?: string
          description?: string | null
          file_url?: string | null
          id?: string
          is_premium?: boolean | null
          metadata?: Json | null
          price?: number | null
          published_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["content_status"] | null
          tags?: string[] | null
          telegram_message_id?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_items_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          content_pitched_at: string | null
          context_summary: string | null
          created_at: string | null
          creator_id: string
          current_topic: string | null
          fan_id: string
          id: string
          last_message_at: string | null
          message_count: number | null
          mood_score: number | null
          tip_requested_at: string | null
        }
        Insert: {
          content_pitched_at?: string | null
          context_summary?: string | null
          created_at?: string | null
          creator_id: string
          current_topic?: string | null
          fan_id: string
          id?: string
          last_message_at?: string | null
          message_count?: number | null
          mood_score?: number | null
          tip_requested_at?: string | null
        }
        Update: {
          content_pitched_at?: string | null
          context_summary?: string | null
          created_at?: string | null
          creator_id?: string
          current_topic?: string | null
          fan_id?: string
          id?: string
          last_message_at?: string | null
          message_count?: number | null
          mood_score?: number | null
          tip_requested_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_fan_id_fkey"
            columns: ["fan_id"]
            isOneToOne: false
            referencedRelation: "fans"
            referencedColumns: ["id"]
          },
        ]
      }
      creators: {
        Row: {
          ai_enabled: boolean | null
          avatar_url: string | null
          backstory: string | null
          bio: string | null
          channel_auto_publish: boolean | null
          channel_post_interval_hours: number | null
          cover_url: string | null
          created_at: string | null
          current_emotion: Database["public"]["Enums"]["emotion_state"] | null
          daily_routines: Json | null
          id: string
          is_ai: boolean | null
          language: string | null
          name: string
          payment_methods: Json | null
          payment_methods_config: Json | null
          personality_traits: Json | null
          social_links: Json | null
          stats: Json | null
          status: Database["public"]["Enums"]["creator_status"] | null
          subscription_price: number | null
          system_prompt: string
          telegram_bot_token: string | null
          telegram_bot_username: string | null
          telegram_channel_id: string | null
          timezone: string | null
          updated_at: string | null
          username: string
          vip_channel_link: string | null
          whatsapp_number: string | null
        }
        Insert: {
          ai_enabled?: boolean | null
          avatar_url?: string | null
          backstory?: string | null
          bio?: string | null
          channel_auto_publish?: boolean | null
          channel_post_interval_hours?: number | null
          cover_url?: string | null
          created_at?: string | null
          current_emotion?: Database["public"]["Enums"]["emotion_state"] | null
          daily_routines?: Json | null
          id?: string
          is_ai?: boolean | null
          language?: string | null
          name: string
          payment_methods?: Json | null
          payment_methods_config?: Json | null
          personality_traits?: Json | null
          social_links?: Json | null
          stats?: Json | null
          status?: Database["public"]["Enums"]["creator_status"] | null
          subscription_price?: number | null
          system_prompt?: string
          telegram_bot_token?: string | null
          telegram_bot_username?: string | null
          telegram_channel_id?: string | null
          timezone?: string | null
          updated_at?: string | null
          username: string
          vip_channel_link?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          ai_enabled?: boolean | null
          avatar_url?: string | null
          backstory?: string | null
          bio?: string | null
          channel_auto_publish?: boolean | null
          channel_post_interval_hours?: number | null
          cover_url?: string | null
          created_at?: string | null
          current_emotion?: Database["public"]["Enums"]["emotion_state"] | null
          daily_routines?: Json | null
          id?: string
          is_ai?: boolean | null
          language?: string | null
          name?: string
          payment_methods?: Json | null
          payment_methods_config?: Json | null
          personality_traits?: Json | null
          social_links?: Json | null
          stats?: Json | null
          status?: Database["public"]["Enums"]["creator_status"] | null
          subscription_price?: number | null
          system_prompt?: string
          telegram_bot_token?: string | null
          telegram_bot_username?: string | null
          telegram_channel_id?: string | null
          timezone?: string | null
          updated_at?: string | null
          username?: string
          vip_channel_link?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      fans: {
        Row: {
          created_at: string | null
          creator_id: string
          detected_style: Json | null
          first_name: string | null
          id: string
          is_subscriber: boolean | null
          language_code: string | null
          last_active_at: string | null
          last_name: string | null
          metadata: Json | null
          notes: string | null
          relationship_level: number | null
          subscription_expires_at: string | null
          telegram_user_id: string
          telegram_username: string | null
          total_spent: number | null
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          detected_style?: Json | null
          first_name?: string | null
          id?: string
          is_subscriber?: boolean | null
          language_code?: string | null
          last_active_at?: string | null
          last_name?: string | null
          metadata?: Json | null
          notes?: string | null
          relationship_level?: number | null
          subscription_expires_at?: string | null
          telegram_user_id: string
          telegram_username?: string | null
          total_spent?: number | null
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          detected_style?: Json | null
          first_name?: string | null
          id?: string
          is_subscriber?: boolean | null
          language_code?: string | null
          last_active_at?: string | null
          last_name?: string | null
          metadata?: Json | null
          notes?: string | null
          relationship_level?: number | null
          subscription_expires_at?: string | null
          telegram_user_id?: string
          telegram_username?: string | null
          total_spent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fans_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          has_payment_button: boolean | null
          id: string
          media_url: string | null
          payment_data: Json | null
          role: Database["public"]["Enums"]["message_role"]
          sent_at: string | null
          telegram_message_id: string | null
          typing_delay_ms: number | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          has_payment_button?: boolean | null
          id?: string
          media_url?: string | null
          payment_data?: Json | null
          role: Database["public"]["Enums"]["message_role"]
          sent_at?: string | null
          telegram_message_id?: string | null
          typing_delay_ms?: number | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          has_payment_button?: boolean | null
          id?: string
          media_url?: string | null
          payment_data?: Json | null
          role?: Database["public"]["Enums"]["message_role"]
          sent_at?: string | null
          telegram_message_id?: string | null
          typing_delay_ms?: number | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      campaign_status: "draft" | "active" | "paused" | "completed"
      content_status: "draft" | "scheduled" | "published" | "failed"
      content_type: "photo" | "video" | "audio" | "text"
      creator_status: "active" | "inactive" | "paused"
      emotion_state:
        | "happy"
        | "sad"
        | "excited"
        | "bored"
        | "angry"
        | "flirty"
        | "tired"
        | "hungry"
        | "normal"
      message_role: "user" | "assistant"
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
      campaign_status: ["draft", "active", "paused", "completed"],
      content_status: ["draft", "scheduled", "published", "failed"],
      content_type: ["photo", "video", "audio", "text"],
      creator_status: ["active", "inactive", "paused"],
      emotion_state: [
        "happy",
        "sad",
        "excited",
        "bored",
        "angry",
        "flirty",
        "tired",
        "hungry",
        "normal",
      ],
      message_role: ["user", "assistant"],
    },
  },
} as const
