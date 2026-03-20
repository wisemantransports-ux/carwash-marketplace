# Booking Flows

## Authenticated Booking
1. Customer visits UI and submits booking form (business, service, schedule)
2. Frontend calls `/api/bookings/create` with `customer_id`, `seller_business_id`, `service_id`, `scheduled_at`
3. API validates fields and customer existence
4. If valid → inserts booking with `status: 'pending'`
5. Returns `success: true, booking_id`

### Expected response
- 200: `{ success: true, booking_id }`
- 400: missing required field or invalid scheduled_at
- 404: customer/business/service not found
- 500: unexpected server error

## Walk-In Booking
1. Customer uses WhatsApp phone input
2. `/api/bookings/create` route validates `whatsapp`; creates user if missing
3. Ensures customer exists in `users` (upsert)
4. Creates booking with `status: 'pending'`
5. Returns `success: true, booking_id`

## Lead Creation Logic
- After booking insert, API checks `leads` for existing `(customer_id, seller_business_id)`
- If none, inserts new lead with status `new` and relevant fields
- Failures in lead insertion are logged but do not break booking flow

## Error codes
- 400: missing fields, invalid whatsapp, invalid scheduled_at
- 404: customer/business/service not found
- 409: conflict (e.g., existing customer in WhatsApp path)
- 500: database or internal server errors

## Invalid Booking States (DO NOT USE)
- assigned
- in_progress
- pending_assignment
