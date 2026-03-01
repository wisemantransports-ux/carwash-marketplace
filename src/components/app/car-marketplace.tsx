'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { CarListing } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { MapPin, Search, Loader2, ArrowRight, ShieldCheck, Clock, History } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Robust image parsing for Postgres array columns
 */
function getDisplayImage(images: any, fallback: string): string {
  if (!images) return fallback;
  if (Array.isArray(images) && images.length > 0) return images[0];
  if (typeof images === 'string') {
    try {
      if (images.startsWith('[') || images.startsWith('{')) {
        const cleaned = images.replace(/[{}]/g, '[').replace(/[}]/g, ']');
        const parsed = JSON.parse(cleaned.includes('[') ? cleaned : `["${images}"]`);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
      }
      const parts = images.replace(/[{}]/g, '').split(',');
      if (parts.length > 0 && parts[0]) return parts[0].replace(/"/g, '');
    } catch {
      return images;
    }
  }
  return fallback;
}

export function CarCard({ car }: { car: any }) {
  const isPremiumDealer = car.business?.subscription_plan === 'Pro' || car.business?.subscription_plan === 'Enterprise';
  const displayImage = getDisplayImage(car.images, 'https://picsum.photos/seed/car/600/400');

  return (
    <Card className="flex flex-col h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/50 bg-card border-2 rounded-2xl group">
      <Link href={`/marketplace/cars/${car.id}`} className="relative h-56 w-full overflow-hidden bg-muted">
        <Image
          src={displayImage}
          alt={`${car.make} ${car.model} ${car.year}`}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          <Badge className="bg-white/90 text-black backdrop-blur-sm border-none shadow-sm uppercase text-[10px] font-black">
            {car.year}
          </Badge>
          {isPremiumDealer && (
            <Badge className="bg-primary text-white border-none shadow-sm uppercase text-[9px] font-black flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Verified Dealer
            </Badge>
          )}
        </div>
        <div className="absolute bottom-3 right-3">
          <Badge className="bg-primary text-white font-black px-3 py-1 text-sm shadow-lg">
            P{Number(car.price).toLocaleString()}
          </Badge>
        </div>
      </Link>
      
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-xl font-bold line-clamp-1">
            {car.title || `${car.make} ${car.model}`}
          </CardTitle>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span>{car.location || car.business?.city || 'Botswana'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{Number(car.mileage || 0).toLocaleString()} KM</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-grow pb-4">
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 italic">
          {car.description || "View this verified vehicle listing from one of our partners."}
        </p>
      </CardContent>

      <CardFooter className="pt-0">
        <Button asChild className="w-full font-bold rounded-xl h-11 shadow-sm">
          <Link href={`/marketplace/cars/${car.id}`}>
            View Details <ArrowRight className="ml-2 h-3 w-3" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function CarMarketplace() {
  const [listings, setListings] = useState<CarListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [makeFilter, setMakeFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');

  const fetchListings = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    try {
      // 1. Fetch verified businesses first (Resilient pattern)
      const { data: verifiedBiz, error: bizError } = await supabase
        .from('businesses')
        .select('id')
        .or('verification_status.eq.verified,status.eq.verified');
      
      if (bizError) throw bizError;
      
      const verifiedIds = (verifiedBiz || []).map(b => b.id);
      
      if (verifiedIds.length === 0) {
        setListings([]);
        return;
      }

      // 2. Fetch listings linked to verified partners
      const { data, error } = await supabase
        .from('car_listing')
        .select(`
          id, title, make, model, year, price, mileage, location, images, description, status, created_at, business_id,
          business:business_id ( name, city, subscription_plan, verification_status )
        `)
        .in('status', ['active', 'available'])
        .in('business_id', verifiedIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setListings((data as any[]) || []);
    } catch (e: any) {
      console.error("Marketplace fetch failure details:", {
        message: e.message,
        details: e.details,
        hint: e.hint,
        code: e.code
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchListings();
  }, [fetchListings]);

  if (!mounted) return null;

  const filtered = listings.filter(l => {
    const matchesSearch = l.make.toLowerCase().includes(search.toLowerCase()) || 
                         l.model.toLowerCase().includes(search.toLowerCase()) ||
                         (l.location && l.location.toLowerCase().includes(search.toLowerCase())) ||
                         (l.title && l.title.toLowerCase().includes(search.toLowerCase()));
    const matchesMake = makeFilter === 'all' || l.make === makeFilter;
    return matchesSearch && matchesMake;
  }).sort((a, b) => {
    if (sortOrder === 'price-low') return a.price - b.price;
    if (sortOrder === 'price-high') return b.price - a.price;
    if (sortOrder === 'year-new') return b.year - a.year;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const makes = Array.from(new Set(listings.map(l => l.make))).sort();

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row gap-6 items-end justify-between bg-white/50 backdrop-blur-sm p-6 rounded-3xl border-2 shadow-sm">
        <div className="flex-1 w-full space-y-2">
          <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Search Listings</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search make, model, or location..." 
              className="pl-10 h-12 rounded-xl bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4 w-full md:w-auto">
          <div className="space-y-2 flex-1 md:w-40">
            <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Make</Label>
            <Select value={makeFilter} onValueChange={setMakeFilter}>
              <SelectTrigger className="h-12 rounded-xl bg-white">
                <SelectValue placeholder="All Makes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Makes</SelectItem>
                {makes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2 flex-1 md:w-40">
            <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Sort By</Label>
            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger className="h-12 rounded-xl bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Latest Listings</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="year-new">Year: Newest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden bg-card rounded-2xl h-[500px]">
              <Skeleton className="h-56 w-full" />
              <div className="p-6 space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-10 w-full" />
              </div>
            </Card>
          ))
        ) : filtered.length > 0 ? (
          filtered.map(car => (
            <CarCard key={car.id} car={car} />
          ))
        ) : (
          <div className="col-span-full py-24 text-center border-2 border-dashed rounded-3xl bg-muted/20">
            <History className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
            <p className="text-xl font-bold text-muted-foreground">No verified car listings found.</p>
            <Button variant="link" onClick={() => { setSearch(''); setMakeFilter('all'); }} className="font-bold">
              View All Active Listings
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}