'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageCircle, Loader2, Smartphone, User, Mail, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { normalizePhone } from "@/lib/utils";

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
  const hint = err.hint || "";
  if (message) {
    let full = message;
    if (details && details !== message) full += ` - ${details}`;
    if (code) full += ` [Code: ${code}]`;
    if (hint) full += ` (${hint})`;
    return full;
  }
  try { return JSON.stringify(err); } catch { return String(err); }
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
      toast({ variant: 'destructive', title: 'Details Required', description: 'Name and WhatsApp are mandatory.' });
      return;
    }

    setLoading(true);
    try {
      // 1. Validate and Normalize Phone
      const cleanWa = normalizePhone(whatsapp);

      const { data: listing, error: lErr } = await supabase
        .from('listings')
        .select(`
          id,
          business_id,
          listing_type,
          business:business_id(whatsapp_number, name)
        `)
        .eq('id', listingId)
        .single();

      if (lErr || !listing) throw new Error("Item information is currently unavailable.");

      let resolvedUserId = authUser?.id;
      
      if (!resolvedUserId) {
        const identRes = await fetch('/api/auth/frictionless', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ whatsapp: cleanWa, name: name.trim() })
        });
        const identData = await identRes.json();
        if (!identData.success || !identData.userId) {
          throw new Error(identData.error || "Could not verify your identity.");
        }
        resolvedUserId = identData.userId;
      }

      if (!resolvedUserId) throw new Error("Identity resolution failed. Please try again.");

      const typeMapping: Record<string, string> = { 'wash_service': 'wash', 'car': 'car', 'spare_part': 'spare_part' };
      const mappedType = typeMapping[listing.listing_type] || listing.listing_type;

      // Ensure seller_id and user_id are correctly populated for constraints
      const payload: any = {
        customer_name: name.trim(),
        customer_whatsapp: cleanWa,
        customer_email: email.trim() || null,
        seller_business_id: listing.business_id,
        seller_id: listing.business_id,
        listing_id: listing.id,
        listing_type: mappedType,
        lead_type: mappedType,
        status: 'new',
        customer_id: resolvedUserId,
        user_id: resolvedUserId
      };

      const { error: leadErr } = await supabase.from('leads').insert(payload);

      if (leadErr) throw leadErr;

      const bizPhone = (listing.business as any)?.whatsapp_number || '26777491261';
      const cleanBizPhone = bizPhone.replace(/\D/g, '');
      const waMessage = `Hi! 👋 I'm interested in *${listingTitle}* on AutoLink. My name is ${name.trim()}.`;
      const url = `https://wa.me/${cleanBizPhone}?text=${encodeURIComponent(waMessage)}`;

      toast({ title: "Inquiry Sent! ✅", description: "Opening dealer chat..." });
      window.open(url, '_blank');
      onClose();
    } catch (err: any) {
      console.error("[LEAD-CAPTURE] Fatal Error:", err);
      toast({ 
        variant: 'destructive', 
        title: 'Submission Failed', 
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
            Product Inquiry
          </DialogTitle>
          <DialogDescription className="text-slate-400 font-medium">
            Contacting <span className="text-white font-bold">{listingTitle}</span>. Your inquiry will be synced to your activity hub.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} required className="pl-10 h-14 bg-white/5 border-white/10 rounded-2xl text-white focus:border-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">WhatsApp Number</Label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input placeholder="+26777123456" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} required className="pl-10 h-14 bg-white/5 border-white/10 rounded-2xl text-white focus:border-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email (Optional)</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input type="email" placeholder="john@example.com" value={email} onChange={e => setEmail(e.target.value)} className="pl-10 h-14 bg-white/5 border-white/10 rounded-2xl text-white focus:border-primary" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" className="w-full h-16 text-lg font-black shadow-xl uppercase tracking-tighter rounded-2xl bg-primary hover:scale-[1.02] transition-all" disabled={loading}>
              {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <MessageCircle className="mr-2 h-5 w-5" />}
              Connect via WhatsApp
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}