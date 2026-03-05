'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  service: any; // Receives the FULL wash service object
}

async function submitBooking({
  customerName,
  whatsappNumber,
  customerEmail,
  service,
  selectedDate,
  locationText
}: {
  customerName: string;
  whatsappNumber: string;
  customerEmail?: string;
  service: any;
  selectedDate: Date;
  locationText: string;
}) {
  console.group("🚀 Booking Debug Start");

  if (!service?.id || !service?.business_id) {
    throw new Error("Service missing id or business_id");
  }

  if (!customerName || !whatsappNumber) {
    throw new Error("Customer name or WhatsApp missing");
  }

  // 1️⃣ Get logged-in user (important for RLS)
  let { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
    if (anonError) throw anonError;
    authUser = anonData.user;
  }

  // 2️⃣ Auto-create or fetch customer
  const { data: existingCustomer } = await supabase
    .from("users")
    .select("id")
    .eq("whatsapp_number", whatsappNumber)
    .maybeSingle();

  let customerId = existingCustomer?.id;

  if (!customerId) {
    const { data: newCustomer, error: createError } = await supabase
      .from("users")
      .insert([
        {
          name: customerName,
          full_name: customerName,
          role: "customer",
          whatsapp_number: whatsappNumber,
          is_anonymous: true,
          is_sso_user: false
        }
      ])
      .select("id")
      .single();

    if (createError) {
      console.error("Customer creation failed:", createError);
      throw createError;
    }

    customerId = newCustomer.id;
  }

  // 3️⃣ Prepare booking payload
  const bookingPayload = {
    customer_id: customerId,
    seller_business_id: service.business_id,
    business_id: service.business_id, // important since column exists
    wash_service_id: service.id,
    employee_id: null,
    assigned_employee_id: null,
    status: "pending_assignment",
    booking_date: new Date(selectedDate).toISOString(),
    requested_time: new Date(selectedDate).toISOString(),
    location: locationText,
    customer_name: customerName,
    customer_whatsapp: whatsappNumber,
    customer_email: customerEmail || null
  };

  console.log("📦 Booking Payload:", bookingPayload);

  // 4️⃣ Insert booking
  const { data, error } = await supabase
    .from("wash_bookings")
    .insert([bookingPayload])
    .select();

  if (error) {
    console.error("❌ Supabase Insert Error:", error);
    throw error;
  }

  console.log("✅ Booking Success:", data);
  console.groupEnd();

  return data;
}

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
    setLoading(true);

    try {
      if (!date || !time) {
        throw new Error("Please select both a date and time.");
      }

      await submitBooking({
        customerName: name,
        whatsappNumber: whatsapp,
        customerEmail: email,
        service: service,
        selectedDate: new Date(`${date}T${time}`),
        locationText: locationText
      });

      toast({
        title: "Booking Confirmed",
        description: "Your carwash booking has been submitted."
      });

      onClose();
      router.push("/customer/bookings");

    } catch (err: any) {
      console.group("❌ Booking Process Failure");
      console.error("Raw Error:", err);
      console.error("Message:", err?.message);
      console.error("Details:", err?.details);
      console.groupEnd();

      toast({
        variant: "destructive",
        title: "Booking Failed",
        description: err?.message || "Unexpected error occurred"
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
