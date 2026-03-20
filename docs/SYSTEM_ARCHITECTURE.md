# System Architecture

## System Principles
- No anonymous users: every user must have a verified identity before booking
- WhatsApp-based identity: customer identity is tied to normalized WhatsApp phone numbers

## Booking Lifecycle
- pending → confirmed → completed → cancelled

## Booking Status Rules
- Allowed statuses (enforced both in code and DB):
  - pending
  - confirmed
  - completed
  - cancelled
- Invalid states (DO NOT USE):
  - assigned
  - in_progress
  - pending_assignment

## Customer Flows
- Walk-in flow
  - A new WhatsApp number is used to create a customer profile on the first inquiry/booking.
  - The system upserts into `users` with role `customer` and persists in Supabase auth.
- Authenticated flow
  - Existing customer with session can request booking directly.
  - Uses `customer_id` to create booking and follow same lifecycle.
