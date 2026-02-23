# Carwash Marketplace: Backend Migration Guide

This guide is derived from the **Gemini Freeze Sheet** and provides a technical overview for implementing the marketplace backend using PostgreSQL (Supabase).

## Core Strategy
1. **Relational Database**: Use PostgreSQL for structured data (Users, Businesses, Bookings).
2. **Role-Based Access Control (RBAC)**: Enforce security via `users.role` (customer, business-owner, admin).
3. **Manual Verification Loop**: Admin oversight for business verification and mobile money payment proof.

---

## 1. Authentication & Users
The platform requires three roles. Use an `auth.users` trigger to sync profile data into the public `users` table.

```sql
CREATE TYPE user_role AS ENUM ('customer', 'business-owner', 'admin');

CREATE TABLE users (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'customer',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 2. Business Infrastructure
Businesses are the core service providers.

```sql
CREATE TYPE business_status AS ENUM ('pending', 'verified', 'suspended');
CREATE TYPE subscription_status AS ENUM ('inactive', 'active', 'payment_submitted');
CREATE TYPE subscription_plan AS ENUM ('Starter', 'Pro', 'Enterprise');

CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id) NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  type TEXT CHECK (type IN ('station', 'mobile')),
  status business_status DEFAULT 'pending',
  subscription_plan subscription_plan DEFAULT 'Starter',
  subscription_status subscription_status DEFAULT 'inactive',
  sub_end_date TIMESTAMPTZ,
  rating DECIMAL DEFAULT 0,
  review_count INTEGER DEFAULT 0
);
```

---

## 3. Subscription & Manual Pula Payments
Businesses pay monthly via Orange Money or Mascom MyZaka.

```sql
CREATE TABLE payment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) NOT NULL,
  plan subscription_plan NOT NULL,
  amount DECIMAL NOT NULL,
  network TEXT NOT NULL,
  reference TEXT UNIQUE NOT NULL,
  proof_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  submitted_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 4. Bookings & Mobile Tracking
Bookings link customers to businesses and cars.

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES users(id),
  business_id UUID REFERENCES businesses(id),
  service_id UUID REFERENCES services(id),
  car_id UUID REFERENCES cars(id),
  staff_id UUID REFERENCES employees(id),
  booking_time TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending',
  mobile_status TEXT,
  price DECIMAL NOT NULL
);
```

---

## 5. Security Principles
- **Search**: Customers query `businesses` where `status = 'verified'` AND `subscription_status = 'active'`.
- **Visibility**: Employee National IDs (`id_reference`) are NEVER exposed to the frontend; only used by Admins for auditing.
- **Integrity**: Payment reference codes must be unique across the platform.

Refer to `docs/FREEZE_SHEET.md` for the full "locked" specification.
