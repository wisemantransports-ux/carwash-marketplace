# Carwash Marketplace: System Flows & Business Logic

This document outlines the core operational flows for the Carwash Marketplace platform, focusing on Authentication, Trial Management, Bookings, and Invoices.

---

## 1. Authentication & Access Control

### Role-Based Redirection
- **Customers**: Redirected to `/customer/home`.
- **Business Owners**: Redirected to `/business/dashboard`.
- **Admins**: Redirected to `/admin/dashboard`.

### 14-Day Trial & Subscription Enforcement (Business Owners)
The system calculates access rights via the `users_with_access` database view.
- **Trial Phase**: New business accounts receive a 14-day trial automatically upon signup.
- **Access Check**: The frontend checks the `access_active` boolean from the profile.
- **Restriction**: If `access_active` is `false` (trial expired AND not paid), the dashboard layout blocks all pages and displays a "Subscription Required" screen.
- **Cleanup**: Unpaid accounts with expired trials are eligible for automatic deletion (handled by backend cron).

---

## 2. Booking Lifecycle

### Phase 1: Customer Request
1. Customer browses verified businesses at `/customer/home`.
2. Customer selects a business and a specific service package.
3. Customer submits a booking request.
4. **Initial Status**: `requested`.

### Phase 2: Business Response
1. Business Owner sees new requests in the "Operations" tab.
2. **Action: Accept**:
   - Booking status updates to `accepted`.
   - **Trigger**: An Invoice is automatically generated in the `invoices` table.
3. **Action: Reject**:
   - Booking status updates to `rejected`. No invoice is created.

### Phase 3: Service Execution
1. Once the wash is done, the Business Owner marks the booking as `completed`.
2. For mobile services, customers can track progress (En-route -> Arrived -> Started -> Finished).

---

## 3. Manual Invoicing & Payments

The platform uses a manual payment verification model. There is **no integrated payment gateway** for service fees.

### Invoice Generation
- Invoices are created automatically when a business **Accepts** a booking request.
- Default Status: `issued`.

### Payment Verification (Business Owner)
1. Business Owner navigates to the "Invoices" tab.
2. For `issued` invoices, the owner can click **"Mark Paid"**.
3. **Inputs Required**:
   - **Payment Method**: `cash`, `mobile_money`, or `card`.
   - **Reference**: Optional transaction ID (e.g., Orange Money SMS code).
4. Status updates to `paid`.

### Customer View
- Customers can view all their invoices at `/customer/invoices`.
- Invoices serve as the official digital proof of service.
- If an invoice is incorrect, customers are directed to the Business Owner for manual resolution or dispute.

---

## 4. Platform Subscriptions (Pula Payments)

Business owners pay for platform access using **Manual Mobile Money** transfers to the Admin.
1. Business selects a plan (Starter/Pro/Enterprise) at `/business/subscription`.
2. Business sends the specified amount to the Admin's Orange/Mascom number.
3. Business uploads a screenshot and reference text as "Proof of Payment".
4. Admin reviews the submission at `/admin/payments`.
5. Upon approval, the user's `paid` status is set to `true`, and access is extended by 30 days.
