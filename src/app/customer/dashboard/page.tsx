'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, ArrowRight, Droplets, MapPin, Calendar, Clock, Star, Zap, ShieldCheck, AlertCircle, MessageSquare, ShoppingCart, CarFront } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * @fileOverview Refined Customer Dashboard Activity Hub
 * Consolidates Wash Bookings and Marketplace Leads into a unified view.
 */
export default function CustomerDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const targetCustomerId = user.id;
    console.log('Session user.id:', user.id);

    try {
      // 1. Fetch Most Recent Active Booking
      const { data: active } = await supabase
        .from('bookings')
        .select('*')
        .eq('customer_id', targetCustomerId)
        .in('status', ['pending_assignment', 'assigned', 'confirmed', 'pending'])
        .order('scheduled_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (active) {
        const { data: biz } = await supabase.from('businesses').select('name, city').eq('id', active.seller_business_id).maybeSingle();
        const { data: svc } = await supabase.from('listings').select('name').eq('id', active.wash_service_id).maybeSingle();
        setActiveBooking({ ...active, business_name: biz?.name || 'Partner', service_name: svc?.name || 'Wash' });
      } else {
        setActiveBooking(null);
      }

      // 2. Fetch Recent Marketplace Inquiries (Leads)
      const { data: leads } = await supabase
        .from('leads')
        .select('*, listing:listing_id(name)')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);
      
      setRecentLeads(leads || []);

    } catch (e) {
      console.error("[CUSTOMER-DASHBOARD] Fetch failure:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) fetchData();
  }, [authLoading, user, fetchData]);

  if (authLoading || loading) return (
    <div className="flex flex-col items-center justify-center py-32 space-y-4 bg-slate-50">
      <Loader2 className="animate-spin h-10 w-10 text-primary" />
      <p className="text-sm font-black uppercase tracking-widest text-slate-400 animate-pulse">Syncing your activity hub...</p>
    </div>
  );

  return (
    <div className="space-y-10 pb-12 animate-in fade-in duration-500">
      <header className="space-y-2 pt-4">
        <h1 className="text-4xl font-black tracking-tight text-slate-900 uppercase italic">
          Hello, {user?.user_metadata?.name?.split(' ')[0] || 'Customer'}
        </h1>
        <p className="text-muted-foreground font-medium text-lg">Track your bookings and inquiries in real-time.</p>
      </header>

      {/* QUICK ACTION */}
      <div className="grid md:grid-cols-2 gap-6">
        <Button asChild className="h-24 rounded-[2rem] text-xl font-black uppercase shadow-2xl bg-primary hover:scale-[1.02] transition-transform group">
          <Link href="/customer/home">
            <Droplets className="mr-4 h-8 w-8 group-hover:rotate-12 transition-transform" />
            Book a New Wash
            <ArrowRight className="ml-auto h-6 w-6 opacity-30" />
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-24 rounded-[2rem] text-xl font-black uppercase border-2 hover:bg-slate-50 transition-all group">
          <Link href="/find-wash">
            <ShoppingCart className="mr-4 h-8 w-8 text-primary group-hover:scale-110 transition-transform" />
            Browse Inventory
            <ArrowRight className="ml-auto h-6 w-6 opacity-30" />
          </Link>
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* ACTIVE WASH TRACKER */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Wash Activity</h2>
            {activeBooking && <Badge className="bg-orange-100 text-orange-700 font-black text-[9px] uppercase animate-pulse">Live Tracker</Badge>}
          </div>
          
          {activeBooking ? (
            <Card className="border-2 border-primary/20 bg-white shadow-xl rounded-[2.5rem] overflow-hidden group hover:border-primary/40 transition-colors">
              <Link href="/customer/bookings">
                <div className="p-8 flex items-start justify-between">
                  <div className="space-y-4">
                    <Badge className={cn(
                        "border-none font-black text-[10px] uppercase px-4 py-1.5 rounded-full shadow-sm",
                        ["pending_assignment", "pending"].includes(activeBooking.status) ? "bg-orange-100 text-orange-700" : "bg-primary/10 text-primary"
                    )}>
                      {activeBooking.status.replace('_', ' ')}
                    </Badge>
                    <div className="space-y-1">
                      <h3 className="text-3xl font-black tracking-tight">{activeBooking.business_name}</h3>
                      <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{activeBooking.service_name}</p>
                    </div>
                    <div className="flex items-center gap-6 text-xs font-bold text-slate-400 pt-2">
                      <span className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl"><Calendar className="h-4 w-4 text-primary" /> {new Date(activeBooking.scheduled_at).toLocaleDateString()}</span>
                      <span className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl"><Clock className="h-4 w-4 text-primary" /> {new Date(activeBooking.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                  <div className="bg-primary/5 p-6 rounded-[2rem] group-hover:bg-primary/10 transition-colors shrink-0">
                    <Zap className={cn("h-10 w-10 text-primary", ["pending_assignment", "pending"].includes(activeBooking.status) && "animate-pulse")} />
                  </div>
                </div>
                <div className="bg-primary/5 p-5 flex items-center justify-center text-primary font-black text-[10px] uppercase tracking-[0.2em] border-t border-primary/5">
                  Open Activity Tracker <ArrowRight className="ml-2 h-3 w-3" />
                </div>
              </Link>
            </Card>
          ) : (
            <div className="py-20 border-2 border-dashed rounded-[2.5rem] text-center space-y-4 bg-white/50 backdrop-blur-sm">
              <div className="bg-slate-100 p-5 rounded-full w-fit mx-auto border-2 border-white shadow-inner">
                <Droplets className="h-8 w-8 text-slate-300" />
              </div>
              <p className="text-slate-400 font-bold italic">No active car wash sessions.</p>
              <Button asChild size="sm" variant="ghost" className="font-black text-primary uppercase text-[10px] tracking-widest">
                <Link href="/customer/home">Book your first wash</Link>
              </Button>
            </div>
          )}
        </div>

        {/* RECENT MARKETPLACE INQUIRIES */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Marketplace Leads</h2>
            <Link href="/customer/leads" className="text-[10px] font-black uppercase text-primary hover:underline">View All</Link>
          </div>
          
          <div className="space-y-3">
            {recentLeads.length > 0 ? recentLeads.map(lead => (
              <Card key={lead.id} className="bg-white border-2 p-5 rounded-3xl shadow-sm hover:shadow-md transition-all group">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "p-3 rounded-2xl border-2 border-white shadow-sm",
                    lead.listing_type === 'car' ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                  )}>
                    {lead.listing_type === 'car' ? <CarFront className="h-5 w-5" /> : <ShoppingCart className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="font-black text-sm text-slate-900 truncate">{lead.listing?.name || 'Automotive Listing'}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[8px] font-black px-2 uppercase">{lead.status}</Badge>
                      <span className="text-[9px] text-slate-400 font-bold uppercase">{new Date(lead.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="rounded-full h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors" asChild>
                    <Link href="/customer/leads"><MessageSquare className="h-4 w-4" /></Link>
                  </Button>
                </div>
              </Card>
            )) : (
              <div className="py-12 text-center bg-white/30 rounded-[2rem] border-2 border-dashed flex flex-col items-center gap-3">
                <MessageSquare className="h-6 w-6 text-slate-200" />
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No inquiries sent</p>
              </div>
            )}
          </div>

          <Card className="bg-slate-900 border-none rounded-[2rem] p-6 shadow-2xl mt-6">
            <div className="flex items-start gap-4">
              <div className="bg-primary/20 p-3 rounded-2xl shadow-lg border border-primary/10">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-white font-black uppercase italic tracking-tight text-lg">Verified Network</p>
                <p className="text-slate-400 text-[10px] leading-relaxed font-medium">
                  Every inquiry is handled via WhatsApp for your security. Shop with confidence.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
