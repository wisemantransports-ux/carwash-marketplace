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

/**
 * processBooking
 * Rule: If logged in, send customer_id. If public, send null.
 */
async function processBooking({
  customerName,
  whatsappNumber,
  customerEmail,
  service,
  scheduledAt,
  locationText
}: {
  customerName: string;
  whatsappNumber: string;
  customerEmail?: string;
  service: any;
  scheduledAt: Date;
  locationText: string;
}) {
  try {
    // 1. Get Logged In User (if any)
    const { data: { user: authUser } } = await supabase.auth.getUser();

    // 2. Create Booking
    // If authUser is null, the trigger on wash_bookings will create the customer record
    const { data: bookingData, error: bookingError } = await supabase
      .from('wash_bookings')
      .insert([{
        customer_id: authUser?.id || null, 
        business_id: service.business_id,
        seller_business_id: service.business_id,
        wash_service_id: service.id,
        customer_name: customerName,
        customer_whatsapp: whatsappNumber,
        customer_email: customerEmail || null,
        requested_time: scheduledAt.toISOString(),
        booking_date: scheduledAt.toISOString().split('T')[0],
        location: locationText,
        status: 'pending_assignment'
      }])
      .select()
      .single();

    if (bookingError) throw bookingError;

    return { booking: bookingData, error: null };

  } catch (err: any) {
    console.error("Booking Flow Error:", err);
    return {
      booking: null,
      error: err.message || 'Booking request failed'
    };
  }
}

export function BookingModal({ isOpen, onClose, service }: BookingModalProps) {
  const router = useRouter();
  const { user: initialAuthUser } = useAuth();
  
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [locationText, setLocationText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && initialAuthUser) {
      setName(initialAuthUser.user_metadata?.name || '');
      const wa = initialAuthUser.phone || initialAuthUser.user_metadata?.whatsapp || '';
      setWhatsapp(wa);
      setEmail(initialAuthUser.email || '');
    }
  }, [isOpen, initialAuthUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await processBooking({
      customerName: name,
      whatsappNumber: whatsapp,
      customerEmail: email,
      service: service,
      scheduledAt: new Date(`${date}T${time}`),
      locationText: locationText
    });

    if (result.error) {
      toast({
        variant: "destructive",
        title: "Booking Failed",
        description: result.error
      });
      setLoading(false);
    } else {
      toast({ title: "Booking Submitted Successfully!", description: "The partner has been notified." });
      onClose();
      // Redirect based on whether user is logged in
      if (initialAuthUser) {
        router.push("/dashboard/customer/bookings");
      } else {
        router.push(`/find-wash/${service.business_id}`);
      }
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
                <Input value={name} onChange={e => setName(e.target.value)} required className="pl-10 bg-white/5 border-white/10 h-12" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">WhatsApp Number</Label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} required className="pl-10 bg-white/5 border-white/10 h-12" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Email (Optional)</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="pl-10 bg-white/5 border-white/10 h-12" />
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
              <Input value={locationText} onChange={e => setLocationText(e.target.value)} required className="pl-10 bg-white/5 border-white/10 h-12" />
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
