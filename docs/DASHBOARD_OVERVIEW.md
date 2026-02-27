# Carwash Marketplace: Dashboard Architecture

This document provides a definitive guide to the user-facing dashboards within the platform as of the latest verification and service creation updates.

---

## 1. Admin Dashboard (`/admin/*`)
**Primary Role**: `admin`
**Goal**: Oversee platform integrity and manual verification workflows.

### Key Sections:
- **Registration Review**: A verification queue where admins inspect Omang/ID selfies for individuals and CIPA certificates for companies.
- **Payment Verifications**: Manual review of Mobile Money (Orange/Smega) screenshots for subscription renewals.
- **Partner Directory**: A unified view of all registered businesses and their current access state.
- **Commissions & Audit**: Oversight of platform revenue and booking history.

---

## 2. Customer Dashboard (`/customer/*`)
**Primary Role**: `customer`
**Goal**: Find, book, and track car wash services.

### Key Sections:
- **Find a Wash**: The marketplace search engine featuring verified partners first.
- **My Bookings**: Tracking for active washes, mobile detailer progress, and service history.
- **Invoices**: Digital repository for all service receipts and payment proof.
- **My Cars**: A digital garage to store vehicle makes and models for one-click booking.

---

## 3. Unified Business Dashboard (`/business/*`)
**Primary Role**: `business-owner`
**Goal**: Manage day-to-day operations and business growth.

### One Dashboard, Two Business Types:
The platform utilizes a **shared dashboard architecture**. Whether a business is an **Individual Micro-business** or a **Registered Entity (CIPA)**, they access the same set of professional tools.

### Key Sections:
- **Operations Center**: Real-time management of Incoming, Active, and Completed booking requests.
- **Services Catalog**: Management of wash packages (unlocked only for verified/active accounts).
- **Staff Registry**: Management of professional detailers, including ID references for customer safety.
- **Earnings History**: Financial breakdown of revenue from bookings and platform payouts.
- **Subscription & Profile**: The only areas accessible to "Pending" businesses to complete their setup.

### The Trust Badge System:
| Feature | Individual (Micro) | Registered (CIPA) |
| :--- | :--- | :--- |
| **Verification Method** | Omang / National ID + Selfie | CIPA Certificate + Reg Number |
| **Tool Access** | Full Dashboard Suite | Full Dashboard Suite |
| **Marketplace Badge** | "Verified Partner" | "CIPA Verified" Trust Seal |
| **Trial Logic** | Auto 14-Day Trial on Approval | Auto 14-Day Trial on Approval |

---

## Access & Security Rules
1. **Verification Lock**: Access to `Operations`, `Services`, `Staff`, and `Earnings` is strictly gated. Users must have `verification_status == 'verified'`.
2. **Subscription Lock**: If a subscription or trial expires, the dashboard is blocked, and the user is redirected to the `/business/subscription` page to renew.
3. **Real-time Sync**: The frontend layout fetches the latest business record from the database on every mount to ensure admin approvals are reflected instantly.
