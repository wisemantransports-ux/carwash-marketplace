
'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Clock, Loader2, Sparkles, User, Smartphone, Droplets, MapPin, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
  const [bizStatus, setBizStatus] = useState<{ active: boolean; reason?: string }>({ active: true });

  // 1. Check Business Status on Open
  useEffect(() => {
    if (isOpen && businessId) {
      const checkBiz = async () => {
        const { data: biz } = await supabase
          .from('businesses_view')
          .select('access_active, verification_status')
          .eq('id', businessId)
          .maybeSingle();
        
        if (biz) {
          if (!biz.access_active) {
            setBizStatus({ active: false, reason: "This partner's professional features are currently paused." });
          } else if (biz.verification_status !== 'verified') {
            setBizStatus({ active: false, reason: "This business is currently under verification review." });
          } else {
            setBizStatus({ active: true });
          }
        }
      };
      checkBiz();
    }
  }, [isOpen, businessId]);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanWa = whatsapp.trim().replace(/\D/g, '');
    
    if (!name || !cleanWa || !listingId || !date || !time) {
      toast({ variant: 'destructive', title: 'Missing Info', description: 'Please fill in all mandatory fields.' });
      return;
    }

    setLoading(true);
    try {
      // 2. Progressive Identity: Check/Create User
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, role')
        .eq('whatsapp_number', cleanWa)
        .maybeSingle();
      
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

      // 3. One Booking Enforcement
      const { count: activeBookings } = await supabase
        .from('wash_bookings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .in('status', ['pending_assignment', 'assigned', 'confirmed']);

      if (activeBookings && activeBookings > 0) {
        throw new Error("You already have an active car wash request. Please complete or cancel it first.");
      }

      // 4. Atomic Lead & Booking Creation
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
        description: "Request sent to " + businessName + ". You can track it in your dashboard." 
      });
      onClose();
    } catch (err: any) {
      toast({ 
        variant: 'destructive', 
        title: 'Booking Failed', 
        description: err.message || "Unable to process booking. Check your connection." 
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
            Secure your elite detailing slot at {businessName}.
          </DialogDescription>
        </DialogHeader>

        {!bizStatus.active ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="bg-orange-500/10 p-4 rounded-full">
              <AlertCircle className="h-10 w-10 text-orange-500" />
            </div>
            <div className="space-y-2 max-w-xs">
              <p className="font-bold text-lg">Partner Restricted</p>
              <p className="text-xs text-slate-400 leading-relaxed">{bizStatus.reason}</p>
            </div>
            <Button variant="outline" className="border-white/10" onClick={onClose}>Close</Button>
          </div>
        ) : (
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
                Confirm Booking
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
