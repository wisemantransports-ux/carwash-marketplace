# Carwash Marketplace: Full Backend Migration Guide

This document provides a comprehensive technical blueprint for migrating the Carwash Marketplace from a high-fidelity frontend prototype to a production-ready backend (e.g., PostgreSQL, Firestore, or Supabase).

---

## 1. Authentication & Identity Management
**Purpose:** Manage user sessions and enforce role-based access control (RBAC).

### Table: `users`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID / String | Primary Key | Unique identifier (matches Auth Provider UID). |
| `email` | String | Unique, Indexed | User's primary contact and login. |
| `name` | String | Not Null | Full name for profiles and receipts. |
| `role` | Enum | Not Null | `customer`, `business-owner`, `admin`. |
| `avatar_url`| String | Optional | Link to profile picture. |
| `created_at`| Timestamp | Default: Now | For auditing and welcome sequences. |

**Data Flow:**
1. **Signup:** User registers -> Auth provider creates UID -> Backend triggers record creation in `users` table.
2. **Access Control:** Middleware checks `user.role` before allowing entry to `/admin/*`, `/business/*`, or `/customer/*`.

---

## 2. Business Infrastructure
**Purpose:** Stores registered car wash entities and their staff.

### Table: `businesses`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID / String | Primary Key | Unique Business ID. |
| `owner_id` | UUID / String | Foreign Key (`users.id`) | Links business to a Business Owner. |
| `name` | String | Not Null | Business trading name. |
| `address` | String | Not Null | Physical location for stations. |
| `city` | String | Indexed | City of operation (e.g., Gaborone). |
| `type` | Enum | Not Null | `station`, `mobile`. |
| `rating` | Decimal | Default: 0 | Cached average rating. |
| `review_count`| Integer | Default: 0 | Cached total reviews. |
| `status` | Enum | Not Null | `pending`, `verified`, `suspended`. |
| `subscription_plan` | Enum | Default: `None` | `Starter`, `Pro`, `Enterprise`. |
| `subscription_status` | Enum | Default: `inactive` | See Status Handling section. |
| `sub_end_date` | Timestamp | Optional | Expiry date for the active plan. |

### Table: `services` (Sub-entity of Business)
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID / String | Primary Key | Service ID. |
| `business_id`| UUID / String | Foreign Key (`businesses.id`) | Links service to a provider. |
| `name` | String | Not Null | e.g., "Eco Steam Clean". |
| `price` | Decimal | Not Null | Price in Pula (BWP). |
| `duration` | Integer | Not Null | Estimated time in minutes. |

### Table: `employees` (Sub-entity of Business)
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID / String | Primary Key | Employee ID. |
| `business_id`| UUID / String | Foreign Key (`businesses.id`) | Links staff to business. |
| `name` | String | Not Null | Staff name for customer identification. |
| `phone` | String | Not Null | For customer coordination. |
| `image_url` | String | Not Null | Face photo for trust/security. |
| `id_reference`| String | Not Null (Secret) | Omang/ID number for internal verification. |

---

## 3. Booking & Operations
**Purpose:** Manages the transaction between customer and business.

### Table: `bookings`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID / String | Primary Key | Booking ID. |
| `customer_id`| UUID / String | Foreign Key (`users.id`) | Who booked. |
| `business_id`| UUID / String | Foreign Key (`businesses.id`) | Provider. |
| `service_id` | UUID / String | Foreign Key (`services.id`) | Package selected. |
| `car_id` | UUID / String | Foreign Key (`cars.id`) | Target vehicle. |
| `booking_time`| Timestamp | Indexed | Appointment date/time. |
| `status` | Enum | Not Null | `pending`, `confirmed`, `completed`, `cancelled`. |
| `mobile_status`| Enum | Optional | `en-route`, `arrived`, `started`, `finished`. |
| `staff_id` | UUID / String | Foreign Key (`employees.id`) | Assigned detailer. |

---

## 4. Subscription & Manual Payment Flow
**Purpose:** Handles the Business-to-Platform monthly billing.

### Table: `payment_submissions`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID / String | Primary Key | Submission ID. |
| `business_id`| UUID / String | Foreign Key (`businesses.id`) | Payer. |
| `plan` | Enum | Not Null | Plan being purchased. |
| `amount` | Decimal | Not Null | P150, P300, or P600. |
| `network` | Enum | Not Null | `Orange`, `Mascom`. |
| `reference` | String | Unique, Not Null | Transaction Reference from SMS. |
| `proof_url` | String | Not Null | Screenshot of payment. |
| `status` | Enum | Default: `pending` | `pending`, `approved`, `rejected`. |
| `submitted_at`| Timestamp | Default: Now | Request date. |

**Verification Logic:**
1. **Business Submits:** Record created with `status: pending`. Business `subscription_status` becomes `payment_submitted`.
2. **Admin Approves:** Admin clicks approve -> Submission `status` becomes `approved`. 
3. **Activation:** Business `subscription_status` set to `active`, `sub_end_date` set to `Now() + 30 days`.

---

## 5. Reputation System
**Purpose:** Build marketplace trust via feedback.

### Table: `ratings`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID / String | Primary Key | Rating ID. |
| `booking_id` | UUID / String | Foreign Key (`bookings.id`) | Target job. |
| `customer_id`| UUID / String | Foreign Key (`users.id`) | Author. |
| `business_id`| UUID / String | Foreign Key (`businesses.id`) | Target business. |
| `rating` | Integer | 1 to 5 | Numerical score. |
| `feedback` | Text | Optional | Customer comment. |

---

## 6. Implementation Notes & Future Scalability
- **Multi-Currency:** Add `currency_code` (ISO 4217) to `services` and `bookings` tables to support ZAR, USD, etc.
- **Plan Constraints:** Backend logic should enforce `Starter` plan users cannot create `employees` > 3.
- **PWA Integration:** Push notification tokens should be stored in a `user_devices` table for real-time tracking updates.
- **Audit Logging:** Every status change (Admin approval, Booking completion) should be recorded in a `system_logs` table for dispute resolution.
