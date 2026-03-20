# USER MODEL

## users table structure
- `id` (uuid, primary key)
- `auth_user_id` (uuid, must match auth.users.id)
- `whatsapp_number` (string)
- `role` (enum: customer, business-owner, admin)

## Rules
- `auth_user_id` is source of truth for identity.
- No anonymous users allowed.
- Every booking must reference `users.id`.
