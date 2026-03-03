
'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageCircle, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: string;
  listingType: 'car' | 'spare_part';
  listingTitle: string;
  sellerId: string;
  sellerWhatsapp?: string;
}

export function LeadModal({ isOpen, onClose, listingId, listingType, listingTitle, sellerId, sellerWhatsapp }: LeadModalProps) {
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !whatsapp) return;

    setLoading(true);
    try {
      // 1. Create or Find User based on WhatsApp (Progressive Identity)
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

      // 2. Create Lead Record
      const { error: leadError } = await supabase
        .from('leads')
        .insert({
          user_id: user.id,
          listing_id: listingId,
          listing_type: listingType,
          seller_id: sellerId,
          status: 'new'
        });

      if (leadError) throw leadError;

      // 3. Redirect to WhatsApp
      const message = `Hi! I'm interested in the *${listingTitle}* (${listingType}) I saw on Autolink Africa. My name is ${name}.`;
      const waUrl = `https://wa.me/${sellerWhatsapp?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
      
      toast({ title: "Connecting to Seller", description: "Opening WhatsApp..." });
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Connect with Seller
          </DialogTitle>
          <DialogDescription>
            Enter your details to instantly message the seller on WhatsApp.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Your Name</Label>
              <Input id="name" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wa">WhatsApp Number</Label>
              <Input id="wa" placeholder="26777123456" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} required />
              <p className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> No login required. We respect your privacy.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" className="w-full h-12 text-lg shadow-lg" disabled={loading}>
              {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <MessageCircle className="mr-2 h-5 w-5" />}
              Send WhatsApp Message
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
