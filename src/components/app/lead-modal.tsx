'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageCircle, Loader2, Smartphone, User, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: string;
  listingTitle: string;
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

  try {
    const stringified = JSON.stringify(err);
    return stringified === '{}' ? String(err) : stringified;
  } catch {
    return String(err);
  }
};

export function LeadModal({ isOpen, onClose, listingId, listingTitle }: LeadModalProps) {

  const { user: authUser } = useAuth();

  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
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

    if (!name.trim() || !whatsapp.trim()) {
      toast({
        variant: 'destructive',
        title: 'Details Required',
        description: 'Name and WhatsApp are mandatory.'
      });
      return;
    }

    setLoading(true);

    try {

      // 1️⃣ Fetch listing data with seller (owner) details
      const { data: listing, error: lErr } = await supabase
        .from('listings')
        .select('business_id, listing_type, business:business_id(owner_id, whatsapp_number, name)')
        .eq('id', listingId)
        .single();

      if (lErr || !listing) throw new Error("Listing data could not be retrieved.");

      const cleanWa = whatsapp.replace(/\D/g, '');

      // 2️⃣ Map types
      const typeMapping: Record<string, string> = {
        wash_service: 'wash',
        car: 'car',
        spare_part: 'spare_part'
      };

      const mappedType = typeMapping[listing.listing_type] || listing.listing_type;

      // 3️⃣ Prepare payload including seller_id to satisfy DB constraint
      const payload: any = {
        customer_name: name.trim(),
        customer_whatsapp: cleanWa,
        customer_email: email.trim() || null,
        seller_business_id: listing.business_id,
        seller_id: (listing.business as any).owner_id,
        listing_id: listingId,
        listing_type: mappedType,
        lead_type: mappedType,
        status: 'new'
      };

      if (authUser?.id) {
        payload.customer_id = authUser.id;
      }

      console.log("[LEAD-DEBUG] Submitting inquiry:", payload);

      // 4️⃣ Insert lead
      const { error: leadErr } = await supabase
        .from('leads')
        .insert(payload);

      if (leadErr) {
        console.error("[LEAD-MODAL] Database Insert Error:", leadErr);
        throw leadErr;
      }

      // 5️⃣ WhatsApp redirect
      const bizPhone = (listing.business as any)?.whatsapp_number || '26777491261';
      const cleanBizPhone = bizPhone.replace(/\D/g, '');

      const message = `Hi! 👋 I'm interested in *${listingTitle}* on AutoLink. My name is ${name}.`;

      const url = `https://wa.me/${cleanBizPhone}?text=${encodeURIComponent(message)}`;

      toast({
        title: "Inquiry Logged! ✅",
        description: "Opening WhatsApp to connect with the dealer..."
      });

      window.open(url, '_blank');

      onClose();

    } catch (err: any) {

      console.error("[LEAD-MODAL] Error Details:", {
        message: err.message,
        details: err.details,
        code: err.code,
        hint: err.hint,
        error: err
      });

      toast({
        variant: 'destructive',
        title: 'Inquiry Failed',
        description: extractErrorMessage(err)
      });

    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-white/10 text-white rounded-[2rem] overflow-hidden">

        <DialogHeader className="space-y-3">

          <DialogTitle className="flex items-center gap-2 text-2xl font-black uppercase tracking-tight italic">
            <MessageCircle className="h-6 w-6 text-primary" />
            Dealer Inquiry
          </DialogTitle>

          <DialogDescription className="text-slate-400 font-medium">
            Contacting <span className="text-white font-bold">{listingTitle}</span>.
            Your inquiry will be saved to your personal dashboard.
          </DialogDescription>

        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">

          <div className="space-y-4">

            <div className="space-y-2">

              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                Your Full Name
              </Label>

              <div className="relative">

                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />

                <Input
                  placeholder="John Doe"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  className="pl-10 h-14 bg-white/5 border-white/10 rounded-2xl text-white"
                />

              </div>

            </div>

            <div className="space-y-2">

              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                WhatsApp Number
              </Label>

              <div className="relative">

                <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />

                <Input
                  placeholder="26777123456"
                  value={whatsapp}
                  onChange={e => setWhatsapp(e.target.value)}
                  required
                  className="pl-10 h-14 bg-white/5 border-white/10 rounded-2xl text-white"
                />

              </div>

            </div>

            <div className="space-y-2">

              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                Email Address (Optional)
              </Label>

              <div className="relative">

                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />

                <Input
                  type="email"
                  placeholder="john@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="pl-10 h-14 bg-white/5 border-white/10 rounded-2xl text-white"
                />

              </div>

            </div>

          </div>

          <DialogFooter>

            <Button
              type="submit"
              className="w-full h-16 text-lg font-black shadow-xl uppercase tracking-tighter rounded-2xl group"
              disabled={loading}
            >

              {loading
                ? <Loader2 className="animate-spin mr-2 h-5 w-5" />
                : <MessageCircle className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
              }

              Connect on WhatsApp

            </Button>

          </DialogFooter>

        </form>

      </DialogContent>
    </Dialog>
  );
}
