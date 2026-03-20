# BOOKING FLOW

## Entry paths
1. Authenticated user:
   - uses `authUser.id` as `customer_id`.

2. Walk-in:
   - provides WhatsApp.
   - system:
     a. check if user exists.
     b. if exists → return `409` (force login).
     c. if not → create user.
     d. proceed with booking.

## Booking rules
- `status` must be one of `['pending', 'confirmed', 'completed', 'cancelled']`.
- default `status` = `'pending'`.
- service must belong to `seller_business_id`.
