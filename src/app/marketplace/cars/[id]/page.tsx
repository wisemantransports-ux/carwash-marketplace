
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { CarListing } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, MapPin, Calendar, ShieldCheck, Clock, Store, Info, MessageCircle } from 'lucide-react';
import Image from 'next/image';
import { LeadModal } from '@/components/app/lead-modal';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

export default function CarDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [car, setCar] = useState<CarListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [leadModalOpen, setLeadModalOpen] = useState(false);

  useEffect(() => {
    async function loadCar() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('car_listing')
          .select(`
            *,
            business:business_id ( name, city, logo_url, whatsapp_number )
          `)
          .eq('id', id)
          .maybeSingle();
        
        if (error) throw error;
        setCar(data as any);
      } catch (e) {
        console.error("Detail Error:", e);
      } finally {
        setLoading(false);
      }
    }
    loadCar();
  }, [id]);

  if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;
  if (!car) return <div className="text-center py-20">Listing not found.</div>;

  const images = car.images && car.images.length > 0 ? car.images : ['https://picsum.photos/seed/car/800/600'];

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Badge className="bg-primary/10 text-primary border-none font-black text-[10px] uppercase">
            {car.status}
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl space-y-12 animate-in fade-in duration-500">
        <div className="grid lg:grid-cols-5 gap-12">
          
          <div className="lg:col-span-3 space-y-8">
            <Carousel className="w-full relative group">
              <CarouselContent>
                {images.map((img, index) => (
                  <CarouselItem key={index}>
                    <div className="relative aspect-video rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-muted">
                      <Image src={img} alt={`${car.make} view ${index + 1}`} fill className="object-cover" />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {images.length > 1 && (
                <>
                  <CarouselPrevious className="left-4" />
                  <CarouselNext className="right-4" />
                </>
              )}
            </Carousel>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border shadow-sm flex flex-col items-center gap-1.5">
                <Clock className="h-5 w-5 text-primary opacity-60" />
                <span className="text-[10px] uppercase font-black text-muted-foreground">Mileage</span>
                <span className="font-bold text-sm">{car.mileage.toLocaleString()} KM</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border shadow-sm flex flex-col items-center gap-1.5">
                <Calendar className="h-5 w-5 text-primary opacity-60" />
                <span className="text-[10px] uppercase font-black text-muted-foreground">Year</span>
                <span className="font-bold text-sm">{car.year}</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border shadow-sm flex flex-col items-center gap-1.5">
                <MapPin className="h-5 w-5 text-primary opacity-60" />
                <span className="text-[10px] uppercase font-black text-muted-foreground">Location</span>
                <span className="font-bold text-sm truncate w-full text-center">{car.business?.city || 'Botswana'}</span>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold border-b pb-2">Vehicle Description</h3>
              <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{car.description}</p>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest bg-primary/5 w-fit px-3 py-1 rounded-full border border-primary/10">
                <ShieldCheck className="h-4 w-4" />
                <span>Verified Listing</span>
              </div>
              <div className="space-y-1">
                <h2 className="text-5xl font-black tracking-tighter text-slate-900">
                  P{Number(car.price).toLocaleString()}
                </h2>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Market Price</p>
              </div>
            </div>

            <Card className="border-2 rounded-3xl overflow-hidden shadow-xl">
              <CardHeader className="bg-slate-50 border-b p-6">
                <CardTitle className="text-lg">Seller Profile</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-8">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center border overflow-hidden">
                    {car.business?.logo_url ? (
                      <Image src={car.business.logo_url} alt="Logo" width={64} height={64} className="object-cover" />
                    ) : (
                      <Store className="h-8 w-8 text-primary opacity-40" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xl font-bold text-slate-900">{car.business?.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {car.business?.city}
                    </p>
                  </div>
                </div>
                
                <Button size="lg" className="w-full h-14 text-lg font-black rounded-2xl shadow-lg" onClick={() => setLeadModalOpen(true)}>
                  <MessageCircle className="mr-2 h-5 w-5" /> Contact via WhatsApp
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <LeadModal 
        isOpen={leadModalOpen}
        onClose={() => setLeadModalOpen(false)}
        listingId={car.id}
        listingType="car"
        listingTitle={`${car.year} ${car.make} ${car.model}`}
        sellerId={car.business_id}
        sellerWhatsapp={car.business?.whatsapp_number}
      />
    </div>
  );
}
