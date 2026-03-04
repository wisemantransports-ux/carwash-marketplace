
'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageCircle, Loader2, Smartphone, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: string;
  listingTitle: string;
}

export function LeadModal({ isOpen, onClose, listingId, listingTitle }: LeadModalProps) {
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanWa = whatsapp.trim().replace(/\D/g, '');
    if (!name || !cleanWa) return;

    setLoading(true);
    try {
      // 1. Fetch Listing & Business
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .select('business_id, listing_type')
        .eq('id', listingId)
        .single();

      if (listingError) throw listingError;
      if (!listing) throw new Error("Listing unavailable or removed.");

      // 2. Progressive Identity: Create/Get User
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

      // 3. Log Lead
      const { error: leadError } = await supabase.from('leads').insert({
        seller_id: listing.business_id,
        user_id: user?.id,
        listing_id: listingId,
        lead_type: listing.listing_type,
        customer_name: name.trim(),
        customer_whatsapp: cleanWa,
        status: 'new'
      });

      if (leadError) throw leadError;

      // 4. WhatsApp Connect
      const { data: biz, error: bizError } = await supabase
        .from('businesses')
        .select('whatsapp_number')
        .eq('id', listing.business_id)
        .single();
      
      if (bizError) throw bizError;

      const phone = biz?.whatsapp_number || '26777491261';
      const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi! 👋 I'm interested in the *${listingTitle}* listing on AutoLink. My name is ${name}.`)}`;
      
      window.open(url, '_blank');
      toast({ title: "Inquiry Sent! ✅", description: "The seller has been notified." });
      onClose();
    } catch (err: any) {
      console.error("Lead Error Detail:", err);
      
      let errorMessage = "Communication error. Please try again or sign in.";
      if (typeof err === 'string') {
        errorMessage = err;
      } else if (err?.message) {
        errorMessage = err.message;
      } else if (err?.error_description) {
        errorMessage = err.error_description;
      } else if (err?.details) {
        errorMessage = err.details;
      }

      toast({ 
        variant: 'destructive', 
        title: 'Inquiry Failed', 
        description: errorMessage 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-black uppercase tracking-tight">
            <MessageCircle className="h-6 w-6 text-primary" />
            Direct Inquiry
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Connect instantly with the verified seller via secure WhatsApp chat.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input placeholder="Kagiso M." value={name} onChange={e => setName(e.target.value)} required className="pl-10 bg-white/5 border-white/10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">WhatsApp Number</Label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input placeholder="26777123456" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} required className="pl-10 bg-white/5 border-white/10" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" className="w-full h-14 text-lg font-black shadow-xl" disabled={loading}>
              {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <MessageCircle className="mr-2 h-5 w-5" />}
              Open WhatsApp Chat
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
