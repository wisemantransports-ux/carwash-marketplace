import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin';
import { supabase } from '@/lib/supabase';

/**
 * @fileOverview Strictly Identity-Verification Customer Login API
 * Enforces that accounts must be created via the lead inquiry trigger.
 * Does NOT create new users.
 */

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `+${digits}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { whatsapp } = body;

    if (!whatsapp) {
      return NextResponse.json({ success: false, error: 'WhatsApp number is required.' }, { status: 400 });
    }

    const cleanWa = normalizePhone(whatsapp);
    
    if (cleanWa.length < 10) {
      return NextResponse.json({ success: false, error: 'Invalid WhatsApp number format.' }, { status: 400 });
    }

    // 1. Check existing Profile in public.users (Primary lookup)
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

    // 2. Secondary check in Auth layer via Admin Client (for accounts created via trigger but not yet synced)
    if (isSupabaseAdminConfigured) {
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (!listError) {
        const authUser = users.find((u: any) => 
          u.phone === cleanWa || 
          u.phone === cleanWa.replace('+', '') ||
          u.user_metadata?.whatsapp === cleanWa
        );

        if (authUser) {
          // Sync found user to public table before allowing entry
          await supabaseAdmin.from('users').upsert({
            id: authUser.id,
            name: authUser.user_metadata?.name || 'Customer',
            whatsapp_number: cleanWa,
            role: 'customer'
          });

          return NextResponse.json({ 
            success: true, 
            customer_id: authUser.id,
            name: authUser.user_metadata?.name || 'Customer',
            role: 'customer'
          });
        }
      }
    }

    // 3. ACCOUNT NOT FOUND: Return 404 as per business logic requirements
    return NextResponse.json({ 
      success: false, 
      message: 'Account not found. Please submit an inquiry to a business first to create your account.' 
    }, { status: 404 });

  } catch (err: any) {
    console.error('[IDENTITY-VERIFICATION] Fatal Error:', err);
    return NextResponse.json({ 
      success: false, 
      error: 'Identity verification failed.' 
    }, { status: 500 });
  }
}
