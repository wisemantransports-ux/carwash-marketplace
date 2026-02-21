// src/lib/types.ts
export type UserRole = 'customer' | 'business-owner' | 'admin';

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

export type Business = {
  id:string;
  ownerId: string;
  name: string;
  address: string;
  city: string;
  type: 'station' | 'mobile';
  rating: number;
  reviewCount: number;
  imageUrl: string;
  verified: boolean;
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

export type Rating = {
  id: string;
  bookingId: string;
  customerId: string;
  businessId: string;
  rating: number;
  feedback: string;
  createdAt: Date;
};

export type Dispute = {
  id: string;
  bookingId: string;
  raisedBy: string; // customerId or businessId
  reason: string;
  status: 'open' | 'resolved' | 'closed';
  createdAt: Date;
}
