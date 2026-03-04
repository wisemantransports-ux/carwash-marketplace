
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * @fileOverview Frictionless Identity Resolver
 * Automates customer registration/lookup based on WhatsApp number.
 * Ensures no OTP or password is required for customers.
 */

export async function POST(req: Request) {
  try {
    const { whatsapp, name } = await req.json();
    if (!whatsapp) return NextResponse.json({ error: 'WhatsApp required' }, { status: 400 });

    const cleanWa = whatsapp.trim().replace(/\D/g, '');

    // 1. Check if user exists in public.users
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, name, role')
      .eq('whatsapp_number', cleanWa)
      .maybeSingle();

    let targetUserId = existingUser?.id;

    if (!existingUser) {
      // 2. Create entry in Auth (without real password/OTP requirement)
      // We use a random password internally as they won't use it
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        phone: cleanWa,
        phone_confirm: true,
        user_metadata: { name, role: 'customer', whatsapp: cleanWa },
        password: Math.random().toString(36).slice(-12)
      });

      if (authError && !authError.message.includes('already registered')) {
        throw authError;
      }

      const userId = authData?.user?.id;
      if (userId) {
        // 3. Sync to public users table
        const { error: syncError } = await supabaseAdmin.from('users').upsert({
          id: userId,
          name: name.trim(),
          whatsapp_number: cleanWa,
          role: 'customer',
          is_verified: true
        });
        if (syncError) throw syncError;
        targetUserId = userId;
      }
    }

    return NextResponse.json({ 
      success: true, 
      userId: targetUserId,
      name: existingUser?.name || name
    });
  } catch (err: any) {
    console.error('[FRICTIONLESS-AUTH] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
