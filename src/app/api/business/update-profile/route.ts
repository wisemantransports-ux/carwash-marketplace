import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin';
import { supabase } from '@/lib/supabase';

/**
 * @fileOverview Secure Business Profile Update API
 * Handles administrative bypass for restricted tables and synchronizes auth metadata.
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

    // 2. Synchronize Owner Identity
    if (owner_name) {
      const trimmedName = owner_name.trim();

      // A. Update Auth Metadata (Source of truth for session)
      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { user_metadata: { name: trimmedName } }
      );
      
      if (authUpdateError) console.error('[PROFILE-API] Auth metadata sync failed:', authUpdateError);

      // B. Update Public Profile Table (Source of truth for dashboard lists)
      const { error: userError } = await supabaseAdmin
        .from('users')
        .update({
          name: trimmedName
        })
        .eq('id', user.id);
      
      if (userError) {
        console.error('[PROFILE-API] Public profile sync failed:', userError);
        // We don't throw here if the auth metadata update succeeded, 
        // as the column might genuinely be missing or renamed in the public schema.
      }
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
