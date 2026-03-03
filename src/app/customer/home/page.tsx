'use client';

import { useEffect, useState, Suspense, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Search, ShieldCheck, Store, Filter, Droplets, ShoppingCart, Car as CarIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { id: 'all', label: 'All Partners', icon: Filter },
  { id: 'wash_service', label: 'Car Wash', icon: Droplets },
  { id: 'spare_part', label: 'Spare Parts', icon: ShoppingCart },
  { id: 'car', label: 'Car Sales', icon: CarIcon },
];

function MarketplaceContent() {
  const searchParams = useSearchParams();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [allListings, setAllListings] = useState<any[]>([]);
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'all');
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. STAGE 1: Fetch Verified Businesses
      const { data: bizData } = await supabase
          .from('businesses')
          .select('id, name, city, logo_url, verification_status, category, address')
          .eq('verification_status', 'verified')
          .order('name', { ascending: true });
      
      const partnerBusinesses = bizData || [];
      const verifiedIds = partnerBusinesses.map(b => b.id);
      const bizMap = partnerBusinesses.reduce((acc: any, b: any) => {
        acc[b.id] = b;
        return acc;
      }, {});

      setBusinesses(partnerBusinesses);

      // 2. STAGE 2: Fetch Listings for Verified Partners Only
      if (verifiedIds.length > 0) {
        const { data: listingData, error: lError } = await supabase
          .from('listings')
          .select('id, business_id, type, listing_type, name, description, price, image_url, created_at')
          .in('business_id', verifiedIds)
          .order('created_at', { ascending: false });

        if (lError) throw lError;

        // 3. STAGE 3: In-Memory Wiring
        setAllListings((listingData || []).map(l => ({ 
          ...l, 
          verified: true,
          business: bizMap[l.business_id] || { name: 'Verified Partner', city: 'Botswana' }
        })));
      } else {
        setAllListings([]);
      }
    } catch (e: any) {
      console.error('Marketplace discovery failure:', e.message || e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, [loadData]);

  const filteredItems = useMemo(() => {
    const sTerm = search.toLowerCase();

    // Interleave business profiles and individual listings
    const bizItems = businesses.filter(b => {
      const bName = (b.name || '').toLowerCase();
      const bCity = (b.city || '').toLowerCase();
      const bCat = (b.category || '').toLowerCase();
      const matchesSearch = bName.includes(sTerm) || bCity.includes(sTerm);
      
      const bizCategoryMatch = category === 'all' || 
                              (category === 'wash_service' && bCat === 'wash') ||
                              (category === 'car' && bCat === 'cars') ||
                              (category === 'spare_part' && bCat === 'spare');
      return matchesSearch && bizCategoryMatch;
    }).map(b => ({ ...b, itemType: 'business' as const }));

    const productItems = allListings.filter(l => {
      const lName = (l.name || '').toLowerCase();
      const lDesc = (l.description || '').toLowerCase();
      const matchesSearch = lName.includes(sTerm) || lDesc.includes(sTerm);
      
      const matchesCategory = category === 'all' || l.listing_type === category || l.type === category;
      return matchesSearch && matchesCategory;
    }).map(l => ({ ...l, itemType: 'product' as const }));

    const combined = [...bizItems, ...productItems].sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    });

    return combined;
  }, [businesses, allListings, search, category]);

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
                  variant={category === cat.id ? 'default' : 'outline'} 
                  size="sm" 
                  className="rounded-full px-4 font-bold h-9 transition-all shadow-sm"
                  onClick={() => setCategory(cat.id)}
                >
                  <cat.icon className={cn("h-3.5 w-3.5 mr-2", category === cat.id ? "text-white" : "text-primary")} />
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
            <Card key={i} className="overflow-hidden bg-card rounded-2xl h-[500px]">
              <Skeleton className="h-48 w-full" />
              <div className="p-6 space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-10 w-full" />
              </div>
            </Card>
          ))
        ) : filteredItems.length > 0 ? (
          filteredItems.map((item: any) => (
            <Card key={`${item.itemType}-${item.id}`} className="flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl border-2 rounded-2xl h-full group">
              <div className="relative h-48 bg-muted overflow-hidden">
                <Image 
                  src={item.itemType === 'business' ? (item.logo_url || `https://picsum.photos/seed/biz-${item.id}/600/400`) : (item.image_url || `https://picsum.photos/seed/list-${item.id}/600/400`)} 
                  alt={item.name} 
                  fill 
                  className="object-cover transition-transform duration-500 group-hover:scale-110" 
                />
                <div className="absolute top-2 left-2">
                  <Badge className="bg-white/90 text-black uppercase text-[9px] font-black shadow-sm">
                    {item.itemType === 'business' ? (item.category || 'Operator') : (item.listing_type || item.type).replace('_', ' ')}
                  </Badge>
                </div>
                <div className="absolute top-2 right-2">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[9px] font-black uppercase shadow-sm">
                    <ShieldCheck className="h-2.5 w-2.5 mr-1" /> Verified
                  </Badge>
                </div>
                {item.price && (
                  <div className="absolute bottom-2 right-2">
                    <Badge className="bg-primary text-white font-black px-3 py-1 shadow-lg">
                      P{Number(item.price).toLocaleString()}
                    </Badge>
                  </div>
                )}
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl font-bold line-clamp-1 group-hover:text-primary transition-colors">{item.name}</CardTitle>
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-bold uppercase tracking-wider">
                  <MapPin className="h-3.5 w-3.5 text-primary opacity-60" /> 
                  <span>{item.itemType === 'business' ? item.city : item.business?.city || 'Botswana'}</span>
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed italic">
                  {item.description || item.address || "Automotive component or service from our trusted partner network."}
                </p>
              </CardContent>
              <CardFooter className="mt-auto flex flex-col gap-2">
                <Button asChild className="w-full font-black h-11 shadow-sm uppercase">
                  <Link href={item.itemType === 'business' || item.listing_type === 'wash_service' || item.type === 'wash_service' ? `/customer/book/${item.itemType === 'business' ? item.id : item.business_id}` : `/marketplace/${item.listing_type === 'car' || item.type === 'car' ? 'cars' : 'spare-parts'}/${item.id}`}>
                    {item.itemType === 'business' ? 'View Profile' : 'View Details'}
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-24 text-center border-2 border-dashed rounded-3xl bg-muted/20">
            <Store className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
            <p className="text-xl font-bold">No partners or listings found.</p>
            <Button variant="outline" className="mt-4" onClick={() => { setSearch(''); setCategory('all'); }}>Clear Filters</Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CustomerHomePage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>}>
      <MarketplaceContent />
    </Suspense>
  );
}
