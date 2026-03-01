
'use client';

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, MapPin, Search, ShieldCheck, Store, Tags, Filter, Droplets, ShoppingCart, Car as CarIcon, ArrowRight, Clock, History } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { CarListing } from '@/lib/types';

const CATEGORIES = [
  { id: 'all', label: 'All Partners', icon: Filter },
  { id: 'Wash', label: 'Car Wash', icon: Droplets },
  { id: 'Spare', label: 'Spare Parts', icon: ShoppingCart },
  { id: 'Cars', label: 'Car Sales', icon: CarIcon },
];

function BusinessCard({ business }: { business: any }) {
  const rating = Number(business.rating || 0);
  const reviews = Number(business.review_count || 0);

  return (
    <Card className="flex flex-col h-[580px] overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/50 bg-card border-2">
      <div className="relative h-40 w-full group overflow-hidden bg-muted">
        {business.logo_url ? (
          <Image
            src={business.logo_url}
            alt={business.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground bg-primary/5">
            <Store className="h-16 w-16 opacity-10" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="backdrop-blur-md bg-white/90 text-black shadow-sm font-bold text-[10px] uppercase">
            {business.services?.length || 0} Packages
          </Badge>
        </div>
      </div>
      
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-xl line-clamp-1">{business.name}</CardTitle>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 shrink-0 text-[10px]">
            <ShieldCheck className="h-3 w-3 mr-1" /> Verified
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{business.address || 'Gaborone'}, {business.city || 'Botswana'}</span>
        </div>
      </CardHeader>

      <CardContent className="flex-grow space-y-4 pb-4 overflow-hidden flex flex-col">
        <div className="space-y-2 flex-1 flex flex-col min-h-0">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter flex items-center gap-1.5">
                <Tags className="h-3 w-3" /> Partner Expertise
            </p>
            <ScrollArea className="flex-1 pr-2">
                <div className="space-y-1.5">
                    {business.services && business.services.length > 0 ? business.services.map((svc: any) => (
                        <div key={svc.id} className="flex justify-between items-center text-xs bg-muted/30 p-2 rounded-lg border border-transparent hover:border-primary/20 transition-colors">
                            <span className="font-medium truncate max-w-[120px]">{svc.name}</span>
                            <span className="font-bold text-primary">BWP {Number(svc.price).toFixed(2)}</span>
                        </div>
                    )) : (
                        <p className="text-[10px] text-muted-foreground italic py-4 text-center">Contact partner for details.</p>
                    )}
                </div>
            </ScrollArea>
        </div>

        <div className="flex items-center gap-1.5 pt-2 border-t border-dashed shrink-0">
          <div className="flex text-yellow-400" aria-label={`Rating: ${rating} stars`}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Star 
                key={s} 
                className={cn(
                  "h-3.5 w-3.5", 
                  s <= Math.round(rating) ? "fill-current" : "text-gray-200"
                )} 
              />
            ))}
          </div>
          <span className="text-sm font-bold">{rating.toFixed(1)}</span>
          <span className="text-[10px] text-muted-foreground ml-auto uppercase font-bold tracking-widest">
            {reviews} Reviews
          </span>
        </div>
      </CardContent>

      <CardFooter className="pt-0 shrink-0">
        <Button asChild className="w-full shadow-md font-bold">
          <Link href={`/customer/book/${business.id}`}>
            View Profile & Book
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function CarCardSimple({ car }: { car: CarListing }) {
  const displayImage = (car.images && car.images.length > 0) ? car.images[0] : 'https://picsum.photos/seed/car/600/400';

  return (
    <Card className="flex flex-col h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/50 bg-card border-2 rounded-2xl group">
      <Link href={`/marketplace/cars/${car.id}`} className="relative h-48 w-full overflow-hidden bg-muted">
        <Image
          src={displayImage}
          alt={car.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute top-2 left-2">
          <Badge className="bg-white/90 text-black shadow-sm uppercase text-[9px] font-black">
            {car.year}
          </Badge>
        </div>
        <div className="absolute bottom-2 right-2">
          <Badge className="bg-primary text-white font-black px-2 py-1 text-xs shadow-lg">
            P{Number(car.price).toLocaleString()}
          </Badge>
        </div>
      </Link>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-bold line-clamp-1">{car.title}</CardTitle>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-bold uppercase">
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {car.location || car.business?.city || 'Botswana'}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {car.mileage.toLocaleString()} KM
          </div>
        </div>
      </CardHeader>
      <CardFooter className="pt-0 mt-auto">
        <Button asChild variant="outline" className="w-full font-bold rounded-xl h-9 text-xs">
          <Link href={`/marketplace/cars/${car.id}`}>View Showroom</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function CustomerHomeContent() {
  const searchParams = useSearchParams();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [cars, setCars] = useState<CarListing[]>([]);
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const q = searchParams.get('q');
    const cat = searchParams.get('category');
    
    if (q !== null) setSearch(q);
    
    if (cat !== null) {
      const match = CATEGORIES.find(c => c.id.toLowerCase() === cat.toLowerCase());
      setCategory(match ? match.id : 'all');
    } else {
      setCategory('all');
    }
  }, [searchParams]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Businesses
      const { data: bizData, error: bizError } = await supabase
          .from('businesses')
          .select('*, services(*)')
          .eq('verification_status', 'verified')
          .order('rating', { ascending: false });
      
      if (bizError) throw bizError;
      setBusinesses(bizData || []);

      // 2. Fetch Cars
      const { data: carData, error: carError } = await supabase
        .from('car_listing')
        .select(`
          id, title, make, model, year, price, mileage, location, images, description, status, created_at,
          business:business_id!inner ( name, city, verification_status )
        `)
        .in('status', ['active', 'available'])
        .eq('business.verification_status', 'verified')
        .order('created_at', { ascending: false });

      if (carError) throw carError;
      setCars((carData as any) || []);

    } catch (e: any) {
      console.error('Marketplace Error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, [loadData]);

  const filteredBusinesses = businesses.filter(b => {
    const matchesSearch = b.name.toLowerCase().includes(search.toLowerCase()) || 
                         (b.city && b.city.toLowerCase().includes(search.toLowerCase()));
    const bizCategory = b.category || 'Wash';
    const matchesCategory = category === 'all' || bizCategory.toLowerCase() === category.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const filteredCars = cars.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) || 
                         c.make.toLowerCase().includes(search.toLowerCase()) ||
                         c.model.toLowerCase().includes(search.toLowerCase()) ||
                         (c.location && c.location.toLowerCase().includes(search.toLowerCase()));
    return category === 'Cars' || category === 'all' ? matchesSearch : false;
  });

  if (!mounted) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <div className="flex-1 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
            <ShieldCheck className="h-3 w-3" />
            <span>Verified Marketplace Partners</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-primary">Partner Directory</h1>
          
          <div className="space-y-4">
            <div className="relative max-w-2xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search partners, parts, or cars..." 
                className="pl-10 h-12 bg-card shadow-sm border-2"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <Button 
                  key={cat.id} 
                  variant={category.toLowerCase() === cat.id.toLowerCase() ? 'default' : 'outline'} 
                  size="sm" 
                  className="rounded-full px-4 font-bold h-9 transition-all shadow-sm"
                  onClick={() => setCategory(cat.id)}
                >
                  <cat.icon className={cn("h-3.5 w-3.5 mr-2", category.toLowerCase() === cat.id.toLowerCase() ? "text-white" : "text-primary")} />
                  {cat.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {category === 'Cars' && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-4">
            <div className="bg-white p-3 rounded-xl shadow-sm">
              <CarIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="space-y-1">
              <p className="font-bold text-blue-900">Vehicle Discovery Showroom</p>
              <p className="text-sm text-blue-800">Browse individual car listings from these verified dealers.</p>
            </div>
          </div>
          <Button asChild variant="outline" className="bg-white border-blue-200 hover:bg-blue-50 rounded-full h-11 font-bold">
            <Link href="/marketplace/cars">Full Showroom <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden bg-card">
              <Skeleton className="h-48 w-full" />
              <div className="p-6 space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-10 w-full" />
              </div>
            </Card>
          ))
        ) : (
          <>
            {category === 'Cars' ? (
              filteredCars.length > 0 ? filteredCars.map(car => (
                <CarCardSimple key={car.id} car={car} />
              )) : (
                <div className="col-span-full py-24 text-center border-2 border-dashed rounded-3xl bg-muted/20">
                  <History className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
                  <p className="text-muted-foreground font-bold text-lg">No verified car listings found.</p>
                  <Button variant="outline" className="mt-4" onClick={() => setCategory('all')}>View All Partners</Button>
                </div>
              )
            ) : (
              filteredBusinesses.length > 0 ? filteredBusinesses.map(business => (
                <BusinessCard key={business.id} business={business} />
              )) : (
                <div className="col-span-full py-24 text-center border-2 border-dashed rounded-3xl bg-muted/20">
                  <Store className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
                  <p className="text-xl font-bold">No verified partners found in this category.</p>
                  <Button variant="outline" className="mt-4" onClick={() => { setSearch(''); setCategory('all'); }}>Clear Filters</Button>
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function CustomerHomePage() {
  return (
    <Suspense fallback={null}>
      <CustomerHomeContent />
    </Suspense>
  );
}
