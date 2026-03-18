import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin';
import { supabase } from '@/lib/supabase';

/**
 * @fileOverview Secure Business Profile Update API
 * Only updates businesses table via admin client. Does not touch users.
 */

export async function PATCH(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json({ success: false, error: 'No token' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) {
      return NextResponse.json({ success: false, error: 'No token' }, { status: 401 });
    }

    if (!isSupabaseAdminConfigured) {
      console.error('[PROFILE-API] Supabase admin not configured');
      return NextResponse.json(
        { success: false, error: 'Supabase admin not configured.' },
        { status: 500 }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('[PROFILE-API] Auth verification failed:', authError);
      return NextResponse.json({ success: false, error: 'Unauthorized session.' }, { status: 401 });
    }

    const body = await req.json();
    const {
      owner_id,
      business_id,
      name,
      whatsapp_number,
      address,
      city,
      logo_url,
      category,
      special_tag,
      type
    } = body;

    console.log('[PROFILE-API] PATCH owner_id:', owner_id, 'user.id:', user.id);

    if (!owner_id || owner_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Invalid owner_id or unauthorized' }, { status: 403 });
    }

    const payload: Record<string, any> = {};
    if (name !== undefined) payload.name = name?.trim();
    if (whatsapp_number !== undefined) payload.whatsapp_number = whatsapp_number?.trim();
    if (address !== undefined) payload.address = address?.trim();
    if (city !== undefined) payload.city = city?.trim();
    if (logo_url !== undefined) payload.logo_url = logo_url;
    if (category !== undefined) payload.category = category;
    if (special_tag !== undefined) payload.special_tag = special_tag;
    if (type !== undefined) payload.type = type;

    console.log('[PROFILE-API] payload:', payload);

    const { data, error } = await supabaseAdmin
      .from('businesses')
      .update(payload)
      .eq('owner_id', owner_id)
      .eq('id', business_id);

    if (error) {
      console.error('[PROFILE-API] Business update error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('[PROFILE-API] Fatal error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Unknown error' }, { status: 500 });
  }
}
