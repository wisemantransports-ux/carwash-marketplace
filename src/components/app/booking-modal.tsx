
'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, User, Smartphone, Droplets, MapPin, Calendar, Clock, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: any; 
}

const extractErrorMessage = (err: any): string => {
  if (!err) return "An unexpected error occurred.";
  if (typeof err === 'string') return err;
  const message = err.message || err.error_description || (err.error && err.error.message);
  const details = err.details || "";
  const code = err.code || "";
  if (message) {
    let fullMessage = message;
    if (details && details !== message) fullMessage += ` (${details})`;
    if (code) fullMessage += ` [${code}]`;
    return fullMessage;
  }
  return String(err);
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
      const wa = authUser.phone || authUser.user_metadata?.whatsapp || '';
      setWhatsapp(wa);
      setEmail(authUser.email || '');
    }
  }, [isOpen, authUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time) {
      toast({ variant: 'destructive', title: "Schedule Missing", description: "Date and time are required." });
      return;
    }

    setLoading(true);

    // DUAL-FLOW PAYLOAD
    // 1. Authenticated: include customer_id
    // 2. Anonymous: OMIT customer_id (triggers database trigger logic)
    const payload: any = {
      customer_name: name.trim(),
      customer_whatsapp: whatsapp.trim(),
      customer_email: email.trim() || null,
      wash_service_id: service.id, // UUID from wash_services
      business_id: service.business_id,
      seller_business_id: service.business_id,
      location: locationText.trim(),
      booking_date: date,
      requested_time: `${date}T${time}:00`,
      status: 'pending_assignment'
    };

    if (authUser?.id) {
      payload.customer_id = authUser.id;
    }

    console.log("Booking debug (Modal):", {
      serviceId: service.id,
      businessId: service.business_id,
      isAnonymous: !authUser?.id,
      payload
    });

    try {
      const { error } = await supabase
        .from('wash_bookings')
        .insert([payload]);

      if (error) throw error;

      toast({ title: "Booking Successful! ✅", description: "Your request has been received." });
      onClose();
      
      if (authUser) {
        router.push("/customer/bookings");
      } else {
        router.push("/login"); // Encourage login to track the new auto-created account
      }
    } catch (err: any) {
      console.error("[BOOKING-MODAL] Error:", err);
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
      <DialogContent className="sm:max-w-lg bg-slate-950 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-primary flex items-center gap-2 uppercase italic text-white">
            <Droplets className="h-6 w-6" />
            Reserve Service
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Booking for: <span className="text-white font-bold">{service.name}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input value={name} onChange={e => setName(e.target.value)} required className="pl-10 bg-white/5 border-white/10 h-12 rounded-xl text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">WhatsApp Number</Label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} required placeholder="26777123456" className="pl-10 bg-white/5 border-white/10 h-12 rounded-xl text-white" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Address (Optional)</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="pl-10 bg-white/5 border-white/10 h-12 rounded-xl text-white" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Date</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} required className="bg-white/5 border-white/10 h-12 rounded-xl text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Time</Label>
              <Input type="time" value={time} onChange={e => setTime(e.target.value)} required className="bg-white/5 border-white/10 h-12 rounded-xl text-white" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Service Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input value={locationText} onChange={e => setLocationText(e.target.value)} placeholder="Plot or Street Address" required className="pl-10 bg-white/5 border-white/10 h-12 rounded-xl text-white" />
            </div>
          </div>

          <Button type="submit" className="w-full h-14 text-lg font-black shadow-xl uppercase tracking-tighter rounded-2xl" disabled={loading}>
            {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <Sparkles className="mr-2 h-5 w-5" />}
            Confirm Reservation
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
