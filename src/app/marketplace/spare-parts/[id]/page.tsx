'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { SparePart } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, MapPin, Package, ShieldCheck, ShoppingCart, Store, Info, Phone, MessageSquare, Tags, Banknote } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * @fileOverview Spare Part Detail Page (Public)
 * Full specification view for individual automotive components.
 * Strictly filtered for 'active' status and verified sellers.
 */

export default function SparePartDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [part, setPart] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    async function loadPart() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('spare_parts')
          .select(`
            *,
            business:business_id!inner ( name, city, logo_url, verification_status, whatsapp_number )
          `)
          .eq('id', id)
          .eq('status', 'active')
          .maybeSingle();
        
        if (error) throw error;
        setPart(data);
      } catch (e) {
        console.error("Detail Fetch Error:", e);
      } finally {
        setLoading(false);
      }
    }
    loadPart();
  }, [id]);

  if (!mounted || loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
      <Loader2 className="animate-spin h-10 w-10 text-primary" />
      <p className="text-muted-foreground animate-pulse font-medium">Loading component details...</p>
    </div>
  );

  if (!part) return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-4 space-y-6">
      <div className="bg-destructive/10 p-6 rounded-full"><Info className="h-12 w-12 text-destructive" /></div>
      <h1 className="text-2xl font-bold">Product not found</h1>
      <p className="text-muted-foreground max-w-sm">This component may have been sold out or removed from the catalog.</p>
      <Button onClick={() => router.back()} variant="outline" className="rounded-full px-8">Return to Catalog</Button>
    </div>
  );

  const images = (part.images && part.images.length > 0) ? part.images : ['https://picsum.photos/seed/part/800/600'];

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
            Genuine {part.category}
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl space-y-12 animate-in fade-in duration-500">
        <div className="grid lg:grid-cols-5 gap-12">
          
          <div className="lg:col-span-3 space-y-8">
            <div className="relative aspect-square sm:aspect-video rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-muted">
              <Image src={images[0]} alt={part.name} fill className="object-cover" priority data-ai-hint="car parts" />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border shadow-sm flex flex-col items-center gap-1.5">
                <Tags className="h-5 w-5 text-primary opacity-60" />
                <span className="text-[10px] uppercase font-black text-muted-foreground tracking-tighter">Condition</span>
                <span className="font-bold text-sm capitalize">{part.condition}</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border shadow-sm flex flex-col items-center gap-1.5">
                <Package className="h-5 w-5 text-primary opacity-60" />
                <span className="text-[10px] uppercase font-black text-muted-foreground tracking-tighter">Availability</span>
                <span className={cn("font-bold text-sm", part.stock_quantity > 0 ? "text-green-600" : "text-destructive")}>
                  {part.stock_quantity > 0 ? `${part.stock_quantity} In Stock` : 'Out of Stock'}
                </span>
              </div>
              <div className="bg-white p-5 rounded-2xl border shadow-sm flex flex-col items-center gap-1.5">
                <MapPin className="h-5 w-5 text-primary opacity-60" />
                <span className="text-[10px] uppercase font-black text-muted-foreground tracking-tighter">Location</span>
                <span className="font-bold text-sm truncate w-full text-center">{part.business?.city || 'Botswana'}</span>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold border-b pb-2">Product Description</h3>
              <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                {part.description || "Genuine automotive component. Contact the verified seller for compatibility checks and warranty information."}
              </p>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest bg-primary/5 w-fit px-3 py-1 rounded-full border border-primary/10">
                <ShieldCheck className="h-4 w-4" />
                <span>Verified Parts Dealer</span>
              </div>
              <div className="space-y-1">
                <h2 className="text-5xl font-black tracking-tighter text-slate-900">
                  P{Number(part.price).toLocaleString()}
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
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center border-2 border-white shadow-md overflow-hidden">
                    {part.business?.logo_url ? (
                      <Image src={part.business.logo_url} alt="Logo" width={64} height={64} className="object-cover" />
                    ) : (
                      <Store className="h-8 w-8 text-primary opacity-40" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xl font-bold text-slate-900">{part.business?.name || "Verified Seller"}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                      <MapPin className="h-3 w-3" /> {part.business?.city || "Botswana"}
                    </p>
                  </div>
                </div>
                
                <div className="grid gap-4">
                  <Button size="lg" className="w-full h-14 text-lg font-black rounded-2xl shadow-lg" asChild>
                    <Link href="/signup">Contact Retailer</Link>
                  </Button>
                  <Button variant="outline" size="lg" className="w-full h-14 font-bold rounded-2xl border-2" asChild>
                    <Link href={`/find-wash/${part.business_id}`}>
                      View Business Services
                    </Link>
                  </Button>
                </div>
                
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
                  <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-blue-800 leading-relaxed font-medium">
                    Genuine parts verification. All platform retailers are checked for business registration and identity.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-4 p-6 bg-white border-2 rounded-3xl shadow-sm">
              <p className="text-[10px] font-black uppercase text-muted-foreground text-center flex items-center justify-center gap-2">
                <Banknote className="h-3 w-3" /> Payment Security
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-xs font-bold text-slate-700">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  No advance payments for delivery.
                </div>
                <div className="flex items-center gap-3 text-xs font-bold text-slate-700">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  Verify part condition in person.
                </div>
                <div className="flex items-center gap-3 text-xs font-bold text-slate-700">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  Use secure platform messaging.
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}