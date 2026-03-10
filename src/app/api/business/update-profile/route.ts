import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin';
import { supabase } from '@/lib/supabase';

/**
 * @fileOverview Secure Business Profile Update API
 * Uses supabaseAdmin to bypass Postgres "Permission Denied" errors on restricted tables.
 * Authenticates via Authorization header token.
 */

export async function POST(req: Request) {
  try {
    // 1. Verify Token (Security)
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized session.' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('[PROFILE-UPDATE-AUTH-ERROR]', authError);
      return NextResponse.json({ success: false, error: 'Unauthorized session.' }, { status: 401 });
    }

    const body = await req.json();
    const { 
      name, 
      address, 
      city, 
      whatsapp_number, 
      business_type, 
      category, 
      id_number,
      owner_name 
    } = body;

    if (!isSupabaseAdminConfigured) {
      throw new Error('Supabase Admin Client is not configured.');
    }

    // 2. Update the Business Record
    const { error: bizError } = await supabaseAdmin
      .from('businesses')
      .update({
        name: name?.trim(),
        address: address?.trim(),
        city: city?.trim(),
        whatsapp_number: whatsapp_number?.trim(),
        business_type,
        category,
        id_number: id_number?.trim()
      })
      .eq('owner_id', user.id);

    if (bizError) throw bizError;

    // 3. Update the User Record (Owner Name)
    if (owner_name) {
      const { error: userError } = await supabaseAdmin
        .from('users')
        .update({
          name: owner_name.trim()
        })
        .eq('id', user.id);
      
      if (userError) throw userError;
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('[PROFILE-UPDATE-ERROR]', err);
    return NextResponse.json({ 
      success: false, 
      error: err.message || 'Failed to update credentials. Database permissions restricted.' 
    }, { status: 500 });
  }
}
