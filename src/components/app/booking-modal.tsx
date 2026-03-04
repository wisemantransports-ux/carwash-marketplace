
'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Clock, Loader2, Sparkles, User, Smartphone, Droplets, MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  businessName: string;
  services: any[];
}

export function BookingModal({ isOpen, onClose, businessId, businessName, services }: BookingModalProps) {
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [listingId, setListingId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [locationPin, setLocationPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanWa = whatsapp.trim().replace(/\D/g, '');
    if (!name || !cleanWa || !listingId || !date || !time) {
      toast({ variant: 'destructive', title: 'Missing Info', description: 'Please fill in all mandatory fields.' });
      return;
    }

    setLoading(true);
    try {
      // 1. Progressive Identity: Check or Create User
      const { data: existingUser, error: findError } = await supabase
        .from('users')
        .select('id')
        .eq('whatsapp_number', cleanWa)
        .maybeSingle();
      
      if (findError) throw findError;

      let user = existingUser;
      
      if (!user) {
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({ 
            whatsapp_number: cleanWa, 
            name: name.trim(), 
            role: 'customer' 
          })
          .select()
          .single();
        
        if (createError) throw createError;
        user = newUser;
      }

      // 2. Log Lead for overall tracking
      const { error: leadError } = await supabase.from('leads').insert({
        seller_id: businessId,
        user_id: user?.id,
        listing_id: listingId,
        lead_type: 'wash_service',
        customer_name: name.trim(),
        customer_whatsapp: cleanWa,
        status: 'new'
      });

      if (leadError) throw leadError;

      // 3. Create Operational Booking
      const { error: bookingError } = await supabase.from('wash_bookings').insert({
        user_id: user?.id,
        whatsapp_number: cleanWa,
        wash_business_id: businessId,
        service_type: listingId,
        booking_date: date,
        booking_time: time,
        location_pin: locationPin.trim() || null,
        status: 'pending_assignment'
      });

      if (bookingError) throw bookingError;

      toast({ 
        title: "Booking Requested! ✨", 
        description: "Request sent to " + businessName + ". They will confirm assignment shortly." 
      });
      onClose();
    } catch (err: any) {
      console.error("Booking Error Detail:", err);
      const errorMessage = err?.message || err?.error_description || "Service unavailable. Check your internet or login status.";
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
            Book Car Wash
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Secure your slot at {businessName}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleBooking} className="space-y-6 py-4">
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
              {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <Sparkles className="mr-2 h-5 w-5" />}
              Request Booking
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
