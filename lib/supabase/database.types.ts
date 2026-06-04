/**
 * Database types for the D&D Luxury Marketplace.
 *
 * Hand-authored to match `supabase/migrations/0001_init.sql`. Keep the two in
 * lockstep — when the schema changes, update both. (Can be regenerated with
 * `supabase gen types typescript` once the project is linked.)
 *
 * Conventions:
 *  - All money is stored as integer ZAR cents (`*_cents`). Never floats.
 *  - All fee rates are integer basis points (`*_bps`); rate = bps / 10000.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "buyer" | "seller" | "admin";
export type UserStatus = "active" | "suspended" | "banned";
export type AuthMethod = "photo" | "courier" | "dropoff";
export type SubmissionStatus =
  | "pending"
  | "more_info"
  | "approved"
  | "declined";
export type ListingStatus = "pending" | "active" | "sold" | "delisted";
export type OrderStatus =
  | "pending"
  | "paid"
  | "delivered"
  | "refunded"
  | "disputed";
export type SubscriptionStatus = "active" | "cancelled" | "past_due";
export type DisputeStatus = "open" | "resolved";

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          role: UserRole;
          full_name: string | null;
          phone: string | null;
          status: UserStatus;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role?: UserRole;
          full_name?: string | null;
          phone?: string | null;
          status?: UserStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: UserRole;
          full_name?: string | null;
          phone?: string | null;
          status?: UserStatus;
          created_at?: string;
        };
        Relationships: [];
      };
      seller_profiles: {
        Row: {
          id: string;
          user_id: string;
          username: string;
          display_name: string | null;
          bio: string | null;
          bank_name: string | null;
          bank_account_number: string | null;
          bank_branch_code: string | null;
          bank_account_holder: string | null;
          reputation_score: number;
          verified: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          username: string;
          display_name?: string | null;
          bio?: string | null;
          bank_name?: string | null;
          bank_account_number?: string | null;
          bank_branch_code?: string | null;
          bank_account_holder?: string | null;
          reputation_score?: number;
          verified?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          username?: string;
          display_name?: string | null;
          bio?: string | null;
          bank_name?: string | null;
          bank_account_number?: string | null;
          bank_branch_code?: string | null;
          bank_account_holder?: string | null;
          reputation_score?: number;
          verified?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      rate_limits: {
        Row: { key: string; bucket: number; count: number };
        Insert: { key: string; bucket: number; count?: number };
        Update: { key?: string; bucket?: number; count?: number };
        Relationships: [];
      };
      subscription_tiers: {
        Row: {
          id: string;
          name: string;
          monthly_fee_cents: number;
          per_item_fee_cents: number;
          max_listings: number | null;
          transaction_fee_bps: number;
          auth_included: string | null;
          courier_credits: number;
          sort_order: number;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          monthly_fee_cents?: number;
          per_item_fee_cents?: number;
          max_listings?: number | null;
          transaction_fee_bps: number;
          auth_included?: string | null;
          courier_credits?: number;
          sort_order?: number;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          monthly_fee_cents?: number;
          per_item_fee_cents?: number;
          max_listings?: number | null;
          transaction_fee_bps?: number;
          auth_included?: string | null;
          courier_credits?: number;
          sort_order?: number;
          active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      seller_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          tier_id: string;
          status: SubscriptionStatus;
          current_period_end: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          tier_id: string;
          status?: SubscriptionStatus;
          current_period_end?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          tier_id?: string;
          status?: SubscriptionStatus;
          current_period_end?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      auth_submissions: {
        Row: {
          id: string;
          seller_id: string;
          method: AuthMethod;
          status: SubmissionStatus;
          brand: string;
          category: string;
          title: string;
          model: string | null;
          description: string | null;
          condition: string;
          asking_price_cents: number;
          year: number | null;
          photo_paths: string[];
          admin_notes: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          submitted_at: string;
        };
        Insert: {
          id?: string;
          seller_id: string;
          method: AuthMethod;
          status?: SubmissionStatus;
          brand: string;
          category: string;
          title: string;
          model?: string | null;
          description?: string | null;
          condition: string;
          asking_price_cents: number;
          year?: number | null;
          photo_paths?: string[];
          admin_notes?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          submitted_at?: string;
        };
        Update: {
          id?: string;
          seller_id?: string;
          method?: AuthMethod;
          status?: SubmissionStatus;
          brand?: string;
          category?: string;
          title?: string;
          model?: string | null;
          description?: string | null;
          condition?: string;
          asking_price_cents?: number;
          year?: number | null;
          photo_paths?: string[];
          admin_notes?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          submitted_at?: string;
        };
        Relationships: [];
      };
      listings: {
        Row: {
          id: string;
          seller_id: string;
          auth_submission_id: string | null;
          title: string;
          brand: string;
          category: string;
          model: string | null;
          description: string | null;
          condition: string;
          price_cents: number;
          year: number | null;
          status: ListingStatus;
          fee_rate_bps: number;
          auth_method: AuthMethod;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          seller_id: string;
          auth_submission_id?: string | null;
          title: string;
          brand: string;
          category: string;
          model?: string | null;
          description?: string | null;
          condition: string;
          price_cents: number;
          year?: number | null;
          status?: ListingStatus;
          fee_rate_bps: number;
          auth_method: AuthMethod;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          seller_id?: string;
          auth_submission_id?: string | null;
          title?: string;
          brand?: string;
          category?: string;
          model?: string | null;
          description?: string | null;
          condition?: string;
          price_cents?: number;
          year?: number | null;
          status?: ListingStatus;
          fee_rate_bps?: number;
          auth_method?: AuthMethod;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      listing_images: {
        Row: {
          id: string;
          listing_id: string;
          url: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          url: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          url?: string;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      wishlists: {
        Row: {
          id: string;
          buyer_id: string;
          brand: string | null;
          category: string | null;
          keywords: string | null;
          max_price_cents: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          buyer_id: string;
          brand?: string | null;
          category?: string | null;
          keywords?: string | null;
          max_price_cents?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          buyer_id?: string;
          brand?: string | null;
          category?: string | null;
          keywords?: string | null;
          max_price_cents?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          buyer_id: string;
          listing_id: string;
          seller_id: string;
          gateway_reference: string | null;
          gross_amount_cents: number;
          commission_amount_cents: number;
          seller_payout_amount_cents: number;
          fee_rate_bps: number;
          status: OrderStatus;
          shipping_name: string | null;
          shipping_address: string | null;
          created_at: string;
          paid_at: string | null;
          delivered_at: string | null;
        };
        Insert: {
          id?: string;
          buyer_id: string;
          listing_id: string;
          seller_id: string;
          gateway_reference?: string | null;
          gross_amount_cents: number;
          commission_amount_cents: number;
          seller_payout_amount_cents: number;
          fee_rate_bps: number;
          status?: OrderStatus;
          shipping_name?: string | null;
          shipping_address?: string | null;
          created_at?: string;
          paid_at?: string | null;
          delivered_at?: string | null;
        };
        Update: {
          id?: string;
          buyer_id?: string;
          listing_id?: string;
          seller_id?: string;
          gateway_reference?: string | null;
          gross_amount_cents?: number;
          commission_amount_cents?: number;
          seller_payout_amount_cents?: number;
          fee_rate_bps?: number;
          status?: OrderStatus;
          shipping_name?: string | null;
          shipping_address?: string | null;
          created_at?: string;
          paid_at?: string | null;
          delivered_at?: string | null;
        };
        Relationships: [];
      };
      checkout_intents: {
        Row: {
          m_payment_id: string;
          listing_id: string;
          buyer_id: string;
          shipping_name: string;
          shipping_address: string;
          created_at: string;
        };
        Insert: {
          m_payment_id: string;
          listing_id: string;
          buyer_id: string;
          shipping_name: string;
          shipping_address: string;
          created_at?: string;
        };
        Update: {
          m_payment_id?: string;
          listing_id?: string;
          buyer_id?: string;
          shipping_name?: string;
          shipping_address?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      disputes: {
        Row: {
          id: string;
          order_id: string;
          raised_by: string;
          reason: string;
          status: DisputeStatus;
          resolution: string | null;
          resolved_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          raised_by: string;
          reason: string;
          status?: DisputeStatus;
          resolution?: string | null;
          resolved_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          raised_by?: string;
          reason?: string;
          status?: DisputeStatus;
          resolution?: string | null;
          resolved_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          order_id: string;
          reviewer_id: string;
          seller_id: string;
          rating: number;
          body: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          reviewer_id: string;
          seller_id: string;
          rating: number;
          body?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          reviewer_id?: string;
          seller_id?: string;
          rating?: number;
          body?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string | null;
          link: string | null;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          body?: string | null;
          link?: string | null;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          body?: string | null;
          link?: string | null;
          read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      seller_public_profiles: {
        Row: {
          user_id: string | null;
          username: string | null;
          display_name: string | null;
          bio: string | null;
          reputation_score: number | null;
          created_at: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      rate_limit_hit: {
        Args: { p_key: string; p_max: number; p_window: number };
        Returns: boolean;
      };
      fulfill_payfast_order: {
        Args: {
          p_gateway_reference: string;
          p_listing_id: string;
          p_buyer_id: string;
          p_gross_cents: number;
          p_commission_cents: number;
          p_payout_cents: number;
          p_fee_rate_bps: number;
          p_shipping_name: string | null;
          p_shipping_address: string | null;
        };
        Returns: string;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
}

// Convenience row aliases.
type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];

export type User = Tables<"users">;
export type SellerProfile = Tables<"seller_profiles">;
export type SubscriptionTier = Tables<"subscription_tiers">;
export type SellerSubscription = Tables<"seller_subscriptions">;
export type AuthSubmission = Tables<"auth_submissions">;
export type Listing = Tables<"listings">;
export type ListingImage = Tables<"listing_images">;
export type Wishlist = Tables<"wishlists">;
export type Order = Tables<"orders">;
export type CheckoutIntent = Tables<"checkout_intents">;
export type Dispute = Tables<"disputes">;
export type Review = Tables<"reviews">;
export type Notification = Tables<"notifications">;
export type SellerPublicProfile =
  PublicSchema["Views"]["seller_public_profiles"]["Row"];
