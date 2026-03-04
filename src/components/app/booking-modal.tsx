
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
 * Ensures session generation trick for RLS compliance.
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
      // 1. Reset states
      setStep('details');
      setOtpCode('');
      
      // 2. Pre-fill if logged in
      if (authUser) {
        setName(authUser.user_metadata?.name || '');
        setWhatsapp(authUser.phone || authUser.user_metadata?.whatsapp || '');
      }

      // 3. Check if partner is active/verified
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
  }, [isOpen, businessId, authUser]);

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !whatsapp || !listingId || !date || !time) {
      toast({ variant: 'destructive', title: 'Missing Info', description: 'Please fill in all mandatory fields.' });
      return;
    }

    if (!authUser) {
      setLoading(true);
      try {
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
      } catch (err: any) {
        toast({ 
          variant: 'destructive', 
          title: 'Auth Error', 
          description: err.message || "Could not send verification code." 
        });
      } finally {
        setLoading(false);
      }
    } else {
      completeBooking();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 6) return;

    setLoading(true);
    try {
      // 1. Verify via Backend API (This creates/updates the user profile)
      const verifyRes = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: whatsapp, otp: otpCode, name })
      });
      const verifyData = await verifyRes.json();
      if (verifyData.error) throw new Error(verifyData.error);

      // 2. The Auth Trick: Forces Supabase client to issue a valid JWT session for RLS
      const cleanPhone = whatsapp.trim().replace(/\D/g, '');
      
      // Request standard OTP login (doesn't send SMS because user is already confirmed)
      await supabase.auth.signInWithOtp({ phone: cleanPhone });
      
      // Verify immediately with the code the user just provided
      const { error: authError } = await supabase.auth.verifyOtp({
        phone: cleanPhone,
        token: otpCode,
        type: 'sms'
      });

      if (authError) throw authError;

      // 3. Proceed to creation now that we have a session
      await completeBooking();
    } catch (err: any) {
      toast({ 
        variant: 'destructive', 
        title: 'Verification Failed', 
        description: err.message || "Invalid verification code." 
      });
    } finally {
      setLoading(false);
    }
  };

  const completeBooking = async () => {
    setLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("Authentication failed. Please sign in.");

      const cleanWa = whatsapp.trim().replace(/\D/g, '') || user.phone || '';

      // Rule: Check if user already has an active booking
      const { count, error: countError } = await supabase
        .from('wash_bookings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .not('status', 'in', '("completed","cancelled","rejected")');
      
      if (countError) throw countError;
      if (count && count > 0) {
        throw new Error("You already have an active booking request.");
      }

      // 1. Log Lead record for sales analytics
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

      // 2. Create the operational Wash Booking
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

      toast({ title: "Booking Successful! ✨", description: "Your elite wash request has been sent." });
      onClose();
      router.push('/customer/bookings');
    } catch (err: any) {
      console.error("Booking Error Detail:", err);
      
      // Robust error message extraction
      let errorMessage = "An unexpected error occurred.";
      if (typeof err === 'string') {
        errorMessage = err;
      } else if (err?.message) {
        errorMessage = err.message;
      } else if (err?.error_description) {
        errorMessage = err.error_description;
      } else if (err?.details) {
        errorMessage = err.details;
      }

      toast({ 
        variant: 'destructive', 
        title: 'Booking Failed', 
        description: errorMessage 
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
              ? `Book your premium service at ${businessName}.`
              : `Enter the 6-digit code sent to ${whatsapp}.`}
          </DialogDescription>
        </DialogHeader>

        {!bizStatus.active ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="bg-orange-500/10 p-4 rounded-full">
              <AlertCircle className="h-10 w-10 text-orange-500" />
            </div>
            <div className="space-y-2 max-w-xs">
              <p className="font-bold text-lg">Service Restricted</p>
              <p className="text-xs text-slate-400 leading-relaxed">{bizStatus.reason}</p>
            </div>
            <Button variant="outline" className="border-white/10" onClick={onClose}>Close</Button>
          </div>
        ) : step === 'details' ? (
          <form onSubmit={handleInitialSubmit} className="space-y-6 py-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Full Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input placeholder="Kagiso M." value={name} onChange={e => setName(e.target.value)} required className="pl-10 bg-white/5 border-white/10 h-12" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">WhatsApp Number *</Label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input placeholder="26777123456" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} required className="pl-10 bg-white/5 border-white/10 h-12" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Select Wash Package *</Label>
              <Select value={listingId} onValueChange={setListingId} required>
                <SelectTrigger className="bg-white/5 border-white/10 h-12 text-white">
                  <SelectValue placeholder="Choose your wash" />
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
                <Label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Preferred Time *</Label>
                <Input type="time" value={time} onChange={e => setTime(e.target.value)} required className="bg-white/5 border-white/10 h-12" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Location (Google Maps Pin)</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input placeholder="Optional: for mobile service..." value={locationPin} onChange={e => setLocationPin(e.target.value)} className="pl-10 bg-white/5 border-white/10 h-12" />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="submit" className="w-full h-14 text-lg font-black shadow-xl uppercase tracking-tighter" disabled={loading}>
                {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <Sparkles className="mr-2 h-5 w-5" />}
                Confirm Booking Request
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
                Verify & Secure Booking
              </Button>
              <Button variant="ghost" className="text-slate-500 hover:text-white" onClick={() => setStep('details')} disabled={loading}>
                Edit Details
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
