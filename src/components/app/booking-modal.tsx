'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Clock, Loader2, Sparkles, User, Smartphone, Droplets, MapPin, AlertCircle, ShieldCheck, MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";

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
  
  // Form States
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [listingId, setListingId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [locationPin, setLocationPin] = useState('');
  
  // Auth Flow States
  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [bizStatus, setBizStatus] = useState<{ active: boolean; reason?: string }>({ active: true });

  useEffect(() => {
    if (isOpen && businessId) {
      const checkBiz = async () => {
        try {
          const { data: biz, error } = await supabase
            .from('businesses')
            .select('verification_status, subscription_status')
            .eq('id', businessId)
            .maybeSingle();
          
          if (error) throw error;

          if (biz) {
            if (biz.subscription_status === 'inactive') {
              setBizStatus({ active: false, reason: "This partner's professional features are currently paused." });
            } else if (biz.verification_status !== 'verified') {
              setBizStatus({ active: false, reason: "This business is currently under verification review." });
            } else {
              setBizStatus({ active: true });
            }
          }
        } catch (e) {
          console.error("Biz status check failed:", e);
        }
      };
      checkBiz();
    }
  }, [isOpen, businessId]);

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !whatsapp || !listingId || !date || !time) {
      toast({ variant: 'destructive', title: 'Missing Info', description: 'Please fill in all mandatory fields.' });
      return;
    }

    if (!authUser) {
      // Step 1: Trigger OTP if not logged in
      setLoading(true);
      try {
        const res = await fetch('/api/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: whatsapp })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        setStep('otp');
        toast({ title: "Verification Sent", description: "Enter the code sent to your WhatsApp." });
      } catch (err: any) {
        toast({ variant: 'destructive', title: 'Auth Error', description: err.message });
      } finally {
        setLoading(false);
      }
    } else {
      // Already authed, go straight to creation
      completeBooking();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 6) return;

    setLoading(true);
    try {
      // 1. Verify via API
      const verifyRes = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: whatsapp, otp: otpCode, name })
      });
      const verifyData = await verifyRes.json();
      if (verifyData.error) throw new Error(verifyData.error);

      // 2. Generate Real Supabase Session (The Trick)
      // signInWithOtp followed immediately by verifyOtp works if phone_confirm is true
      const { error: signError } = await supabase.auth.signInWithOtp({
        phone: whatsapp.trim().replace(/\D/g, '')
      });
      // We ignore error here because we expect it might fail if provider is not configured for actual SMS,
      // but verifyOtp will work with our custom token if configured or if using the "sms" type.
      
      const { error: authError } = await supabase.auth.verifyOtp({
        phone: whatsapp.trim().replace(/\D/g, ''),
        token: otpCode,
        type: 'sms'
      });

      if (authError) throw authError;

      // 3. Complete the booking
      await completeBooking();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Verification Failed', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const completeBooking = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication failed. Please try again.");

      const cleanWa = whatsapp.trim().replace(/\D/g, '');

      // 1. Log Lead
      const { error: leadError } = await supabase.from('leads').insert({
        seller_id: businessId,
        user_id: user.id,
        listing_id: listingId,
        lead_type: 'wash_service',
        customer_name: name.trim(),
        customer_whatsapp: cleanWa,
        status: 'new'
      });

      if (leadError) throw leadError;

      // 2. Create Booking
      const { error: bookingError } = await supabase.from('wash_bookings').insert({
        user_id: user.id,
        whatsapp_number: cleanWa,
        wash_business_id: businessId,
        service_type: listingId,
        booking_date: date,
        booking_time: time,
        location_pin: locationPin.trim() || null,
        status: 'pending_assignment'
      });

      if (bookingError) throw bookingError;

      toast({ title: "Booking Successful! ✨", description: "Redirecting to your dashboard..." });
      onClose();
      router.push('/customer/bookings');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Booking Failed', description: err.message });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-slate-950 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-primary flex items-center gap-2">
            <Droplets className="h-6 w-6" />
            {step === 'details' ? 'Book Car Wash' : 'Verify Identity'}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {step === 'details' 
              ? `Secure your elite detailing slot at ${businessName}.`
              : `Enter the 6-digit code sent to ${whatsapp}.`}
          </DialogDescription>
        </DialogHeader>

        {!bizStatus.active ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="bg-orange-500/10 p-4 rounded-full">
              <AlertCircle className="h-10 w-10 text-orange-500" />
            </div>
            <div className="space-y-2 max-w-xs">
              <p className="font-bold text-lg">Partner Restricted</p>
              <p className="text-xs text-slate-400 leading-relaxed">{bizStatus.reason}</p>
            </div>
            <Button variant="outline" className="border-white/10" onClick={onClose}>Close</Button>
          </div>
        ) : step === 'details' ? (
          <form onSubmit={handleInitialSubmit} className="space-y-6 py-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Your Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} required className="pl-10 bg-white/5 border-white/10 h-12" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">WhatsApp No. *</Label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input placeholder="26777123456" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} required className="pl-10 bg-white/5 border-white/10 h-12" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Select Package *</Label>
              <Select value={listingId} onValueChange={setListingId} required>
                <SelectTrigger className="bg-white/5 border-white/10 h-12 text-white">
                  <SelectValue placeholder="Choose a wash type" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-white">
                  {services.map(s => (
                    <SelectItem key={s.id} value={s.id} className="font-bold">{s.name} — P{s.price}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Service Date *</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} required className="bg-white/5 border-white/10 h-12" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Service Time *</Label>
                <Input type="time" value={time} onChange={e => setTime(e.target.value)} required className="bg-white/5 border-white/10 h-12" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Location Pin (Optional for Mobile)</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input 
                  placeholder="Google Maps link or address..." 
                  value={locationPin} 
                  onChange={e => setLocationPin(e.target.value)} 
                  className="pl-10 bg-white/5 border-white/10 h-12" 
                />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="submit" className="w-full h-14 text-lg font-black shadow-xl uppercase tracking-tighter" disabled={loading}>
                {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <ShieldCheck className="mr-2 h-5 w-5" />}
                Confirm Details
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-8 py-8 text-center">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-slate-500 tracking-[0.2em]">Verification Code</Label>
              <Input 
                value={otpCode} 
                onChange={e => setOtpCode(e.target.value)} 
                maxLength={6}
                placeholder="••••••"
                className="h-20 text-4xl font-black tracking-[0.5em] text-center bg-white/5 border-white/10 rounded-2xl"
                autoFocus
              />
            </div>
            
            <div className="space-y-4">
              <Button type="submit" className="w-full h-16 text-xl font-black bg-green-600 hover:bg-green-700 shadow-2xl rounded-2xl uppercase tracking-widest" disabled={loading || otpCode.length < 6}>
                {loading ? <Loader2 className="animate-spin mr-2 h-6 w-6" /> : <ShieldCheck className="mr-2 h-6 w-6" />}
                Verify & Book
              </Button>
              <Button variant="ghost" className="text-slate-500 hover:text-white" onClick={() => setStep('details')} disabled={loading}>
                Edit Phone Number
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
