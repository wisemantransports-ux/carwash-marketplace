
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * @fileOverview Customer Login API
 * Resolves a customer's identity using only their WhatsApp number.
 * Bypasses OTP/Passwords for a frictionless experience.
 */

export async function POST(req: Request) {
  try {
    const { whatsapp } = await req.json();

    if (!whatsapp) {
      return NextResponse.json({ error: 'WhatsApp number is required' }, { status: 400 });
    }

    // Normalize number (strip non-digits)
    const cleanWa = whatsapp.trim().replace(/\D/g, '');

    // 1. Query auth.users via Admin API (Service Role)
    // We look for users with this phone number
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('[LOGIN-API] List Error:', listError);
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Find the user whose phone or metadata matches the WhatsApp number
    const foundUser = users.find(u => 
      u.phone === cleanWa || 
      u.phone === `+${cleanWa}` || 
      u.user_metadata?.whatsapp === cleanWa
    );

    if (!foundUser) {
      return NextResponse.json({ error: 'No account found. Please place a booking first.' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true,
      customer_id: foundUser.id,
      whatsapp: cleanWa 
    });

  } catch (err: any) {
    console.error('[LOGIN-API] Fatal Error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
