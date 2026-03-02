
// src/lib/types.ts
export type UserRole = 'customer' | 'admin' | 'business-owner';

export type Tenant = {
  id: string;
  name: string;
  domain?: string;
  logo_url?: string;
  primary_color?: string; // HSL format e.g. "210 74% 50%"
  secondary_color?: string;
  support_email?: string;
  whatsapp_number?: string;
};

export type User = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenant_id: string;
  avatarUrl?: string;
  address?: string;
  city?: string;
  description?: string;
  paid?: boolean;
  trial_start?: string;
  trial_expiry?: string;
  trial_remaining?: number;
  access_active?: boolean;
  plan?: SubscriptionPlan;
  whatsapp_number?: string;
};

export type Business = {
  id: string;
  owner_id: string;
  tenant_id: string;
  name: string;
  address: string;
  city: string;
  type: 'station' | 'mobile';
  business_type: BusinessType;
  category: BusinessCategory;
  whatsapp_number?: string;
  rating: number;
  review_count: number;
  status: 'pending' | 'verified' | 'suspended';
  verification_status: VerificationStatus;
  subscription_plan: SubscriptionPlan;
  subscription_status: SubscriptionStatus;
  subscription_payment_status?: SubscriptionPaymentStatus;
  sub_end_date?: string;
  logo_url?: string;
  special_tag?: string;
  id_number?: string;
  selfie_url?: string;
  certificate_url?: string;
};

export type CarListing = {
  id: string;
  business_id: string;
  tenant_id: string;
  title: string; 
  make: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  location?: string;
  images: string[];
  status: CarListingStatus;
  description: string;
  created_at: string;
  business?: {
    name: string;
    city: string;
    logo_url?: string;
    subscription_plan?: string;
    whatsapp_number?: string;
    verification_status?: string;
  };
};

export type SparePart = {
  id: string;
  business_id: string;
  tenant_id: string;
  name: string;
  category: string;
  price: number;
  condition: SparePartCondition;
  images: string[];
  stock_quantity: number;
  description: string;
  status: SparePartStatus;
  created_at: string;
  business?: {
    name: string;
    city: string;
    verification_status: string;
  };
};

export type SubscriptionPlan = 'Starter' | 'Pro' | 'Enterprise' | 'None';
export type SubscriptionStatus = 'inactive' | 'awaiting_payment' | 'payment_submitted' | 'active' | 'expired' | 'suspended';
export type SubscriptionPaymentStatus = 'none' | 'paypal_confirmed' | 'manual_confirmed' | 'pending_verification';
export type BusinessType = 'individual' | 'registered';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type BusinessCategory = 'Wash' | 'Spare' | 'Cars';
export type CarListingStatus = 'available' | 'sold' | 'archived' | 'active';
export type SparePartCondition = 'new' | 'used' | 'refurbished';
export type SparePartStatus = 'active' | 'archived' | 'sold_out';

export type Booking = {
  id: string;
  customerId: string;
  businessId: string;
  tenant_id: string;
  service_id: string;
  car_id: string;
  booking_time: string;
  status: string;
  price: number;
};

export type PaymentSubmission = {
  id: string;
  business_id: string;
  tenant_id: string;
  plan_selected: SubscriptionPlan;
  amount: number;
  mobile_network: string;
  reference_text: string;
  proof_image_url: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at?: string;
};
