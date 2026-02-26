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
  // Fields from users_with_access view
  trial_start?: string;
  trial_expiry?: string;
  paid?: boolean;
  trial_remaining?: number;
  access_active?: boolean;
  plan?: SubscriptionPlan;
};

export type Car = {
  id: string;
  userId: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string;
};

export type Service = {
  id: string;
  business_id: string;
  name: string;
  description: string;
  price: number;
  duration: number; // in minutes
  currency_code: string;
};

export type SubscriptionPlan = 'Starter' | 'Pro' | 'Enterprise' | 'None';
export type SubscriptionStatus = 'inactive' | 'awaiting_payment' | 'payment_submitted' | 'active' | 'expired' | 'suspended';

export type Business = {
  id: string;
  owner_id: string;
  name: string;
  address: string;
  city: string;
  type: 'station' | 'mobile';
  rating: number;
  review_count: number;
  status: 'pending' | 'verified' | 'suspended';
  subscription_plan: SubscriptionPlan;
  subscription_status: SubscriptionStatus;
  sub_end_date?: string;
  imageUrl?: string;
};

export type Employee = {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  imageUrl: string;
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
  payment: {
    escrowStatus: EscrowStatus;
    commission: number;
  };
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
