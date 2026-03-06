import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin';
import { supabase } from '@/lib/supabase';

/**
 * @fileOverview Resilient Customer Login API
 * Priority 1: Find existing user in public.users via standard client.
 * Priority 2: Create new user via Admin client (if configured).
 * Priority 3: Fallback to Prototype success (if unconfigured) to prevent UI block.
 */

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { whatsapp } = body;

    if (!whatsapp) {
      return NextResponse.json({ success: false, error: 'WhatsApp number is required.' }, { status: 400 });
    }

    const cleanWa = whatsapp.trim().replace(/\D/g, '');
    
    if (cleanWa.length < 8) {
      return NextResponse.json({ success: false, error: 'Invalid WhatsApp number format.' }, { status: 400 });
    }

    // 1. Try to find user in public.users via standard client (Works without Service Key)
    const { data: existingProfile, error: profileError } = await supabase
      .from('users')
      .select('id, name')
      .eq('whatsapp_number', cleanWa)
      .maybeSingle();

    if (existingProfile) {
      // Return existing bookings
      const { data: bookings } = await supabase
        .from('wash_bookings')
        .select('id, status, wash_service_id, assigned_employee_id, requested_time, booking_date, location')
        .eq('customer_id', existingProfile.id)
        .order('requested_time', { ascending: false });

      return NextResponse.json({ 
        success: true,
        customer_id: existingProfile.id,
        active_bookings: bookings || []
      });
    }

    // 2. If user not found, try to auto-create via Admin API
    if (isSupabaseAdminConfigured) {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        phone: cleanWa,
        phone_confirm: true,
        user_metadata: { role: 'customer', whatsapp: cleanWa, name: 'Customer' },
        password: Math.random().toString(36).slice(-16) 
      });

      if (createError && !createError.message.includes('already registered')) {
        return NextResponse.json({ success: false, error: createError.message }, { status: 500 });
      }

      const customerId = newUser?.user?.id || (await supabaseAdmin.auth.admin.listUsers()).data.users.find((u: any) => u.phone === cleanWa)?.id;

      if (customerId) {
        await supabaseAdmin.from('users').upsert({
          id: customerId,
          name: 'Customer',
          full_name: 'Anonymous Customer',
          whatsapp_number: cleanWa,
          role: 'customer',
          is_anonymous: true,
          created_at: new Date().toISOString()
        });

        return NextResponse.json({ success: true, customer_id: customerId, active_bookings: [] });
      }
    }

    // 3. PROTOTYPE FALLBACK: If unconfigured, allow login with a virtual ID
    // This allows the user to see the dashboard/UI flow working.
    console.warn('[LOGIN-API] Running in Prototype Fallback mode. Please provide SUPABASE_SERVICE_ROLE_KEY for real user persistence.');
    
    return NextResponse.json({ 
      success: true,
      customer_id: '00000000-0000-0000-0000-000000000000', // Deterministic mock ID
      active_bookings: [],
      is_mock: true,
      message: 'Running in Prototype Mode (Service Key missing)'
    });

  } catch (err: any) {
    console.error('[LOGIN-API] Fatal Error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
