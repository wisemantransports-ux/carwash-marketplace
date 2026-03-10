'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageCircle, Loader2, Smartphone, User, Mail, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: string;
  listingTitle: string;
}

/**
 * Utility to extract descriptive error messages from Supabase/PostgREST error objects.
 */
const extractErrorMessage = (err: any): string => {
  if (!err) return "An unexpected error occurred.";
  if (typeof err === 'string') return err;
  
  const message = err.message || err.error_description || (err.error && err.error.message);
  const details = err.details || "";
  const code = err.code || "";
  const hint = err.hint || "";
  
  if (message) {
    let fullMessage = message;
    if (details && details !== message) fullMessage += ` - ${details}`;
    if (hint) fullMessage += ` (Hint: ${hint})`;
    if (code) fullMessage += ` [Code: ${code}]`;
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
  const router = useRouter();
  const { user: authUser } = useAuth();

  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  // Pre-fill form if user is authenticated
  useEffect(() => {
    if (isOpen && authUser) {
      setName(authUser.user_metadata?.name || '');
      const wa = authUser.phone || authUser.user_metadata?.whatsapp || '';
      setWhatsapp(wa);
      setEmail(authUser.email || '');
    }
  }, [isOpen, authUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !whatsapp.trim()) {
      toast({
        variant: 'destructive',
        title: 'Input Required',
        description: 'Name and WhatsApp number are mandatory for dealer inquiries.'
      });
      return;
    }

    setLoading(true);

    try {
      // 1. Fetch listing details and business owner info
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

      if (lErr || !listing) {
        throw new Error("Unable to retrieve listing metadata. The item may have been removed.");
      }

      const cleanWa = whatsapp.replace(/\D/g, '');
      
      // Map frontend listing types to database enum values
      const typeMapping: Record<string, string> = { 
        'wash_service': 'wash', 
        'car': 'car', 
        'spare_part': 'spare_part' 
      };
      
      const mappedType = typeMapping[listing.listing_type] || listing.listing_type;

      // 2. Construct Payload
      // Note: seller_id must be a valid business ID to satisfy fk_leads_seller if it targets businesses table
      const payload: any = {
        customer_name: name.trim(),
        customer_whatsapp: cleanWa,
        customer_email: email.trim() || null,
        seller_business_id: listing.business_id,
        seller_id: listing.business_id, 
        listing_id: listing.id,
        listing_type: mappedType,
        lead_type: mappedType,
        status: 'new'
      };

      // 3. Handle Identity (Auth vs Anonymous)
      // If anonymous, customer_id and user_id remain NULL to trigger backend resolution
      if (authUser?.id) {
        payload.customer_id = authUser.id;
        payload.user_id = authUser.id;
      }

      console.log("[LEAD-CAPTURE] Dispatched Payload:", payload);

      // 4. Record Lead in Database
      const { error: leadErr } = await supabase
        .from('leads')
        .insert(payload);

      if (leadErr) {
        console.error("[LEAD-CAPTURE] Database Rejection:", leadErr);
        throw leadErr;
      }

      // 5. WhatsApp Redirection Logic
      const bizPhone = (listing.business as any)?.whatsapp_number;
      if (!bizPhone) {
        toast({ 
          variant: 'destructive', 
          title: 'Routing Error', 
          description: 'This dealer has not configured a WhatsApp number.' 
        });
        onClose();
        return;
      }

      const cleanBizPhone = bizPhone.replace(/\D/g, '');
      const message = `Hi! 👋 I'm interested in *${listingTitle}* on AutoLink. My name is ${name}.`;
      const url = `https://wa.me/${cleanBizPhone}?text=${encodeURIComponent(message)}`;

      toast({
        title: "Inquiry Successful! ✅",
        description: "Connecting you with the dealer on WhatsApp..."
      });

      window.open(url, '_blank');
      onClose();

    } catch (err: any) {
      console.error("[LEAD-CAPTURE] Process Error:", err);
      toast({
        variant: 'destructive',
        title: 'Lead Capture Failed',
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
            Direct Inquiry
          </DialogTitle>
          <DialogDescription className="text-slate-400 font-medium">
            Contacting <span className="text-white font-bold">{listingTitle}</span>.
            We'll automatically save this to your activity hub.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                Preferred Name
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  disabled={loading}
                  className="pl-10 h-14 bg-white/5 border-white/10 rounded-2xl text-white focus:ring-primary focus:border-primary"
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
                  placeholder="267 77 123 456"
                  value={whatsapp}
                  onChange={e => setWhatsapp(e.target.value)}
                  required
                  disabled={loading}
                  className="pl-10 h-14 bg-white/5 border-white/10 rounded-2xl text-white focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                Email (Optional)
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  type="email"
                  placeholder="john@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={loading}
                  className="pl-10 h-14 bg-white/5 border-white/10 rounded-2xl text-white focus:ring-primary focus:border-primary"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="submit"
              className="w-full h-16 text-lg font-black shadow-xl uppercase tracking-tighter rounded-2xl group transition-all"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="animate-spin mr-2 h-5 w-5" />
              ) : (
                <MessageCircle className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
              )}
              Connect with Dealer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
