'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, ArrowRight, Droplets, MapPin, Calendar, Clock, Star, Zap } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function CustomerHome() {
  const { user, loading: authLoading } = useAuth();
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [recentHistory, setRecentHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user || !user.id) {
      console.log('Fetch deferred: auth not ready or missing user id', { user });
      return;
    }

    setLoading(true);

    console.log('SESSION USER:', user);

    const testFetchBookings = async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*');

      console.log('TEST BOOKINGS:', data);
      console.log('TEST ERROR:', error);
    };

    testFetchBookings();

    const targetCustomerId = user.id;


    try {
      // 1. Fetch Most Active Booking
      const activeResponse = await supabase
        .from('bookings')
        .select('*')
        .eq('customer_id', targetCustomerId)
        .in('status', ['pending', 'pending_assignment', 'assigned', 'confirmed', 'in_progress'])
        .order('scheduled_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log('BOOKINGS QUERY RESPONSE (active):', activeResponse);
      if (activeResponse.error) throw activeResponse.error;

      const active = activeResponse.data;

      if (active) {
        // Wire business and service info
        const { data: biz } = await supabase.from('businesses').select('name, city').eq('id', active.seller_business_id).single();
        const { data: svc } = await supabase.from('listings').select('name').eq('id', active.wash_service_id).single();
        setActiveBooking({ ...active, business_name: biz?.name, service_name: svc?.name });
      } else {
        setActiveBooking(null);
      }

      console.log('Customer active booking:', active ? 1 : 0);

      // 2. Fetch Recent Completed
      const historyResponse = await supabase
        .from('bookings')
        .select('*')
        .eq('customer_id', targetCustomerId)
        .eq('status', 'completed')
        .order('scheduled_at', { ascending: false })
        .limit(3);

      console.log('BOOKINGS QUERY RESPONSE (history):', historyResponse);
      if (historyResponse.error) throw historyResponse.error;

      const history = historyResponse.data;
      setRecentHistory(history || []);

      const allBookings = [active, ...(history || [])].filter(Boolean);
      console.log('FETCHED BOOKINGS:', allBookings);

      const customerIds = [
        active ? active.customer_id : null,
        ...(history || []).map(b => b.customer_id),
      ].filter(Boolean);

      console.log('bookings customer_id list:', customerIds);
      console.log('Recent bookings fetched', history?.length || 0);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) fetchData();
  }, [authLoading, user, fetchData]);

  if (authLoading || loading) return (
    <div className="flex flex-col items-center justify-center py-32 space-y-4">
      <Loader2 className="animate-spin h-10 w-10 text-primary" />
      <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">Opening Dashboard...</p>
    </div>
  );

  return (
    <div className="space-y-8">
      <header className="space-y-1 pt-4">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase italic">Welcome back, {user?.user_metadata?.name?.split(' ')[0] || 'Customer'}</h1>
        <p className="text-slate-500 font-medium italic">Ready for a showroom shine today?</p>
      </header>

      {/* Primary CTA */}
      <Button asChild className="w-full h-20 rounded-3xl text-xl font-black uppercase shadow-2xl shadow-primary/20 bg-primary group overflow-hidden">
        <Link href="/dashboard/customer/book">
          <Droplets className="mr-3 h-8 w-8 group-hover:scale-110 transition-transform" />
          Book a Car Wash
          <ArrowRight className="ml-auto h-6 w-6 opacity-50" />
        </Link>
      </Button>

      {/* Active Tracking Card */}
      <section className="space-y-4">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Live Activity</h2>
        {activeBooking ? (
          <Card className="border-2 border-primary/20 bg-white shadow-xl rounded-3xl overflow-hidden group">
            <Link href={`/dashboard/customer/bookings/${activeBooking.id}`}>
              <div className="p-6 flex items-start justify-between">
                <div className="space-y-3">
                  <Badge className="bg-primary/10 text-primary border-none font-black text-[10px] uppercase px-3">
                    {activeBooking.status.replace('_', ' ')}
                  </Badge>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black">{activeBooking.business_name}</h3>
                    <p className="text-sm font-bold text-slate-500">{activeBooking.service_name}</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {new Date(activeBooking.scheduled_at).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {new Date(activeBooking.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl group-hover:bg-primary/5 transition-colors">
                  <Zap className="h-8 w-8 text-primary animate-pulse" />
                </div>
              </div>
              <div className="bg-primary/5 p-4 flex items-center justify-center text-primary font-black text-xs uppercase tracking-widest">
                View Tracker <ArrowRight className="ml-2 h-3 w-3" />
              </div>
            </Link>
          </Card>
        ) : (
          <div className="py-12 border-2 border-dashed rounded-3xl text-center space-y-2 bg-white/50">
            <p className="text-slate-400 font-bold italic">No active wash requests.</p>
            <Link href="/dashboard/customer/book" className="text-primary font-black uppercase text-xs hover:underline underline-offset-4">Schedule one now</Link>
          </div>
        )}
      </section>

      {/* Recent History */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Recent Activity</h2>
          <Link href="/dashboard/customer/history" className="text-[10px] font-black uppercase text-primary">View All</Link>
        </div>
        <div className="space-y-3">
          {recentHistory.map(item => (
            <div key={item.id} className="bg-white border p-4 rounded-2xl flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4">
                <div className="bg-green-50 p-2 rounded-xl">
                  <Star className="h-5 w-5 text-green-600 fill-green-600" />
                </div>
                <div>
                  <p className="font-bold text-sm">Completed Wash</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">{new Date(item.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-[9px] font-black bg-green-50 text-green-700 border-green-100">VERIFIED</Badge>
            </div>
          ))}
          {recentHistory.length === 0 && (
            <p className="text-center py-6 text-xs font-bold text-slate-300 italic">No historical records found.</p>
          )}
        </div>
      </section>
    </div>
  );
}
