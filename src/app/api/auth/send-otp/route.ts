import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * @fileOverview API Route to generate and store a WhatsApp OTP.
 */

export async function POST(req: Request) {
  try {
    const { phone } = await req.json();
    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    const cleanPhone = phone.trim().replace(/\D/g, '');
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Store OTP in the phone_otps table
    // Assuming table schema: phone (text, pk), otp (text), expires_at (timestamptz), verified (boolean)
    const { error } = await supabaseAdmin
      .from('phone_otps')
      .upsert({ 
        phone: cleanPhone, 
        otp, 
        expires_at: expiresAt,
        verified: false 
      });

    if (error) throw error;

    // IN PRODUCTION: This is where you would call a WhatsApp API provider
    console.log(`[ALM-AUTH] Custom WhatsApp OTP for ${cleanPhone}: ${otp}`);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('OTP Send Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
