
'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageCircle, Loader2, Smartphone, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: string;
  listingTitle: string;
}

export function LeadModal({ isOpen, onClose, listingId, listingTitle }: LeadModalProps) {
  const { user: authUser } = useAuth();
  const [name, setName] = useState(authUser?.user_metadata?.name || '');
  const [whatsapp, setWhatsapp] = useState(authUser?.phone || authUser?.user_metadata?.whatsapp || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !whatsapp) return;

    setLoading(true);
    try {
      // 1. Frictionless Identity Resolution
      let currentUserId = authUser?.id;

      if (!currentUserId) {
        const res = await fetch('/api/auth/frictionless', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ whatsapp, name })
        });

        const contentType = res.headers.get("content-type");
        if (!res.ok || !contentType || !contentType.includes("application/json")) {
          const errorBody = await res.text().catch(() => "Server error");
          console.error("Lead Auth Error:", errorBody);
          throw new Error("Authentication service unavailable. Please try again later.");
        }

        const authResult = await res.json();
        if (authResult.error) throw new Error(authResult.error);
        currentUserId = authResult.userId;
      }

      if (!currentUserId) throw new Error("Could not resolve identity.");

      // 2. Fetch Listing & Business Context
      const { data: listing, error: lErr } = await supabase
        .from('listings')
        .select('business_id, listing_type, business:business_id(whatsapp_number)')
        .eq('id', listingId)
        .single();

      if (lErr || !listing) throw new Error("This listing is no longer available.");

      const cleanWa = whatsapp.replace(/\D/g, '');

      // 3. Log Lead (Schema Alignment)
      const { error: leadErr } = await supabase.from('leads').insert({
        customer_id: currentUserId,
        seller_business_id: listing.business_id,
        listing_id: listingId,
        customer_name: name.trim(),
        customer_whatsapp: cleanWa,
        status: 'new'
      });
      
      if (leadErr) {
        console.error("Lead Insertion Error:", leadErr);
        throw leadErr;
      }

      // 4. WhatsApp Connect
      const bizPhone = (listing.business as any)?.whatsapp_number || '26777491261';
      const url = `https://wa.me/${bizPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi! 👋 I'm interested in *${listingTitle}* on AutoLink. My name is ${name}.`)}`;
      
      window.open(url, '_blank');
      toast({ title: "Inquiry Sent! ✅", description: "The seller has been notified. Redirecting to WhatsApp..." });
      onClose();
    } catch (err: any) {
      console.error("Lead Error:", err);
      const message = err?.message || "Data sync failure. Please try again.";
      toast({ 
        variant: 'destructive', 
        title: 'Inquiry Failed', 
        description: message 
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
            Instant connection via WhatsApp. No account required.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input placeholder="Enter your name" value={name} onChange={e => setName(e.target.value)} required className="pl-10 bg-white/5 border-white/10 h-12" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">WhatsApp Number</Label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input placeholder="26777123456" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} required className="pl-10 bg-white/5 border-white/10 h-12" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" className="w-full h-14 text-lg font-black shadow-xl uppercase tracking-tighter" disabled={loading}>
              {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <MessageCircle className="mr-2 h-5 w-5" />}
              Connect on WhatsApp
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
