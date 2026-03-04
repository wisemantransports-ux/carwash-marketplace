'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, User, Smartphone, Droplets, MapPin, Calendar, Clock, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: any; // Receives the FULL wash service object
}

/**
 * Robust error message extraction for Supabase and standard JS errors.
 */
const extractErrorMessage = (err: any): string => {
  if (!err) return "An unexpected error occurred.";
  if (typeof err === 'string') return err;
  
  // Handle Supabase PostgrestError or standard Error
  const message = err.message || err.error_description || (err.error && err.error.message);
  const details = err.details || "";
  const code = err.code || "";
  
  if (message) {
    let fullMessage = message;
    if (details && details !== message) fullMessage += ` (${details})`;
    if (code) fullMessage += ` [${code}]`;
    return fullMessage;
  }

  try {
    const stringified = JSON.stringify(err);
    return stringified === '{}' ? String(err) : stringified;
  } catch {
    return String(err);
  }
};

export function BookingModal({ isOpen, onClose, service }: BookingModalProps) {
  const router = useRouter();
  const { user: authUser } = useAuth();
  
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [locationText, setLocationText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && authUser) {
      setName(authUser.user_metadata?.name || '');
      const wa = authUser.phone || authUser.user_metadata?.whatsapp || '';
      setWhatsapp(wa);
    }
  }, [isOpen, authUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!service?.id || !service?.business_id) {
      toast({ variant: 'destructive', title: 'Invalid Service', description: 'Missing service or business identifiers.' });
      return;
    }

    if (!name.trim() || !whatsapp.trim() || !date || !time) {
      toast({ variant: 'destructive', title: 'Missing Info', description: 'Please fill in all mandatory fields.' });
      return;
    }

    setLoading(true);
    try {
      let currentUserId = authUser?.id;

      // 1. Resolve Identity via Frictionless Bridge if not logged in
      if (!currentUserId) {
        const res = await fetch('/api/auth/frictionless', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ whatsapp, name })
        });

        const contentType = res.headers.get("content-type");
        if (!res.ok || !contentType || !contentType.includes("application/json")) {
          throw new Error("Identity service unavailable. Please check your connection.");
        }

        const authResult = await res.json();
        if (authResult.error) throw new Error(authResult.error);
        currentUserId = authResult.userId;
      }

      if (!currentUserId) {
        throw new Error("Could not verify your identity. Please try again.");
      }

      // 2. Prepare Booking Payload - Aligned with strict schema requirements
      const bookingPayload = {
        customer_id: currentUserId,
        seller_business_id: service.business_id,
        business_id: service.business_id, // Satisfy both potential ID columns
        wash_service_id: service.id,
        employee_id: null,
        status: 'pending_assignment',
        booking_date: new Date(`${date}T${time}`).toISOString(),
        location: locationText.trim(),
        customer_name: name.trim(),
        customer_whatsapp: whatsapp.replace(/\D/g, '')
      };

      // 3. Insert into wash_bookings - Ensuring ONLY this table is used for carwash
      const { error: bookingError } = await supabase
        .from('wash_bookings')
        .insert([bookingPayload]);

      if (bookingError) throw bookingError;

      // 4. Success Flow
      toast({ title: "Booking Confirmed! ✨", description: "Your wash request is now live." });
      onClose();
      router.push('/customer/bookings');
    } catch (err: any) {
      // Improved error logging to catch the "empty object" issue
      console.group("Booking Process Failure");
      console.error("Raw Error:", err);
      console.error("Error Message:", err?.message);
      console.error("Error Details:", err?.details);
      console.groupEnd();

      toast({ 
        variant: 'destructive', 
        title: 'Booking Failed', 
        description: extractErrorMessage(err) 
      });
    } finally {
      setLoading(false);
    }
  };

  if (!service) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-slate-950 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-primary flex items-center gap-2">
            <Droplets className="h-6 w-6" />
            Book Service
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Professional wash for: <span className="text-white font-bold">{service.name}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} required className="pl-10 bg-white/5 border-white/10 h-12" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">WhatsApp Number</Label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input placeholder="26777123456" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} required className="pl-10 bg-white/5 border-white/10 h-12" />
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Service Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} required className="pl-10 bg-white/5 border-white/10 h-12" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Preferred Time</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input type="time" value={time} onChange={e => setTime(e.target.value)} required className="pl-10 bg-white/5 border-white/10 h-12" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Service Location / Address</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input placeholder="e.g. Plot 1234, G-West, Gaborone" value={locationText} onChange={e => setLocationText(e.target.value)} required className="pl-10 bg-white/5 border-white/10 h-12" />
            </div>
          </div>

          <Button type="submit" className="w-full h-14 text-lg font-black shadow-xl uppercase tracking-tighter" disabled={loading}>
            {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <Sparkles className="mr-2 h-5 w-5" />}
            Confirm Booking
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
