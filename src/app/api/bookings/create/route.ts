// RULE:
// Always refer to /docs before modifying logic
// Any logic change must update docs
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { customer_id, whatsapp, customer_name, seller_business_id, service_id, scheduled_at } = body;

    // Validate required fields
    if (!seller_business_id) return NextResponse.json({ success: false, error: 'Missing seller_business_id' }, { status: 400 });
    if (!service_id) return NextResponse.json({ success: false, error: 'Missing service_id' }, { status: 400 });
    if (!scheduled_at) return NextResponse.json({ success: false, error: 'Missing scheduled_at' }, { status: 400 });
    if (!customer_id && !whatsapp) return NextResponse.json({ success: false, error: 'Missing customer_id or whatsapp' }, { status: 400 });

    const scheduledDate = new Date(scheduled_at);
    if (Number.isNaN(scheduledDate.getTime())) {
      return NextResponse.json({ success: false, error: 'Invalid scheduled_at value' }, { status: 400 });
    }

    let resolvedCustomerId = customer_id;

    if (resolvedCustomerId) {
      const { data: customer, error: customerError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', resolvedCustomerId)
        .single();

      if (customerError || !customer) {
        return NextResponse.json({ success: false, error: 'Customer does not exist' }, { status: 404 });
      }
    } else {
      const cleanWa = String(whatsapp).trim().replace(/\D/g, '');
      if (!cleanWa || cleanWa.length < 10) {
        return NextResponse.json({ success: false, error: 'Invalid whatsapp number' }, { status: 400 });
      }

      const { data: existingUser, error: existingUserError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('whatsapp_number', cleanWa)
        .maybeSingle();

      if (existingUserError) {
        return NextResponse.json({ success: false, error: 'User lookup failed' }, { status: 500 });
      }

      if (existingUser && existingUser.id) {
        return NextResponse.json({ success: false, error: 'Customer already exists; please log in', existing_customer_id: existingUser.id }, { status: 409 });
      }

      const insertName = (customer_name || 'Walk-in Customer').trim();
      const { data: newCustomer, error: createCustomerError } = await supabaseAdmin
        .from('users')
        .insert([{ whatsapp_number: cleanWa, name: insertName, role: 'customer' }])
        .select('id')
        .single();

      if (createCustomerError || !newCustomer) {
        return NextResponse.json({ success: false, error: 'Failed to create walk-in customer' }, { status: 500 });
      }

      resolvedCustomerId = newCustomer.id;
    }

    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('id', seller_business_id)
      .single();

    if (businessError || !business) {
      return NextResponse.json({ success: false, error: 'Business does not exist' }, { status: 404 });
    }

    const { data: service, error: serviceError } = await supabaseAdmin
      .from('listings')
      .select('id, business_id')
      .eq('id', service_id)
      .eq('listing_type', 'wash_service')
      .single();

    if (serviceError || !service) {
      return NextResponse.json({ success: false, error: 'Service does not exist' }, { status: 404 });
    }

    if (service.business_id !== seller_business_id) {
      return NextResponse.json({ success: false, error: 'Service does not belong to the selected business' }, { status: 400 });
    }

    const { data: booking, error: insertError } = await supabaseAdmin
      .from('bookings')
      .insert([{
        customer_id: resolvedCustomerId,
        seller_business_id,
        service_id: service.id,
        scheduled_at: scheduledDate.toISOString(),
        status: 'pending',
      }])
      .select('id')
      .single();

    if (insertError || !booking) {
      console.error('[BOOKING ERROR]', insertError);
      return NextResponse.json({ success: false, error: insertError?.message || 'Failed to create booking' }, { status: 500 });
    }

    try {
      const { data: existingLead } = await supabaseAdmin
        .from('leads')
        .select('id')
        .eq('customer_id', resolvedCustomerId)
        .eq('seller_business_id', seller_business_id)
        .maybeSingle();

      if (!existingLead) {
        const leadPayload: any = {
          customer_id: resolvedCustomerId,
          seller_business_id,
          seller_id: seller_business_id,
          lead_type: 'wash_service',
          status: 'new',
          whatsapp_number: whatsapp || null,
          service_id: service.id,
          created_at: new Date().toISOString(),
        };

        await supabaseAdmin.from('leads').insert(leadPayload);
      }
    } catch (leadError) {
      console.warn('[LEAD UPSTREAM ERROR] could not create lead:', leadError);
    }

    return NextResponse.json({ success: true, booking_id: booking.id });
  } catch (err: any) {
    console.error('[BOOKING FATAL]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
