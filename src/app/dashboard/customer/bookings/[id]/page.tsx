'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, ShieldCheck, CheckCircle2, UserCheck, Droplets, MapPin, XCircle, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const TRACKER_STEPS = [
  { id: 'pending_assignment', label: 'Requested', desc: 'Awaiting partner response' },
  { id: 'assigned', label: 'Assigned', desc: 'Professional detailer chosen' },
  { id: 'confirmed', label: 'Confirmed', desc: 'Schedule locked' },
  { id: 'completed', label: 'Finished', desc: 'Service complete!' },
];

export default function BookingTrackerPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = params?.id as string;

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const resolveCustomerId = async (authUserId: string): Promise<string | null> => {
    const { data: canonical, error } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', authUserId)
      .maybeSingle();

    if (error) {
      console.error('[CANONICAL RESOLVE ERROR]', error);
      return null;
    }

    return canonical?.id || null;
  };

  const fetchDetails = useCallback(async () => {
    if (!id || !user) return;
    try {
      const canonicalUserId = await resolveCustomerId(user.id);
      console.log('Session user.id:', user.id);
      console.log('Resolved users.id:', canonicalUserId);

      const targetCustomerId = canonicalUserId || user.id;
      if (!canonicalUserId) {
        console.warn('[CANONICAL USER ID MISSING] using auth ID fallback', { userId: user.id });
      }

      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', id)
        .eq('customer_id', targetCustomerId)
        .single();
      
      if (error) throw error;

      const { data: biz } = await supabase.from('businesses').select('name, city').eq('id', data.seller_business_id).single();
      const { data: svc } = await supabase.from('listings').select('name, price').eq('id', data.wash_service_id).single();
      const { data: emp } = data.assigned_employee_id 
        ? await supabase.from('employees').select('name, image_url').eq('id', data.assigned_employee_id).single()
        : { data: null };

      setBooking({ ...data, business: biz, service: svc, employee: emp });
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Fetch Error' });
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    fetchDetails();
    
    // Real-time listener
    const channel = supabase.channel(`tracker-${id}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'bookings', 
        filter: `id=eq.${id}` 
      }, () => fetchDetails())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, fetchDetails]);

  const handleCancel = async () => {
    if (!confirm('Cancel this wash request?')) return;
    setCancelling(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('customer_id', user!.id);
      
      if (error) throw error;
      toast({ title: 'Request Cancelled' });
      router.push('/dashboard/customer/bookings');
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Cancellation Failed', description: e.message });
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <div className="flex justify-center py-32"><Loader2 className="animate-spin text-primary" /></div>;
  if (!booking) return <div className="text-center py-20 font-bold opacity-40">Record not found.</div>;

  const currentIdx = TRACKER_STEPS.findIndex(s => s.id === booking.status);
  const isCancelled = booking.status === 'cancelled';

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link href="/dashboard/customer/bookings"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-black uppercase italic tracking-tight">Booking Tracker</h1>
            <p className="text-[10px] font-black uppercase text-slate-400">Ref: {booking.id.toUpperCase()}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-full h-10 px-4" onClick={() => fetchDetails()}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          {booking.status === 'pending_assignment' && (
            <Button variant="destructive" size="sm" className="rounded-full h-10 px-4 font-bold" onClick={handleCancel} disabled={cancelling}>
              <XCircle className="h-4 w-4 mr-2" /> Cancel Request
            </Button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="rounded-[2.5rem] border-2 shadow-2xl overflow-hidden">
            <CardHeader className="bg-slate-900 text-white p-8">
              <div className="flex items-center justify-between mb-4">
                <Badge className="bg-primary text-white border-none font-black text-[10px] px-4 py-1 uppercase">Live Status</Badge>
                {isCancelled && <Badge variant="destructive" className="font-black uppercase text-[10px]">CANCELLED</Badge>}
              </div>
              <CardTitle className="text-4xl font-black tracking-tighter italic">{booking.service?.name}</CardTitle>
              <CardDescription className="text-slate-400 font-bold flex items-center gap-2 mt-2 uppercase tracking-widest text-[10px]">
                <ShieldCheck className="h-4 w-4 text-green-500" /> {booking.business?.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-10">
              {!isCancelled ? (
                <div className="space-y-12 relative">
                  <div className="absolute left-6 top-0 bottom-0 w-1 bg-slate-100" />
                  {TRACKER_STEPS.map((step, idx) => {
                    const isDone = currentIdx >= idx || booking.status === 'completed';
                    const isCurrent = booking.status === step.id;

                    return (
                      <div key={step.id} className={cn(
                        "flex gap-8 relative z-10 transition-all duration-500",
                        !isDone && "opacity-20 grayscale"
                      )}>
                        <div className={cn(
                          "h-12 w-12 rounded-full border-4 flex items-center justify-center shadow-lg transition-all",
                          isDone ? "bg-primary border-primary text-white" : "bg-white border-slate-200 text-slate-300",
                          isCurrent && "scale-125 ring-8 ring-primary/10 animate-pulse"
                        )}>
                          {isDone ? <CheckCircle2 className="h-6 w-6" /> : (idx + 1)}
                        </div>
                        <div className="flex-1 pt-1">
                          <h4 className="font-black uppercase tracking-tight text-slate-900">{step.label}</h4>
                          <p className="text-sm text-slate-500 font-medium">{step.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center space-y-4">
                  <div className="bg-red-50 p-6 rounded-full w-fit mx-auto border-4 border-white shadow-xl">
                    <XCircle className="h-12 w-12 text-red-600" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black uppercase italic">Reservation Cancelled</h3>
                    <p className="text-slate-500 font-medium max-w-xs mx-auto">This booking has been removed from the operational queue.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {booking.employee && (
            <Card className="rounded-3xl border-2 shadow-xl bg-white overflow-hidden">
              <CardHeader className="bg-slate-50 border-b p-6">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400">Assigned Detailer</CardTitle>
              </CardHeader>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center border-2 border-white shadow-md overflow-hidden shrink-0">
                  {booking.employee.image_url ? (
                    <img src={booking.employee.image_url} alt="Staff" className="h-full w-full object-cover" />
                  ) : (
                    <UserCheck className="h-8 w-8 text-primary" />
                  )}
                </div>
                <div className="space-y-1 overflow-hidden">
                  <p className="text-xl font-black tracking-tight truncate">{booking.employee.name}</p>
                  <p className="text-[10px] font-black uppercase text-primary tracking-widest">Verified Professional</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="rounded-3xl border-2 shadow-xl bg-white p-6 space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Service Particulars</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-[10px] font-black uppercase text-slate-400 leading-none">Arrival Location</p>
                  <p className="text-sm font-bold leading-tight">{booking.location || 'Verified Partner Station'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Droplets className="h-5 w-5 text-primary shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-[10px] font-black uppercase text-slate-400 leading-none">Estimated Price</p>
                  <p className="text-xl font-black text-primary">P{Number(booking.service?.price || 0).toFixed(2)}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
