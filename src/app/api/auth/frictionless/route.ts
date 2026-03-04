
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * @fileOverview Frictionless Identity Resolver
 * Automates customer registration/lookup based on WhatsApp number.
 * Ensures no OTP or password is required for customers.
 * Always returns JSON to prevent "Unexpected token <" errors.
 */

export async function POST(req: Request) {
  try {
    // 1. Basic configuration check
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Server configuration error: Supabase keys are missing.' },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { whatsapp, name } = body;

    if (!whatsapp) {
      return NextResponse.json({ error: 'WhatsApp number is required.' }, { status: 400 });
    }

    const cleanWa = whatsapp.trim().replace(/\D/g, '');

    // 2. Check if user exists in public.users
    const { data: existingUser, error: findError } = await supabaseAdmin
      .from('users')
      .select('id, name, role')
      .eq('whatsapp_number', cleanWa)
      .maybeSingle();

    if (findError) {
      console.error('[FRICTIONLESS-AUTH] Lookup Error:', findError);
      return NextResponse.json({ error: 'Database lookup failed.' }, { status: 500 });
    }

    let targetUserId = existingUser?.id;

    if (!existingUser) {
      // 3. Create entry in Supabase Auth via Admin API
      // We use a random password internally as customers use WhatsApp identity
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        phone: cleanWa,
        phone_confirm: true,
        user_metadata: { name, role: 'customer', whatsapp: cleanWa },
        password: Math.random().toString(36).slice(-16)
      });

      if (authError && !authError.message.includes('already registered')) {
        console.error('[FRICTIONLESS-AUTH] Auth Creation Error:', authError);
        return NextResponse.json({ error: authError.message }, { status: 500 });
      }

      // If user existed in Auth but not in public.users (sync issue), recover ID
      if (authError && authError.message.includes('already registered')) {
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        const found = users.find(u => u.phone === cleanWa || u.user_metadata?.whatsapp === cleanWa);
        targetUserId = found?.id;
      } else {
        targetUserId = authData?.user?.id;
      }

      if (targetUserId) {
        // 4. Sync to public users table
        const { error: syncError } = await supabaseAdmin.from('users').upsert({
          id: targetUserId,
          name: (name || 'New Customer').trim(),
          whatsapp_number: cleanWa,
          role: 'customer',
          is_verified: true,
          trial_expiry: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        });
        
        if (syncError) {
          console.error('[FRICTIONLESS-AUTH] Sync Error:', syncError);
          return NextResponse.json({ error: 'Profile synchronization failed.' }, { status: 500 });
        }
      }
    }

    if (!targetUserId) {
      return NextResponse.json({ error: 'Failed to resolve user identity.' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      userId: targetUserId,
      name: existingUser?.name || name
    });
  } catch (err: any) {
    console.error('[FRICTIONLESS-AUTH] Fatal Error:', err);
    return NextResponse.json(
      { error: err.message || 'An unexpected error occurred during authentication.' }, 
      { status: 500 }
    );
  }
}
