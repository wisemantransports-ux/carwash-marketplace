'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Loader2, Droplets, MapPin, Calendar, Clock, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function BookServicePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [selectedBiz, setSelectedBiz] = useState('');
  const [selectedSvc, setSelectedSvc] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');

  useEffect(() => {
    async function loadBusinesses() {
      const { data } = await supabase
        .from('businesses')
        .select('id, name, city')
        .eq('verification_status', 'verified');
      setBusinesses(data || []);
      setLoading(false);
    }
    loadBusinesses();
  }, []);

  useEffect(() => {
    if (selectedBiz) {
      const fetchServices = async () => {
        const { data, error } = await supabase
          .from('wash_services')
          .select('id, name, price')
          .eq('business_id', selectedBiz);
        
        if (error) {
          console.error("Error fetching services:", error);
          setServices([]);
        } else {
          setServices(data || []);
        }
      };
      fetchServices();
    } else {
      setServices([]);
    }
  }, [selectedBiz]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({ variant: 'destructive', title: 'Session Expired', description: 'Please sign in again.' });
      router.push('/login');
      return;
    }

    if (!selectedBiz || !selectedSvc || !date || !time) {
      toast({ variant: 'destructive', title: 'Details Required' });
      return;
    }

    const payload = {
      customer_id: user.id, // LOGGED IN: explicitly send user ID
      customer_name: user.user_metadata?.name || 'Customer',
      customer_whatsapp: user.phone || user.user_metadata?.whatsapp || 'No Phone',
      customer_email: user.email || null,
      wash_service_id: selectedSvc, // UUID from wash_services
      business_id: selectedBiz,
      seller_business_id: selectedBiz,
      location: location.trim(),
      booking_date: date,
      requested_time: `${date}T${time}:00`,
      status: 'pending_assignment'
    };

    console.log("[DASHBOARD-BOOKING] Submitting Payload:", payload);

    setSubmitting(true);
    try {
      const { error } = await supabase.from('wash_bookings').insert([payload]);

      if (error) throw error;

      toast({ title: 'Request Sent! ✅', description: 'Business owner will assign a detailer shortly.' });
      router.push('/customer/bookings');
    } catch (e: any) {
      console.error("[DASHBOARD-BOOKING] Error:", e);
      toast({ 
        variant: 'destructive', 
        title: 'Booking Failed', 
        description: e.message || 'Check connection and try again.' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) return (
    <div className="flex flex-col items-center justify-center py-32 space-y-4">
      <Loader2 className="animate-spin text-primary h-10 w-10" />
      <p className="text-sm font-black uppercase tracking-widest text-muted-foreground animate-pulse">Loading Partners...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link href="/customer/dashboard"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <h1 className="text-3xl font-black uppercase italic tracking-tight text-slate-900 leading-none">Book New Wash</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="rounded-[2.5rem] border-2 shadow-2xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-900 text-white p-8">
            <CardTitle className="flex items-center gap-2 text-2xl font-black uppercase tracking-tight italic">
              <Droplets className="h-6 w-6 text-primary" />
              Service Options
            </CardTitle>
            <CardDescription className="text-slate-400 font-bold">Configure your professional detailing session.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="grid sm:grid-cols-2 gap-8">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">1. Choose Business</Label>
                <Select value={selectedBiz} onValueChange={setSelectedBiz}>
                  <SelectTrigger className="h-14 rounded-2xl border-2 bg-slate-50/50"><SelectValue placeholder="Verified partners..." /></SelectTrigger>
                  <SelectContent>
                    {businesses.map(b => <SelectItem key={b.id} value={b.id}>{b.name} ({b.city})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">2. Select Package</Label>
                <Select value={selectedSvc} onValueChange={setSelectedSvc} disabled={!selectedBiz}>
                  <SelectTrigger className="h-14 rounded-2xl border-2 bg-slate-50/50">
                    <SelectValue placeholder="Pick a wash package..." />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} - P{s.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">3. Booking Date</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-14 rounded-2xl border-2 bg-slate-50/50" required />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">4. Arrival Time</Label>
                <Input type="time" value={time} onChange={e => setTime(e.target.value)} className="h-14 rounded-2xl border-2 bg-slate-50/50" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">5. Location Details</Label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input 
                  placeholder="Plot number, complex, or specific address..." 
                  value={location} 
                  onChange={e => setLocation(e.target.value)}
                  className="h-14 rounded-2xl border-2 pl-12 bg-slate-50/50" 
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="pt-4">
          <Button 
            type="submit" 
            className="w-full h-16 rounded-[2rem] text-xl font-black uppercase shadow-2xl bg-primary group transition-all hover:scale-[1.01]"
            disabled={submitting}
          >
            {submitting ? <Loader2 className="animate-spin mr-2 h-6 w-6" /> : <ShieldCheck className="mr-2 h-6 w-6" />}
            Submit Request
          </Button>
          <div className="flex items-center justify-center gap-2 mt-6">
            <div className="h-px bg-slate-200 flex-1" />
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Verified Session</p>
            <div className="h-px bg-slate-200 flex-1" />
          </div>
        </div>
      </form>
    </div>
  );
}
