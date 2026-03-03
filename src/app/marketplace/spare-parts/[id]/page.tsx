'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, MapPin, Package, ShieldCheck, Store, Info, Banknote, Tags, MessageCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { LeadModal } from '@/components/app/lead-modal';

/**
 * Robust image parsing for Postgres array columns
 */
function getDisplayImage(images: any, fallback: string): string {
  if (!images) return fallback;
  if (Array.isArray(images) && images.length > 0) return images[0];
  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
    } catch {
      const cleaned = images.replace(/[{}]/g, '').split(',');
      if (cleaned.length > 0 && cleaned[0]) return cleaned[0].replace(/"/g, '');
    }
  }
  return fallback;
}

export default function SparePartDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const [part, setPart] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [leadModalOpen, setLeadModalOpen] = useState(false);

  useEffect(() => {
    async function loadPart() {
      if (!id) return;
      setLoading(true);
      try {
        const { data: listing, error: listingError } = await supabase
          .from('listings')
          .select('*')
          .eq('id', id)
          .eq('type', 'spare_part')
          .single();
        
        if (listingError) throw listingError;

        if (listing) {
          const { data: bizData } = await supabase
            .from('businesses')
            .select('name, city, logo_url, whatsapp_number')
            .eq('id', listing.business_id)
            .single();

          setPart({
            ...listing,
            business: bizData || { name: 'Verified Retailer', city: 'Botswana' }
          });
        }
      } catch (e: any) {
        console.error("Detail Fetch Error:", e.message);
      } finally {
        setLoading(false);
      }
    }
    loadPart();
  }, [id]);

  if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;
  if (!part) return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-4 space-y-6">
      <div className="bg-destructive/10 p-6 rounded-full"><Info className="h-12 w-12 text-destructive" /></div>
      <h1 className="text-2xl font-bold">Product not found</h1>
      <Button onClick={() => router.back()} variant="outline" className="rounded-full px-8">Return to Catalog</Button>
    </div>
  );

  const mainImage = getDisplayImage(part.images, 'https://picsum.photos/seed/part/800/600');

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-sm font-bold truncate max-w-[200px] sm:max-w-md">
              {part.name}
            </h1>
          </div>
          <Badge className="bg-primary/10 text-primary border-none font-black text-[10px] uppercase">
            {part.category || 'Spare Part'}
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl space-y-12 animate-in fade-in duration-500">
        <div className="grid lg:grid-cols-5 gap-12">
          
          <div className="lg:col-span-3 space-y-8">
            <div className="relative aspect-square sm:aspect-video rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-muted">
              <Image src={mainImage} alt={part.name} fill className="object-cover" priority />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border shadow-sm flex flex-col items-center gap-1.5">
                <Tags className="h-5 w-5 text-primary opacity-60" />
                <span className="text-[10px] uppercase font-black text-muted-foreground tracking-tighter">Condition</span>
                <span className="font-bold text-sm capitalize">{part.condition || 'New'}</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border shadow-sm flex flex-col items-center gap-1.5">
                <Package className="h-5 w-5 text-primary opacity-60" />
                <span className="text-[10px] uppercase font-black text-muted-foreground tracking-tighter">Availability</span>
                <span className="font-bold text-sm text-green-600">In Stock</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border shadow-sm flex flex-col items-center gap-1.5">
                <MapPin className="h-5 w-5 text-primary opacity-60" />
                <span className="text-[10px] uppercase font-black text-muted-foreground tracking-tighter">Location</span>
                <span className="font-bold text-sm truncate w-full text-center">{part.business?.city || 'Botswana'}</span>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold border-b pb-2">Technical Description</h3>
              <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                {part.description || "Authentic automotive component available from a verified retailer."}
              </p>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest bg-primary/5 w-fit px-3 py-1 rounded-full border border-primary/10">
                <ShieldCheck className="h-4 w-4" />
                <span>Verified Retailer Listing</span>
              </div>
              <div className="space-y-1">
                <h2 className="text-5xl font-black tracking-tighter text-slate-900">
                  P{Number(part.price || 0).toLocaleString()}
                </h2>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Market Price (BWP)</p>
              </div>
            </div>

            <Card className="border-2 rounded-3xl overflow-hidden shadow-xl">
              <CardHeader className="bg-slate-50 border-b p-6">
                <CardTitle className="text-lg">Retailer Profile</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-8">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center border overflow-hidden">
                    {part.business?.logo_url ? (
                      <Image src={part.business.logo_url} alt="Logo" width={64} height={64} className="object-cover" />
                    ) : (
                      <Store className="h-8 w-8 text-primary opacity-40" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xl font-bold text-slate-900">{part.business?.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                      <MapPin className="h-3 w-3" /> {part.business?.city}
                    </p>
                  </div>
                </div>
                
                <Button size="lg" className="w-full h-14 text-lg font-black rounded-2xl shadow-lg" onClick={() => setLeadModalOpen(true)}>
                  <MessageCircle className="mr-2 h-5 w-5" /> Contact Retailer
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <LeadModal 
        isOpen={leadModalOpen}
        onClose={() => setLeadModalOpen(false)}
        listingId={part.id}
        listingTitle={part.name}
      />
    </div>
  );
}