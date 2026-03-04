
// src/lib/types.ts
export type UserRole = 'admin' | 'business' | 'customer';

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

export type Business = {
  id: string;
  owner_id: string;
  name: string;
  address: string;
  city: string;
  category: 'wash' | 'spare' | 'car';
  verification_status: 'verified' | 'unverified';
  subscription_plan: 'Starter' | 'Pro' | 'Enterprise' | 'None';
  logo_url?: string;
  rating?: number;
};

export type Employee = {
  id: string;
  business_id: string;
  name: string;
  phone: string;
  image_url: string;
  id_reference: string;
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
  location_pin?: string;
  status: 'pending_assignment' | 'assigned' | 'confirmed' | 'completed' | 'cancelled';
  price?: number;
  user?: { name: string };
  employee?: { name: string; image_url: string };
  created_at: string;
};
