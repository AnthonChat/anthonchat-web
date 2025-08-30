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
  stripe: {
    Tables: {
      charges: {
        Row: {
          amount: number | null
          amount_refunded: number | null
          application: string | null
          application_fee: string | null
          balance_transaction: string | null
          captured: boolean | null
          created: number | null
          currency: string | null
          customer: string | null
          description: string | null
          destination: string | null
          dispute: string | null
          failure_code: string | null
          failure_message: string | null
          fraud_details: Json | null
          id: string
          invoice: string | null
          livemode: boolean | null
          metadata: Json | null
          object: string | null
          on_behalf_of: string | null
          order: string | null
          outcome: Json | null
          paid: boolean | null
          payment_intent: string | null
          payment_method_details: Json | null
          receipt_email: string | null
          receipt_number: string | null
          refunded: boolean | null
          refunds: Json | null
          review: string | null
          shipping: Json | null
          source: Json | null
          source_transfer: string | null
          statement_descriptor: string | null
          status: string | null
          transfer_group: string | null
          updated: number | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          amount_refunded?: number | null
          application?: string | null
          application_fee?: string | null
          balance_transaction?: string | null
          captured?: boolean | null
          created?: number | null
          currency?: string | null
          customer?: string | null
          description?: string | null
          destination?: string | null
          dispute?: string | null
          failure_code?: string | null
          failure_message?: string | null
          fraud_details?: Json | null
          id: string
          invoice?: string | null
          livemode?: boolean | null
          metadata?: Json | null
          object?: string | null
          on_behalf_of?: string | null
          order?: string | null
          outcome?: Json | null
          paid?: boolean | null
          payment_intent?: string | null
          payment_method_details?: Json | null
          receipt_email?: string | null
          receipt_number?: string | null
          refunded?: boolean | null
          refunds?: Json | null
          review?: string | null
          shipping?: Json | null
          source?: Json | null
          source_transfer?: string | null
          statement_descriptor?: string | null
          status?: string | null
          transfer_group?: string | null
          updated?: number | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          amount_refunded?: number | null
          application?: string | null
          application_fee?: string | null
          balance_transaction?: string | null
          captured?: boolean | null
          created?: number | null
          currency?: string | null
          customer?: string | null
          description?: string | null
          destination?: string | null
          dispute?: string | null
          failure_code?: string | null
          failure_message?: string | null
          fraud_details?: Json | null
          id?: string
          invoice?: string | null
          livemode?: boolean | null
          metadata?: Json | null
          object?: string | null
          on_behalf_of?: string | null
          order?: string | null
          outcome?: Json | null
          paid?: boolean | null
          payment_intent?: string | null
          payment_method_details?: Json | null
          receipt_email?: string | null
          receipt_number?: string | null
          refunded?: boolean | null
          refunds?: Json | null
          review?: string | null
          shipping?: Json | null
          source?: Json | null
          source_transfer?: string | null
          statement_descriptor?: string | null
          status?: string | null
          transfer_group?: string | null
          updated?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          amount_off: number | null
          created: number | null
          currency: string | null
          duration: string | null
          duration_in_months: number | null
          id: string
          livemode: boolean | null
          max_redemptions: number | null
          metadata: Json | null
          name: string | null
          object: string | null
          percent_off: number | null
          percent_off_precise: number | null
          redeem_by: number | null
          times_redeemed: number | null
          updated: number | null
          updated_at: string
          valid: boolean | null
        }
        Insert: {
          amount_off?: number | null
          created?: number | null
          currency?: string | null
          duration?: string | null
          duration_in_months?: number | null
          id: string
          livemode?: boolean | null
          max_redemptions?: number | null
          metadata?: Json | null
          name?: string | null
          object?: string | null
          percent_off?: number | null
          percent_off_precise?: number | null
          redeem_by?: number | null
          times_redeemed?: number | null
          updated?: number | null
          updated_at?: string
          valid?: boolean | null
        }
        Update: {
          amount_off?: number | null
          created?: number | null
          currency?: string | null
          duration?: string | null
          duration_in_months?: number | null
          id?: string
          livemode?: boolean | null
          max_redemptions?: number | null
          metadata?: Json | null
          name?: string | null
          object?: string | null
          percent_off?: number | null
          percent_off_precise?: number | null
          redeem_by?: number | null
          times_redeemed?: number | null
          updated?: number | null
          updated_at?: string
          valid?: boolean | null
        }
        Relationships: []
      }
      credit_notes: {
        Row: {
          amount: number | null
          amount_shipping: number | null
          created: number | null
          currency: string | null
          customer: string | null
          customer_balance_transaction: string | null
          discount_amount: number | null
          discount_amounts: Json | null
          id: string
          invoice: string | null
          lines: Json | null
          livemode: boolean | null
          memo: string | null
          metadata: Json | null
          number: string | null
          object: string | null
          out_of_band_amount: number | null
          pdf: string | null
          reason: string | null
          refund: string | null
          shipping_cost: Json | null
          status: string | null
          subtotal: number | null
          subtotal_excluding_tax: number | null
          tax_amounts: Json | null
          total: number | null
          total_excluding_tax: number | null
          type: string | null
          voided_at: string | null
        }
        Insert: {
          amount?: number | null
          amount_shipping?: number | null
          created?: number | null
          currency?: string | null
          customer?: string | null
          customer_balance_transaction?: string | null
          discount_amount?: number | null
          discount_amounts?: Json | null
          id: string
          invoice?: string | null
          lines?: Json | null
          livemode?: boolean | null
          memo?: string | null
          metadata?: Json | null
          number?: string | null
          object?: string | null
          out_of_band_amount?: number | null
          pdf?: string | null
          reason?: string | null
          refund?: string | null
          shipping_cost?: Json | null
          status?: string | null
          subtotal?: number | null
          subtotal_excluding_tax?: number | null
          tax_amounts?: Json | null
          total?: number | null
          total_excluding_tax?: number | null
          type?: string | null
          voided_at?: string | null
        }
        Update: {
          amount?: number | null
          amount_shipping?: number | null
          created?: number | null
          currency?: string | null
          customer?: string | null
          customer_balance_transaction?: string | null
          discount_amount?: number | null
          discount_amounts?: Json | null
          id?: string
          invoice?: string | null
          lines?: Json | null
          livemode?: boolean | null
          memo?: string | null
          metadata?: Json | null
          number?: string | null
          object?: string | null
          out_of_band_amount?: number | null
          pdf?: string | null
          reason?: string | null
          refund?: string | null
          shipping_cost?: Json | null
          status?: string | null
          subtotal?: number | null
          subtotal_excluding_tax?: number | null
          tax_amounts?: Json | null
          total?: number | null
          total_excluding_tax?: number | null
          type?: string | null
          voided_at?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: Json | null
          balance: number | null
          created: number | null
          currency: string | null
          default_source: string | null
          deleted: boolean
          delinquent: boolean | null
          description: string | null
          discount: Json | null
          email: string | null
          id: string
          invoice_prefix: string | null
          invoice_settings: Json | null
          livemode: boolean | null
          metadata: Json | null
          name: string | null
          next_invoice_sequence: number | null
          object: string | null
          phone: string | null
          preferred_locales: Json | null
          shipping: Json | null
          tax_exempt: string | null
          updated_at: string
        }
        Insert: {
          address?: Json | null
          balance?: number | null
          created?: number | null
          currency?: string | null
          default_source?: string | null
          deleted?: boolean
          delinquent?: boolean | null
          description?: string | null
          discount?: Json | null
          email?: string | null
          id: string
          invoice_prefix?: string | null
          invoice_settings?: Json | null
          livemode?: boolean | null
          metadata?: Json | null
          name?: string | null
          next_invoice_sequence?: number | null
          object?: string | null
          phone?: string | null
          preferred_locales?: Json | null
          shipping?: Json | null
          tax_exempt?: string | null
          updated_at?: string
        }
        Update: {
          address?: Json | null
          balance?: number | null
          created?: number | null
          currency?: string | null
          default_source?: string | null
          deleted?: boolean
          delinquent?: boolean | null
          description?: string | null
          discount?: Json | null
          email?: string | null
          id?: string
          invoice_prefix?: string | null
          invoice_settings?: Json | null
          livemode?: boolean | null
          metadata?: Json | null
          name?: string | null
          next_invoice_sequence?: number | null
          object?: string | null
          phone?: string | null
          preferred_locales?: Json | null
          shipping?: Json | null
          tax_exempt?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      disputes: {
        Row: {
          amount: number | null
          balance_transactions: Json | null
          charge: string | null
          created: number | null
          currency: string | null
          evidence: Json | null
          evidence_details: Json | null
          id: string
          is_charge_refundable: boolean | null
          livemode: boolean | null
          metadata: Json | null
          object: string | null
          payment_intent: string | null
          reason: string | null
          status: string | null
          updated: number | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          balance_transactions?: Json | null
          charge?: string | null
          created?: number | null
          currency?: string | null
          evidence?: Json | null
          evidence_details?: Json | null
          id: string
          is_charge_refundable?: boolean | null
          livemode?: boolean | null
          metadata?: Json | null
          object?: string | null
          payment_intent?: string | null
          reason?: string | null
          status?: string | null
          updated?: number | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          balance_transactions?: Json | null
          charge?: string | null
          created?: number | null
          currency?: string | null
          evidence?: Json | null
          evidence_details?: Json | null
          id?: string
          is_charge_refundable?: boolean | null
          livemode?: boolean | null
          metadata?: Json | null
          object?: string | null
          payment_intent?: string | null
          reason?: string | null
          status?: string | null
          updated?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      early_fraud_warnings: {
        Row: {
          actionable: boolean | null
          charge: string | null
          created: number | null
          fraud_type: string | null
          id: string
          livemode: boolean | null
          object: string | null
          payment_intent: string | null
          updated_at: string
        }
        Insert: {
          actionable?: boolean | null
          charge?: string | null
          created?: number | null
          fraud_type?: string | null
          id: string
          livemode?: boolean | null
          object?: string | null
          payment_intent?: string | null
          updated_at?: string
        }
        Update: {
          actionable?: boolean | null
          charge?: string | null
          created?: number | null
          fraud_type?: string | null
          id?: string
          livemode?: boolean | null
          object?: string | null
          payment_intent?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          api_version: string | null
          created: number | null
          data: Json | null
          id: string
          livemode: boolean | null
          object: string | null
          pending_webhooks: number | null
          request: string | null
          type: string | null
          updated: number | null
          updated_at: string
        }
        Insert: {
          api_version?: string | null
          created?: number | null
          data?: Json | null
          id: string
          livemode?: boolean | null
          object?: string | null
          pending_webhooks?: number | null
          request?: string | null
          type?: string | null
          updated?: number | null
          updated_at?: string
        }
        Update: {
          api_version?: string | null
          created?: number | null
          data?: Json | null
          id?: string
          livemode?: boolean | null
          object?: string | null
          pending_webhooks?: number | null
          request?: string | null
          type?: string | null
          updated?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          account_country: string | null
          account_name: string | null
          account_tax_ids: Json | null
          amount_due: number | null
          amount_paid: number | null
          amount_remaining: number | null
          application_fee_amount: number | null
          attempt_count: number | null
          attempted: boolean | null
          auto_advance: boolean | null
          billing_reason: string | null
          charge: string | null
          collection_method: string | null
          created: number | null
          currency: string | null
          custom_fields: Json | null
          customer: string | null
          customer_address: Json | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          customer_shipping: Json | null
          customer_tax_exempt: string | null
          customer_tax_ids: Json | null
          default_payment_method: string | null
          default_source: string | null
          default_tax_rates: Json | null
          description: string | null
          discount: Json | null
          discounts: Json | null
          due_date: number | null
          ending_balance: number | null
          footer: string | null
          hosted_invoice_url: string | null
          id: string
          invoice_pdf: string | null
          last_finalization_error: Json | null
          lines: Json | null
          livemode: boolean | null
          metadata: Json | null
          next_payment_attempt: number | null
          number: string | null
          object: string | null
          on_behalf_of: string | null
          paid: boolean | null
          payment_intent: string | null
          payment_settings: Json | null
          period_end: number | null
          period_start: number | null
          post_payment_credit_notes_amount: number | null
          pre_payment_credit_notes_amount: number | null
          receipt_number: string | null
          starting_balance: number | null
          statement_descriptor: string | null
          status: Database["stripe"]["Enums"]["invoice_status"] | null
          status_transitions: Json | null
          subscription: string | null
          subtotal: number | null
          tax: number | null
          total: number | null
          total_discount_amounts: Json | null
          total_tax_amounts: Json | null
          transfer_data: Json | null
          updated_at: string
          webhooks_delivered_at: number | null
        }
        Insert: {
          account_country?: string | null
          account_name?: string | null
          account_tax_ids?: Json | null
          amount_due?: number | null
          amount_paid?: number | null
          amount_remaining?: number | null
          application_fee_amount?: number | null
          attempt_count?: number | null
          attempted?: boolean | null
          auto_advance?: boolean | null
          billing_reason?: string | null
          charge?: string | null
          collection_method?: string | null
          created?: number | null
          currency?: string | null
          custom_fields?: Json | null
          customer?: string | null
          customer_address?: Json | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_shipping?: Json | null
          customer_tax_exempt?: string | null
          customer_tax_ids?: Json | null
          default_payment_method?: string | null
          default_source?: string | null
          default_tax_rates?: Json | null
          description?: string | null
          discount?: Json | null
          discounts?: Json | null
          due_date?: number | null
          ending_balance?: number | null
          footer?: string | null
          hosted_invoice_url?: string | null
          id: string
          invoice_pdf?: string | null
          last_finalization_error?: Json | null
          lines?: Json | null
          livemode?: boolean | null
          metadata?: Json | null
          next_payment_attempt?: number | null
          number?: string | null
          object?: string | null
          on_behalf_of?: string | null
          paid?: boolean | null
          payment_intent?: string | null
          payment_settings?: Json | null
          period_end?: number | null
          period_start?: number | null
          post_payment_credit_notes_amount?: number | null
          pre_payment_credit_notes_amount?: number | null
          receipt_number?: string | null
          starting_balance?: number | null
          statement_descriptor?: string | null
          status?: Database["stripe"]["Enums"]["invoice_status"] | null
          status_transitions?: Json | null
          subscription?: string | null
          subtotal?: number | null
          tax?: number | null
          total?: number | null
          total_discount_amounts?: Json | null
          total_tax_amounts?: Json | null
          transfer_data?: Json | null
          updated_at?: string
          webhooks_delivered_at?: number | null
        }
        Update: {
          account_country?: string | null
          account_name?: string | null
          account_tax_ids?: Json | null
          amount_due?: number | null
          amount_paid?: number | null
          amount_remaining?: number | null
          application_fee_amount?: number | null
          attempt_count?: number | null
          attempted?: boolean | null
          auto_advance?: boolean | null
          billing_reason?: string | null
          charge?: string | null
          collection_method?: string | null
          created?: number | null
          currency?: string | null
          custom_fields?: Json | null
          customer?: string | null
          customer_address?: Json | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_shipping?: Json | null
          customer_tax_exempt?: string | null
          customer_tax_ids?: Json | null
          default_payment_method?: string | null
          default_source?: string | null
          default_tax_rates?: Json | null
          description?: string | null
          discount?: Json | null
          discounts?: Json | null
          due_date?: number | null
          ending_balance?: number | null
          footer?: string | null
          hosted_invoice_url?: string | null
          id?: string
          invoice_pdf?: string | null
          last_finalization_error?: Json | null
          lines?: Json | null
          livemode?: boolean | null
          metadata?: Json | null
          next_payment_attempt?: number | null
          number?: string | null
          object?: string | null
          on_behalf_of?: string | null
          paid?: boolean | null
          payment_intent?: string | null
          payment_settings?: Json | null
          period_end?: number | null
          period_start?: number | null
          post_payment_credit_notes_amount?: number | null
          pre_payment_credit_notes_amount?: number | null
          receipt_number?: string | null
          starting_balance?: number | null
          statement_descriptor?: string | null
          status?: Database["stripe"]["Enums"]["invoice_status"] | null
          status_transitions?: Json | null
          subscription?: string | null
          subtotal?: number | null
          tax?: number | null
          total?: number | null
          total_discount_amounts?: Json | null
          total_tax_amounts?: Json | null
          transfer_data?: Json | null
          updated_at?: string
          webhooks_delivered_at?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_fkey"
            columns: ["customer"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_subscription_fkey"
            columns: ["subscription"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      payment_intents: {
        Row: {
          amount: number | null
          amount_capturable: number | null
          amount_details: Json | null
          amount_received: number | null
          application: string | null
          application_fee_amount: number | null
          automatic_payment_methods: string | null
          canceled_at: number | null
          cancellation_reason: string | null
          capture_method: string | null
          client_secret: string | null
          confirmation_method: string | null
          created: number | null
          currency: string | null
          customer: string | null
          description: string | null
          id: string
          invoice: string | null
          last_payment_error: string | null
          livemode: boolean | null
          metadata: Json | null
          next_action: string | null
          object: string | null
          on_behalf_of: string | null
          payment_method: string | null
          payment_method_options: Json | null
          payment_method_types: Json | null
          processing: string | null
          receipt_email: string | null
          review: string | null
          setup_future_usage: string | null
          shipping: Json | null
          statement_descriptor: string | null
          statement_descriptor_suffix: string | null
          status: string | null
          transfer_data: Json | null
          transfer_group: string | null
        }
        Insert: {
          amount?: number | null
          amount_capturable?: number | null
          amount_details?: Json | null
          amount_received?: number | null
          application?: string | null
          application_fee_amount?: number | null
          automatic_payment_methods?: string | null
          canceled_at?: number | null
          cancellation_reason?: string | null
          capture_method?: string | null
          client_secret?: string | null
          confirmation_method?: string | null
          created?: number | null
          currency?: string | null
          customer?: string | null
          description?: string | null
          id: string
          invoice?: string | null
          last_payment_error?: string | null
          livemode?: boolean | null
          metadata?: Json | null
          next_action?: string | null
          object?: string | null
          on_behalf_of?: string | null
          payment_method?: string | null
          payment_method_options?: Json | null
          payment_method_types?: Json | null
          processing?: string | null
          receipt_email?: string | null
          review?: string | null
          setup_future_usage?: string | null
          shipping?: Json | null
          statement_descriptor?: string | null
          statement_descriptor_suffix?: string | null
          status?: string | null
          transfer_data?: Json | null
          transfer_group?: string | null
        }
        Update: {
          amount?: number | null
          amount_capturable?: number | null
          amount_details?: Json | null
          amount_received?: number | null
          application?: string | null
          application_fee_amount?: number | null
          automatic_payment_methods?: string | null
          canceled_at?: number | null
          cancellation_reason?: string | null
          capture_method?: string | null
          client_secret?: string | null
          confirmation_method?: string | null
          created?: number | null
          currency?: string | null
          customer?: string | null
          description?: string | null
          id?: string
          invoice?: string | null
          last_payment_error?: string | null
          livemode?: boolean | null
          metadata?: Json | null
          next_action?: string | null
          object?: string | null
          on_behalf_of?: string | null
          payment_method?: string | null
          payment_method_options?: Json | null
          payment_method_types?: Json | null
          processing?: string | null
          receipt_email?: string | null
          review?: string | null
          setup_future_usage?: string | null
          shipping?: Json | null
          statement_descriptor?: string | null
          statement_descriptor_suffix?: string | null
          status?: string | null
          transfer_data?: Json | null
          transfer_group?: string | null
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          billing_details: Json | null
          card: Json | null
          created: number | null
          customer: string | null
          id: string
          metadata: Json | null
          object: string | null
          type: string | null
        }
        Insert: {
          billing_details?: Json | null
          card?: Json | null
          created?: number | null
          customer?: string | null
          id: string
          metadata?: Json | null
          object?: string | null
          type?: string | null
        }
        Update: {
          billing_details?: Json | null
          card?: Json | null
          created?: number | null
          customer?: string | null
          id?: string
          metadata?: Json | null
          object?: string | null
          type?: string | null
        }
        Relationships: []
      }
      payouts: {
        Row: {
          amount: number | null
          amount_reversed: number | null
          arrival_date: string | null
          automatic: boolean | null
          balance_transaction: string | null
          bank_account: Json | null
          created: number | null
          currency: string | null
          date: string | null
          description: string | null
          destination: string | null
          failure_balance_transaction: string | null
          failure_code: string | null
          failure_message: string | null
          id: string
          livemode: boolean | null
          metadata: Json | null
          method: string | null
          object: string | null
          recipient: string | null
          source_transaction: string | null
          source_type: string | null
          statement_description: string | null
          statement_descriptor: string | null
          status: string | null
          transfer_group: string | null
          type: string | null
          updated: number | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          amount_reversed?: number | null
          arrival_date?: string | null
          automatic?: boolean | null
          balance_transaction?: string | null
          bank_account?: Json | null
          created?: number | null
          currency?: string | null
          date?: string | null
          description?: string | null
          destination?: string | null
          failure_balance_transaction?: string | null
          failure_code?: string | null
          failure_message?: string | null
          id: string
          livemode?: boolean | null
          metadata?: Json | null
          method?: string | null
          object?: string | null
          recipient?: string | null
          source_transaction?: string | null
          source_type?: string | null
          statement_description?: string | null
          statement_descriptor?: string | null
          status?: string | null
          transfer_group?: string | null
          type?: string | null
          updated?: number | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          amount_reversed?: number | null
          arrival_date?: string | null
          automatic?: boolean | null
          balance_transaction?: string | null
          bank_account?: Json | null
          created?: number | null
          currency?: string | null
          date?: string | null
          description?: string | null
          destination?: string | null
          failure_balance_transaction?: string | null
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          livemode?: boolean | null
          metadata?: Json | null
          method?: string | null
          object?: string | null
          recipient?: string | null
          source_transaction?: string | null
          source_type?: string | null
          statement_description?: string | null
          statement_descriptor?: string | null
          status?: string | null
          transfer_group?: string | null
          type?: string | null
          updated?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          active: boolean | null
          aggregate_usage: string | null
          amount: number | null
          billing_scheme: string | null
          created: number | null
          currency: string | null
          id: string
          interval: string | null
          interval_count: number | null
          livemode: boolean | null
          metadata: Json | null
          nickname: string | null
          object: string | null
          product: string | null
          tiers_mode: string | null
          transform_usage: string | null
          trial_period_days: number | null
          updated_at: string
          usage_type: string | null
        }
        Insert: {
          active?: boolean | null
          aggregate_usage?: string | null
          amount?: number | null
          billing_scheme?: string | null
          created?: number | null
          currency?: string | null
          id: string
          interval?: string | null
          interval_count?: number | null
          livemode?: boolean | null
          metadata?: Json | null
          nickname?: string | null
          object?: string | null
          product?: string | null
          tiers_mode?: string | null
          transform_usage?: string | null
          trial_period_days?: number | null
          updated_at?: string
          usage_type?: string | null
        }
        Update: {
          active?: boolean | null
          aggregate_usage?: string | null
          amount?: number | null
          billing_scheme?: string | null
          created?: number | null
          currency?: string | null
          id?: string
          interval?: string | null
          interval_count?: number | null
          livemode?: boolean | null
          metadata?: Json | null
          nickname?: string | null
          object?: string | null
          product?: string | null
          tiers_mode?: string | null
          transform_usage?: string | null
          trial_period_days?: number | null
          updated_at?: string
          usage_type?: string | null
        }
        Relationships: []
      }
      prices: {
        Row: {
          active: boolean | null
          billing_scheme: string | null
          created: number | null
          currency: string | null
          id: string
          livemode: boolean | null
          lookup_key: string | null
          metadata: Json | null
          nickname: string | null
          object: string | null
          product: string | null
          recurring: Json | null
          tiers_mode: Database["stripe"]["Enums"]["pricing_tiers"] | null
          transform_quantity: Json | null
          type: Database["stripe"]["Enums"]["pricing_type"] | null
          unit_amount: number | null
          unit_amount_decimal: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          billing_scheme?: string | null
          created?: number | null
          currency?: string | null
          id: string
          livemode?: boolean | null
          lookup_key?: string | null
          metadata?: Json | null
          nickname?: string | null
          object?: string | null
          product?: string | null
          recurring?: Json | null
          tiers_mode?: Database["stripe"]["Enums"]["pricing_tiers"] | null
          transform_quantity?: Json | null
          type?: Database["stripe"]["Enums"]["pricing_type"] | null
          unit_amount?: number | null
          unit_amount_decimal?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          billing_scheme?: string | null
          created?: number | null
          currency?: string | null
          id?: string
          livemode?: boolean | null
          lookup_key?: string | null
          metadata?: Json | null
          nickname?: string | null
          object?: string | null
          product?: string | null
          recurring?: Json | null
          tiers_mode?: Database["stripe"]["Enums"]["pricing_tiers"] | null
          transform_quantity?: Json | null
          type?: Database["stripe"]["Enums"]["pricing_type"] | null
          unit_amount?: number | null
          unit_amount_decimal?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prices_product_fkey"
            columns: ["product"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean | null
          created: number | null
          default_price: string | null
          description: string | null
          id: string
          images: Json | null
          livemode: boolean | null
          marketing_features: Json | null
          metadata: Json | null
          name: string | null
          object: string | null
          package_dimensions: Json | null
          shippable: boolean | null
          statement_descriptor: string | null
          unit_label: string | null
          updated: number | null
          updated_at: string
          url: string | null
        }
        Insert: {
          active?: boolean | null
          created?: number | null
          default_price?: string | null
          description?: string | null
          id: string
          images?: Json | null
          livemode?: boolean | null
          marketing_features?: Json | null
          metadata?: Json | null
          name?: string | null
          object?: string | null
          package_dimensions?: Json | null
          shippable?: boolean | null
          statement_descriptor?: string | null
          unit_label?: string | null
          updated?: number | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          active?: boolean | null
          created?: number | null
          default_price?: string | null
          description?: string | null
          id?: string
          images?: Json | null
          livemode?: boolean | null
          marketing_features?: Json | null
          metadata?: Json | null
          name?: string | null
          object?: string | null
          package_dimensions?: Json | null
          shippable?: boolean | null
          statement_descriptor?: string | null
          unit_label?: string | null
          updated?: number | null
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      refunds: {
        Row: {
          amount: number | null
          balance_transaction: string | null
          charge: string | null
          created: number | null
          currency: string | null
          destination_details: Json | null
          id: string
          metadata: Json | null
          object: string | null
          payment_intent: string | null
          reason: string | null
          receipt_number: string | null
          source_transfer_reversal: string | null
          status: string | null
          transfer_reversal: string | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          balance_transaction?: string | null
          charge?: string | null
          created?: number | null
          currency?: string | null
          destination_details?: Json | null
          id: string
          metadata?: Json | null
          object?: string | null
          payment_intent?: string | null
          reason?: string | null
          receipt_number?: string | null
          source_transfer_reversal?: string | null
          status?: string | null
          transfer_reversal?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          balance_transaction?: string | null
          charge?: string | null
          created?: number | null
          currency?: string | null
          destination_details?: Json | null
          id?: string
          metadata?: Json | null
          object?: string | null
          payment_intent?: string | null
          reason?: string | null
          receipt_number?: string | null
          source_transfer_reversal?: string | null
          status?: string | null
          transfer_reversal?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          billing_zip: string | null
          charge: string | null
          closed_reason: string | null
          created: number | null
          id: string
          ip_address: string | null
          ip_address_location: Json | null
          livemode: boolean | null
          object: string | null
          open: boolean | null
          opened_reason: string | null
          payment_intent: string | null
          reason: string | null
          session: string | null
          updated_at: string
        }
        Insert: {
          billing_zip?: string | null
          charge?: string | null
          closed_reason?: string | null
          created?: number | null
          id: string
          ip_address?: string | null
          ip_address_location?: Json | null
          livemode?: boolean | null
          object?: string | null
          open?: boolean | null
          opened_reason?: string | null
          payment_intent?: string | null
          reason?: string | null
          session?: string | null
          updated_at?: string
        }
        Update: {
          billing_zip?: string | null
          charge?: string | null
          closed_reason?: string | null
          created?: number | null
          id?: string
          ip_address?: string | null
          ip_address_location?: Json | null
          livemode?: boolean | null
          object?: string | null
          open?: boolean | null
          opened_reason?: string | null
          payment_intent?: string | null
          reason?: string | null
          session?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      setup_intents: {
        Row: {
          cancellation_reason: string | null
          created: number | null
          customer: string | null
          description: string | null
          id: string
          latest_attempt: string | null
          mandate: string | null
          object: string | null
          on_behalf_of: string | null
          payment_method: string | null
          single_use_mandate: string | null
          status: string | null
          usage: string | null
        }
        Insert: {
          cancellation_reason?: string | null
          created?: number | null
          customer?: string | null
          description?: string | null
          id: string
          latest_attempt?: string | null
          mandate?: string | null
          object?: string | null
          on_behalf_of?: string | null
          payment_method?: string | null
          single_use_mandate?: string | null
          status?: string | null
          usage?: string | null
        }
        Update: {
          cancellation_reason?: string | null
          created?: number | null
          customer?: string | null
          description?: string | null
          id?: string
          latest_attempt?: string | null
          mandate?: string | null
          object?: string | null
          on_behalf_of?: string | null
          payment_method?: string | null
          single_use_mandate?: string | null
          status?: string | null
          usage?: string | null
        }
        Relationships: []
      }
      subscription_items: {
        Row: {
          billing_thresholds: Json | null
          created: number | null
          deleted: boolean | null
          id: string
          metadata: Json | null
          object: string | null
          price: string | null
          quantity: number | null
          subscription: string | null
          tax_rates: Json | null
        }
        Insert: {
          billing_thresholds?: Json | null
          created?: number | null
          deleted?: boolean | null
          id: string
          metadata?: Json | null
          object?: string | null
          price?: string | null
          quantity?: number | null
          subscription?: string | null
          tax_rates?: Json | null
        }
        Update: {
          billing_thresholds?: Json | null
          created?: number | null
          deleted?: boolean | null
          id?: string
          metadata?: Json | null
          object?: string | null
          price?: string | null
          quantity?: number | null
          subscription?: string | null
          tax_rates?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_items_price_fkey"
            columns: ["price"]
            isOneToOne: false
            referencedRelation: "prices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_items_subscription_fkey"
            columns: ["subscription"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_schedules: {
        Row: {
          application: string | null
          canceled_at: number | null
          completed_at: number | null
          created: number
          current_phase: Json | null
          customer: string
          default_settings: Json | null
          end_behavior: string | null
          id: string
          livemode: boolean
          metadata: Json
          object: string | null
          phases: Json
          released_at: number | null
          released_subscription: string | null
          status: Database["stripe"]["Enums"]["subscription_schedule_status"]
          subscription: string | null
          test_clock: string | null
        }
        Insert: {
          application?: string | null
          canceled_at?: number | null
          completed_at?: number | null
          created: number
          current_phase?: Json | null
          customer: string
          default_settings?: Json | null
          end_behavior?: string | null
          id: string
          livemode: boolean
          metadata: Json
          object?: string | null
          phases: Json
          released_at?: number | null
          released_subscription?: string | null
          status: Database["stripe"]["Enums"]["subscription_schedule_status"]
          subscription?: string | null
          test_clock?: string | null
        }
        Update: {
          application?: string | null
          canceled_at?: number | null
          completed_at?: number | null
          created?: number
          current_phase?: Json | null
          customer?: string
          default_settings?: Json | null
          end_behavior?: string | null
          id?: string
          livemode?: boolean
          metadata?: Json
          object?: string | null
          phases?: Json
          released_at?: number | null
          released_subscription?: string | null
          status?: Database["stripe"]["Enums"]["subscription_schedule_status"]
          subscription?: string | null
          test_clock?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          application_fee_percent: number | null
          billing_cycle_anchor: number | null
          billing_thresholds: Json | null
          cancel_at: number | null
          cancel_at_period_end: boolean | null
          canceled_at: number | null
          collection_method: string | null
          created: number | null
          current_period_end: number | null
          current_period_start: number | null
          customer: string | null
          days_until_due: number | null
          default_payment_method: string | null
          default_source: string | null
          default_tax_rates: Json | null
          discount: Json | null
          ended_at: number | null
          id: string
          items: Json | null
          latest_invoice: string | null
          livemode: boolean | null
          metadata: Json | null
          next_pending_invoice_item_invoice: number | null
          object: string | null
          pause_collection: Json | null
          pending_invoice_item_interval: Json | null
          pending_setup_intent: string | null
          pending_update: Json | null
          plan: string | null
          schedule: string | null
          start_date: number | null
          status: Database["stripe"]["Enums"]["subscription_status"] | null
          transfer_data: Json | null
          trial_end: Json | null
          trial_start: Json | null
          updated_at: string
        }
        Insert: {
          application_fee_percent?: number | null
          billing_cycle_anchor?: number | null
          billing_thresholds?: Json | null
          cancel_at?: number | null
          cancel_at_period_end?: boolean | null
          canceled_at?: number | null
          collection_method?: string | null
          created?: number | null
          current_period_end?: number | null
          current_period_start?: number | null
          customer?: string | null
          days_until_due?: number | null
          default_payment_method?: string | null
          default_source?: string | null
          default_tax_rates?: Json | null
          discount?: Json | null
          ended_at?: number | null
          id: string
          items?: Json | null
          latest_invoice?: string | null
          livemode?: boolean | null
          metadata?: Json | null
          next_pending_invoice_item_invoice?: number | null
          object?: string | null
          pause_collection?: Json | null
          pending_invoice_item_interval?: Json | null
          pending_setup_intent?: string | null
          pending_update?: Json | null
          plan?: string | null
          schedule?: string | null
          start_date?: number | null
          status?: Database["stripe"]["Enums"]["subscription_status"] | null
          transfer_data?: Json | null
          trial_end?: Json | null
          trial_start?: Json | null
          updated_at?: string
        }
        Update: {
          application_fee_percent?: number | null
          billing_cycle_anchor?: number | null
          billing_thresholds?: Json | null
          cancel_at?: number | null
          cancel_at_period_end?: boolean | null
          canceled_at?: number | null
          collection_method?: string | null
          created?: number | null
          current_period_end?: number | null
          current_period_start?: number | null
          customer?: string | null
          days_until_due?: number | null
          default_payment_method?: string | null
          default_source?: string | null
          default_tax_rates?: Json | null
          discount?: Json | null
          ended_at?: number | null
          id?: string
          items?: Json | null
          latest_invoice?: string | null
          livemode?: boolean | null
          metadata?: Json | null
          next_pending_invoice_item_invoice?: number | null
          object?: string | null
          pause_collection?: Json | null
          pending_invoice_item_interval?: Json | null
          pending_setup_intent?: string | null
          pending_update?: Json | null
          plan?: string | null
          schedule?: string | null
          start_date?: number | null
          status?: Database["stripe"]["Enums"]["subscription_status"] | null
          transfer_data?: Json | null
          trial_end?: Json | null
          trial_start?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_customer_fkey"
            columns: ["customer"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_ids: {
        Row: {
          country: string | null
          created: number
          customer: string | null
          id: string
          livemode: boolean | null
          object: string | null
          owner: Json | null
          type: string | null
          value: string | null
        }
        Insert: {
          country?: string | null
          created: number
          customer?: string | null
          id: string
          livemode?: boolean | null
          object?: string | null
          owner?: Json | null
          type?: string | null
          value?: string | null
        }
        Update: {
          country?: string | null
          created?: number
          customer?: string | null
          id?: string
          livemode?: boolean | null
          object?: string | null
          owner?: Json | null
          type?: string | null
          value?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_migration_mode: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_sync_engine_enabled: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      invoice_status:
        | "draft"
        | "open"
        | "paid"
        | "uncollectible"
        | "void"
        | "deleted"
      pricing_tiers: "graduated" | "volume"
      pricing_type: "one_time" | "recurring"
      subscription_schedule_status:
        | "not_started"
        | "active"
        | "completed"
        | "released"
        | "canceled"
      subscription_status:
        | "trialing"
        | "active"
        | "canceled"
        | "incomplete"
        | "incomplete_expired"
        | "past_due"
        | "unpaid"
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
  stripe: {
    Enums: {
      invoice_status: [
        "draft",
        "open",
        "paid",
        "uncollectible",
        "void",
        "deleted",
      ],
      pricing_tiers: ["graduated", "volume"],
      pricing_type: ["one_time", "recurring"],
      subscription_schedule_status: [
        "not_started",
        "active",
        "completed",
        "released",
        "canceled",
      ],
      subscription_status: [
        "trialing",
        "active",
        "canceled",
        "incomplete",
        "incomplete_expired",
        "past_due",
        "unpaid",
      ],
    },
  },
} as const
