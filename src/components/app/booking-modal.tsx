
'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Clock, Loader2, Sparkles, User, Smartphone } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { Service } from '@/lib/types';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  businessName: string;
  services: Service[];
}

export function BookingModal({ isOpen, onClose, businessId, businessName, services }: BookingModalProps) {
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !whatsapp || !serviceId || !date || !time) {
      toast({ variant: 'destructive', title: "Missing Details", description: "Please fill in all fields." });
      return;
    }

    setLoading(true);
    try {
      // 1. Resolve Identity
      const { data: user, error: userError } = await supabase
        .from('users')
        .upsert({ 
          whatsapp_number: whatsapp.trim(), 
          name: name.trim(),
          role: 'customer'
        }, { onConflict: 'whatsapp_number' })
        .select()
        .single();

      if (userError) throw userError;

      const selectedService = services.find(s => s.id === serviceId);

      // 2. Create Booking
      const { error: bookingError } = await supabase
        .from('wash_bookings')
        .insert({
          user_id: user.id,
          wash_business_id: businessId,
          service_type: selectedService?.name,
          booking_date: date,
          booking_time: time,
          status: 'pending_assignment',
          price: selectedService?.price || 0
        });

      if (bookingError) throw bookingError;

      toast({ 
        title: "Booking Requested! ✨", 
        description: "The business will assign a detailer and confirm via WhatsApp shortly." 
      });
      onClose();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Booking Failed', description: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-primary flex items-center gap-2">
            <Sparkles className="h-6 w-6" />
            Book a Wash
          </DialogTitle>
          <DialogDescription>
            at {businessName}. No account needed to request.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleBooking} className="space-y-6 py-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><User className="h-3.5 w-3.5" /> Full Name</Label>
              <Input placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Smartphone className="h-3.5 w-3.5" /> WhatsApp</Label>
              <Input placeholder="26777123456" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Select Service</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a package" />
              </SelectTrigger>
              <SelectContent>
                {services.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name} - P{s.price}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><CalendarIcon className="h-3.5 w-3.5" /> Date</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> Time</Label>
              <Input type="time" value={time} onChange={e => setTime(e.target.value)} required />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="submit" className="w-full h-14 text-lg font-black shadow-xl" disabled={loading}>
              {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : null}
              Confirm Booking Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
