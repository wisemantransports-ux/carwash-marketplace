import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin';
import { supabase } from '@/lib/supabase';

/**
 * @fileOverview Secure Business Profile Update API
 * Handles administrative bypass for restricted tables with token-based verification.
 */

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return NextResponse.json({ success: false, error: 'Authorization token missing.' }, { status: 401 });
    }

    // Verify user session via standard Supabase client
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('[PROFILE-API] Auth verification failed:', authError);
      return NextResponse.json({ success: false, error: 'Unauthorized session or invalid token.' }, { status: 401 });
    }

    const body = await req.json();
    const { 
      business_id,
      name, 
      address, 
      city, 
      whatsapp_number, 
      business_type, 
      category, 
      id_number,
      owner_name,
      logo_url,
      special_tag
    } = body;

    if (!isSupabaseAdminConfigured) {
      throw new Error('Supabase Admin Client is not configured on the server.');
    }

    // 1. Update the Business Record
    // We use both ID and owner_id for strict security
    const { error: bizError } = await supabaseAdmin
      .from('businesses')
      .update({
        name: name?.trim(),
        address: address?.trim(),
        city: city?.trim(),
        whatsapp_number: whatsapp_number?.trim(),
        business_type,
        category,
        id_number: id_number?.trim(),
        logo_url,
        special_tag
      })
      .eq('id', business_id)
      .eq('owner_id', user.id);

    if (bizError) throw bizError;

    // 2. Update the User Record (Owner Name)
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
    console.error('[PROFILE-API] Fatal error:', err);
    return NextResponse.json({ 
      success: false, 
      error: err.message || 'Failed to update credentials via administrative bridge.' 
    }, { status: 500 });
  }
}
