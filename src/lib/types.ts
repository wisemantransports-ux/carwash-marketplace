
// src/lib/types.ts
export type UserRole = 'admin' | 'business-owner' | 'customer';

export type User = {
  id: string;
  email: string;
  whatsapp_number: string;
  name: string;
  role: UserRole;
  is_verified: boolean;
  avatar_url?: string;
  paid?: boolean;
  trial_expiry?: string;
  access_active?: boolean;
  otp_code?: string;
  otp_expires_at?: string;
};

export type ListingCategory = 'car' | 'spare_part' | 'wash_service';

export type Listing = {
  id: string;
  business_id: string;
  listing_type: ListingCategory;
  name: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
  service_image_url?: string | null;
  verified: boolean;
  created_at: string;
  updated_at: string;
  business?: {
    name: string;
    city: string;
    logo_url?: string;
    verification_status: string;
    performanceBadge?: string;
    performanceScore?: number;
  };
};

export type LeadStatus = 'new' | 'contacted' | 'converted' | 'closed';

export type Lead = {
  id: string;
  customer_id: string | null;
  seller_business_id: string;
  listing_id: string;
  customer_name: string;
  customer_whatsapp: string;
  customer_email?: string | null;
  listing_type: ListingCategory;
  status: LeadStatus;
  created_at: string;
  updated_at: string;
  listing?: { name: string; price: number };
  business?: { name: string; city: string; whatsapp_number: string };
};

export type BusinessType = 'individual' | 'registered';
export type BusinessCategory = 'Wash' | 'Spare' | 'Cars';

export type Business = {
  id: string;
  owner_id: string;
  name: string;
  address: string;
  city: string;
  category: BusinessCategory;
  verification_status: 'pending' | 'verified' | 'rejected';
  status: 'pending' | 'verified' | 'suspended';
  business_type: BusinessType;
  type?: 'station' | 'mobile';
  subscription_plan: 'Starter' | 'Pro' | 'Enterprise' | 'None';
  subscription_status: 'inactive' | 'active' | 'payment_submitted';
  whatsapp_number?: string;
  logo_url?: string;
  rating?: number;
  id_number?: string;
  special_tag?: string;
  sub_end_date?: string;
};

export type Employee = {
  id: string;
  business_id: string;
  name: string;
  phone: string;
  image_url?: string;
  id_reference?: string;
};

export type WashService = {
  id: string;
  name: string;
  business_id: string;
  price: number;
  duration_minutes: number;
};

export type WashBookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export type WashBooking = {
  id: string;
  customer_name: string;
  customer_whatsapp: string;
  customer_email: string | null;
  verified: boolean;
  wash_service_id: string;
  seller_business_id: string;
  assigned_employee_id: string | null;
  status: WashBookingStatus;
  scheduled_at: string;
  created_at: string;
  updated_at: string;
  customer_id: string | null;
  employee_id: string | null;
  business_id: string;
  location: string | null;
  
  // UI helper fields
  service_name?: string;
  employee_name?: string;
};
