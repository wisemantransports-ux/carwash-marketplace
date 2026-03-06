
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * @fileOverview Customer Login API
 * Resolves a customer's identity using only their WhatsApp number.
 * Ensures strict JSON responses to prevent parsing errors.
 */

export async function POST(req: Request) {
  try {
    // 1. Safely parse body
    const body = await req.json().catch(() => ({}));
    const { whatsapp } = body;

    if (!whatsapp) {
      return NextResponse.json(
        { error: 'WhatsApp number is required.' }, 
        { status: 400 }
      );
    }

    // 2. Normalize number
    const cleanWa = whatsapp.trim().replace(/\D/g, '');

    // 3. Query auth users via Admin API
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('[LOGIN-API] Admin List Error:', listError);
      return NextResponse.json(
        { error: 'Database connection failed.' }, 
        { status: 500 }
      );
    }

    // 4. Match user by phone or metadata
    const foundUser = users.find(u => 
      u.phone === cleanWa || 
      u.phone === `+${cleanWa}` || 
      u.user_metadata?.whatsapp === cleanWa
    );

    if (!foundUser) {
      return NextResponse.json(
        { error: 'No account found. Please place a booking first.' }, 
        { status: 404 }
      );
    }

    // 5. Success
    return NextResponse.json({ 
      success: true,
      customer_id: foundUser.id,
      whatsapp: cleanWa 
    });

  } catch (err: any) {
    console.error('[LOGIN-API] Fatal Error:', err);
    return NextResponse.json(
      { error: err.message || 'An unexpected error occurred during login.' }, 
      { status: 500 }
    );
  }
}
