import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      customer_id,
      seller_business_id,
      service_id,
      booking_date,
      booking_time,
    } = body;

    if (!customer_id || !seller_business_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('bookings')
      .insert([
        {
          customer_id,
          seller_business_id,
          service_id,
          booking_date,
          booking_time,
          status: 'pending',
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('[BOOKING ERROR]', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });

  } catch (err: any) {
    console.error('[BOOKING FATAL]', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
