export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
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
      accounts: {
        Row: {
          created_at: string
          id: string
          is_archived: boolean
          kind: Database["public"]["Enums"]["account_kind"]
          name: string
          sort_order: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_archived?: boolean
          kind?: Database["public"]["Enums"]["account_kind"]
          name: string
          sort_order?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_archived?: boolean
          kind?: Database["public"]["Enums"]["account_kind"]
          name?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          amount: number
          category_id: string
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["category_kind"]
          period_month: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["category_kind"]
          period_month: string
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["category_kind"]
          period_month?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_kind_fkey"
            columns: ["category_id", "kind"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "kind"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          is_archived: boolean
          kind: Database["public"]["Enums"]["category_kind"]
          name: string
          sort_order: number
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_archived?: boolean
          kind: Database["public"]["Enums"]["category_kind"]
          name: string
          sort_order?: number
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_archived?: boolean
          kind?: Database["public"]["Enums"]["category_kind"]
          name?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: []
      }
      dismissed_alerts: {
        Row: {
          category_id: string
          dismissed_at: string
          period_month: string
          threshold: number
          user_id: string
        }
        Insert: {
          category_id: string
          dismissed_at?: string
          period_month: string
          threshold: number
          user_id: string
        }
        Update: {
          category_id?: string
          dismissed_at?: string
          period_month?: string
          threshold?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dismissed_alerts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          currency: string
          cycle_start_day: number
          display_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          cycle_start_day?: number
          display_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          currency?: string
          cycle_start_day?: number
          display_name?: string | null
          id?: string
        }
        Relationships: []
      }
      recurring_rules: {
        Row: {
          account_id: string | null
          amount: number
          category_id: string
          created_at: string
          ends_on: string | null
          every: number
          freq: Database["public"]["Enums"]["recur_freq"]
          id: string
          is_paused: boolean
          kind: Database["public"]["Enums"]["category_kind"]
          last_run_on: string | null
          note: string | null
          starts_on: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category_id: string
          created_at?: string
          ends_on?: string | null
          every?: number
          freq: Database["public"]["Enums"]["recur_freq"]
          id?: string
          is_paused?: boolean
          kind: Database["public"]["Enums"]["category_kind"]
          last_run_on?: string | null
          note?: string | null
          starts_on: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category_id?: string
          created_at?: string
          ends_on?: string | null
          every?: number
          freq?: Database["public"]["Enums"]["recur_freq"]
          id?: string
          is_paused?: boolean
          kind?: Database["public"]["Enums"]["category_kind"]
          last_run_on?: string | null
          note?: string | null
          starts_on?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_rules_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_rules_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_account_balance"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "recurring_rules_category_id_kind_fkey"
            columns: ["category_id", "kind"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "kind"]
          },
        ]
      }
      saving_goals: {
        Row: {
          achieved_at: string | null
          created_at: string
          id: string
          name: string
          target_amount: number
          target_date: string | null
          user_id: string
        }
        Insert: {
          achieved_at?: string | null
          created_at?: string
          id?: string
          name: string
          target_amount: number
          target_date?: string | null
          user_id: string
        }
        Update: {
          achieved_at?: string | null
          created_at?: string
          id?: string
          name?: string
          target_amount?: number
          target_date?: string | null
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string | null
          amount: number
          category_id: string
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["category_kind"]
          note: string | null
          occurred_on: string
          receipt_path: string | null
          recurring_occurred_on: string | null
          recurring_rule_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category_id: string
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["category_kind"]
          note?: string | null
          occurred_on: string
          receipt_path?: string | null
          recurring_occurred_on?: string | null
          recurring_rule_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category_id?: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["category_kind"]
          note?: string | null
          occurred_on?: string
          receipt_path?: string | null
          recurring_occurred_on?: string | null
          recurring_rule_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_account_balance"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "transactions_category_id_kind_fkey"
            columns: ["category_id", "kind"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "kind"]
          },
          {
            foreignKeyName: "transactions_recurring_rule_id_fkey"
            columns: ["recurring_rule_id"]
            isOneToOne: false
            referencedRelation: "recurring_rules"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_account_balance: {
        Row: {
          account_id: string | null
          balance: number | null
          expense: number | null
          income: number | null
          is_archived: boolean | null
          kind: Database["public"]["Enums"]["account_kind"] | null
          name: string | null
          user_id: string | null
        }
        Relationships: []
      }
      v_budget_usage: {
        Row: {
          budget_amount: number | null
          category_id: string | null
          category_name: string | null
          pct: number | null
          period_month: string | null
          spent: number | null
          status: string | null
          user_id: string | null
        }
        Relationships: []
      }
      v_monthly_summary: {
        Row: {
          expense: number | null
          income: number | null
          net: number | null
          period_month: string | null
          user_id: string | null
        }
        Relationships: []
      }
      v_running_balance: {
        Row: {
          balance: number | null
          expense: number | null
          income: number | null
          net: number | null
          period_month: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      delete_my_account: { Args: never; Returns: undefined }
      materialize_recurring: { Args: { until?: string }; Returns: number }
      period_of: { Args: { cycle_day: number; d: string }; Returns: string }
      reset_my_categories: { Args: never; Returns: undefined }
      seed_default_categories: { Args: { target: string }; Returns: undefined }
    }
    Enums: {
      account_kind: "cash" | "bank" | "credit" | "ewallet"
      category_kind: "income" | "expense"
      recur_freq: "daily" | "weekly" | "monthly" | "yearly"
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
      account_kind: ["cash", "bank", "credit", "ewallet"],
      category_kind: ["income", "expense"],
      recur_freq: ["daily", "weekly", "monthly", "yearly"],
    },
  },
} as const

