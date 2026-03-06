'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowRight, MapPin, Calendar, Droplets } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function MyBookingsPage() {
  const { user, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('wash_bookings')
        .select('*')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });
      
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
          business_name: bizMap[b.seller_business_id],
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

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8">
      <header className="space-y-1 pt-4 px-1">
        <h1 className="text-3xl font-black uppercase italic tracking-tight">Active Reservations</h1>
        <p className="text-slate-500 font-medium italic">Monitor your upcoming wash services.</p>
      </header>

      <div className="grid gap-6">
        {bookings.length > 0 ? bookings.map((b) => (
          <Card key={b.id} className="rounded-3xl border-2 shadow-lg overflow-hidden group hover:border-primary/30 transition-all">
            <Link href={`/dashboard/customer/bookings/${b.id}`}>
              <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn(
                      "font-black uppercase text-[9px] px-3 py-1",
                      b.booking_status === 'completed' ? "bg-green-50 text-green-700 border-green-200" : 
                      b.booking_status === 'cancelled' ? "bg-red-50 text-red-700 border-red-200" :
                      "bg-blue-50 text-blue-700 border-blue-200"
                    )}>
                      {b.booking_status.replace('_', ' ')}
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
                      {new Date(b.booking_date).toLocaleDateString()}
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

                <div className="hidden md:flex bg-slate-50 p-3 rounded-2xl group-hover:bg-primary/5 transition-colors">
                  <ArrowRight className="h-5 w-5 text-primary" />
                </div>
              </div>
            </Link>
          </Card>
        )) : (
          <div className="py-32 border-2 border-dashed rounded-3xl text-center space-y-6 bg-white">
            <Droplets className="h-16 w-16 mx-auto text-slate-200" />
            <div className="space-y-2">
              <p className="text-2xl font-black uppercase italic text-slate-300">No active bookings</p>
              <p className="text-slate-400 font-medium">Your upcoming services will appear here.</p>
            </div>
            <Button asChild className="rounded-full px-10 font-black uppercase">
              <Link href="/dashboard/customer/book">Start Booking</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
