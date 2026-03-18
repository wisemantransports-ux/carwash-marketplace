import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin';
import { supabase } from '@/lib/supabase';

/**
 * @fileOverview Frictionless Identity Resolver (Updated for Single-Account Audit)
 * Ensures inquiries are linked to existing accounts by phone lookup.
 */

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { whatsapp, name } = body;

    if (!whatsapp) {
      return NextResponse.json({ error: 'WhatsApp number is required.' }, { status: 400 });
    }

    const cleanWa = whatsapp.trim().replace(/\D/g, '');

    // 1. Lookup existing profile
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, name')
      .eq('whatsapp_number', cleanWa)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json({ success: true, user: { id: existingUser.id, name: existingUser.name }, userId: existingUser.id, name: existingUser.name });
    }

    // 2. Lookup existing Auth User via Admin (to prevent duplicate phone errors)
    if (isSupabaseAdminConfigured) {
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
      const authUser = users.find((u: any) => u.phone === cleanWa || u.phone === `+${cleanWa}`);

      if (authUser) {
        // Sync existing Auth user to Profile table
        await supabaseAdmin.from('users').upsert({
          id: authUser.id,
          name: (name || 'Customer').trim(),
          whatsapp_number: cleanWa,
          role: 'customer'
        });
        return NextResponse.json({ success: true, user: { id: authUser.id, name: authUser.user_metadata?.name || name || 'Customer' }, userId: authUser.id, name });
      }

      // 3. Truly new user: Create in Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        phone: cleanWa,
        phone_confirm: true,
        user_metadata: { name, role: 'customer', whatsapp: cleanWa },
        password: Math.random().toString(36).slice(-16)
      });

      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 500 });
      }

      if (authData?.user) {
        await supabaseAdmin.from('users').upsert({
          id: authData.user.id,
          name: (name || 'Customer').trim(),
          whatsapp_number: cleanWa,
          role: 'customer',
          created_at: new Date().toISOString()
        });
        
        return NextResponse.json({ success: true, user: { id: authData.user.id, name: name || 'Customer' }, userId: authData.user.id, name });
      }
    }

    return NextResponse.json({ 
      success: true, 
      userId: '00000000-0000-0000-0000-000000000000',
      name: name || 'Mock User',
      is_mock: true
    });

  } catch (err: any) {
    console.error('[FRICTIONLESS-AUDIT] Fatal Error:', err);
    return NextResponse.json({ error: 'Frictionless resolution failed.' }, { status: 500 });
  }
}
