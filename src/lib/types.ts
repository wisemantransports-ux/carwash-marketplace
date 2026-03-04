
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
  user_id: string | null;
  seller_id: string;
  listing_id: string;
  lead_type: ListingCategory;
  customer_name: string;
  customer_whatsapp: string;
  status: LeadStatus;
  created_at: string;
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
  subscription_plan: 'Starter' | 'Pro' | 'Enterprise' | 'None';
  subscription_status: 'inactive' | 'active' | 'payment_submitted';
  whatsapp_number?: string;
  logo_url?: string;
  rating?: number;
  id_number?: string;
  special_tag?: string;
};

export type Employee = {
  id: string;
  business_id: string;
  name: string;
  phone: string;
  image_url: string;
  id_reference?: string;
};

export type WashBookingStatus = 'pending_assignment' | 'assigned' | 'confirmed' | 'completed' | 'cancelled' | 'rejected';

export type WashBooking = {
  id: string;
  user_id: string | null;
  whatsapp_number: string;
  wash_business_id: string;
  employee_id: string | null;
  service_type: string; // This links to listing_id
  booking_date: string;
  booking_time: string;
  location_pin?: string;
  status: WashBookingStatus;
  price?: number;
  user?: { name: string };
  employee?: { name: string; phone: string; image_url: string };
  business?: { name: string; city: string; logo_url: string };
  created_at: string;
};
