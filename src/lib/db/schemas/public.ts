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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      channel_verifications: {
        Row: {
          channel_id: string
          created_at: string
          expires_at: string
          id: string
          nonce: string
          user_id: string | null
          user_handle: string | null
          chat_metadata: Json | null
        }
        Insert: {
          channel_id: string
          created_at?: string
          expires_at: string
          id?: string
          nonce: string
          user_id?: string | null
          user_handle?: string | null
          chat_metadata?: Json | null
        }
        Update: {
          channel_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          nonce?: string
          user_id?: string | null
          user_handle?: string | null
          chat_metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_verifications_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          link_method: Database["public"]["Enums"]["link_method"]
        }
        Insert: {
          created_at?: string
          id: string
          is_active?: boolean
          link_method: Database["public"]["Enums"]["link_method"]
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          link_method?: Database["public"]["Enums"]["link_method"]
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: number
          role: Database["public"]["Enums"]["chat_role"]
          user_channel: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: number
          role: Database["public"]["Enums"]["chat_role"]
          user_channel: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: number
          role?: Database["public"]["Enums"]["chat_role"]
          user_channel?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_user_channel_fkey"
            columns: ["user_channel"]
            isOneToOne: false
            referencedRelation: "user_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      tiers_features: {
        Row: {
          history_limit: number | null
          id: string
          requests_limit: number | null
          tokens_limit: number | null
        }
        Insert: {
          history_limit?: number | null
          id: string
          requests_limit?: number | null
          tokens_limit?: number | null
        }
        Update: {
          history_limit?: number | null
          id?: string
          requests_limit?: number | null
          tokens_limit?: number | null
        }
        Relationships: []
      }
      usage_records: {
        Row: {
          created_at: string
          requests_used: number
          tokens_used: number
          updated_at: string
          user_channel_id: string
        }
        Insert: {
          created_at?: string
          requests_used?: number
          tokens_used?: number
          updated_at?: string
          user_channel_id: string
        }
        Update: {
          created_at?: string
          requests_used?: number
          tokens_used?: number
          updated_at?: string
          user_channel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_records_user_channel_id_fkey"
            columns: ["user_channel_id"]
            isOneToOne: true
            referencedRelation: "user_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      user_channels: {
        Row: {
          channel_id: string
          created_at: string
          id: string
          link: string
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          channel_id: string
          created_at?: string
          id?: string
          link: string
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          channel_id?: string
          created_at?: string
          id?: string
          link?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_channels_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_channels_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "user_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_channels_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_memories: {
        Row: {
          content: string
          created_at: string
          id: number
          role: Database["public"]["Enums"]["chat_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: never
          role: Database["public"]["Enums"]["chat_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: never
          role?: Database["public"]["Enums"]["chat_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_memories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          nickname: string
          signup_source: string | null
          stripe_customer_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id: string
          last_name: string
          nickname: string
          signup_source?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          nickname?: string
          signup_source?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_onboarding_complete: {
        Args: { user_id_param: string }
        Returns: boolean
      }
      count_tokens: {
        Args: { txt: string }
        Returns: number
      }
      finalize_channel_link: {
        Args: { p_nonce: string; p_link: string }
        Returns: Json
      }
      get_current_usage: {
        Args: { p_user_id: string }
        Returns: {
          user_id: string
          subscription_id: string
          subscription_period_start: string
          subscription_period_end: string
          total_tokens_used: number
          total_requests_used: number
        }[]
      }
      get_user_activity: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_user_subscription_plan: {
        Args: { p_user_id: string }
        Returns: string
      }
      get_user_usage_and_limits: {
        Args: { user_id: string }
        Returns: {
          tokens_used: number
          requests_used: number
          tokens_limit: number
          requests_limit: number
          history_limit: number
        }
      }
      get_user_total_usage: {
        Args: { input_user_id: string }
        Returns: Json
      }
      increment_usage: {
        Args: {
          p_tokens_increment: number
          p_requests_increment: number
          p_user_channel_id: string
        }
        Returns: undefined
      }
      insert_message: {
        Args: {
          p_user_id: string
          p_channel_id: string
          p_content: string
          p_role: Database["public"]["Enums"]["chat_role"]
        }
        Returns: {
          content: string
          created_at: string
          id: number
          role: Database["public"]["Enums"]["chat_role"]
          user_channel: string
        }
      }
      insert_message_and_return: {
        Args: {
          p_user_id: string
          p_channel_id: string
          p_content: string
          p_role: Database["public"]["Enums"]["chat_role"]
        }
        Returns: {
          content: string
          created_at: string
          id: number
          role: Database["public"]["Enums"]["chat_role"]
          user_channel: string
        }
      }
      reset_daily_usage_records: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      chat_role: "user" | "assistant"
      link_method: "phone_number" | "username" | "id"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      chat_role: ["user", "assistant"],
      link_method: ["phone_number", "username", "id"],
    },
  },
} as const
