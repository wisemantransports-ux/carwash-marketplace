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
      // 1. Load services correctly from wash_services table
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
    
    // Ensure identity
    if (!user) {
      toast({ variant: 'destructive', title: 'Session Expired', description: 'Please sign in again.' });
      router.push('/login');
      return;
    }

    if (!selectedBiz || !selectedSvc || !date || !time) {
      toast({ variant: 'destructive', title: 'Details Required' });
      return;
    }

    // 3. Add debug log before booking
    console.log("Booking debug:", {
      serviceId: selectedSvc,
      businessId: selectedBiz
    });

    setSubmitting(true);
    try {
      // 4. Correct booking insert using wash_service_id UUID
      const { error } = await supabase.from('wash_bookings').insert({
        customer_id: user.id,
        customer_name: user.user_metadata?.name || 'Customer',
        customer_whatsapp: user.phone || user.user_metadata?.whatsapp || 'No Phone',
        customer_email: user.email || null,
        wash_service_id: selectedSvc, // UUID from dropdown
        business_id: selectedBiz,
        seller_business_id: selectedBiz,
        location: location,
        booking_date: date,
        requested_time: `${date}T${time}:00`,
        status: 'pending_assignment'
      });

      if (error) throw error;

      toast({ title: 'Your booking has been submitted successfully.', description: 'Connecting you with the partner.' });
      router.push('/dashboard/customer/bookings');
    } catch (e: any) {
      console.error("Booking Error:", e);
      toast({ variant: 'destructive', title: 'Booking Failed', description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link href="/dashboard/customer"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <h1 className="text-3xl font-black uppercase italic tracking-tight text-slate-900">Request Wash</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="rounded-[2.5rem] border-2 shadow-xl overflow-hidden">
          <CardHeader className="bg-slate-900 text-white p-8">
            <CardTitle className="flex items-center gap-2 text-2xl font-black uppercase tracking-tight">
              <Droplets className="h-6 w-6 text-primary" />
              Service Preferences
            </CardTitle>
            <CardDescription className="text-slate-400 font-bold">Select a verified partner and package.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Select Professional Partner</Label>
              <Select value={selectedBiz} onValueChange={setSelectedBiz}>
                <SelectTrigger className="h-14 rounded-2xl border-2"><SelectValue placeholder="Choose a business" /></SelectTrigger>
                <SelectContent>
                  {businesses.map(b => <SelectItem key={b.id} value={b.id}>{b.name} ({b.city})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Wash Package</Label>
              {/* 2. Fix the service dropdown - stores service.id UUID */}
              <Select value={selectedSvc} onValueChange={setSelectedSvc} disabled={!selectedBiz}>
                <SelectTrigger className="h-14 rounded-2xl border-2"><SelectValue placeholder="Select service" /></SelectTrigger>
                <SelectContent>
                  {services.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} - P{s.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Preferred Date</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-14 rounded-2xl border-2" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Arrival Time</Label>
                <Input type="time" value={time} onChange={e => setTime(e.target.value)} className="h-14 rounded-2xl border-2" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Location / Address</Label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input 
                  placeholder="Plot No, Street, City" 
                  value={location} 
                  onChange={e => setLocation(e.target.value)}
                  className="h-14 rounded-2xl border-2 pl-12" 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="pt-4">
          <Button 
            type="submit" 
            className="w-full h-16 rounded-2xl text-xl font-black uppercase shadow-2xl bg-primary group"
            disabled={submitting}
          >
            {submitting ? <Loader2 className="animate-spin mr-2" /> : <ShieldCheck className="mr-2" />}
            Confirm Reservation
          </Button>
          <p className="text-center text-[10px] text-muted-foreground font-bold mt-4 uppercase tracking-widest">
            Payment will be handled directly with the partner upon service.
          </p>
        </div>
      </form>
    </div>
  );
}
