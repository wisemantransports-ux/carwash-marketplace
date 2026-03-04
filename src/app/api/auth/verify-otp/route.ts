
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * @fileOverview API Route to verify a WhatsApp OTP and manage user identity.
 * Handles "Progressive Identity" by finding or creating a customer record.
 */

export async function POST(req: Request) {
  try {
    const { phone, otp, name } = await req.json();
    const cleanPhone = phone.trim().replace(/\D/g, '');

    // 1. Verify against phone_otps table
    const { data: record, error: fetchError } = await supabaseAdmin
      .from('phone_otps')
      .select('*')
      .eq('phone', cleanPhone)
      .single();

    if (fetchError || !record || record.otp !== otp) {
      return NextResponse.json({ error: 'Invalid or expired verification code' }, { status: 400 });
    }

    if (new Date(record.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Code has expired' }, { status: 400 });
    }

    // 2. Mark as verified
    await supabaseAdmin.from('phone_otps').update({ verified: true }).eq('phone', cleanPhone);

    // 3. Progressive Identity: Check if Supabase Auth user exists
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;

    let authUser = users.find(u => u.phone === cleanPhone || u.user_metadata?.whatsapp === cleanPhone);

    if (!authUser) {
      // Create new Auth User with pre-confirmed phone to allow session generation
      const { data: { user: newUser }, error: createError } = await supabaseAdmin.auth.admin.createUser({
        phone: cleanPhone,
        phone_confirm: true,
        user_metadata: { 
          name: name.trim(), 
          role: 'customer', 
          whatsapp: cleanPhone 
        }
      });
      if (createError) throw createError;
      authUser = newUser;
    }

    // 4. Sync to public users table
    const { error: syncError } = await supabaseAdmin.from('users').upsert({
      id: authUser!.id,
      name: name.trim(),
      whatsapp_number: cleanPhone,
      role: 'customer',
      trial_expiry: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    });

    if (syncError) throw syncError;

    return NextResponse.json({ success: true, userId: authUser!.id });
  } catch (err: any) {
    console.error('OTP Verify Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
