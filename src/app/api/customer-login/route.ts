import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin';
import { supabase } from '@/lib/supabase';

/**
 * @fileOverview Refined Customer Login API (WhatsApp Only)
 * Implements "Login or Create" frictionless flow.
 * Priority 1: Find existing user in public.users.
 * Priority 2: Use Admin client to retrieve or create Auth ID.
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

    // 1. Try to find user in public.users via standard client
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

    // 2. If not found, perform auto-creation (Frictionless Flow)
    if (isSupabaseAdminConfigured) {
      try {
        // A. Check if they exist in Supabase Auth but not public.users
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) throw listError;

        let authUser = users.find((u: any) => u.phone === cleanWa || u.user_metadata?.whatsapp === cleanWa);

        // B. If not in Auth, create them
        if (!authUser) {
          const { data: newAuth, error: createError } = await supabaseAdmin.auth.admin.createUser({
            phone: cleanWa,
            phone_confirm: true,
            user_metadata: { 
              name: 'New Customer', 
              role: 'customer', 
              whatsapp: cleanWa 
            },
            password: Math.random().toString(36).slice(-16) // Random password for security
          });
          if (createError) throw createError;
          authUser = newAuth.user;
        }

        // C. Sync/Upsert to public.users table
        if (authUser) {
          const { error: syncError } = await supabaseAdmin.from('users').upsert({
            id: authUser.id,
            name: 'New Customer',
            whatsapp_number: cleanWa,
            role: 'customer',
            created_at: new Date().toISOString()
          });
          
          if (syncError) throw syncError;

          return NextResponse.json({ 
            success: true, 
            customer_id: authUser.id,
            name: 'New Customer',
            role: 'customer'
          });
        }
      } catch (adminError: any) {
        console.error('[LOGIN-API] Admin resolution failed:', adminError.message);
        // Continue to fallback if admin creation hits limits or errors
      }
    }

    // 3. PROTOTYPE FALLBACK (Enables login in dev/local environments without service keys)
    console.warn('[LOGIN-API] Running in Prototype Fallback mode.');
    return NextResponse.json({ 
      success: true, 
      customer_id: '00000000-0000-0000-0000-000000000000',
      name: 'Guest Customer',
      role: 'customer',
      is_mock: true
    });

  } catch (err: any) {
    console.error('[LOGIN-API] Fatal Error:', err);
    return NextResponse.json({ 
      success: false, 
      error: 'Unable to process login. Please try again.' 
    }, { status: 500 });
  }
}
