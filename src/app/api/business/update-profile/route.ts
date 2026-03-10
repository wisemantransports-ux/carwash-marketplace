import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin';
import { supabase } from '@/lib/supabase';

/**
 * @fileOverview Secure Business Profile Update API
 * Handles administrative bypass for restricted tables and synchronizes auth metadata.
 * Explicitly excludes platform-controlled fields from updates.
 */

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return NextResponse.json({ success: false, error: 'Authorization token missing.' }, { status: 401 });
    }

    // Verify user session via standard Supabase client to ensure auth validity
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('[PROFILE-API] Auth verification failed:', authError);
      return NextResponse.json({ success: false, error: 'Unauthorized session.' }, { status: 401 });
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
      logo_url
    } = body;

    if (!isSupabaseAdminConfigured) {
      throw new Error('Supabase Admin Client is not configured on the server.');
    }

    // 1. Update the Business Record via Admin Client
    // We explicitly only allow updating standard profile fields.
    // Platform-controlled fields like status, verification_status, and special_tag are OMITTED.
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
        updated_at: new Date().toISOString()
      })
      .eq('id', business_id)
      .eq('owner_id', user.id);

    if (bizError) {
      console.error('[PROFILE-API] Business update error:', bizError);
      return NextResponse.json({ 
        success: false, 
        error: bizError.message || 'Failed to update business particulars.' 
      }, { status: 500 });
    }

    // 2. Synchronize Owner Identity
    if (owner_name) {
      const trimmedName = owner_name.trim();

      // A. Update Auth Metadata (Source of truth for session headers)
      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { user_metadata: { name: trimmedName } }
      );
      
      if (authUpdateError) console.error('[PROFILE-API] Auth metadata sync failed:', authUpdateError);

      // B. Sync public profile table
      const { error: userUpdateError } = await supabaseAdmin
        .from('users')
        .update({ name: trimmedName })
        .eq('id', user.id);
      
      if (userUpdateError) {
        console.warn('[PROFILE-API] Public profile sync warning:', userUpdateError.message);
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
