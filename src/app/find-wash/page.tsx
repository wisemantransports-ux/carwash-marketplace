
'use client';

import { useEffect, useState, Suspense, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Search, ShieldCheck, ArrowLeft, Store, Loader2, Filter, Droplets, ShoppingCart, Car as CarIcon, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
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
      if (parts.length > 0 && parts[0]) return parts[0].replace(/"/g, '');
    } catch { return images; }
  }
  return fallback;
}

const CATEGORIES = [
  { id: 'all', label: 'All Partners', icon: Filter },
  { id: 'Wash', label: 'Car Wash', icon: Droplets },
  { id: 'Spare', label: 'Spare Parts', icon: ShoppingCart },
  { id: 'Cars', label: 'Car Sales', icon: CarIcon },
];

function MarketplaceContent() {
  const searchParams = useSearchParams();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [cars, setCars] = useState<any[]>([]);
  const [spareParts, setSpareParts] = useState<any[]>([]);
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'all');
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const loadData = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    try {
      const { data: bizData } = await supabase
          .from('businesses')
          .select('*')
          .or('verification_status.eq.verified,status.eq.verified')
          .order('name', { ascending: true });
      
      const verifiedBusinesses = bizData || [];
      const verifiedIds = verifiedBusinesses.map(b => b.id);
      const bizMap = verifiedBusinesses.reduce((acc: any, b: any) => {
        acc[b.id] = b;
        return acc;
      }, {});

      setBusinesses(verifiedBusinesses);

      if (verifiedIds.length > 0) {
        const { data: carData } = await supabase
          .from('car_listing')
          .select('*')
          .in('status', ['active', 'available'])
          .in('business_id', verifiedIds);

        setCars((carData || []).map(c => ({ ...c, business: bizMap[c.business_id] })));

        const { data: partData } = await supabase
          .from('spare_parts')
          .select('*')
          .in('status', ['active', 'available'])
          .in('business_id', verifiedIds);

        setSpareParts((partData || []).map(p => ({ ...p, business: bizMap[p.business_id] })));
      }
    } catch (e: any) {
      console.error('Discovery failure:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, [loadData]);

  const filteredItems = useMemo(() => {
    const bizList = businesses.filter(b => {
      const matchesSearch = b.name?.toLowerCase().includes(search.toLowerCase()) || 
                           (b.city && b.city.toLowerCase().includes(search.toLowerCase()));
      const bizCategory = b.category || 'Wash';
      const matchesCategory = category === 'all' || bizCategory.toLowerCase() === category.toLowerCase();
      return matchesSearch && matchesCategory;
    }).map(b => ({ ...b, itemType: 'business' as const }));

    const carList = cars.filter(c => {
      const matchesSearch = (c.title?.toLowerCase().includes(search.toLowerCase())) || 
                           (c.make?.toLowerCase().includes(search.toLowerCase()));
      const matchesCategory = category === 'all' || category.toLowerCase() === 'cars';
      return matchesSearch && matchesCategory;
    }).map(c => ({ ...c, itemType: 'car' as const }));

    const partList = spareParts.filter(p => {
      const matchesSearch = (p.name?.toLowerCase().includes(search.toLowerCase())) || 
                           (p.category?.toLowerCase().includes(search.toLowerCase()));
      const matchesCategory = category === 'all' || category.toLowerCase() === 'spare';
      return matchesSearch && matchesCategory;
    }).map(p => ({ ...p, itemType: 'part' as const }));

    return [...bizList, ...carList, ...partList].sort((a, b) => 
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
  }, [businesses, cars, spareParts, search, category]);

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
             <div className="bg-primary text-primary-foreground font-bold p-1 rounded text-xs">ALM</div>
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
            <span>Verified Platform Partners</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight">Partner Directory</h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Find verified car wash services, quality spare parts, and premium vehicle listings across Botswana.
          </p>
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
                onClick={() => setCategory(cat.id)}
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
              <Card key={`${item.itemType}-${item.id}`} className="flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl border-2 rounded-2xl h-full">
                <div className="relative h-48 bg-muted">
                  <Image src={getDisplayImage(item.images || [item.logo_url], 'https://picsum.photos/seed/auto/600/400')} alt="Item" fill className="object-cover" />
                  <div className="absolute top-2 left-2">
                    <Badge className="bg-white/90 text-black uppercase text-[9px] font-black">{item.itemType}</Badge>
                  </div>
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl font-bold line-clamp-1">{item.name || item.title}</CardTitle>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                    <MapPin className="h-3.5 w-3.5" /> <span>{item.city || 'Available'}</span>
                  </div>
                </CardHeader>
                <CardFooter className="mt-auto">
                  <Button asChild className="w-full font-bold h-11 shadow-sm">
                    <Link href={item.itemType === 'business' ? `/find-wash/${item.id}` : `/marketplace/${item.itemType === 'car' ? 'cars' : 'spare-parts'}/${item.id}`}>
                      View Profile
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))
          ) : (
            <div className="col-span-full py-24 text-center border-2 border-dashed rounded-3xl bg-muted/20">
              <Store className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
              <p className="text-muted-foreground font-bold text-lg italic">No verified listings found matching your search.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function PublicFindWashPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>}>
      <MarketplaceContent />
    </Suspense>
  );
}
