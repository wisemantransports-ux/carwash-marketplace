'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, User, Smartphone, Droplets, MapPin, Calendar, Clock, Mail, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { normalizePhone } from "@/lib/utils";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: any; 
}

const extractErrorMessage = (err: any): string => {
  if (!err) return "An unexpected error occurred.";
  const message = err.message || err.error_description || (err.error && err.error.message);
  const details = err.details || "";
  const code = err.code || "";
  if (message) return `${message} ${details ? `(${details})` : ''} ${code ? `[${code}]` : ''}`;
  try { return JSON.stringify(err); } catch { return String(err); }
};

export function BookingModal({ isOpen, onClose, service }: BookingModalProps) {
  const router = useRouter();
  const { user: authUser } = useAuth();
  
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [locationText, setLocationText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && authUser) {
      setName(authUser.user_metadata?.name || '');
      setWhatsapp(authUser.phone || authUser.user_metadata?.whatsapp || '');
      setEmail(authUser.email || '');
    }
  }, [isOpen, authUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time) {
      toast({ variant: 'destructive', title: "Details Missing" });
      return;
    }

    setLoading(true);
    try {
      // 1. Validate and Normalize Phone
      const cleanWa = normalizePhone(whatsapp);

      let resolvedUserId = authUser?.id;
      
      if (!resolvedUserId) {
        const identRes = await fetch('/api/auth/frictionless', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ whatsapp: cleanWa, name: name.trim() })
        });
        const identData = await identRes.json();
        if (!identData.success || !identData.userId) {
          throw new Error(identData.error || "Could not verify your identity.");
        }
        resolvedUserId = identData.userId;
      }

      if (!resolvedUserId) throw new Error("Identity resolution failed. Please try again.");

      const payload: any = {
        customer_name: name.trim(),
        customer_whatsapp: cleanWa,
        customer_email: email.trim() || null,
        wash_service_id: service.id,
        business_id: service.business_id,
        seller_business_id: service.business_id,
        location: locationText.trim(),
        booking_date: date,
        requested_time: `${date}T${time}:00`,
        status: 'pending_assignment',
        customer_id: resolvedUserId,
        user_id: resolvedUserId
      };

      const { error } = await supabase.from('wash_bookings').insert(payload);
      if (error) throw error;

      toast({ title: "Booking Requested! ✅", description: "Tracking now available in your dashboard." });
      onClose();
      router.push("/customer/dashboard");
    } catch (err: any) {
      console.error("[BOOKING-CAPTURE] Error:", err);
      toast({
        variant: "destructive",
        title: "Booking Failed",
        description: extractErrorMessage(err)
      });
    } finally {
      setLoading(false);
    }
  };

  if (!service) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-slate-950 border-white/10 text-white rounded-[2.5rem] overflow-hidden">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-2xl font-black text-primary flex items-center gap-2 uppercase italic">
            <Droplets className="h-6 w-6" />
            Reserve Your Wash
          </DialogTitle>
          <DialogDescription className="text-slate-400 font-medium">
            Booking <span className="text-white font-bold">{service.name}</span>. Your activity tracker will be linked to your WhatsApp number.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input value={name} onChange={e => setName(e.target.value)} required className="pl-10 h-12 bg-white/5 border-white/10 rounded-xl text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">WhatsApp No.</Label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} required placeholder="26777123456" className="pl-10 h-12 bg-white/5 border-white/10 rounded-xl text-white" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Preferred Date</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} required className="h-12 bg-white/5 border-white/10 rounded-xl text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Arrival Time</Label>
              <Input type="time" value={time} onChange={e => setTime(e.target.value)} required className="h-12 bg-white/5 border-white/10 rounded-xl text-white" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Service Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input value={locationText} onChange={e => setLocationText(e.target.value)} placeholder="Plot No. or Specific Address" required className="pl-10 h-12 bg-white/5 border-white/10 rounded-xl text-white" />
            </div>
          </div>

          <Button type="submit" className="w-full h-16 text-lg font-black shadow-xl uppercase tracking-tighter rounded-2xl bg-primary hover:scale-[1.02] transition-transform" disabled={loading}>
            {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <ShieldCheck className="mr-2 h-5 w-5" />}
            Confirm Wash Request
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
