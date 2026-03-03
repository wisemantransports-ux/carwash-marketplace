
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
 * @fileOverview Frictionless Lead Modal
 * Strictly aligned with listings/leads database contract.
 * Derives seller and type data server-side (from listing record).
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
      // 1. FETCH LISTING FIRST (Backend Alignment Requirement)
      const { data: listing, error: fetchError } = await supabase
        .from('listings')
        .select('business_id, type')
        .eq('id', listingId)
        .single();

      if (fetchError || !listing) {
        throw new Error("Target listing is no longer available.");
      }

      // 2. Resolve Identity (Progressive User Creation)
      let { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('whatsapp_number', cleanWhatsapp)
        .maybeSingle();

      if (!user) {
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({ 
            whatsapp_number: cleanWhatsapp, 
            name: name.trim(),
            role: 'customer',
            is_verified: false 
          })
          .select()
          .single();
        
        if (createError) throw createError;
        user = newUser;
      }

      // 3. Create Lead Record (Deriving fields from listing record as per contract)
      const { error: leadError } = await supabase
        .from('leads')
        .insert({
          customer_name: name.trim(),
          customer_whatsapp: cleanWhatsapp,
          whatsapp_number: cleanWhatsapp, // Schema redundancy for indexing
          user_id: user?.id || null,
          listing_id: listingId,
          listing_type: listing.type, // Derived
          lead_type: listing.type,    // Derived
          seller_id: listing.business_id, // Derived
          seller_business_id: listing.business_id, // Derived
          status: 'new' // Explicit constant
        });

      if (leadError) throw leadError;

      // 4. Redirect to WhatsApp (Fetch seller phone from business table if needed)
      const { data: business } = await supabase
        .from('businesses')
        .select('whatsapp_number')
        .eq('id', listing.business_id)
        .single();

      const sellerPhone = business?.whatsapp_number || '26777491261';
      const message = `Hi! 👋 I'm interested in the *${listingTitle}* I saw on AutoLink Africa. My name is ${name}.`;
      const waUrl = `https://wa.me/${sellerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
      
      toast({ title: "Connecting to Seller", description: "Opening WhatsApp..." });
      window.open(waUrl, '_blank');
      onClose();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Connection Failed', description: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-black">
            <MessageCircle className="h-6 w-6 text-primary" />
            Connect via WhatsApp
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Enter your details to instantly message the seller. No login required.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Your First Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input 
                  id="name" 
                  placeholder="e.g. Kagiso" 
                  className="pl-10 h-12 bg-white/5 border-white/10 text-white rounded-xl"
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  required 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wa" className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">WhatsApp Number</Label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input 
                  id="wa" 
                  placeholder="26777123456" 
                  className="pl-10 h-12 bg-white/5 border-white/10 text-white rounded-xl"
                  value={whatsapp} 
                  onChange={e => setWhatsapp(e.target.value)} 
                  required 
                />
              </div>
              <p className="text-[10px] text-slate-500 italic flex items-center gap-1.5 px-1 pt-1">
                <ShieldCheck className="h-3 w-3 text-primary" /> Verified local partners for maximum trust.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" className="w-full h-14 text-lg font-black shadow-xl" disabled={loading}>
              {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <MessageCircle className="mr-2 h-5 w-5" />}
              Send WhatsApp Message
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
