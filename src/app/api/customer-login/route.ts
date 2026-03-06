import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * @fileOverview Customer Login API
 * Implements frictionless login using WhatsApp number.
 * Auto-creates auth user if missing and returns active bookings.
 */

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { whatsapp } = body;

    if (!whatsapp) {
      return NextResponse.json(
        { success: false, error: 'WhatsApp number is required.' }, 
        { status: 400 }
      );
    }

    // 1. Normalize number (remove non-digits)
    const cleanWa = whatsapp.trim().replace(/\D/g, '');
    
    // Check if number is at least 8 digits
    if (cleanWa.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Invalid WhatsApp number format.' }, 
        { status: 400 }
      );
    }

    // 2. Query auth users via Admin API
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('[LOGIN-API] Admin List Error:', listError);
      return NextResponse.json(
        { success: false, error: 'Identity provider connection failed.' }, 
        { status: 500 }
      );
    }

    // Match user by phone or metadata (handling + prefix)
    let foundUser = users.find(u => 
      u.phone === cleanWa || 
      u.phone === `+${cleanWa}` || 
      u.user_metadata?.whatsapp === cleanWa
    );

    let customerId: string;

    // 3. Auto-create user if not found
    if (!foundUser) {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        phone: cleanWa,
        phone_confirm: true,
        user_metadata: { role: 'customer', whatsapp: cleanWa, name: 'Customer' },
        // Random password since they use WhatsApp identity
        password: Math.random().toString(36).slice(-16) 
      });

      if (createError) {
        console.error('[LOGIN-API] User Creation Error:', createError);
        return NextResponse.json(
          { success: false, error: createError.message }, 
          { status: 500 }
        );
      }
      
      customerId = newUser.user.id;

      // Sync to public.users table - INCLUDES ALL REQUIRED COLUMNS FROM SOURCE OF TRUTH
      const { error: syncError } = await supabaseAdmin.from('users').upsert({
        id: customerId,
        name: 'Customer',
        full_name: 'Anonymous Customer',
        whatsapp_number: cleanWa,
        role: 'customer',
        is_anonymous: true,
        is_sso_user: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      if (syncError) {
        console.error('[LOGIN-API] Public Sync Error:', syncError);
        // We continue because the auth record is already created
      }
    } else {
      customerId = foundUser.id;
    }

    // 4. Retrieve Wash Bookings for this customer
    const { data: bookings, error: bookingError } = await supabaseAdmin
      .from('wash_bookings')
      .select('id, status, wash_service_id, assigned_employee_id, requested_time, booking_date, location')
      .eq('customer_id', customerId)
      .order('requested_time', { ascending: false });

    if (bookingError) {
      console.error('[LOGIN-API] Booking Fetch Error:', bookingError);
    }

    // 5. Return success JSON
    return NextResponse.json({ 
      success: true,
      customer_id: customerId,
      active_bookings: bookings || []
    });

  } catch (err: any) {
    console.error('[LOGIN-API] Fatal Error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'An unexpected error occurred during login.' }, 
      { status: 500 }
    );
  }
}
