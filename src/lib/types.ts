
// src/lib/types.ts
export type UserRole = 'customer' | 'admin' | 'business-owner';

export type User = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  address?: string;
  city?: string;
  description?: string;
  // Fields from users_with_access view (for customers/admin)
  trial_start?: string;
  trial_expiry?: string;
  paid?: boolean;
  trial_remaining?: number;
  access_active?: boolean;
  plan?: SubscriptionPlan;
  whatsapp_number?: string;
};

export type Car = {
  id: string;
  owner_id: string;
  make: string;
  model: string;
  make_model?: string;
};

export type Service = {
  id: string;
  business_id: string;
  name: string;
  description?: string;
  price: number;
  duration?: number;
  currency_code?: string;
  created_at?: string;
};

export type SubscriptionPlan = 'Starter' | 'Pro' | 'Enterprise' | 'None';
export type SubscriptionStatus = 'inactive' | 'awaiting_payment' | 'payment_submitted' | 'active' | 'expired' | 'suspended';
export type BusinessType = 'individual' | 'registered';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type BusinessCategory = 'Wash' | 'Spare' | 'Cars';

export type Business = {
  id: string;
  owner_id: string;
  name: string;
  address: string;
  city: string;
  type: 'station' | 'mobile'; // Service delivery model
  business_type: BusinessType; // Entity legal type
  category: BusinessCategory;
  whatsapp_number?: string;
  rating: number;
  review_count: number;
  status: 'pending' | 'verified' | 'suspended'; // Platform access status
  verification_status: VerificationStatus; // Document verification status
  subscription_plan: SubscriptionPlan;
  subscription_status: SubscriptionStatus;
  sub_end_date?: string;
  logo_url?: string;
  special_tag?: string; // e.g. "CIPA Verified"
  id_number?: string; // Omang or Reg Number
  selfie_url?: string;
  certificate_url?: string;
  trial_start_date?: string;
  trial_end_date?: string;
};

export type Employee = {
  id: string;
  business_id: string;
  name: string;
  phone: string;
  image_url: string;
  id_reference: string;
};

export type BookingStatus = 'requested' | 'accepted' | 'completed' | 'rejected' | 'cancelled';
export type MobileBookingStatus = 'en-route' | 'arrived' | 'service-started' | 'service-finished';
export type EscrowStatus = 'funded' | 'released' | 'refunded';

export type Booking = {
  id: string;
  customerId: string;
  businessId: string;
  serviceId: string;
  carId: string;
  bookingTime: Date;
  status: BookingStatus;
  mobileBookingStatus?: MobileBookingStatus;
  assignedEmployeeId?: string;
  price: number;
};

export type PaymentMethod = 'cash' | 'mobile_money' | 'card';
export type InvoiceStatus = 'issued' | 'paid' | 'disputed';

export type Invoice = {
  id: string;
  bookingId: string;
  customerId: string;
  businessId: string;
  amount: number;
  status: InvoiceStatus;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  issuedAt: Date;
  paidAt?: Date;
};

export type PaymentSubmission = {
  id: string;
  businessId: string;
  planSelected: SubscriptionPlan;
  amount: number;
  mobileNetwork: 'Orange' | 'Smega';
  referenceText: string;
  proofImageUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Date;
  reviewedAt?: Date;
};

export type Rating = {
  id: string;
  bookingId: string;
  customerId: string;
  businessId: string;
  rating: number;
  feedback: string;
  createdAt: Date;
};

export type BusinessEarningStatus = 'earned' | 'pending payout' | 'paid out';

export type BusinessEarning = {
  id: string;
  business_id: string;
  source: 'booking' | 'other';
  reference_id: string;
  amount: number;
  status: BusinessEarningStatus;
  created_at: string;
  // Relationship data from joins
  bookings?: {
    id: string;
    booking_time: string;
    status: string;
    customer?: { name: string };
    service?: { name: string; price: number };
  };
};

export type CarListingStatus = 'available' | 'sold' | 'archived' | 'active';

export type CarListing = {
  id: string;
  business_id: string;
  owner_id?: string;
  title: string; // Fixed: title is mandatory in DB
  make: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  location?: string;
  images: string[]; // Corrected: Must be an array
  status: CarListingStatus;
  description: string;
  created_at: string;
  // Joined data
  business?: {
    name: string;
    city: string;
    logo_url?: string;
    subscription_plan?: string;
    whatsapp_number?: string;
  };
};

export type TestDriveRequestStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export type TestDriveRequest = {
  id: string;
  car_listing_id: string;
  customer_id: string;
  requested_time: string;
  status: TestDriveRequestStatus;
  staff_id?: string; // Assigned employee
  created_at: string;
  // Form submission fields (optional overrides)
  customer_name?: string;
  customer_phone?: string;
  // Joins
  car_listing?: CarListing;
  customer?: { name: string; phone?: string; email: string };
  staff?: Employee;
};
