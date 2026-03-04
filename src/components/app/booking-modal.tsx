
'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Clock, Loader2, Sparkles, User, Smartphone, Droplets, MapPin, AlertCircle, ShieldCheck } from "lucide-react";
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

/**
 * @fileOverview Refined Booking Modal
 * Implements frictionless progressive identity via custom WhatsApp OTP.
 * Enforces "One Active Booking" rule and subscription gating.
 */
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
      setStep('details');
      setOtpCode('');
      
      if (authUser) {
        setName(authUser.user_metadata?.name || '');
        setWhatsapp(authUser.phone || authUser.user_metadata?.whatsapp || '');
      }

      const checkBizAndUser = async () => {
        try {
          // 1. Check Partner Access
          const { data: biz } = await supabase
            .from('businesses')
            .select('verification_status, subscription_status')
            .eq('id', businessId)
            .maybeSingle();
          
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
          console.error("Integrity check failed:", e);
        }
      };
      checkBizAndUser();
    }
  }, [isOpen, businessId, authUser]);

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !whatsapp || !listingId || !date || !time) {
      toast({ variant: 'destructive', title: 'Missing Info', description: 'Please fill in all mandatory fields.' });
      return;
    }

    setLoading(true);
    try {
      // 1. Rule: Check for active bookings if already authed
      if (authUser) {
        const { count, error } = await supabase
          .from('wash_bookings')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', authUser.id)
          .not('status', 'in', '("completed","cancelled","rejected")');
        
        if (error) throw error;
        if (count && count > 0) {
          throw new Error("You already have an active car wash request. Please wait for completion or cancel it.");
        }
      }

      if (!authUser) {
        // Trigger custom OTP via server-side API
        const res = await fetch('/api/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: whatsapp })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        setStep('otp');
        toast({ title: "Verification Sent", description: "Enter the 6-digit code sent to your WhatsApp." });
      } else {
        completeBooking();
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Action Failed', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 6) return;

    setLoading(true);
    try {
      // 1. Verify via Backend API
      const verifyRes = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: whatsapp, otp: otpCode, name })
      });
      const verifyData = await verifyRes.json();
      if (verifyData.error) throw new Error(verifyData.error);

      // 2. Auth Trick: Issue JWT Session
      const cleanPhone = whatsapp.trim().replace(/\D/g, '');
      await supabase.auth.signInWithOtp({ phone: cleanPhone });
      const { error: authError } = await supabase.auth.verifyOtp({
        phone: cleanPhone,
        token: otpCode,
        type: 'sms'
      });

      if (authError) throw authError;

      // 3. Proceed to creation
      await completeBooking();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Verification Failed', description: err.message || "Invalid code." });
    } finally {
      setLoading(false);
    }
  };

  const completeBooking = async () => {
    setLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("Auth session lost. Please try again.");

      const cleanWa = whatsapp.trim().replace(/\D/g, '') || user.phone || '';

      // 1. Create Lead
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

      // 2. Create Wash Booking
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
      console.error("Booking Finalization Error:", err);
      toast({ 
        variant: 'destructive', 
        title: 'Booking Failed', 
        description: err.message || "Could not complete booking. Please check your connection." 
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
            {step === 'details' ? 'Elite Wash Booking' : 'Security Verification'}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {step === 'details' 
              ? `Professional service at ${businessName}.`
              : `Enter the 6-digit code sent via WhatsApp to ${whatsapp}.`}
          </DialogDescription>
        </DialogHeader>

        {!bizStatus.active ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="bg-orange-500/10 p-4 rounded-full"><AlertCircle className="h-10 w-10 text-orange-500" /></div>
            <div className="space-y-2 max-w-xs">
              <p className="font-bold text-lg">Partner Restricted</p>
              <p className="text-xs text-slate-400 leading-relaxed">{bizStatus.reason}</p>
            </div>
            <Button variant="outline" className="border-white/10" onClick={onClose}>Return to Marketplace</Button>
          </div>
        ) : step === 'details' ? (
          <form onSubmit={handleInitialSubmit} className="space-y-6 py-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input placeholder="Kagiso M." value={name} onChange={e => setName(e.target.value)} required className="pl-10 bg-white/5 border-white/10 h-12" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">WhatsApp Number</Label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input placeholder="26777123456" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} required className="pl-10 bg-white/5 border-white/10 h-12" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Wash Package</Label>
              <Select value={listingId} onValueChange={setListingId} required>
                <SelectTrigger className="bg-white/5 border-white/10 h-12 text-white">
                  <SelectValue placeholder="Choose a service" />
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
                <Label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Service Date</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} required className="bg-white/5 border-white/10 h-12" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Time</Label>
                <Input type="time" value={time} onChange={e => setTime(e.target.value)} required className="bg-white/5 border-white/10 h-12" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Location pin (for mobile wash)</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input placeholder="Optional: Google Maps URL" value={locationPin} onChange={e => setLocationPin(e.target.value)} className="pl-10 bg-white/5 border-white/10 h-12" />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="submit" className="w-full h-14 text-lg font-black shadow-xl uppercase tracking-tighter" disabled={loading}>
                {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <Sparkles className="mr-2 h-5 w-5" />}
                Submit Request
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-8 py-8 text-center">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-slate-500 tracking-[0.2em]">6-Digit Code</Label>
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
                Change Details
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
