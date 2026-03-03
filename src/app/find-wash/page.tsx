'use client';

import { useEffect, useState, Suspense, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Search, ShieldCheck, ArrowLeft, Store, Loader2, Filter, Droplets, ShoppingCart, Car as CarIcon, ArrowRight, History, MessageCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

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
      if (parts.length > 0 && parts[0]) return parts[0].replace(/"/g, '').trim();
    } catch { return images; }
  }
  return fallback;
}

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
    if (!isSupabaseConfigured) return;
    setLoading(true);
    try {
      // Stage 1: The Source of Truth (Verified Businesses Only)
      const { data: verifiedBiz, error: bizError } = await supabase
          .from('businesses')
          .select('id, name, city, logo_url, verification_status, category')
          .eq('verification_status', 'verified');
      
      if (bizError) throw bizError;

      const partnerBusinesses = verifiedBiz || [];
      const verifiedIds = partnerBusinesses.map(b => b.id);
      const bizMap = partnerBusinesses.reduce((acc: any, b: any) => {
        acc[b.id] = b;
        return acc;
      }, {});

      setBusinesses(partnerBusinesses);

      // Stage 2: Parallel Product Fetching (Only from Verified IDs)
      const { data: listingData, error: listingError } = await supabase
        .from('listings')
        .select('id, business_id, type, listing_type, name, description, price, created_at, images')
        .in('business_id', verifiedIds)
        .order('created_at', { ascending: false });

      if (listingError) throw listingError;

      // Stage 3: In-Memory Wiring
      setAllListings((listingData || []).map(l => ({ 
        ...l, 
        verified: true,
        business: bizMap[l.business_id] || { name: 'Verified Partner', city: 'Botswana' }
      })));
    } catch (e: any) {
      console.error('Marketplace discovery failure:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, [loadData]);

  const filteredItems = useMemo(() => {
    // Interleave business profiles and individual listings
    const bizItems = businesses.filter(b => {
      const matchesSearch = b.name?.toLowerCase().includes(search.toLowerCase()) || 
                           (b.city && b.city.toLowerCase().includes(search.toLowerCase()));
      
      const bizCategoryMatch = category === 'all' || 
                              (category === 'wash_service' && b.category === 'Wash') ||
                              (category === 'car' && b.category === 'Cars') ||
                              (category === 'spare_part' && b.category === 'Spare');
      return matchesSearch && bizCategoryMatch;
    }).map(b => ({ ...b, itemType: 'business' as const, verified: true }));

    const productItems = allListings.filter(l => {
      const matchesSearch = (l.name?.toLowerCase().includes(search.toLowerCase())) || 
                           (l.description && l.description.toLowerCase().includes(search.toLowerCase()));
      
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
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-primary font-bold hover:opacity-80 transition-opacity">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Home</span>
          </Link>
          <div className="flex items-center gap-2">
             <div className="bg-primary text-primary-foreground font-black p-1 rounded text-xs">ALM</div>
            <span className="text-sm font-bold text-primary tracking-tight">AutoLink Directory</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" asChild><Link href="/login">Sign In</Link></Button>
            <Button size="sm" asChild><Link href="/signup">Sign Up</Link></Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 space-y-12">
        <div className="space-y-4 max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
            <ShieldCheck className="h-3 w-3" />
            <span>Premium Marketplace Partners</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Find Cars, Spare Parts, or Carwash Services</h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Discover verified automotive solutions across Botswana. Genuine parts, elite detailing, and high-quality vehicles.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-end justify-between bg-white/50 backdrop-blur-sm p-6 rounded-3xl border-2 shadow-sm">
          <div className="flex-1 w-full space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Marketplace Discovery</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                placeholder="Search by model, part, or location…" 
                className="pl-10 h-14 bg-white border-2 rounded-2xl shadow-sm text-lg"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 w-full lg:w-auto">
            <div className="space-y-2 flex-1 lg:w-64">
              <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Category</Label>
              <div className="flex bg-muted/50 p-1 rounded-xl border">
                {CATEGORIES.map(cat => (
                  <Button 
                    key={cat.id} 
                    variant={category === cat.id ? 'default' : 'ghost'} 
                    size="sm" 
                    className="flex-1 rounded-lg font-bold h-9 transition-all text-[10px]"
                    onClick={() => setCategory(cat.id)}
                  >
                    {cat.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
          {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="overflow-hidden bg-card rounded-2xl h-[500px]">
                    <Skeleton className="h-48 w-full" />
                    <div className="p-4 space-y-4">
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
                    src={item.itemType === 'business' ? (item.logo_url || 'https://picsum.photos/seed/biz/600/400') : getDisplayImage(item.images, 'https://picsum.photos/seed/auto/600/400')} 
                    alt={item.name} 
                    fill 
                    className="object-cover transition-transform duration-500 group-hover:scale-110" 
                  />
                  <div className="absolute top-2 left-2">
                    <Badge className="bg-white/90 text-black uppercase text-[9px] font-black shadow-sm">
                      {item.itemType === 'business' ? (item.category || 'Operator') : (item.listing_type || item.type).replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                    {item.verified && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[9px] font-black uppercase shadow-sm">
                        <ShieldCheck className="h-2.5 w-2.5 mr-1" /> Verified
                      </Badge>
                    )}
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
                    <MapPin className="h-3.5 w-3.5" /> <span>{item.itemType === 'business' ? item.city : item.business?.city || 'Botswana'}</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                    {item.description || item.address || "Automotive solution available from our trusted partner network."}
                  </p>
                </CardContent>
                <CardFooter className="mt-auto flex flex-col gap-2">
                  <Button asChild className="w-full font-bold h-11 shadow-sm">
                    <Link href={item.itemType === 'business' || item.type === 'wash_service' || item.listing_type === 'wash_service' ? `/find-wash/${item.itemType === 'business' ? item.id : item.business_id}` : `/marketplace/${item.listing_type === 'car' || item.type === 'car' ? 'cars' : 'spare-parts'}/${item.id}`}>
                      {item.itemType === 'business' ? 'View Profile' : 'View Details'}
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" className="w-full h-10 font-bold border-green-600/20 hover:bg-green-600 hover:text-white transition-all group">
                    <MessageCircle className="h-4 w-4 mr-2 text-green-600 group-hover:text-white" /> AI Help → WhatsApp
                  </Button>
                </CardFooter>
              </Card>
            ))
          ) : (
            <div className="col-span-full py-24 text-center border-2 border-dashed rounded-3xl bg-muted/20">
              <History className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
              <p className="text-muted-foreground font-bold text-lg">No verified listings found matching your search.</p>
              <Button variant="link" className="mt-2 font-bold" onClick={() => { setSearch(''); setCategory('all'); }}>
                Clear all filters
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function PublicFindWashPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>}>
      <MarketplaceContent />
    </Suspense>
  );
}