# Booking System Refactor - Complete Implementation

## Overview
Refactored the booking system to support two customer types:
1. **Existing registered users** - Authenticated via Supabase Auth
2. **First-time walk-in customers** - Using WhatsApp number for identification

All anonymous/frictionless logic has been removed. The system now ensures every booking is linked to a real registered user.

---

## Architecture Changes

### 1. API Updates (`/api/bookings/create/route.ts`)

#### Customer Identification Flow
- **Authenticated Users**: Pass `customer_id` from `authUser.id`
- **Walk-in Customers**: Pass `whatsapp` and optional `customer_name`

#### Processing Logic
```
1. Validate inputs (seller_business_id, service_id, scheduled_at required)
2. Identify or create customer:
   - If customer_id provided: validate exists in users table
   - If whatsapp provided:
     a. Check if user exists with that whatsapp_number
     b. If exists: return 409 (ask them to log in)
     c. If not: create new user record with whatsapp_number and name
3. Validate business exists
4. Validate service exists and belongs to business
5. Create booking record
6. Register lead per business (check for duplicate before inserting)
```

#### Response Codes
- `200`: Booking created successfully → `{ success: true, booking_id }`
- `400`: Bad request (validation error)
- `404`: Resource not found (customer/business/service)
- `409`: Customer exists; direct to login
- `500`: Server error

#### Lead Deduplication
- Checks if lead exists for `(customer_id, seller_business_id)` pair
- Only creates lead if this pair is new
- Allows same customer to appear as lead for multiple businesses

---

### 2. Frontend Updates

#### Booking Modal (`src/components/app/booking-modal.tsx`)

**Changes**:
- Removed requirement for authenticated user
- Now supports both authenticated and walk-in flows
- Payload construction:
  ```javascript
  if (authUser?.id) {
    payload.customer_id = authUser.id;
  } else {
    payload.whatsapp = whatsapp;
    payload.customer_name = name.trim();
  }
  ```
- Enhanced error handling:
  - 409 response: Redirect to login with message
  - Other errors: Display specific error message

#### Lead Modal (`src/components/app/lead-modal.tsx`)

**Changes**:
- Support walk-in customer creation via WhatsApp
- Flow for unauthenticated users:
  1. Check if WhatsApp already has account
  2. If yes: Throw error directing to login
  3. If no: Create new user record
  4. Create lead record
- No duplicate leads for same `(customer_id, business_id)` pair
- Maintain WhatsApp chat opening functionality

---

## Database Validation

### Foreign Key Constraints Enforced
- `bookings.customer_id` → `users.id` (checked via SELECT)
- `bookings.service_id` → `listings.id` (checked via SELECT)
- `bookings.seller_business_id` → `businesses.id` (checked via SELECT)

### Booking Status
- Created bookings use status: `'pending_assignment'`
- Status field validated against check constraints in database

### Leads Table
- Stores `customer_id`, `seller_business_id`, `lead_type`, `status`
- Supports multi-business tracking for same customer
- Prevents duplicate leads for same customer-business pair

---

## Testing Scenarios

### Scenario 1: Existing Customer Booking
1. User logs in with WhatsApp
2. User navigates to booking modal
3. System identifies `authUser.id`
4. Booking created with existing `customer_id`
5. Lead registered if first interaction with this business
6. ✅ Expected: Booking succeeds, dashboard shows booking

### Scenario 2: Walk-in Customer (New)
1. Unauthenticated user enters WhatsApp + name
2. System checks WhatsApp doesn't exist
3. System creates new user record
4. Booking created with new `customer_id`
5. Lead registered for business
6. ✅ Expected: Booking succeeds, WhatsApp in lead record

### Scenario 3: Walk-in Customer (Existing Account)
1. Unauthenticated user enters WhatsApp
2. System finds existing user account
3. API returns 409 with message
4. Frontend redirects to login
5. User logs in, then books
6. ✅ Expected: Redirect to login, then normal booking flow

### Scenario 4: Lead Registration - No Duplicates
1. Customer books with Business A → Lead created
2. Same customer books with Business A again → No new lead
3. Same customer books with Business B → New lead created
4. ✅ Expected: 1 lead per business, not per booking

---

## Error Handling

| Scenario | Status | Message |
|----------|--------|---------|
| Missing seller_business_id | 400 | "Missing seller_business_id" |
| Missing service_id | 400 | "Missing service_id" |
| Missing customer_id & whatsapp | 400 | "Missing customer_id or whatsapp" |
| Invalid scheduled_at | 400 | "Invalid scheduled_at value" |
| Invalid WhatsApp format | 400 | "Invalid whatsapp number" |
| Customer doesn't exist (auth) | 404 | "Customer does not exist" |
| Business doesn't exist | 404 | "Business does not exist" |
| Service doesn't exist | 404 | "Service does not exist" |
| Service wrong business | 400 | "Service does not belong to the selected business" |
| Customer WhatsApp exists | 409 | "Customer already exists; please log in" |
| User creation failed | 500 | "Failed to create walk-in customer" |
| Booking insert failed | 500 | Error from database |

---

## Code Cleanup

**Removed**:
- ❌ All `resolveCustomerId()` functions
- ❌ Frictionless identity resolver API (`/api/auth/frictionless`)
- ❌ Anonymous user creation logic
- ❌ `signInAnonymously()` calls
- ❌ Anonymous user fallback patterns
- ❌ `is_anonymous` checks

**Kept Intact**:
- ✅ All existing validations
- ✅ All error handling
- ✅ All status codes
- ✅ All business logic (ratings, assignments, etc.)
- ✅ Database constraints and foreign keys

---

## Validation Checklist

- [x] Authenticated users can book directly
- [x] Walk-in users can create account and book
- [x] Existing walk-in accounts redirect to login
- [x] All bookings linked to real users
- [x] Foreign key constraints enforced
- [x] Lead deduplication working
- [x] Error handling comprehensive
- [x] No anonymous logic remaining
- [x] Service validation per business
- [x] Scheduled_at validation
- [x] WhatsApp validation (min 10 digits)

---

## Migration Notes

**No database migration required** - all schema already supports:
- Multiple customers per business
- WhatsApp number in users table
- Lead tracking per business
- Foreign key relationships

**User impact**:
- Existing users: No change in behavior
- New walk-in users: Can now book without pre-registration
- Lead tracking: Now properly deduplicated per business

---

## Future Enhancements

1. Email-based booking for non-WhatsApp users
2. Batch lead import for businesses
3. Lead scoring based on booking history
4. RLS policies for lead privacy per business owner
5. Automated status notifications via WhatsApp
