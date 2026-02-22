# Backend Architecture Specification

This document details the backend structure for the **Carwash Marketplace**, designed for a future Firebase/Firestore implementation.

## 1. Data Relationships

### Hierarchical Data
- **Business > Services**: Services are sub-collections of a Business, as they are unique to each provider's equipment and pricing.
- **Business > Employees**: Employees belong to a specific business. In the future, employee verification (Omang/ID) will be enforced at this level.
- **User > Cars**: A customer's vehicles are private and scoped to their profile.

### Flattened Data (Root Collections)
- **Bookings**: Bookings are stored at the root to allow both Customers and Business Owners to query them efficiently via `customerId` and `businessId` indexes.
- **Payment Submissions**: Centralized queue for Admin oversight of manual mobile money transactions.

## 2. Authentication Strategy
The platform utilizes three distinct roles based on custom claims or profile fields:
1. **Customer**: Can browse, book, and rate.
2. **Business Owner**: Can manage services, employees, and view their own earnings.
3. **Admin**: Can verify businesses, approve payments, and manage platform-wide commissions.

## 3. Subscription Logic (Manual Flow)
1. **Business Submission**: Business uploads MM reference -> `PaymentSubmission` created (status: `pending`).
2. **Admin Action**: Admin reviews -> Updates `PaymentSubmission` to `approved` -> Triggers update to `Business` status to `active` and sets `subscriptionEndDate` (+30 days).
3. **UI Enforcement**: Dashboard components check `subscriptionStatus` and `subscriptionEndDate` before allowing "Accept Booking" actions.

## 4. Security Rule Requirements (Future)
- **Read**: Customers only see `Business` docs where `status == 'verified'` AND `subscriptionStatus == 'active'`.
- **Write**: Users can only edit their own profile or their own business docs.
- **Verification**: Admins have exclusive write access to `Business.status` and `PaymentSubmission.status`.

## 5. AI Service Generation
The Genkit flows are designed to be stateless server actions that take document fields (like `serviceName`) and return text. These will persist the generated text back to the `Service` document in Firestore.
