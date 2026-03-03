
// src/lib/types.ts
export type UserRole = 'customer' | 'business-owner' | 'admin';

export type User = {
  id: string;
  email: string;
  whatsapp_number: string;
  name: string;
  role: UserRole;
  is_verified: boolean;
  otp_code?: string | null;
  otp_expires_at?: string | null;
  last_login_at?: string | null;
  avatarUrl?: string;
  created_at?: string;
  paid?: boolean;
  trial_expiry?: string;
  access_active?: boolean;
};

export type LeadStatus = 'new' | 'contacted' | 'converted' | 'closed';
export type ListingCategory = 'car' | 'spare_part' | 'wash_service';

export type Listing = {
  id: string;
  business_id: string;
  type: ListingCategory;
  listing_type: ListingCategory;
  name: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
  verified?: boolean;
  created_at: string;
  updated_at: string;
};

export type Lead = {
  id: string;
  user_id: string | null;
  customer_name: string;
  customer_whatsapp: string;
  whatsapp_number: string;
  seller_id: string;
  listing_id: string;
  listing_type: ListingCategory;
  status: LeadStatus;
  created_at: string;
  contacted_at?: string;
  user?: { name: string; is_verified: boolean };
};

export type BusinessType = 'individual' | 'registered';
export type BusinessCategory = 'Wash' | 'Spare' | 'Cars';

export type Business = {
  id: string;
  owner_id: string;
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
  verification_status: 'pending' | 'verified' | 'rejected';
  subscription_plan: 'Starter' | 'Pro' | 'Enterprise' | 'None';
  subscription_status: 'inactive' | 'awaiting_payment' | 'payment_submitted' | 'active' | 'expired' | 'suspended';
  logo_url?: string;
  id_number?: string;
  selfie_url?: string;
  certificate_url?: string;
  sub_end_date?: string;
};

export type Employee = {
  id: string;
  business_id: string;
  name: string;
  phone: string;
  image_url: string; // Mandatory for carwash assignment
  id_reference?: string;
};

export type WashBooking = {
  id: string;
  user_id: string | null;
  whatsapp_number: string;
  wash_business_id: string;
  employee_id: string | null;
  service_type: string;
  booking_date: string;
  booking_time: string;
  status: 'pending_assignment' | 'assigned' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  price?: number;
  user?: { name: string; is_verified: boolean };
  employee?: { name: string; image_url: string };
};

export type BusinessLocation = {
  id: string;
  business_id: string;
  name: string;
  address: string;
  city: string;
  phone: string | null;
};
