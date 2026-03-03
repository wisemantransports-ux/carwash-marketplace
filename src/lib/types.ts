
// src/lib/types.ts
export type UserRole = 'customer' | 'seller' | 'wash_business' | 'employee' | 'admin';

export type User = {
  id: string;
  whatsapp_number: string;
  name: string;
  role: UserRole;
  is_verified: boolean;
  otp_code?: string | null;
  otp_expires_at?: string | null;
  last_login_at?: string | null;
  avatarUrl?: string;
  created_at?: string;
};

export type LeadStatus = 'new' | 'contacted' | 'converted' | 'closed';
export type ListingType = 'car' | 'spare_part';

export type Lead = {
  id: string;
  user_id?: string | null;
  whatsapp_number: string;
  listing_id: string;
  listing_type: ListingType;
  seller_id: string;
  status: LeadStatus;
  created_at: string;
  contacted_at?: string | null;
  // Joined fields
  user?: {
    name: string;
    is_verified: boolean;
  };
  listing_details?: {
    title?: string;
    name?: string;
  };
};

export type BookingStatus = 'pending_assignment' | 'assigned' | 'confirmed' | 'completed' | 'cancelled';

export type WashBooking = {
  id: string;
  user_id?: string | null;
  whatsapp_number: string;
  wash_business_id: string;
  service_type: string;
  booking_date: string;
  booking_time: string;
  status: BookingStatus;
  employee_id?: string | null;
  price: number;
  created_at: string;
  // Joined fields
  user?: {
    name: string;
    is_verified: boolean;
  };
  employee?: {
    name: string;
    image_url?: string;
  };
};

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
  verification_status: VerificationStatus;
  subscription_plan: SubscriptionPlan;
  subscription_status: SubscriptionStatus;
  logo_url?: string;
  id_number?: string;
};

export type SubscriptionPlan = 'Starter' | 'Pro' | 'Enterprise' | 'None';
export type SubscriptionStatus = 'inactive' | 'awaiting_payment' | 'payment_submitted' | 'active' | 'expired' | 'suspended';
export type BusinessType = 'individual' | 'registered';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type BusinessCategory = 'Wash' | 'Spare' | 'Cars';

export type CarListing = {
  id: string;
  business_id: string;
  title: string; 
  make: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  images: string[];
  status: string;
  description: string;
  created_at: string;
  business?: {
    name: string;
    whatsapp_number?: string;
    city: string;
  };
};

export type SparePart = {
  id: string;
  business_id: string;
  name: string;
  category: string;
  price: number;
  condition: string;
  images: string[];
  stock_quantity: number;
  description: string;
  status: string;
  created_at: string;
  business?: {
    name: string;
    whatsapp_number?: string;
    city: string;
  };
};

export type Employee = {
  id: string;
  business_id: string;
  name: string;
  phone: string;
  image_url?: string;
};
