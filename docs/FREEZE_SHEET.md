# Carwash Marketplace — Gemini Freeze Sheet

**Purpose:** Lock all backend structures, auth, and flows for safe Supabase implementation. No Firebase logic is included.

---

## 1. Users / Authentication

| Table | Column | Type / Constraints | Notes |
| :--- | :--- | :--- | :--- |
| **users** | `id` | UUID / String, PK | Matches Auth UID |
| | `email` | String, unique | Login |
| | `name` | String, not null | Full name |
| | `role` | Enum: `customer`, `business-owner`, `admin` | RBAC |
| | `avatar_url` | String, optional | Profile pic |
| | `created_at` | Timestamp, default `now()` | Audit |

**Flows:**
- **Signup:** Auth trigger → create `users` entry.
- **Access Control:** Middleware checks `role` for access to `/admin/*`, `/business/*`, or `/customer/*`.

---

## 2. Businesses / Staff / Services

| Table | Column | Type / Constraints | Notes |
| :--- | :--- | :--- | :--- |
| **businesses** | `id` | UUID, PK | |
| | `owner_id` | FK → `users.id` | |
| | `name` | String, not null | |
| | `address` | String | |
| | `city` | String | Indexed |
| | `type` | Enum: `station`, `mobile` | |
| | `rating` | Decimal | Cached metric |
| | `review_count` | Integer | Cached metric |
| | `status` | Enum: `pending`, `verified`, `suspended` | |
| | `subscription_plan`| Enum: `Starter`, `Pro`, `Enterprise` | |
| | `subscription_status`| Enum: `inactive`, `active`, `payment_submitted` | |
| | `sub_end_date` | Timestamp | |
| **services** | `id` | UUID, PK | |
| | `business_id` | FK → `businesses.id` | |
| | `name` | String | |
| | `price` | Decimal | |
| | `duration` | Integer | Minutes |
| | `currency_code` | String, default `BWP` | Optional multi-currency |
| **employees** | `id` | UUID, PK | |
| | `business_id` | FK → `businesses.id` | |
| | `name` | String | |
| | `phone` | String | |
| | `image_url` | String | |
| | `id_reference` | String | National ID (Omang) |

---

## 3. Cars & Bookings

| Table | Column | Type / Constraints | Notes |
| :--- | :--- | :--- | :--- |
| **cars** | `id` | UUID, PK | |
| | `owner_id` | FK → `users.id` | |
| | `plate_number` | String | |
| | `make_model` | String | |
| **bookings** | `id` | UUID, PK | |
| | `customer_id` | FK → `users.id` | |
| | `business_id` | FK → `businesses.id` | |
| | `service_id` | FK → `services.id` | |
| | `car_id` | FK → `cars.id` | |
| | `staff_id` | FK → `employees.id`, null | Assigned detailer |
| | `booking_time` | Timestamp, indexed | Appointment time |
| | `status` | Enum: `pending`, `confirmed`, `completed`, `cancelled` | |
| | `mobile_status` | Enum: `en-route`, `arrived`, `started`, `finished` | |

---

## 4. Payments / Subscriptions

| Table | Column | Type / Constraints | Notes |
| :--- | :--- | :--- | :--- |
| **payment_submissions** | `id` | UUID, PK | |
| | `business_id` | FK → `businesses.id` | |
| | `plan` | Enum: `Starter`, `Pro`, `Enterprise` | |
| | `amount` | Decimal | P150 / P300 / P600 |
| | `network` | Enum: `Orange`, `Mascom` | |
| | `reference` | String, unique | Transaction ID from SMS |
| | `proof_url` | String | Screenshot |
| | `status` | Enum: `pending`, `approved`, `rejected` | |
| | `submitted_at` | Timestamp, default `now()` | |

**Flow:** Submission → Admin Approval → `businesses.subscription_status` updated → `sub_end_date` set.

---

## 5. Ratings & Reputation

| Table | Column | Type / Constraints | Notes |
| :--- | :--- | :--- | :--- |
| **ratings** | `id` | UUID, PK | |
| | `booking_id` | FK → `bookings.id` | |
| | `customer_id` | FK → `users.id` | |
| | `business_id` | FK → `businesses.id` | |
| | `rating` | Integer (1–5) | |
| | `feedback` | Text | Optional |

---

## 6. Auxiliary / Logging / Devices

| Table | Column | Type / Constraints | Notes |
| :--- | :--- | :--- | :--- |
| **user_devices** | `user_id` | FK → `users.id` | |
| | `token` | String | Push notification token |
| **system_logs** | `event_type` | String | e.g., `booking_created` |
| | `user_id` | FK → `users.id` | |
| | `timestamp` | Timestamp | |
| | `details` | JSONB | Audit trail data |

---

## 7. Notes / Constraints
1. **Multi-Currency Support:** `currency_code` added to `services` for future scalability.
2. **Plan Restrictions:** Application logic must ensure `Starter` plan users cannot create `employees` > 3.
3. **No Firebase / IDX Backend Code:** This is strictly a blueprint for PostgreSQL-compatible backends (e.g., Supabase).
4. **Trust Seal:** `businesses.status` must be `verified` AND `subscription_status` must be `active` for a business to appear in public search.
