
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { CarListing } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, MapPin, Calendar, Banknote, ShieldCheck, Clock, CheckCircle2, Store } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function CarDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [car, setCar] = useState<CarListing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCar() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('car_listings')
          .select('*, business:business_id(*)')
          .eq('id', id)
          .single();
        
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

  if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;
  if (!car) return <div className="text-center py-20">Listing not found. <Button onClick={() => router.back()}>Go Back</Button></div>;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold truncate">{car.year} {car.make} {car.model}</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
        <div className="grid lg:grid-cols-2 gap-12">
          <div className="space-y-6">
            <div className="relative aspect-video rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-muted">
              <Image src={car.image_url} alt={car.make} fill className="object-cover" />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col items-center gap-1">
                <Clock className="h-5 w-5 text-primary opacity-60" />
                <span className="text-[10px] uppercase font-black text-muted-foreground">Mileage</span>
                <span className="font-bold text-sm">{car.mileage.toLocaleString()} KM</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col items-center gap-1">
                <Calendar className="h-5 w-5 text-primary opacity-60" />
                <span className="text-[10px] uppercase font-black text-muted-foreground">Year</span>
                <span className="font-bold text-sm">{car.year}</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col items-center gap-1">
                <MapPin className="h-5 w-5 text-primary opacity-60" />
                <span className="text-[10px] uppercase font-black text-muted-foreground">Location</span>
                <span className="font-bold text-sm">{car.location || car.business?.city || 'Gabs'}</span>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
                <ShieldCheck className="h-4 w-4" />
                <span>Verified Listing</span>
              </div>
              <h2 className="text-5xl font-black tracking-tighter">P{Number(car.price).toLocaleString()}</h2>
              <p className="text-xl text-muted-foreground leading-relaxed">
                {car.description || "Premium pre-owned vehicle in excellent condition. Contact seller for full maintenance history and specifications."}
              </p>
            </div>

            <Card className="border-2 rounded-2xl overflow-hidden shadow-lg">
              <CardHeader className="bg-muted/10 border-b">
                <CardTitle className="text-lg">Seller Information</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center border text-primary">
                    {car.business?.logo_url ? (
                      <Image src={car.business.logo_url} alt="Logo" width={64} height={64} className="rounded-xl object-cover" />
                    ) : (
                      <Store className="h-8 w-8" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xl font-bold">{car.business?.name || "Private Seller"}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {car.business?.city || "Botswana"}
                    </p>
                  </div>
                </div>
                
                <div className="grid gap-3">
                  <Button size="lg" className="w-full h-14 text-lg font-bold rounded-xl" onClick={() => router.push('/signup')}>
                    Request Test Drive
                  </Button>
                  <Button variant="outline" size="lg" className="w-full h-14 font-bold rounded-xl" asChild>
                    <Link href={`/find-wash/${car.business_id}`}>View Seller Profile</Link>
                  </Button>
                </div>
                
                <p className="text-[10px] text-center text-muted-foreground italic">
                  HydroFlow mediates requests to ensure seller and buyer safety.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
