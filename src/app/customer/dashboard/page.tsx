'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, ArrowRight, Droplets, MapPin, Calendar, Clock, Star, Zap, ShieldCheck, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * @fileOverview Customer Dashboard
 * Primary entry point for logged-in customers with quick actions.
 */
export default function CustomerDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [recentHistory, setRecentHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Fetch Most Recent Active Booking (Priority to Pending/Assigned)
      const { data: active } = await supabase
        .from('wash_bookings')
        .select('*')
        .eq('customer_id', user.id)
        .in('status', ['pending_assignment', 'assigned', 'confirmed', 'pending'])
        .order('requested_time', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (active) {
        // Wire business and service info
        const { data: biz } = await supabase.from('businesses').select('name, city').eq('id', active.seller_business_id).maybeSingle();
        const { data: svc } = await supabase.from('listings').select('name').eq('id', active.wash_service_id).maybeSingle();
        setActiveBooking({ ...active, business_name: biz?.name || 'Partner', service_name: svc?.name || 'Wash' });
      } else {
        setActiveBooking(null);
      }

      // 2. Fetch Recent Completed
      const { data: history } = await supabase
        .from('wash_bookings')
        .select('*')
        .eq('customer_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(3);
      
      setRecentHistory(history || []);

    } catch (e) {
      console.error("[CUSTOMER-HOME] Fetch error:", e);
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
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      <header className="space-y-1 pt-4">
        <h1 className="text-4xl font-black tracking-tight text-slate-900 uppercase italic">
          Hello, {user?.user_metadata?.name?.split(' ')[0] || 'Customer'}
        </h1>
        <p className="text-muted-foreground font-medium text-lg">Manage your car wash requests and discovery.</p>
      </header>

      {/* PRIMARY CTA: Request a Wash */}
      <div className="grid gap-6">
        <Button asChild className="w-full h-24 rounded-[2rem] text-2xl font-black uppercase shadow-2xl shadow-primary/20 bg-primary hover:scale-[1.02] transition-transform overflow-hidden group">
          <Link href="/customer/home">
            <Droplets className="mr-4 h-10 w-10 group-hover:rotate-12 transition-transform" />
            Request a New Wash
            <ArrowRight className="ml-auto h-8 w-8 opacity-30" />
          </Link>
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Active Tracking Card */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Live Request</h2>
            {activeBooking && (
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 animate-pulse text-[9px] font-black uppercase">
                Active Tracking
              </Badge>
            )}
          </div>
          {activeBooking ? (
            <Card className="border-2 border-primary/20 bg-white shadow-xl rounded-3xl overflow-hidden group hover:border-primary/40 transition-colors">
              <Link href="/customer/bookings">
                <div className="p-6 flex items-start justify-between">
                  <div className="space-y-3">
                    <Badge className={cn(
                        "border-none font-black text-[10px] uppercase px-3 py-1",
                        (activeBooking.status === 'pending_assignment' || activeBooking.status === 'pending') ? "bg-orange-100 text-orange-700" : "bg-primary/10 text-primary"
                    )}>
                      {activeBooking.status.replace('_', ' ')}
                    </Badge>
                    <div className="space-y-1">
                      <h3 className="text-2xl font-black">{activeBooking.business_name}</h3>
                      <p className="text-sm font-bold text-slate-500">{activeBooking.service_name}</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-bold text-slate-400 pt-2">
                      <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {new Date(activeBooking.requested_time).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {new Date(activeBooking.requested_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl group-hover:bg-primary/5 transition-colors shrink-0">
                    <Zap className={cn("h-8 w-8 text-primary", (activeBooking.status === 'pending_assignment' || activeBooking.status === 'pending') && "animate-pulse")} />
                  </div>
                </div>
                <div className="bg-primary/5 p-4 flex items-center justify-center text-primary font-black text-[10px] uppercase tracking-widest border-t border-primary/5">
                  Track Progress <ArrowRight className="ml-2 h-3 w-3" />
                </div>
              </Link>
            </Card>
          ) : (
            <div className="py-12 border-2 border-dashed rounded-3xl text-center space-y-3 bg-white/50">
              <div className="bg-muted p-4 rounded-full w-fit mx-auto">
                <Clock className="h-6 w-6 text-muted-foreground opacity-40" />
              </div>
              <div className="space-y-1 px-6">
                <p className="text-slate-400 font-bold italic">No active wash requests.</p>
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter">Your scheduled services will appear here.</p>
              </div>
            </div>
          )}
        </section>

        {/* Recent History */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Recent Activity</h2>
            <Link href="/customer/bookings" className="text-[10px] font-black uppercase text-primary hover:underline">View All</Link>
          </div>
          <div className="space-y-3">
            {recentHistory.length > 0 ? recentHistory.map(item => (
              <div key={item.id} className="bg-white border-2 p-4 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition-shadow group">
                <div className="flex items-center gap-4">
                  <div className="bg-green-50 p-2 rounded-xl group-hover:bg-green-100 transition-colors">
                    <Star className="h-5 w-5 text-green-600 fill-green-600" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Completed Wash</p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">{new Date(item.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[9px] font-black bg-green-50 text-green-700 border-green-100">VERIFIED</Badge>
              </div>
            )) : (
              <div className="py-12 text-center text-xs font-bold text-slate-300 italic bg-white/30 rounded-3xl border-2 border-dashed">
                No historical records found.
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Support Card */}
      <Card className="rounded-[2rem] border-2 bg-slate-900 text-white overflow-hidden mt-8 shadow-2xl">
        <CardContent className="p-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-2xl font-black uppercase italic italic tracking-tight">Partner with the best</h3>
            <p className="text-slate-400 text-sm font-medium max-w-md">Every business on AutoLink is verified by our admins. Enjoy professional service at competitive Botswana rates.</p>
          </div>
          <Button variant="outline" className="rounded-full h-12 px-8 font-black border-white/20 text-white hover:bg-white/10" asChild>
            <Link href="/customer/home">Discover Partners</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
