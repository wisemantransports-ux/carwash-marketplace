import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin';
import { supabase } from '@/lib/supabase';

/**
 * @fileOverview Refined Customer Login API (WhatsApp Only)
 * Priority 1: Find existing user in public.users via standard client.
 * Priority 2: Use Admin client to retrieve Auth ID.
 * Priority 3: Fallback to Prototype success.
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

    // 1. Try to find user in public.users
    const { data: existingProfile } = await supabase
      .from('users')
      .select('id, name, role')
      .eq('whatsapp_number', cleanWa)
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json({ 
        success: true,
        customer_id: existingProfile.id,
        name: existingProfile.name,
        role: existingProfile.role
      });
    }

    // 2. If not in public.users, check Supabase Auth directly (if Admin configured)
    if (isSupabaseAdminConfigured) {
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (!listError) {
        const authUser = users.find((u: any) => u.phone === cleanWa || u.user_metadata?.whatsapp === cleanWa);
        if (authUser) {
          // Sync to public if missing
          await supabaseAdmin.from('users').upsert({
            id: authUser.id,
            name: authUser.user_metadata?.name || 'Customer',
            whatsapp_number: cleanWa,
            role: 'customer'
          });

          return NextResponse.json({ 
            success: true, 
            customer_id: authUser.id,
            name: authUser.user_metadata?.name || 'Customer'
          });
        }
      }
    }

    // 3. If user doesn't exist at all, return failure 
    // They will be created automatically on their first Booking or Lead submission.
    return NextResponse.json({ 
      success: false, 
      error: 'Account not found. Your account will be created automatically when you make your first booking or inquiry.' 
    }, { status: 404 });

  } catch (err: any) {
    console.error('[LOGIN-API] Fatal Error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
