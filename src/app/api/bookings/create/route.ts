import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      customer_id,
      seller_business_id,
      service_id,
      scheduled_at,
    } = body;

    if (!customer_id) {
      return NextResponse.json({ success: false, error: 'Missing customer_id' }, { status: 400 });
    }
    if (!seller_business_id) {
      return NextResponse.json({ success: false, error: 'Missing seller_business_id' }, { status: 400 });
    }
    if (!service_id) {
      return NextResponse.json({ success: false, error: 'Missing service_id' }, { status: 400 });
    }
    if (!scheduled_at) {
      return NextResponse.json({ success: false, error: 'Missing scheduled_at' }, { status: 400 });
    }

    console.log('BOOKING INSERT PAYLOAD', {
      customer_id,
      seller_business_id,
      service_id,
      scheduled_at,
    });

    const scheduledDate = new Date(scheduled_at);
    if (Number.isNaN(scheduledDate.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid scheduled_at value' },
        { status: 400 }
      );
    }

    // Validate customer exists
    const { data: customer, error: customerError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', customer_id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { success: false, error: 'Customer does not exist' },
        { status: 404 }
      );
    }

    // Validate seller business exists
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('id', seller_business_id)
      .single();

    if (businessError || !business) {
      return NextResponse.json(
        { success: false, error: 'Business does not exist' },
        { status: 404 }
      );
    }

    // Validate service exists and belongs to the business (support table aliases)
    let service = null;
    let serviceError = null;

    const serviceTables = ['wash_services', 'services', 'listings'];
    for (const table of serviceTables) {
      const res = await supabaseAdmin
        .from(table)
        .select('id, business_id')
        .eq('id', service_id)
        .single();

      if (!res.error && res.data) {
        service = res.data;
        serviceError = null;
        break;
      }

      serviceError = res.error;
    }

    if (serviceError || !service) {
      return NextResponse.json(
        { success: false, error: 'Service does not exist' },
        { status: 404 }
      );
    }

    if (service.business_id !== seller_business_id) {
      return NextResponse.json(
        { success: false, error: 'Service does not belong to the selected business' },
        { status: 400 }
      );
    }

    const { data: booking, error: insertError } = await supabaseAdmin
      .from('bookings')
      .insert([
        {
          customer_id,
          seller_business_id,
          wash_service_id: service.id,
          scheduled_at: scheduledDate.toISOString(),
          status: 'pending_assignment',
        },
      ])
      .select('id')
      .single();

    if (insertError || !booking) {
      console.error('[BOOKING ERROR]', insertError);
      return NextResponse.json(
        { success: false, error: insertError?.message || 'Failed to create booking' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, booking_id: booking.id });

  } catch (err: any) {
    console.error('[BOOKING FATAL]', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
