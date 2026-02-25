
// src/lib/mock-api.ts
import { User, UserRole, Car, Business, Service, Employee, Booking, PaymentSubmission, SubscriptionPlan, SubscriptionStatus } from './types';
import { PlaceHolderImages } from './placeholder-images';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const findImage = (id: string) => PlaceHolderImages.find(img => img.id === id)?.imageUrl || 'https://picsum.photos/seed/placeholder/200/200';

// --- MOCK DATABASE ---

const users: User[] = [
  { id: 'user-1', email: 'customer@test.com', name: 'John Doe', role: 'customer', avatarUrl: findImage('user-avatar-1') },
  { id: 'user-2', email: 'owner@test.com', name: 'Jane Smith', role: 'business-owner', avatarUrl: findImage('user-avatar-2'), trial_start: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), trial_expiry: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(), paid: false },
  { id: 'user-3', email: 'admin@test.com', name: 'Admin User', role: 'admin' },
];

const businesses: Business[] = [
    { id: 'biz-1', ownerId: 'user-2', name: 'Sparkle Clean Station', address: '123 Main St', city: 'Gaborone', type: 'station', rating: 4.8, reviewCount: 150, imageUrl: findImage('car-wash-1'), status: 'verified', subscriptionPlan: 'Pro', subscriptionStatus: 'active', subscriptionStartDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), subscriptionEndDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) },
    { id: 'biz-2', ownerId: 'user-2', name: 'Pula Mobile Wash', address: 'Mobile Service', city: 'Gaborone', type: 'mobile', rating: 4.9, reviewCount: 210, imageUrl: findImage('car-wash-2'), status: 'verified', subscriptionPlan: 'Starter', subscriptionStatus: 'active', subscriptionStartDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), subscriptionEndDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) },
    { id: 'biz-3', ownerId: 'user-404', name: 'Aqua Touch Gabs', address: '456 Oak Ave', city: 'Gaborone', type: 'station', rating: 4.5, reviewCount: 95, imageUrl: findImage('car-wash-3'), status: 'verified', subscriptionPlan: 'None', subscriptionStatus: 'inactive' },
    { id: 'biz-4', ownerId: 'user-404', name: 'Pro Shine Mobile', address: 'Mobile Service', city: 'Francistown', type: 'mobile', rating: 4.7, reviewCount: 120, imageUrl: findImage('car-wash-2'), status: 'pending', subscriptionPlan: 'None', subscriptionStatus: 'inactive' },
];

let paymentSubmissions: PaymentSubmission[] = [];

const services: Service[] = [
    { id: 'svc-1', businessId: 'biz-1', name: 'Express Exterior', description: 'Quick and efficient exterior wash using high-pressure jets.', price: 25, duration: 15 },
    { id: 'svc-2', businessId: 'biz-1', name: 'Premium Detail', description: 'Full interior vacuum, steam cleaning, and exterior wax.', price: 150, duration: 120 },
    { id: 'svc-3', businessId: 'biz-2', name: 'Mobile Eco Wash', description: 'Environmentally friendly waterless wash at your doorstep.', price: 45, duration: 45 },
    { id: 'svc-4', businessId: 'biz-2', name: 'Mobile Deluxe', description: 'Thorough exterior wash and high-gloss wax at your location.', price: 80, duration: 60 },
    { id: 'svc-5', businessId: 'biz-3', name: 'Standard Station Wash', description: 'Reliable exterior and interior cleaning.', price: 40, duration: 30 },
];

const cars: Car[] = [
    { id: 'car-1', userId: 'user-1', make: 'Toyota', model: 'Hilux', year: 2021, licensePlate: 'B 123 ABC' },
    { id: 'car-2', userId: 'user-1', make: 'Ford', model: 'Ranger', year: 2022, licensePlate: 'B 789 XYZ' },
];

const employees: Employee[] = [
    { id: 'emp-1', businessId: 'biz-2', name: 'Mike Mokgosi', phone: '71000001', imageUrl: findImage('employee-1') },
    { id: 'emp-2', businessId: 'biz-2', name: 'Sarah Lesedi', phone: '71000002', imageUrl: findImage('employee-2') },
];

let bookings: Booking[] = [
    { id: 'book-1', customerId: 'user-1', businessId: 'biz-1', serviceId: 'svc-1', carId: 'car-1', bookingTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), status: 'completed', price: 25, payment: { escrowStatus: 'released', commission: 2.5 } },
    { id: 'book-2', customerId: 'user-1', businessId: 'biz-2', serviceId: 'svc-3', carId: 'car-2', bookingTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), status: 'confirmed', assignedEmployeeId: 'emp-1', mobileBookingStatus: 'en-route', price: 45, payment: { escrowStatus: 'funded', commission: 4.5 } },
    { id: 'book-3', customerId: 'user-1', businessId: 'biz-3', serviceId: 'svc-5', carId: 'car-1', bookingTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), status: 'pending', price: 40, payment: { escrowStatus: 'funded', commission: 4.0 } },
];

// --- MOCK API FUNCTIONS ---

export const mockGetCurrentUser = async (role: UserRole): Promise<User | null> => {
    await delay(100);
    return users.find(u => u.role === role) || null;
}

export const mockGetBusinesses = async (): Promise<{ data: Business[]; error: null }> => {
    await delay(400);
    return { data: businesses, error: null };
}

export const mockGetUnverifiedBusinesses = async (): Promise<{ data: Business[]; error: null }> => {
    await delay(400);
    return { data: businesses.filter(b => b.status === 'pending'), error: null };
}

export const mockGetVerifiedBusinesses = async (): Promise<{ data: Business[]; error: null }> => {
    await delay(400);
    // CRITICAL TRUST FILTER: Only verified AND active subscription businesses are visible to car owners
    const filtered = businesses.filter(b => b.status === 'verified' && b.subscriptionStatus === 'active');
    return { data: filtered, error: null };
}

export const mockGetBusinessById = async (id: string): Promise<{ data: Business | null; error: string | null }> => {
    await delay(300);
    const business = businesses.find(b => b.id === id);
    return { data: business || null, error: business ? null : 'Not found' };
}

export const mockGetServicesForBusiness = async (businessId: string): Promise<{ data: Service[]; error: null }> => {
    await delay(300);
    return { data: services.filter(s => s.businessId === businessId), error: null };
}

export const mockGetBookingsForCustomer = async (customerId: string): Promise<{ data: Booking[]; error: null }> => {
    await delay(500);
    const customerBookings = [...bookings].filter(b => b.customerId === customerId).sort((a,b) => b.bookingTime.getTime() - a.bookingTime.getTime());
    return { data: customerBookings, error: null };
}

export const mockGetBookingsForBusiness = async (businessId: string): Promise<{ data: Booking[]; error: null }> => {
    await delay(500);
    const businessBookings = [...bookings].filter(b => b.businessId === businessId).sort((a,b) => a.bookingTime.getTime() - b.bookingTime.getTime());
    return { data: businessBookings, error: null };
}

export const mockGetBookingsCountForBusiness = async (businessId: string): Promise<number> => {
    await delay(200);
    return bookings.filter(b => b.businessId === businessId).length;
}

export const mockGetBookingById = async (id: string): Promise<{ data: Booking | null; error: null }> => {
  await delay(200);
  const booking = bookings.find(b => b.id === id);
  return { data: booking || null, error: null };
}

export const mockAssignEmployeeToBooking = async (bookingId: string, employeeId: string): Promise<void> => {
    await delay(300);
    const booking = bookings.find(b => b.id === bookingId);
    if (booking) {
        booking.assignedEmployeeId = employeeId;
        booking.status = 'confirmed';
    }
}

export const mockSubmitPayment = async (submission: Omit<PaymentSubmission, 'id' | 'status' | 'submittedAt'>): Promise<void> => {
    await delay(600);
    const newSubmission: PaymentSubmission = {
        ...submission,
        id: `pay-${Date.now()}`,
        status: 'pending',
        submittedAt: new Date(),
    };
    paymentSubmissions.push(newSubmission);
    
    // Update business status
    const biz = businesses.find(b => b.id === submission.businessId);
    if (biz) {
        biz.subscriptionStatus = 'payment_submitted';
        biz.subscriptionPlan = submission.planSelected;
    }
}

export const mockGetPendingPayments = async (): Promise<{ data: PaymentSubmission[]; error: null }> => {
    await delay(400);
    return { data: paymentSubmissions.filter(p => p.status === 'pending'), error: null };
}

export const mockVerifyPayment = async (paymentId: string, action: 'approve' | 'reject'): Promise<void> => {
    await delay(500);
    const submission = paymentSubmissions.find(p => p.id === paymentId);
    if (submission) {
        submission.status = action === 'approve' ? 'approved' : 'rejected';
        submission.reviewedAt = new Date();
        
        const biz = businesses.find(b => b.id === submission.businessId);
        if (biz) {
            if (action === 'approve') {
                biz.subscriptionStatus = 'active';
                biz.subscriptionStartDate = new Date();
                biz.subscriptionEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            } else {
                biz.subscriptionStatus = 'inactive';
            }
        }
    }
}

export const mockUpdateBusinessSubscription = async (id: string, plan: SubscriptionPlan, status: SubscriptionStatus): Promise<void> => {
    await delay(300);
    const biz = businesses.find(b => b.id === id);
    if (biz) {
        biz.subscriptionPlan = plan;
        biz.subscriptionStatus = status;
    }
}

export const mockGetCarsForUser = async (userId: string): Promise<{ data: Car[]; error: null }> => {
    await delay(300);
    return { data: cars.filter(c => c.userId === userId), error: null };
}

export const mockGetEmployeesForBusiness = async (businessId: string): Promise<{ data: Employee[]; error: null }> => {
    await delay(300);
    return { data: employees.filter(e => e.businessId === businessId), error: null };
}

export const mockUpdateBusinessStatus = async (id: string, status: 'verified' | 'suspended'): Promise<void> => {
    await delay(300);
    const biz = businesses.find(b => b.id === id);
    if (biz) biz.status = status;
}
