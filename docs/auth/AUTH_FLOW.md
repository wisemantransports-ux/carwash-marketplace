# AUTH FLOW

- Login is OTP-based using Supabase Auth.
- No session = not authenticated.
- After OTP verification:
  - `session.user.id` is the ONLY identity marker.
- `users` table must store:
  - `id = auth_user_id = session.user.id`.
- No fallback login allowed (no anonymous/weak secondary IDs allowed).
