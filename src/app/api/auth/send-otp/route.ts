import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin';

/**
 * @fileOverview API Route to generate and store a WhatsApp OTP.
 * This is used for customer login and registration.
 */

export async function POST(req: Request) {
  try {
    if (!isSupabaseAdminConfigured) {
      return NextResponse.json(
        { error: 'Supabase Admin is not configured.' },
        { status: 500 }
      );
    }

    const { phone } = await req.json();
    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    const cleanPhone = phone.trim().replace(/\D/g, '');
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { error } = await supabaseAdmin
      .from('phone_otps')
      .upsert({ 
        phone: cleanPhone, 
        otp, 
        expires_at: expiresAt,
        verified: false 
      });

    if (error) throw error;

    console.log(`[ALM-AUTH] WhatsApp OTP for ${cleanPhone}: ${otp}`);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('OTP Send Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
