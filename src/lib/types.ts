
// src/lib/types.ts
export type UserRole = 'customer' | 'business-owner' | 'admin' | 'business';

export type User = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
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
  businessId: string;
  name: string;
  description: string;
  price: number;
  duration: number; // in minutes
};

export type BusinessStatus = 'pending' | 'verified' | 'suspended';

export type SubscriptionPlan = 'Starter' | 'Pro' | 'Enterprise' | 'None';
export type SubscriptionStatus = 'inactive' | 'awaiting_payment' | 'payment_submitted' | 'active' | 'expired' | 'suspended';

export type Business = {
  id: string;
  ownerId: string;
  name: string;
  address: string;
  city: string;
  type: 'station' | 'mobile';
  rating: number;
  reviewCount: number;
  imageUrl: string;
  status: BusinessStatus;
  // Subscription fields
  subscriptionPlan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
};

export type Employee = {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  imageUrl: string;
};

export type BookingStatus = 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
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

export type PaymentSubmission = {
  id: string;
  businessId: string;
  planSelected: SubscriptionPlan;
  amount: number;
  mobileNetwork: 'Orange' | 'Mascom';
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
