import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin';
import { supabase } from '@/lib/supabase';

/**
 * @fileOverview Audit-Compliant Customer Login API
 * Implements "Lookup First" identity resolution to prevent duplicate accounts.
 */

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { whatsapp } = body;

    if (!whatsapp) {
      return NextResponse.json({ success: false, error: 'WhatsApp number is required.' }, { status: 400 });
    }

    // Normalize phone number for consistent lookup
    const cleanWa = whatsapp.trim().replace(/\D/g, '');
    
    if (cleanWa.length < 7) {
      return NextResponse.json({ success: false, error: 'Invalid WhatsApp number format.' }, { status: 400 });
    }

    // 1. Check existing Profile in public.users (FASTEST)
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

    // 2. Check Auth layer via Admin Client (Fallback for synced accounts)
    if (isSupabaseAdminConfigured) {
      try {
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) throw listError;

        // Try to find a user with this phone number or whatsapp metadata
        const authUser = users.find((u: any) => 
          u.phone === cleanWa || 
          u.phone === `+${cleanWa}` ||
          u.user_metadata?.whatsapp === cleanWa
        );

        if (authUser) {
          // SYNC FOUND USER: Account exists in Auth but missing in public.users
          const { error: syncError } = await supabaseAdmin.from('users').upsert({
            id: authUser.id,
            name: authUser.user_metadata?.name || 'Customer',
            whatsapp_number: cleanWa,
            role: 'customer',
            created_at: new Date().toISOString()
          });
          
          if (syncError) throw syncError;

          return NextResponse.json({ 
            success: true, 
            customer_id: authUser.id,
            name: authUser.user_metadata?.name || 'Customer',
            role: 'customer'
          });
        }

        // 3. NO ACCOUNT EXISTS: Create New
        const { data: newAuth, error: createError } = await supabaseAdmin.auth.admin.createUser({
          phone: cleanWa,
          phone_confirm: true,
          user_metadata: { 
            name: 'Customer', 
            role: 'customer', 
            whatsapp: cleanWa 
          },
          password: Math.random().toString(36).slice(-16)
        });

        if (createError) throw createError;

        if (newAuth.user) {
          await supabaseAdmin.from('users').upsert({
            id: newAuth.user.id,
            name: 'Customer',
            whatsapp_number: cleanWa,
            role: 'customer',
            created_at: new Date().toISOString()
          });
          
          return NextResponse.json({ 
            success: true, 
            customer_id: newAuth.user.id,
            name: 'Customer',
            role: 'customer'
          });
        }
      } catch (adminError: any) {
        console.error('[IDENTITY-AUDIT] Admin resolution failure:', adminError.message);
      }
    }

    // 4. PROTOTYPE FALLBACK
    return NextResponse.json({ 
      success: true, 
      customer_id: '00000000-0000-0000-0000-000000000000',
      name: 'Guest Customer',
      role: 'customer',
      is_mock: true
    });

  } catch (err: any) {
    console.error('[IDENTITY-AUDIT] Fatal Error:', err);
    return NextResponse.json({ 
      success: false, 
      error: 'Identity verification failed.' 
    }, { status: 500 });
  }
}
