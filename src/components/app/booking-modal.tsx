
'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, User, Smartphone, Droplets, MapPin, AlertCircle, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  businessName: string;
  services: any[];
}

export function BookingModal({ isOpen, onClose, businessId, businessName, services }: BookingModalProps) {
  const router = useRouter();
  const { user: authUser } = useAuth();
  
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [locationText, setLocationText] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [bizStatus, setBizStatus] = useState<{ active: boolean; reason?: string }>({ active: true });

  useEffect(() => {
    if (isOpen) {
      if (authUser) {
        setName(authUser.user_metadata?.name || '');
        setWhatsapp(authUser.phone || authUser.user_metadata?.whatsapp || '');
      }
      
      const checkBiz = async () => {
        try {
          const { data: biz } = await supabase
            .from('businesses')
            .select('verification_status, subscription_status')
            .eq('id', businessId)
            .maybeSingle();
          
          if (biz) {
            if (biz.subscription_status === 'inactive') {
              setBizStatus({ active: false, reason: "Partner features are currently paused." });
            } else if (biz.verification_status !== 'verified') {
              setBizStatus({ active: false, reason: "Business is currently under review." });
            } else {
              setBizStatus({ active: true });
            }
          }
        } catch (e) {
          console.error("Check failed:", e);
        }
      };
      checkBiz();
    }
  }, [isOpen, businessId, authUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !whatsapp || !serviceId || !date || !time) {
      toast({ variant: 'destructive', title: 'Missing Info', description: 'Please fill in mandatory fields.' });
      return;
    }

    setLoading(true);
    try {
      // 1. Frictionless Identity Resolution & Session Restore
      const res = await fetch('/api/auth/frictionless', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsapp, name })
      });
      const authResult = await res.json();
      if (authResult.error) throw new Error(authResult.error);

      // Force session refresh to ensure RLS works
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const finalUserId = currentUser?.id || authResult.userId;

      if (!finalUserId) throw new Error("Could not resolve identity.");

      // 2. Check for active bookings
      const { count, error: countError } = await supabase
        .from('wash_bookings')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', finalUserId)
        .not('status', 'in', '("completed","cancelled","rejected")');
      
      if (countError) throw countError;
      if (count && count > 0) throw new Error("You already have an active request.");

      // 3. Prepare Payloads (Locked Schema Alignment)
      const selectedService = services.find(s => s.id === serviceId);
      const bookingDate = new Date(`${date}T${time}`);

      // Log Lead
      const { error: leadErr } = await supabase.from('leads').insert({
        customer_id: finalUserId,
        seller_business_id: businessId,
        listing_id: serviceId,
        customer_name: name.trim(),
        customer_whatsapp: whatsapp.replace(/\D/g, ''),
        status: 'new'
      });
      if (leadErr) throw leadErr;

      // Log Wash Booking
      const { error: bookingErr } = await supabase.from('wash_bookings').insert({
        customer_id: finalUserId,
        seller_business_id: businessId,
        wash_service_id: serviceId,
        employee_id: null,
        status: 'pending_assignment',
        booking_date: bookingDate.toISOString(),
        location: locationText.trim() || null,
        price: selectedService?.price || 0
      });
      if (bookingErr) throw bookingErr;

      toast({ title: "Booking Confirmed ✨", description: "Your wash has been requested. Check your dashboard." });
      onClose();
      router.push('/customer/bookings');
    } catch (err: any) {
      console.error("Booking Error:", err);
      toast({ 
        variant: 'destructive', 
        title: 'Booking Failed', 
        description: err.message || "PostgreSQL constraints failed. Check your data." 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-slate-950 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-primary flex items-center gap-2">
            <Droplets className="h-6 w-6" />
            Book Your Shine
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Automated identity via WhatsApp. No password required.
          </DialogDescription>
        </DialogHeader>

        {!bizStatus.active ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="bg-orange-500/10 p-4 rounded-full"><AlertCircle className="h-10 w-10 text-orange-500" /></div>
            <p className="font-bold text-lg">{bizStatus.reason}</p>
            <Button variant="outline" className="border-white/10" onClick={onClose}>Back</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} required className="pl-10 bg-white/5 border-white/10" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">WhatsApp Number</Label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input placeholder="26777123456" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} required className="pl-10 bg-white/5 border-white/10" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Select Package</Label>
              <Select value={serviceId} onValueChange={setServiceId} required>
                <SelectTrigger className="bg-white/5 border-white/10 text-white h-12">
                  <SelectValue placeholder="Choose a wash package" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-white">
                  {services.map(s => (
                    <SelectItem key={s.id} value={s.id} className="font-bold">
                      {s.name} — P{Number(s.price || 0).toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Service Date</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} required className="bg-white/5 border-white/10 h-12" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Preferred Time</Label>
                <Input type="time" value={time} onChange={e => setTime(e.target.value)} required className="bg-white/5 border-white/10 h-12" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Service Location (Optional)</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input placeholder="Address or Location Pin" value={locationText} onChange={e => setLocationText(e.target.value)} className="pl-10 bg-white/5 border-white/10 h-12" />
              </div>
            </div>

            <Button type="submit" className="w-full h-14 text-lg font-black shadow-xl uppercase tracking-tighter" disabled={loading}>
              {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <Sparkles className="mr-2 h-5 w-5" />}
              Confirm Booking
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
