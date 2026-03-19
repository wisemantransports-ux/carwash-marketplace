# Booking System - Request/Response Flows

## Flow 1: Authenticated User Booking

### Request
```bash
POST /api/bookings/create
Content-Type: application/json

{
  "customer_id": "auth-user-uuid",
  "seller_business_id": "business-uuid",
  "service_id": "listings-uuid",
  "scheduled_at": "2026-03-20T14:00:00.000Z"
}
```

### Processing
1. ✅ Validate customer_id exists in users table
2. ✅ Validate business exists
3. ✅ Validate service exists and belongs to business
4. ✅ Create booking with status: 'pending_assignment'
5. ✅ Register lead if not duplicate for this business

### Response (200 OK)
```json
{
  "success": true,
  "booking_id": "booking-uuid"
}
```

### Frontend Action
- Show success toast
- Redirect to `/customer/dashboard`

---

## Flow 2: Walk-in Customer (New Account)

### Request
```bash
POST /api/bookings/create
Content-Type: application/json

{
  "whatsapp": "263772234567",
  "customer_name": "John Doe",
  "seller_business_id": "business-uuid",
  "service_id": "listings-uuid",
  "scheduled_at": "2026-03-20T14:00:00.000Z"
}
```

### Processing
1. ✅ Check if WhatsApp exists in users table
2. ✅ Doesn't exist → Create new user record
   ```
   INSERT INTO users (whatsapp_number, name, role)
   VALUES ('263772234567', 'John Doe', 'customer')
   ```
3. ✅ Use new user's ID as customer_id
4. ✅ Validate business and service
5. ✅ Create booking
6. ✅ Register lead

### Response (200 OK)
```json
{
  "success": true,
  "booking_id": "booking-uuid"
}
```

### Frontend Action
- Show success toast
- Redirect to `/customer/dashboard`
- User can now view booking and WhatsApp appears in leads

---

## Flow 3: Walk-in Customer (Existing Account)

### Request
```bash
POST /api/bookings/create
Content-Type: application/json

{
  "whatsapp": "263772234567",
  "customer_name": "John Doe",
  "seller_business_id": "business-uuid",
  "service_id": "listings-uuid",
  "scheduled_at": "2026-03-20T14:00:00.000Z"
}
```

### Processing
1. ✅ Check if WhatsApp exists in users table
2. ❌ User found! Return 409 Conflict

### Response (409 Conflict)
```json
{
  "success": false,
  "error": "Customer already exists; please log in",
  "existing_customer_id": "user-uuid",
  "status": 409
}
```

### Frontend Action
- Show error toast: "Please log in with this WhatsApp number to proceed."
- Close modal
- Redirect to `/login` page
- User logs in → Then can book normally (Flow 1)

---

## Flow 4: Lead Registration with Deduplication

### First Interaction with Business A
```bash
POST /api/bookings/create

{
  "customer_id": "user-uuid",
  "seller_business_id": "business-a-uuid",
  ...
}
```

**API checks leads table:**
```sql
SELECT id FROM leads
WHERE customer_id = 'user-uuid'
  AND seller_business_id = 'business-a-uuid'
```

Result: No rows found → **Create lead**

```sql
INSERT INTO leads (
  customer_id, seller_business_id, lead_type, status, ...
)
VALUES (...)
```

### Second Interaction with Business A (Same Customer)
```bash
POST /api/bookings/create

{
  "customer_id": "user-uuid",
  "seller_business_id": "business-a-uuid",
  ...
}
```

**API checks leads table:**
```sql
SELECT id FROM leads
WHERE customer_id = 'user-uuid'
  AND seller_business_id = 'business-a-uuid'
```

Result: Row found → **Skip lead creation** (no duplicate)

### Interaction with Business B (Same Customer)
```bash
POST /api/bookings/create

{
  "customer_id": "user-uuid",
  "seller_business_id": "business-b-uuid",
  ...
}
```

**API checks leads table:**
```sql
SELECT id FROM leads
WHERE customer_id = 'user-uuid'
  AND seller_business_id = 'business-b-uuid'
```

Result: No rows found → **Create new lead**

**Result**: Customer appears in leads for both Business A and B (once each)

---

## Error Responses

### 400 Bad Request - Missing Fields
```json
{
  "success": false,
  "error": "Missing seller_business_id",
  "status": 400
}
```

### 400 Bad Request - Invalid Date
```json
{
  "success": false,
  "error": "Invalid scheduled_at value",
  "status": 400
}
```

### 400 Bad Request - Invalid WhatsApp
```json
{
  "success": false,
  "error": "Invalid whatsapp number",
  "status": 400
}
```

### 404 Not Found - Customer Missing (Auth Flow)
```json
{
  "success": false,
  "error": "Customer does not exist",
  "status": 404
}
```

### 404 Not Found - Business Missing
```json
{
  "success": false,
  "error": "Business does not exist",
  "status": 404
}
```

### 404 Not Found - Service Missing
```json
{
  "success": false,
  "error": "Service does not exist",
  "status": 404
}
```

### 400 Bad Request - Service Wrong Business
```json
{
  "success": false,
  "error": "Service does not belong to the selected business",
  "status": 400
}
```

### 409 Conflict - Account Exists
```json
{
  "success": false,
  "error": "Customer already exists; please log in",
  "existing_customer_id": "user-uuid",
  "status": 409
}
```

### 500 Server Error - User Lookup Failed
```json
{
  "success": false,
  "error": "User lookup failed",
  "status": 500
}
```

### 500 Server Error - User Creation Failed
```json
{
  "success": false,
  "error": "Failed to create walk-in customer",
  "status": 500
}
```

### 500 Server Error - Booking Creation Failed
```json
{
  "success": false,
  "error": "Database error message",
  "status": 500
}
```

---

## Frontend Form States

### Authenticated User
```
Name: [pre-filled from authUser]
WhatsApp: [pre-filled from authUser]
Email: [pre-filled from authUser]
Business: [selector]
Service: [selector based on business]
Date: [date picker]
Time: [time picker]

Button: "Reserve Wash"
```

### Walk-in User (Not Authenticated)
```
Name: [empty, required]
WhatsApp: [empty, required, min 10 digits]
Email: [empty, optional]
Business: [selector]
Service: [selector based on business]
Date: [date picker]
Time: [time picker]

Button: "Reserve Wash"
```

**Behavior**: Frontend automatically detects if authUser exists and includes customer_id or whatsapp in payload accordingly.

---

## Database Changes (None Required)

All tables already support the new flows:
- ✅ `users.whatsapp_number` - already exists
- ✅ `bookings.customer_id` - already foreign key to users.id
- ✅ `leads.customer_id` - already foreign key to users.id
- ✅ `bookings.seller_business_id` - already foreign key to businesses.id
- ✅ `listings.business_id` - already foreign key to businesses.id

---

## Validation Summary

| Component | Checks |
|-----------|--------|
| **Customer ID** | Must exist in users table OR valid WhatsApp→auto-create |
| **Business** | Must exist in businesses table |
| **Service** | Must exist in listings (listing_type='wash_service') |
| **Service Ownership** | Service.business_id must match seller_business_id |
| **Scheduled At** | Must be valid ISO date string |
| **WhatsApp** | Must be 10+ digits (when provided) |
| **Lead Dedup** | Check (customer_id, seller_business_id) pair before insert |

---

## Summary

✅ **Authenticated Flow**: Customer books directly using their user ID
✅ **Walk-in Flow**: Customer creates account via WhatsApp, then books
✅ **Deduplication**: Same customer appears as lead once per business
✅ **Error Handling**: Clear status codes for each failure case
✅ **No Anonymous Logic**: All bookings linked to real users
