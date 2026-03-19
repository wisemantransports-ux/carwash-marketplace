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
  const [businessEmail, setBusinessEmail] = useState(process.env.NEXT_PUBLIC_BOOKING_BUSINESS_EMAIL || 'mula@demo.com');
  const [sellerBusinessId, setSellerBusinessId] = useState<string>('');
  const [services, setServices] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
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

  useEffect(() => {
    const resolveBusiness = async () => {
      if (!businessEmail) return;
      const businessRes = await supabase
        .from('businesses')
        .select('id')
        .eq('email', businessEmail.trim())
        .single();

      if (businessRes.error) {
        console.error('[BUSINESS RESOLVE ERROR]', businessRes.error);
        setSellerBusinessId('');
        setServices([]);
        setSelectedServiceId('');
        return;
      }

      if (!businessRes.data || !businessRes.data.id) {
        console.warn('[BUSINESS RESOLVE NOT FOUND]', businessEmail);
        setSellerBusinessId('');
        setServices([]);
        setSelectedServiceId('');
        return;
      }

      setSellerBusinessId(businessRes.data.id);
    };

    resolveBusiness();
  }, [businessEmail]);

  useEffect(() => {
    if (!sellerBusinessId) return;

    const loadServices = async () => {
      const { data, error } = await supabase
        .from('services')
        .select('id, name')
        .eq('business_id', sellerBusinessId);

      console.log('SERVICES LOADED', data);

      if (!error && data) {
        setServices(data as Array<{ id: string; name: string }>);
      } else {
        setServices([]);
      }

      if (data && !data.find((s: any) => s.id === selectedServiceId)) {
        setSelectedServiceId('');
      }
    };

    loadServices();
  }, [sellerBusinessId, selectedServiceId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!whatsapp || !name || !date || !time || !selectedServiceId || !businessEmail) {
      toast({ variant: 'destructive', title: 'Please complete all fields and select a service/business.' });
      return;
    }

    setLoading(true);
    try {
      const cleanWa = normalizePhone(whatsapp);
      const businessEmailResolved = businessEmail.trim() || process.env.NEXT_PUBLIC_BOOKING_BUSINESS_EMAIL || 'mula@demo.com';

      const frictionlessRes = await fetch('/api/auth/frictionless', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsapp: cleanWa, name: name.trim() }),
      });

      const frictionlessData = await frictionlessRes.json();
      const customer_id = authUser?.id || frictionlessData?.user?.id || frictionlessData?.userId;
      if (!frictionlessData?.success || !customer_id) {
        console.error('[FRICTIONLESS FAILURE]', frictionlessData);
        throw new Error('Failed to resolve or create customer account.');
      }

      console.log('BOOKING DEBUG', {
        sellerBusinessId,
        services,
        selectedServiceId,
      });

      if (!selectedServiceId) {
        throw new Error('Please select a service');
      }

      const businessRes = await supabase
        .from('businesses')
        .select('id')
        .eq('email', businessEmailResolved)
        .single();

      if (businessRes.error || !businessRes.data?.id) {
        console.error('[BUSINESS RESOLVE ERROR]', businessRes);
        throw new Error('Could not resolve business from email.');
      }

      const seller_business_id = businessRes.data.id;

      let serviceValidation = null;
      const serviceTables = ['wash_services', 'services', 'listings'];

      for (const table of serviceTables) {
        const { data, error } = await supabase
          .from(table)
          .select('id,business_id')
          .eq('id', selectedServiceId)
          .maybeSingle();

        if (!error && data) {
          serviceValidation = data;
          break;
        }
      }

      console.log('SERVICE VALIDATION', serviceValidation);

      if (!serviceValidation) {
        throw new Error('Selected service does not exist.');
      }

      if (serviceValidation.business_id !== seller_business_id) {
        throw new Error('Service does not belong to selected business.');
      }

      const scheduled_at = new Date(`${date} ${time}`);
      if (Number.isNaN(scheduled_at.getTime())) {
        throw new Error('Invalid date/time for booking.');
      }

      console.log('BOOKING DEBUG', {
        selectedServiceId,
        seller_business_id,
        scheduled_at: scheduled_at.toISOString(),
      });

      const bookingPayload = {
        customer_id,
        seller_business_id,
        service_id: selectedServiceId,
        scheduled_at: scheduled_at.toISOString(),
        status: 'pending_assignment',
      };

      const bookingRes2 = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingPayload),
      });

      const bookingData = await bookingRes2.json();
      if (!bookingData.success) {
        throw new Error(bookingData.error || 'Booking creation failed.');
      }

      toast({ title: 'Booking Requested! ✅', description: 'Tracking now available in your dashboard.' });
      onClose();
      router.push('/customer/dashboard');
    } catch (err: any) {
      console.error('[BOOKING-CAPTURE] Error:', err);
      toast({
        variant: 'destructive',
        title: 'Booking Failed',
        description: extractErrorMessage(err),
      });
    } finally {
      setLoading(false);
    }
  };

  if (!service && services.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-slate-950 border-white/10 text-white rounded-[2.5rem] overflow-hidden">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-2xl font-black text-primary flex items-center gap-2 uppercase italic">
            <Droplets className="h-6 w-6" />
            Reserve Your Wash
          </DialogTitle>
          <DialogDescription className="text-slate-400 font-medium">
            Booking <span className="text-white font-bold">{services.find((s) => s.id === selectedServiceId)?.name || 'selected service'}</span>. Your activity tracker will be linked to your WhatsApp number.
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
                <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} required placeholder="+26777123456" className="pl-10 h-12 bg-white/5 border-white/10 rounded-xl text-white" />
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Business E-mail</Label>
              <Input value={businessEmail} onChange={e => setBusinessEmail(e.target.value)} required className="h-12 bg-white/5 border-white/10 rounded-xl text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Service</Label>
              <select
                value={selectedServiceId || ''}
                onChange={(e) => {
                  console.log('SERVICE SELECTED', e.target.value);
                  setSelectedServiceId(e.target.value);
                }}
                className="h-12 w-full bg-white/5 border-white/10 rounded-xl text-white px-3"
              >
                <option value="">Select a service</option>
                {services.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
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