'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowRight, MapPin, Calendar, Droplets, XCircle, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

export default function MyBookingsPage() {
  const { user, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      console.log('Session user.id:', user.id);

      const targetCustomerId = user.id;

      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('customer_id', targetCustomerId)
        .in('status', ['pending', 'pending_assignment', 'assigned', 'confirmed', 'in_progress'])
        .order('scheduled_at', { ascending: false });
      
      console.log('FETCHED BOOKINGS:', data);
      console.log('Bookings fetched', data?.length || 0);
      console.log('bookings customer_id list:', (data || []).map((b: any) => b.customer_id));
      if (error) throw error;

      if (data && data.length > 0) {
        const bizIds = [...new Set(data.map(b => b.seller_business_id))];
        const svcIds = [...new Set(data.map(b => b.wash_service_id))];

        const [bizRes, svcRes] = await Promise.all([
          supabase.from('businesses').select('id, name').in('id', bizIds),
          supabase.from('listings').select('id, name').in('id', svcIds)
        ]);

        const bizMap = (bizRes.data || []).reduce((acc: any, b: any) => ({ ...acc, [b.id]: b.name }), {});
        const svcMap = (svcRes.data || []).reduce((acc: any, s: any) => ({ ...acc, [s.id]: s.name }), {});

        setBookings(data.map(b => ({
          ...b,
          business_name: bizMap[b.seller_business_id] || 'Verified Partner',
          service_name: svcMap[b.wash_service_id] || 'Professional Wash'
        })));
      } else {
        setBookings([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) fetchBookings();
  }, [authLoading, user, fetchBookings]);

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('customer_id', user!.id);
      
      if (error) throw error;
      toast({ title: 'Booking Cancelled' });
      fetchBookings();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Cancellation Failed', description: e.message });
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8">
      <header className="space-y-1 pt-4 px-1 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tight text-slate-900">Active Reservations</h1>
          <p className="text-slate-500 font-medium italic">Monitor your upcoming wash services.</p>
        </div>
        <Button asChild className="rounded-full font-black uppercase text-[10px] h-9 px-6 shadow-md">
          <Link href="/dashboard/customer/book">New Request</Link>
        </Button>
      </header>

      <div className="grid gap-6">
        {bookings.length > 0 ? bookings.map((b) => (
          <Card key={b.id} className="rounded-3xl border-2 shadow-lg overflow-hidden group hover:border-primary/30 transition-all bg-white">
            <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn(
                    "font-black uppercase text-[9px] px-3 py-1",
                    b.status === 'completed' ? "bg-green-50 text-green-700 border-green-200" : 
                    b.status === 'cancelled' ? "bg-red-50 text-red-700 border-red-200" :
                    b.status === 'pending_assignment' ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                    b.status === 'confirmed' ? "bg-blue-50 text-blue-700 border-blue-200" :
                    "bg-slate-50 text-slate-700"
                  )}>
                    {(b.status || 'pending').replace('_', ' ')}
                  </Badge>
                  <span className="font-mono text-[9px] opacity-30 uppercase">ID: {b.id.slice(-6)}</span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-black">{b.service_name}</h3>
                  <p className="text-sm font-bold text-primary italic">{b.business_name}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:flex md:items-center gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-slate-400">Scheduled</p>
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <Calendar className="h-3 w-3 text-primary" />
                    {new Date(b.scheduled_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-slate-400">Location</p>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                    <MapPin className="h-3 w-3 text-primary" />
                    <span className="line-clamp-1 max-w-[120px]">{b.location || 'Station Wash'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {b.status === 'pending_assignment' && (
                  <Button variant="ghost" size="sm" className="text-red-600 font-bold text-[10px] uppercase h-9 rounded-xl" onClick={() => handleCancel(b.id)}>
                    <XCircle className="mr-1 h-3 w-3" /> Cancel
                  </Button>
                )}
                <Button variant="outline" size="sm" asChild className="h-9 px-4 rounded-xl font-black text-[10px] uppercase">
                  <Link href={`/dashboard/customer/bookings/${b.id}`}>
                    Tracker <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        )) : (
          <div className="py-32 border-2 border-dashed rounded-3xl text-center space-y-6 bg-white">
            <Droplets className="h-16 w-16 mx-auto text-slate-200" />
            <div className="space-y-2">
              <p className="text-2xl font-black uppercase italic text-slate-300">You have no bookings yet.</p>
              <p className="text-slate-400 font-medium">Your upcoming services will appear here.</p>
            </div>
            <Button asChild className="rounded-full px-10 font-black uppercase h-12 shadow-lg">
              <Link href="/dashboard/customer/book">Start Booking</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
