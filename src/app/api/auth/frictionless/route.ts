import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin';
import { supabase } from '@/lib/supabase';

/**
 * @fileOverview Frictionless Identity Resolver (Updated for Resiliency)
 * Priority 1: Check existing profile in public.users via standard client.
 * Priority 2: Use Admin client for creation if configured.
 * Priority 3: Provide a mock identity for prototype continuity.
 */

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { whatsapp, name } = body;

    if (!whatsapp) {
      return NextResponse.json({ error: 'WhatsApp number is required.' }, { status: 400 });
    }

    const cleanWa = whatsapp.trim().replace(/\D/g, '');

    // 1. Try finding existing user via Standard Client
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, name')
      .eq('whatsapp_number', cleanWa)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json({ success: true, userId: existingUser.id, name: existingUser.name });
    }

    // 2. Try Admin Creation
    if (isSupabaseAdminConfigured) {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        phone: cleanWa,
        phone_confirm: true,
        user_metadata: { name, role: 'customer', whatsapp: cleanWa },
        password: Math.random().toString(36).slice(-16)
      });

      if (authError && !authError.message.includes('already registered')) {
        return NextResponse.json({ error: authError.message }, { status: 500 });
      }

      let targetUserId = authData?.user?.id;
      if (authError?.message.includes('already registered')) {
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
        targetUserId = users.find((u: any) => u.phone === cleanWa)?.id;
      }

      if (targetUserId) {
        await supabaseAdmin.from('users').upsert({
          id: targetUserId,
          name: (name || 'New Customer').trim(),
          full_name: (name || 'New Customer').trim(),
          whatsapp_number: cleanWa,
          role: 'customer',
          is_anonymous: true,
          created_at: new Date().toISOString()
        });
        
        return NextResponse.json({ success: true, userId: targetUserId, name });
      }
    }

    // 3. PROTOTYPE FALLBACK
    console.warn('[FRICTIONLESS-AUTH] Running in Prototype Fallback mode (Service Key missing).');
    return NextResponse.json({ 
      success: true, 
      userId: '00000000-0000-0000-0000-000000000000',
      name: name || 'Mock User',
      is_mock: true
    });

  } catch (err: any) {
    console.error('[FRICTIONLESS-AUTH] Fatal Error:', err);
    return NextResponse.json({ error: 'Frictionless authentication failed.' }, { status: 500 });
  }
}
