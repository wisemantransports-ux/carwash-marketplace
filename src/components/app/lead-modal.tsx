
'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageCircle, Loader2, ShieldCheck, Smartphone, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: string;
  listingTitle: string;
}

/**
 * @fileOverview Progressive Lead Capture
 * Automatically creates customer profile on first inquiry.
 */

export function LeadModal({ isOpen, onClose, listingId, listingTitle }: LeadModalProps) {
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanWhatsapp = whatsapp.trim().replace(/\D/g, '');
    if (!name || !cleanWhatsapp) return;

    setLoading(true);
    try {
      // 1. Fetch Listing & Seller
      const { data: listing } = await supabase
        .from('listings')
        .select('business_id, type')
        .eq('id', listingId)
        .single();

      if (!listing) throw new Error("Listing not found.");

      // 2. Progressive Identity (Check/Create User)
      let { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('whatsapp_number', cleanWhatsapp)
        .maybeSingle();

      if (!user) {
        const { data: newUser } = await supabase
          .from('users')
          .insert({ 
            whatsapp_number: cleanWhatsapp, 
            name: name.trim(),
            role: 'customer'
          })
          .select()
          .single();
        user = newUser;
      }

      // 3. Create Lead
      const { error: leadError } = await supabase
        .from('leads')
        .insert({
          customer_name: name.trim(),
          customer_whatsapp: cleanWhatsapp,
          whatsapp_number: cleanWhatsapp,
          user_id: user?.id || null,
          listing_id: listingId,
          listing_type: listing.type,
          seller_id: listing.business_id,
          status: 'new'
        });

      if (leadError) throw leadError;

      // 4. Connect via WhatsApp
      const { data: biz } = await supabase.from('businesses').select('whatsapp_number').eq('id', listing.business_id).single();
      const sellerPhone = biz?.whatsapp_number || '26777491261';
      const waUrl = `https://wa.me/${sellerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi! 👋 I'm interested in the *${listingTitle}* on AutoLink. My name is ${name}.`)}`;
      
      toast({ title: "Inquiry Logged" });
      window.open(waUrl, '_blank');
      onClose();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Action Failed', description: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-black uppercase italic tracking-tight">
            <MessageCircle className="h-6 w-6 text-primary" />
            Direct Inquiry
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Connect instantly with the verified seller via WhatsApp.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Your Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input placeholder="Kagiso" className="pl-10 h-12 bg-white/5 border-white/10 text-white" value={name} onChange={e => setName(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">WhatsApp No.</Label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input placeholder="26777123456" className="pl-10 h-12 bg-white/5 border-white/10 text-white" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} required />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" className="w-full h-14 text-lg font-black shadow-xl" disabled={loading}>
              {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <MessageCircle className="mr-2 h-5 w-5" />}
              Open Secure WhatsApp Chat
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
