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
 * Handle bookings for users who may be anonymous or returning.
 * Ensures a 'customers' record exists and links the booking to it.
 */
async function processBooking({
  customerName,
  whatsappNumber,
  serviceId,
  scheduledAt
}: {
  customerName: string;
  whatsappNumber: string;
  serviceId: string;
  scheduledAt: Date;
}) {
  try {
    // 1. Ensure Auth Session
    let { data: { user: authUser } } = await supabase.auth.getUser();
    
    if (!authUser) {
      const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
      if (anonError) throw { step: 'auth', message: anonError.message, details: anonError };
      authUser = anonData.user;
    }

    if (!authUser) throw { step: 'auth', message: 'Failed to establish auth session', details: null };

    // 2. Check/Create Customer Record
    let customerData = null;
    const { data: existingCustomer, error: fetchError } = await supabase
      .from('customers')
      .select('*')
      .eq('auth_id', authUser.id)
      .maybeSingle();

    if (fetchError) throw { step: 'customer_lookup', message: fetchError.message, details: fetchError };

    if (!existingCustomer) {
      const { data: newCustomer, error: createError } = await supabase
        .from('customers')
        .insert([{
          auth_id: authUser.id,
          whatsapp_number: whatsappNumber,
          full_name: customerName,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (createError) throw { step: 'customer_creation', message: createError.message, details: createError };
      customerData = newCustomer;
    } else {
      customerData = existingCustomer;
    }

    // 3. Create Booking linked to customer_id
    const { data: bookingData, error: bookingError } = await supabase
      .from('bookings')
      .insert([{
        customer_id: customerData.id,
        service_id: serviceId,
        scheduled_at: scheduledAt.toISOString(),
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (bookingError) throw { step: 'booking_insert', message: bookingError.message, details: bookingError };

    // 4. Return Success JSON
    return {
      customer: customerData,
      booking: bookingData,
      error: null
    };

  } catch (err: any) {
    console.error("Booking Logic Error:", err);
    return {
      customer: null,
      booking: null,
      error: {
        step: err.step || 'unknown',
        message: err.message || 'An unexpected database error occurred',
        details: err.details || err
      }
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
      serviceId: service.id,
      scheduledAt: new Date(`${date}T${time}`)
    });

    if (result.error) {
      toast({
        variant: "destructive",
        title: `Booking Failed (${result.error.step})`,
        description: result.error.message
      });
      setLoading(false);
    } else {
      toast({
        title: "Booking Confirmed",
        description: "Your carwash booking has been submitted."
      });
      onClose();
      router.push("/customer/bookings");
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
