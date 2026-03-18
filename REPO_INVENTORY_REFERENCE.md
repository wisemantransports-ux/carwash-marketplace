# Repository Inventory Reference

## Frontend Pages

| Path | Purpose | Lines of interest |
| --- | --- | --- |
| `src/app/business/profile/page.tsx` | Business profile edit/view + save/logo upload | state 24, fetch 56, logo 74, save 167 |
| `src/app/find-wash/page.tsx` | Marketplace discovery | query 42 |
| `src/app/find-wash/[businessId]/page.tsx` | Marketplace business details | query 31 |
| `src/app/dashboard/customer/page.tsx` | Customer dashboard (bookings) | query 35 |
| `src/app/business/dashboard/page.tsx` | Seller dashboard metrics | query 51 |
| `src/app/business/leads/page.tsx` | Business lead listing | query 33 |
| `src/app/customer/book/[businessId]/page.tsx` | Booking/lead capture flow | query 31 |

## Components

| Path | Purpose | Lines of interest |
| --- | --- | --- |
| `src/components/app/shared-layout.tsx` | Global layout/user menu | users query 99 |
| `src/components/app/car-marketplace.tsx` | Marketplace listing component | N/A |
| `src/components/app/ai-recommender.tsx` | AI suggestions | N/A |

## API Routes

| Path | Purpose | Methods | Database Tables affected |
| --- | --- | --- | --- |
| `src/app/api/business/update-profile/route.ts` | Update business profile via admin | PATCH | `businesses` |
| `src/app/api/auth/send-otp/route.ts` | Send login OTP | POST | `phone_otps` |
| `src/app/api/auth/verify-otp/route.ts` | Verify OTP & sync user profile | POST | `phone_otps`, `auth.users`, `users` |
| `src/app/api/auth/frictionless/route.ts` | Frictionless user lookup + create | POST | `users`, `auth.users` |
| `src/app/api/customer-login/route.ts` | Customer login and sync | POST | `users`, `auth.users` |

## Database Tables

| Table name | Fields (inferred) | Relationships | RLS policy summary |
| --- | --- | --- | --- |
| `businesses` | `id`, `owner_id`, `name`, `address`, `city`, `whatsapp_number`, `category`, `business_type`, `type`, `logo_url`, `special_tag`, `verification_status`, `status`, `subscription_plan`, `subscription_status`, `rating`, `id_number` | owner_id -> `auth.users.id` | owner_id based, verified lock for public |
| `users` | `id`, `name`, `email`, `whatsapp_number`, `role`, etc. | id -> `auth.users.id` | user profile access via auth policies |
| `phone_otps` | `phone`, `otp`, `verified`, `expires_at` | none | OTP validation only |
| `businesses_view` | derived view for admin lists | from `businesses` for aggregated metrics | read-only for admin role |

## Frontend State Bindings (business profile)

| State variable | Purpose / Field mapping |
| --- | --- |
| `name` | Business name |
| `whatsapp` | WhatsApp number (`whatsapp_number`) |
| `address` | Business address |
| `city` | City |
| `logoUrl` | Logo URL (`logo_url`) |
| `category` | Business category (`category`) |
| `bizType` | Business type (`business_type`) |
| `specialTag` | `special_tag` |
| `deliveryType` | Delivery model `type` (`station`/`mobile`) |
| `profile` | Current business record object |
| `ownerName` | Display-only owner name from auth metadata |

## Auth Flows & Roles

| Role | Description / Access |
| --- | --- |
| `business owner` | owns business, can edit profile (`owner_id = auth.uid()`) |
| `admin` | manages verification, monthly metrics, can bypass via `supabaseAdmin` route |
| `customer` | books services, can query verified businesses |
| `public` | marketplace browsing only via verified filters |
| `supabase auth` | `getSession`, `getUser` used in UI and API checks |

## Known Issues / Gaps

| Issue type | Description | File / Line |
| --- | --- | --- |
| Naming mismatch | `specialTag` state vs `special_tag` request field, fixed | `src/app/business/profile/page.tsx` |
| Variable bug | `response` vs `res` in API response parse, fixed | `src/app/business/profile/page.tsx` |
| Permission failure | Prior `users` table updates caused RLS denial | `src/app/business/profile/page.tsx`, API path |
| Routing conflict | `/icon.svg` existed in `/src/app`; removed | `src/app/icon.svg` |
| Lint config | `.eslintrc` circular warning from lint process | repo root |