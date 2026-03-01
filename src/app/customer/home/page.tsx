'use client';

import { useEffect, useState, Suspense, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, MapPin, Search, ShieldCheck, Store, Tags, Filter, Droplets, ShoppingCart, Car as CarIcon, ArrowRight, Clock, History, Package } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { CarListing, SparePart } from '@/lib/types';

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
  const displayImage = getDisplayImage(car.images, 'https://picsum.photos/seed/car/600/400');

  return (
    <Card className="flex flex-col h-[580px] overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/50 bg-card border-2 rounded-2xl group">
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
            <MapPin className="h-3 w-3" /> {car.business?.city || 'Botswana'}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {car.mileage?.toLocaleString() || 0} KM
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
          {car.description || "View this premium vehicle listing from one of our verified partners."}
        </p>
      </CardContent>
      <CardFooter className="pt-0 mt-auto">
        <Button asChild variant="outline" className="w-full font-bold h-11">
          <Link href={`/marketplace/cars/${car.id}`}>View Showroom</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function SparePartCardSimple({ part }: { part: SparePart }) {
  const displayImage = getDisplayImage(part.images, 'https://picsum.photos/seed/part/400/300');

  return (
    <Card className="flex flex-col h-[580px] overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/50 bg-card border-2 rounded-2xl group">
      <div className="relative h-48 w-full overflow-hidden bg-muted">
        <Image
          src={displayImage}
          alt={part.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          <Badge className="bg-white/90 text-black backdrop-blur-sm shadow-sm uppercase text-[9px] font-black">
            {part.category}
          </Badge>
          <Badge className={cn(
            "border-none shadow-sm uppercase text-[9px] font-black text-white",
            part.condition === 'new' ? "bg-green-600" : "bg-orange-600"
          )}>
            {part.condition}
          </Badge>
        </div>
        <div className="absolute bottom-2 right-2">
          <Badge className="bg-primary text-white font-black px-2 py-1 text-xs shadow-lg">
            P{Number(part.price).toLocaleString()}
          </Badge>
        </div>
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold line-clamp-1">{part.name}</CardTitle>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase pt-1">
          <Store className="h-3.5 w-3.5 text-primary" />
          <span className="truncate">{part.business?.name || 'Verified Seller'}</span>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed italic">
          {part.description || "Authentic automotive component available from a verified local retailer."}
        </p>
      </CardContent>
      <CardFooter className="pt-0 mt-auto">
        <Button asChild className="w-full font-bold h-11" variant="outline">
          <Link href={`/marketplace/spare-parts/${part.id}`}>View Details</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function CustomerHomeContent() {
  const searchParams = useSearchParams();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [cars, setCars] = useState<CarListing[]>([]);
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
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
      // 1. Fetch Verified Businesses (Source of truth)
      const { data: bizData } = await supabase
          .from('businesses')
          .select('*, services(*)')
          .or('verification_status.eq.verified,status.eq.verified')
          .order('name', { ascending: true });
      
      const verifiedBusinesses = bizData || [];
      const verifiedIds = verifiedBusinesses.map(b => b.id);
      setBusinesses(verifiedBusinesses);

      if (verifiedIds.length > 0) {
        // 2. Fetch Cars from Verified Partners (Resilient manual join)
        const { data: carData } = await supabase
          .from('car_listing')
          .select(`
            id, title, make, model, year, price, mileage, images, description, status, created_at, business_id,
            business:business_id ( name, city, verification_status )
          `)
          .in('status', ['active', 'available'])
          .in('business_id', verifiedIds)
          .order('created_at', { ascending: false });

        setCars((carData as any[]) || []);

        // 3. Fetch Spare Parts from Verified Partners
        const { data: partData } = await supabase
          .from('spare_parts')
          .select(`
            id, name, category, price, condition, images, stock_quantity, description, status, created_at, business_id,
            business:business_id ( name, city, verification_status )
          `)
          .eq('status', 'active')
          .in('business_id', verifiedIds)
          .order('created_at', { ascending: false });
        
        setSpareParts((partData as any[]) || []);
      } else {
        setCars([]);
        setSpareParts([]);
      }

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

  const unifiedList = useMemo(() => {
    const bizList = businesses.filter(b => {
      const matchesSearch = b.name?.toLowerCase().includes(search.toLowerCase()) || 
                           (b.city && b.city.toLowerCase().includes(search.toLowerCase()));
      const bizCategory = b.category || 'Wash';
      const matchesCategory = category === 'all' || bizCategory.toLowerCase() === category.toLowerCase();
      return matchesSearch && matchesCategory;
    }).map(b => ({ ...b, itemType: 'business' as const }));

    const carList = cars.filter(c => {
      const matchesSearch = (c.title?.toLowerCase().includes(search.toLowerCase())) || 
                           (c.make?.toLowerCase().includes(search.toLowerCase())) ||
                           (c.model?.toLowerCase().includes(search.toLowerCase()));
      const matchesCategory = category === 'all' || category.toLowerCase() === 'cars';
      return matchesSearch && matchesCategory;
    }).map(c => ({ ...c, itemType: 'car' as const }));

    const partList = spareParts.filter(p => {
      const matchesSearch = (p.name?.toLowerCase().includes(search.toLowerCase())) || 
                           (p.category?.toLowerCase().includes(search.toLowerCase()));
      const matchesCategory = category === 'all' || category.toLowerCase() === 'spare';
      return matchesSearch && matchesCategory;
    }).map(p => ({ ...p, itemType: 'part' as const }));

    // Combined list sorted by activity
    return [...bizList, ...carList, ...partList].sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    });
  }, [businesses, cars, spareParts, search, category]);

  if (!mounted) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <div className="flex-1 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
            <ShieldCheck className="h-3 w-3" />
            <span>Verified Marketplace Partners</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-primary">Automotive Partner Directory</h1>
          
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden bg-card h-[580px]">
              <Skeleton className="h-48 w-full" />
              <div className="p-6 space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </Card>
          ))
        ) : unifiedList.length > 0 ? (
          unifiedList.map((item: any) => {
            if (item.itemType === 'business') return <BusinessCard key={`biz-${item.id}`} business={item} />;
            if (item.itemType === 'car') return <CarCardSimple key={`car-${item.id}`} car={item} />;
            if (item.itemType === 'part') return <SparePartCardSimple key={`part-${item.id}`} part={item} />;
            return null;
          })
        ) : (
          <div className="col-span-full py-24 text-center border-2 border-dashed rounded-3xl bg-muted/20">
            <Store className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
            <p className="text-xl font-bold">No verified partners or listings found.</p>
            <Button variant="outline" className="mt-4" onClick={() => { setSearch(''); setCategory('all'); }}>Clear Filters</Button>
          </div>
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
