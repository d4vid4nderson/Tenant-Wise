// Database types matching Supabase schema
// These types mirror the tables defined in supabase/migrations/001_initial_schema.sql

export type SubscriptionTier = 'free' | 'basic' | 'pro';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'paused';
export type PaymentStatus = 'succeeded' | 'pending' | 'failed' | 'refunded';
export type PropertyType = 'single_family' | 'duplex' | 'apartment' | 'condo' | 'townhouse' | 'other';
export type PropertyStatus = 'available' | 'occupied' | 'under_construction';
export type TenantStatus = 'active' | 'past' | 'pending';
export type DocumentType = 'late_rent' | 'lease_renewal' | 'maintenance' | 'move_in_out' | 'deposit_return' | 'other';

// Profile (extends Supabase Auth user)
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  subscription_tier: SubscriptionTier;
  documents_this_month: number;
  billing_cycle_start: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_connected_account_id: string | null;
  created_at: string;
  updated_at: string;
}

// Property
export interface Property {
  id: string;
  user_id: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  zip: string;
  unit_count: number;
  property_type: PropertyType | null;
  status: PropertyStatus | null;
  notes: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  monthly_rent: number | null;
  market_rent: number | null;
  image_url: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  rent_due_day: number | null;
  created_at: string;
  updated_at: string;
}

// Pet Information
export interface Pet {
  type: string; // dog, cat, bird, etc.
  name: string | null;
  breed: string | null;
  weight: number | null; // in pounds
}

// Tenant
export interface Tenant {
  id: string;
  user_id: string;
  property_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  lease_start: string | null;
  lease_end: string | null;
  rent_amount: number | null;
  security_deposit: number | null;
  status: TenantStatus;
  notes: string | null;
  // Screening/Approval fields
  date_of_birth: string | null;
  ssn_last_four: string | null;
  drivers_license: string | null;
  current_employer: string | null;
  employer_phone: string | null;
  annual_income: number | null;
  previous_address: string | null;
  previous_landlord_name: string | null;
  previous_landlord_phone: string | null;
  move_in_date: string | null;
  application_status: 'pending' | 'approved' | 'denied' | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  number_of_occupants: number | null;
  // Pet information
  has_pets: boolean;
  pets: Pet[] | null;
  created_at: string;
  updated_at: string;
}

// Document
export interface Document {
  id: string;
  user_id: string;
  property_id: string | null;
  tenant_id: string | null;
  document_type: DocumentType;
  title: string;
  content: string;
  form_data: Record<string, unknown> | null;
  state: string;
  created_at: string;
}

// Subscription
export interface Subscription {
  id: string;
  user_id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  trial_start: string | null;
  trial_end: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

// Payment (SaaS subscription payments)
export interface Payment {
  id: string;
  user_id: string;
  subscription_id: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_method: string | null;
  description: string | null;
  receipt_url: string | null;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  stripe_transfer_id: string | null;
  created_at: string;
}

// Rent Payment Status
export type RentPaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded' | 'canceled';
export type FeePayer = 'landlord' | 'tenant' | 'split';

// Tenant Payment Method (ACH bank accounts)
export interface TenantPaymentMethod {
  id: string;
  tenant_id: string;
  landlord_id: string;
  stripe_customer_id: string;
  stripe_payment_method_id: string;
  payment_method_type: string;
  bank_name: string | null;
  last_four: string | null;
  is_default: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

// Rent Payment (landlord collecting from tenant)
export interface RentPayment {
  id: string;
  landlord_id: string;
  tenant_id: string | null;
  property_id: string | null;
  payment_method_id: string | null;
  amount: number; // in cents
  fee_amount: number; // in cents
  net_amount: number; // in cents
  fee_payer: FeePayer;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  stripe_transfer_id: string | null;
  status: RentPaymentStatus;
  failure_reason: string | null;
  rent_period_start: string | null;
  rent_period_end: string | null;
  due_date: string | null;
  paid_at: string | null;
  description: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Connected Account (for landlord payouts)
export type ConnectedAccountStatus = 'pending' | 'active' | 'restricted' | 'disabled';

export interface ConnectedAccount {
  id: string;
  user_id: string;
  stripe_account_id: string;
  account_status: ConnectedAccountStatus;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  onboarding_complete: boolean;
  default_payout_schedule: string;
  created_at: string;
  updated_at: string;
}

// Document Usage
export interface DocumentUsage {
  id: string;
  user_id: string;
  billing_period_start: string;
  billing_period_end: string;
  documents_generated: number;
  document_types_used: Record<string, number>;
  created_at: string;
  updated_at: string;
}

// Insert types (for creating new records)
export type ProfileInsert = Omit<Profile, 'created_at' | 'updated_at'> & {
  created_at?: string;
  updated_at?: string;
};

export type PropertyInsert = Omit<Property, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type TenantInsert = Omit<Tenant, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type DocumentInsert = Omit<Document, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

// Update types (for updating existing records)
export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'created_at'>>;
export type PropertyUpdate = Partial<Omit<Property, 'id' | 'user_id' | 'created_at'>>;
export type TenantUpdate = Partial<Omit<Tenant, 'id' | 'user_id' | 'created_at'>>;
export type DocumentUpdate = Partial<Omit<Document, 'id' | 'user_id' | 'created_at'>>;

// Joined types (with related data)
export interface TenantWithProperty extends Tenant {
  property?: Property;
}

export interface DocumentWithRelations extends Document {
  property?: Property;
  tenant?: Tenant;
}

// Subscription tier limits
export const TIER_LIMITS: Record<SubscriptionTier, { documentsPerMonth: number | null; documentTypes: DocumentType[] }> = {
  free: {
    documentsPerMonth: 3,
    documentTypes: ['late_rent', 'move_in_out', 'maintenance'],
  },
  basic: {
    documentsPerMonth: null, // unlimited
    documentTypes: ['late_rent', 'lease_renewal', 'maintenance', 'move_in_out', 'deposit_return', 'other'],
  },
  pro: {
    documentsPerMonth: null, // unlimited
    documentTypes: ['late_rent', 'lease_renewal', 'maintenance', 'move_in_out', 'deposit_return', 'other'],
  },
};

// Database response types
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      properties: {
        Row: Property;
        Insert: PropertyInsert;
        Update: PropertyUpdate;
      };
      tenants: {
        Row: Tenant;
        Insert: TenantInsert;
        Update: TenantUpdate;
      };
      documents: {
        Row: Document;
        Insert: DocumentInsert;
        Update: DocumentUpdate;
      };
    };
    Functions: {
      increment_document_count: {
        Args: { user_id: string };
        Returns: void;
      };
      reset_monthly_document_counts: {
        Args: Record<string, never>;
        Returns: void;
      };
    };
  };
}
