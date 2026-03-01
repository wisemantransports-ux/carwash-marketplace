
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { CarListing } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, MapPin, Calendar, ShieldCheck, Clock, Store, Info, Phone, MessageSquare } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

/**
 * @fileOverview Car Listing Detail Page
 * Provides full vehicle specifications, image gallery, and seller context.
 * Strictly filters for 'active' status and hides sensitive ownership data.
 */

export default function CarDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [car, setCar] = useState<CarListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    async function loadCar() {
      setLoading(true);
      try {
        // Query restricted to public fields and active status
        const { data, error } = await supabase
          .from('car_listing')
          .select(`
            id, title, make, model, year, price, mileage, location, images, description, status, created_at,
            business:business_id ( name, city, logo_url, subscription_plan, whatsapp_number )
          `)
          .eq('id', id)
          .eq('status', 'active')
          .maybeSingle();
        
        if (error) throw error;
        setCar(data);
      } catch (e) {
        console.error("Detail Error:", e);
      } finally {
        setLoading(false);
      }
    }
    loadCar();
  }, [id]);

  if (!mounted || loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
      <Loader2 className="animate-spin h-10 w-10 text-primary" />
      <p className="text-muted-foreground animate-pulse font-medium">Loading vehicle details...</p>
    </div>
  );

  if (!car) return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-4 space-y-6">
      <div className="bg-destructive/10 p-6 rounded-full"><Info className="h-12 w-12 text-destructive" /></div>
      <h1 className="text-2xl font-bold text-slate-900">Listing not found</h1>
      <p className="text-muted-foreground max-w-sm">The vehicle you are looking for might have been sold or removed from the marketplace.</p>
      <Button onClick={() => router.back()} variant="outline" className="rounded-full px-8">Return to Search</Button>
    </div>
  );

  // Normalizing images array for carousel
  const images = car.images && car.images.length > 0 ? car.images : [car.image_url];

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-sm font-bold truncate max-w-[200px] sm:max-w-md">
              {car.year} {car.make} {car.model}
            </h1>
          </div>
          <Badge className="bg-primary/10 text-primary border-none font-black text-[10px] uppercase">
            Active Listing
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl space-y-12 animate-in fade-in duration-500">
        <div className="grid lg:grid-cols-5 gap-12">
          
          {/* Visual Showcase (Images) */}
          <div className="lg:col-span-3 space-y-8">
            <Carousel className="w-full relative group">
              <CarouselContent>
                {images.map((img, index) => (
                  <CarouselItem key={index}>
                    <div className="relative aspect-video rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-muted">
                      <Image 
                        src={img} 
                        alt={`${car.make} view ${index + 1}`} 
                        fill 
                        className="object-cover" 
                        priority={index === 0}
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {images.length > 1 && (
                <>
                  <CarouselPrevious className="left-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <CarouselNext className="right-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </>
              )}
            </Carousel>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border shadow-sm flex flex-col items-center gap-1.5 transition-transform hover:scale-105">
                <Clock className="h-5 w-5 text-primary opacity-60" />
                <span className="text-[10px] uppercase font-black text-muted-foreground tracking-tighter">Mileage</span>
                <span className="font-bold text-sm">{car.mileage.toLocaleString()} KM</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border shadow-sm flex flex-col items-center gap-1.5 transition-transform hover:scale-105">
                <Calendar className="h-5 w-5 text-primary opacity-60" />
                <span className="text-[10px] uppercase font-black text-muted-foreground tracking-tighter">Year</span>
                <span className="font-bold text-sm">{car.year}</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border shadow-sm flex flex-col items-center gap-1.5 transition-transform hover:scale-105">
                <MapPin className="h-5 w-5 text-primary opacity-60" />
                <span className="text-[10px] uppercase font-black text-muted-foreground tracking-tighter">Location</span>
                <span className="font-bold text-sm truncate w-full text-center">{car.location || car.business?.city || 'Botswana'}</span>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold border-b pb-2">Vehicle Description</h3>
              <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                {car.description || "This premium vehicle is currently available for viewing. Please contact the seller for full maintenance history and additional specifications."}
              </p>
            </div>
          </div>

          {/* Pricing & Interaction */}
          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest bg-primary/5 w-fit px-3 py-1 rounded-full border border-primary/10">
                <ShieldCheck className="h-4 w-4" />
                <span>Verified Platform Listing</span>
              </div>
              <div className="space-y-1">
                <h2 className="text-5xl font-black tracking-tighter text-slate-900">
                  P{Number(car.price).toLocaleString()}
                </h2>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Fixed Market Price (BWP)</p>
              </div>
            </div>

            <Card className="border-2 rounded-3xl overflow-hidden shadow-xl">
              <CardHeader className="bg-slate-50 border-b p-6">
                <CardTitle className="text-lg">Seller Profile</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-8">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center border-2 border-white shadow-md overflow-hidden">
                    {car.business?.logo_url ? (
                      <Image src={car.business.logo_url} alt="Logo" width={64} height={64} className="object-cover" />
                    ) : (
                      <Store className="h-8 w-8 text-primary opacity-40" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xl font-bold text-slate-900">{car.business?.name || "Verified Individual"}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                      <MapPin className="h-3 w-3" /> {car.business?.city || "Gaborone, Botswana"}
                    </p>
                  </div>
                </div>
                
                <div className="grid gap-4">
                  <Button size="lg" className="w-full h-14 text-lg font-black rounded-2xl shadow-lg" asChild>
                    <Link href="/signup">Request Test Drive</Link>
                  </Button>
                  <Button variant="outline" size="lg" className="w-full h-14 font-bold rounded-2xl border-2" asChild>
                    <Link href={`/find-wash/${car.business_id}`}>
                      View Business Services
                    </Link>
                  </Button>
                </div>
                
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
                  <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-blue-800 leading-relaxed font-medium">
                    Verified partners receive priority coordination. Private contact details are released once your test drive request is accepted.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-4 p-6 bg-white border-2 rounded-3xl shadow-sm">
              <p className="text-[10px] font-black uppercase text-muted-foreground text-center">Safety Guidelines</p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-xs font-bold text-slate-700">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  Inspect documents in person.
                </div>
                <div className="flex items-center gap-3 text-xs font-bold text-slate-700">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  No advance payments for viewing.
                </div>
                <div className="flex items-center gap-3 text-xs font-bold text-slate-700">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  Meet in safe, public locations.
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
