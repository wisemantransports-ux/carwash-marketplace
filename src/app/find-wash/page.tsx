
'use client';

import { useEffect, useState, Suspense, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, MapPin, Search, ShieldCheck, ArrowLeft, Store, Loader2, Filter, Droplets, ShoppingCart, Car as CarIcon, ArrowRight, Clock, History } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { CarListing } from '@/lib/types';

const CATEGORIES = [
  { id: 'all', label: 'All Partners', icon: Filter },
  { id: 'Wash', label: 'Car Wash', icon: Droplets },
  { id: 'Spare', label: 'Spare Parts', icon: ShoppingCart },
  { id: 'Cars', label: 'Car Sales', icon: CarIcon },
];

function BusinessCard({ business }: { business: any }) {
  const rating = Number(business.avg_rating || business.rating || 0);
  const reviews = Number(business.review_count || 0);

  return (
    <Card className="flex flex-col h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/50 bg-card border-2 rounded-2xl">
      <div className="relative h-44 w-full group overflow-hidden bg-muted">
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
        <div className="absolute top-2 left-2">
          <Badge className="bg-white/90 text-black backdrop-blur-sm border-none shadow-sm uppercase text-[9px] font-black">
            {business.category || 'Wash'}
          </Badge>
        </div>
      </div>
      
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-xl line-clamp-1 font-bold">{business.name}</CardTitle>
          <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200 font-bold shrink-0">
            <ShieldCheck className="h-3 w-3 mr-1" /> Verified
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{business.city || 'Botswana'}</span>
        </div>
      </CardHeader>

      <CardContent className="flex-grow pb-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 pt-2 border-t border-dashed">
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
            <span className="text-[10px] text-muted-foreground">({reviews} reviews)</span>
          </div>
          
          <div className="bg-muted/30 p-2 rounded-lg border border-transparent">
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">Expertise</p>
            <p className="text-xs font-bold text-primary">View services & availability</p>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <Button asChild className="w-full font-bold rounded-xl h-11">
          <Link href={`/find-wash/${business.id}`}>View Profile</Link>
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

function MarketplaceContent() {
  const router = useRouter();
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
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // 1. Fetch Verified Businesses
      const { data: bizData, error: bizError } = await supabase
          .from('businesses')
          .select('*')
          .eq('verification_status', 'verified')
          .order('created_at', { ascending: false });
      
      if (bizError) throw bizError;
      setBusinesses(bizData || []);

      // 2. Fetch Active Cars
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

    } catch (e) {
      console.error('Directory Fetch Failure:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, [loadData]);

  const handleCategoryChange = (catId: string) => {
    setCategory(catId);
    const params = new URLSearchParams(searchParams.toString());
    if (catId === 'all') params.delete('category');
    else params.set('category', catId);
    router.push(`/find-wash?${params.toString()}`);
  };

  const filteredItems = useMemo(() => {
    const filteredBiz = businesses.filter(b => {
      const matchesSearch = b.name?.toLowerCase().includes(search.toLowerCase()) || 
                           (b.city && b.city.toLowerCase().includes(search.toLowerCase()));
      const bizCategory = b.category || 'Wash';
      const matchesCategory = category === 'all' || bizCategory.toLowerCase() === category.toLowerCase();
      return matchesSearch && matchesCategory;
    }).map(b => ({ ...b, itemType: 'business' as const }));

    const filteredCars = cars.filter(c => {
      const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) || 
                           c.make.toLowerCase().includes(search.toLowerCase()) ||
                           c.model.toLowerCase().includes(search.toLowerCase()) ||
                           (c.location && c.location.toLowerCase().includes(search.toLowerCase()));
      const matchesCategory = category === 'all' || category === 'Cars';
      return matchesSearch && matchesCategory;
    }).map(c => ({ ...c, itemType: 'car' as const }));

    // Combine and sort by created_at descending
    return [...filteredBiz, ...filteredCars].sort((a, b) => 
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
  }, [businesses, cars, search, category]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-primary font-bold hover:opacity-80 transition-opacity">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Home</span>
          </Link>
          <div className="flex items-center gap-2">
             <div className="bg-primary text-primary-foreground font-bold p-1 rounded text-[10px]">CWM</div>
            <span className="text-sm font-bold text-primary tracking-tight">Partner Directory</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" asChild><Link href="/login">Sign In</Link></Button>
            <Button size="sm" asChild><Link href="/signup">Sign Up</Link></Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 space-y-12">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
          <div className="space-y-4 max-w-4xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-2">
              <ShieldCheck className="h-3 w-3" />
              <span>Verified Automotive Experts</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">Automotive Partner Directory</h1>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Find verified car wash services, quality spare parts shops, and vehicle dealerships across Botswana.
            </p>
          </div>
          
          <Button size="lg" className="rounded-2xl shadow-xl h-14 px-8 font-black bg-blue-600 hover:bg-blue-700" asChild>
            <Link href="/marketplace/cars">
              Browse Full Showroom <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="space-y-6">
          <div className="relative max-w-2xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                placeholder="Search partners, parts, or cars..." 
                className="pl-10 h-14 bg-white border-2 rounded-2xl shadow-sm text-lg"
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
                className="rounded-full px-6 font-bold h-10 transition-all shadow-sm"
                onClick={() => handleCategoryChange(cat.id)}
              >
                <cat.icon className={cn("h-4 w-4 mr-2", category.toLowerCase() === cat.id.toLowerCase() ? "text-white" : "text-primary")} />
                {cat.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
          {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="overflow-hidden bg-card rounded-2xl">
                    <Skeleton className="h-48 w-full" />
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </Card>
              ))
          ) : filteredItems.length > 0 ? (
            filteredItems.map((item: any) => (
              item.itemType === 'business' ? (
                <BusinessCard key={item.id} business={item} />
              ) : (
                <CarCardSimple key={item.id} car={item} />
              )
            ))
          ) : (
            <div className="col-span-full py-24 text-center border-2 border-dashed rounded-3xl bg-muted/20">
              <Store className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
              <p className="text-muted-foreground font-bold text-lg">No verified listings found matching your search.</p>
              <Button variant="link" onClick={() => handleCategoryChange('all')} className="font-bold">View All Partners</Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function PublicFindWashPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4 bg-background">
          <Loader2 className="animate-spin h-10 w-10 text-primary" />
          <p className="text-muted-foreground animate-pulse font-medium">Loading Directory...</p>
      </div>
    }>
      <MarketplaceContent />
    </Suspense>
  );
}
