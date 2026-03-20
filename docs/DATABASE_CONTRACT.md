# Database Contract

## bookings table
- `id`: uuid (PK)
- `customer_id`: uuid (FK users.id)
- `seller_business_id`: uuid (FK businesses.id)
- `service_id`: uuid (FK listings.id)
- `scheduled_at`: timestamptz
- `status`: text (`pending`, `confirmed`, `completed`, `cancelled` only)
- `assigned_employee_id`: uuid | null
- `created_at`, `updated_at`

## users table
- `id`: uuid (PK)
- `name`: text
- `whatsapp_number`: text
- `role`: enum ('customer','business-owner','admin')
- plus metadata fields like trial_expiry, is_verified, etc.

## listings table (service data)
- `id`: uuid (PK)
- `business_id`: uuid (FK businesses.id)
- `listing_type`: expects `'wash_service'` for booking services
- `name`, `price`, `duration`, etc.

## Allowed Booking Statuses
- `pending`
- `confirmed`
- `completed`
- `cancelled`

## INVALID STATES (DO NOT USE)
- `assigned`
- `in_progress`
- `pending_assignment`

## API Behavior Alignment
- `POST /api/bookings/create`: inserts `status: 'pending'`
- Status transition path enforced in app logic: `pending` → `confirmed` → `completed` or `cancelled`
- No writes to disallowed state fields in all booking APIs after refactor
