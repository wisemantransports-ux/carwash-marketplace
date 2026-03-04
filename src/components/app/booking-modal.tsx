'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, User, Smartphone, Droplets, MapPin, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: any; // Receives the FULL wash service object
}

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
      setWhatsapp(authUser.phone || authUser.user_metadata?.whatsapp || '');
    }
  }, [isOpen, authUser]);

  /**
   * Auto-creates a customer in the public.users table if they don't exist.
   */
  async function getOrCreateCustomer(customerName: string, whatsappNumber: string) {
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('whatsapp_number', whatsappNumber)
      .maybeSingle();

    if (existing) return existing.id;

    const { data: newCustomer, error } = await supabase
      .from('users')
      .insert([{ name: customerName, whatsapp_number: whatsappNumber, role: 'customer' }])
      .select('id')
      .single();

    if (error) throw error;

    return newCustomer.id;
  }

  /**
   * Main submission logic aligned with specific TASK requirements.
   */
  async function submitBooking({
    customerName,
    whatsappNumber,
    serviceData,
    selectedDate,
    locationText
  }: any) {
    // 1. Defensive Guards
    if (!serviceData?.id || !serviceData?.business_id) {
      throw new Error("Service missing required IDs.");
    }

    if (!customerName || !whatsappNumber) {
      throw new Error("Customer details missing.");
    }

    // 2. Resolve Customer Identity
    const customerId = await getOrCreateCustomer(customerName, whatsappNumber);

    if (!customerId) {
      throw new Error("Customer resolution failed.");
    }

    // 3. Prepare Payload (Strict Schema Alignment)
    const bookingPayload = {
      customer_id: customerId,
      seller_business_id: serviceData.business_id, // Derived from service
      wash_service_id: serviceData.id,
      employee_id: null,
      status: "pending_assignment",
      booking_date: new Date(selectedDate).toISOString(),
      location: locationText
    };

    // 4. Insert ONLY into wash_bookings (No leads insert)
    const { data, error } = await supabase
      .from("wash_bookings")
      .insert([bookingPayload])
      .select();

    if (error) {
      console.error("Wash Booking Insert Error:", error);
      throw error;
    }

    return data;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !whatsapp || !date || !time) {
      toast({ variant: 'destructive', title: 'Missing Info', description: 'Please fill in mandatory fields.' });
      return;
    }

    setLoading(true);
    try {
      const selectedDateTime = `${date}T${time}`;
      
      await submitBooking({
        customerName: name.trim(),
        whatsappNumber: whatsapp.replace(/\D/g, ''),
        serviceData: service,
        selectedDate: selectedDateTime,
        locationText: locationText.trim()
      });

      toast({ title: "Booking Confirmed! ✨", description: "Your wash request has been sent." });
      onClose();
      router.push('/customer/bookings');
    } catch (err: any) {
      console.error("Booking Logic Error:", err);
      toast({ 
        variant: 'destructive', 
        title: 'Booking Failed', 
        description: err.message || "An unexpected error occurred." 
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
            Book Your Wash
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Booking for: <span className="text-white font-bold">{service.name}</span>
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
              <Input placeholder="Address or Area Pin" value={locationText} onChange={e => setLocationText(e.target.value)} className="pl-10 bg-white/5 border-white/10 h-12" />
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
