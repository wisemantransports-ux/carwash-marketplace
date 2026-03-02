
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { MapPin, Star, ShieldCheck, UserCheck, TrendingUp, Store, Loader2, Search, ShoppingCart, Car as CarIcon, Droplets, Check, Zap, ArrowRight, Clock, Package } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState, useMemo } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useTenant } from "@/hooks/use-tenant";

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
  { id: 'Wash', label: 'Car Wash', icon: Droplets, desc: 'Book trusted wash services near you.', color: 'text-blue-600', bg: 'bg-blue-50', href: '/find-wash?category=Wash' },
  { id: 'Spare', label: 'Spare Parts', icon: ShoppingCart, desc: 'Find parts for any car, verified sellers.', color: 'text-orange-600', bg: 'bg-orange-50', href: '/find-wash?category=Spare' },
  { id: 'Cars', label: 'Car Sales', icon: CarIcon, desc: 'Browse cars from verified individuals.', color: 'text-green-600', bg: 'bg-green-50', href: '/find-wash?category=Cars' },
];

export default function LandingPage() {
  const router = useRouter();
  const { tenant, loading: tenantLoading } = useTenant();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [cars, setCars] = useState<any[]>([]);
  const [spareParts, setSpareParts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setMounted(true);
    async function loadData() {
      if (!isSupabaseConfigured || !tenant) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // 1. Fetch Verified Businesses for this Tenant
        const { data: bizData, error: bizError } = await supabase
            .from('businesses')
            .select('*')
            .eq('tenant_id', tenant.id)
            .or('verification_status.eq.verified,status.eq.verified')
            .order('rating', { ascending: false });
        
        if (bizError) throw bizError;

        const verifiedBusinesses = bizData || [];
        const verifiedIds = verifiedBusinesses.map(b => b.id);
        const bizMap = verifiedBusinesses.reduce((acc: any, b: any) => {
          acc[b.id] = b;
          return acc;
        }, {});

        setBusinesses(verifiedBusinesses);

        if (verifiedIds.length > 0) {
          // 2. Fetch Cars for this Tenant
          const { data: carData } = await supabase
            .from('car_listing')
            .select('*')
            .eq('tenant_id', tenant.id)
            .in('status', ['active', 'available'])
            .in('business_id', verifiedIds)
            .order('created_at', { ascending: false })
            .limit(6);
          
          const wiredCars = (carData || []).map(c => ({
            ...c,
            business: bizMap[c.business_id] || { name: 'Verified Partner' }
          }));
          setCars(wiredCars);

          // 3. Fetch Spare Parts for this Tenant
          const { data: partData } = await supabase
            .from('spare_parts')
            .select('*')
            .eq('tenant_id', tenant.id)
            .in('status', ['active', 'available'])
            .in('business_id', verifiedIds)
            .order('created_at', { ascending: false })
            .limit(6);
          
          const wiredParts = (partData || []).map(p => ({
            ...p,
            business: bizMap[p.business_id] || { name: 'Verified Retailer' }
          }));
          setSpareParts(wiredParts);
        }
      } catch (e: any) {
        console.error("Landing discovery failure:", e);
      } finally {
        setLoading(false);
      }
    }
    if (tenant) loadData();
  }, [tenant]);

  const unifiedTrending = useMemo(() => {
    const bizItems = businesses.map(b => ({ ...b, itemType: 'business' }));
    const carItems = cars.map(c => ({ ...c, itemType: 'car' }));
    const partItems = spareParts.map(p => ({ ...p, itemType: 'part' }));
    return [...bizItems, ...carItems, ...partItems].sort((a, b) => 
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
  }, [businesses, cars, spareParts]);

  if (!mounted || tenantLoading) return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
        <p className="text-muted-foreground animate-pulse font-medium">Resolving tenant branding...</p>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
             <div className="bg-primary text-primary-foreground font-bold p-1 rounded text-xs">
               {tenant?.name?.substring(0, 3).toUpperCase() || 'AUT'}
             </div>
            <span className="font-bold text-primary tracking-tight">{tenant?.name || 'Marketplace'}</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <Link href="#categories" className="text-sm font-medium hover:text-primary transition-colors">Categories</Link>
            <Link href="/find-wash" className="text-sm font-medium hover:text-primary transition-colors font-bold">Partner Directory</Link>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push('/login')}>Sign In</Button>
            <Button size="sm" onClick={() => router.push('/signup')}>Get Started</Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 md:pt-48 md:pb-32 bg-gradient-to-b from-primary/5 via-transparent to-transparent">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border shadow-sm text-sm font-bold text-primary mb-2">
              <Zap className="h-4 w-4" />
              <span>Verified White-Label Platform</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1] text-slate-900">
              Discover {tenant?.name || 'Automotive'} <span className="text-primary italic">Expertise</span>.
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Find verified car wash services, quality spare parts, and vehicle sales powered by {tenant?.name}.
            </p>
            
            <div className="relative max-w-2xl mx-auto pt-4">
              <div className="flex flex-col sm:flex-row gap-3 p-2 bg-white rounded-2xl shadow-2xl border-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input 
                    placeholder="Search for services or products..." 
                    className="pl-10 h-12 border-none bg-transparent shadow-none focus-visible:ring-0 text-lg"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button size="lg" className="h-12 px-8 font-bold rounded-xl shadow-lg" onClick={() => router.push(`/find-wash?q=${searchQuery}`)}>
                  Search Now
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Discovery Feed */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div className="space-y-2">
                  <h2 className="text-4xl font-extrabold tracking-tight">Trending in {tenant?.name}</h2>
                  <p className="text-muted-foreground text-lg">The latest verified listings from our professional partners.</p>
                </div>
                <Button variant="outline" size="lg" asChild className="rounded-full px-10 h-12 font-bold">
                    <Link href="/find-wash">Full Directory</Link>
                </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                      <Card key={i} className="overflow-hidden bg-card rounded-2xl h-[450px]">
                        <Skeleton className="h-48 w-full" />
                        <div className="p-6 space-y-4">
                          <Skeleton className="h-6 w-3/4" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                      </Card>
                  ))
              ) : unifiedTrending.length > 0 ? (
                  unifiedTrending.slice(0, 9).map((item: any) => (
                    <Card key={`${item.itemType}-${item.id}`} className="flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl border-2 rounded-2xl h-full">
                      <div className="relative h-48 bg-muted">
                        <Image src={getDisplayImage(item.images || [item.logo_url], 'https://picsum.photos/seed/auto/600/400')} alt="Item" fill className="object-cover" />
                        <div className="absolute top-2 left-2">
                          <Badge className="bg-white/90 text-black uppercase text-[9px] font-black">{item.itemType}</Badge>
                        </div>
                      </div>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xl font-bold line-clamp-1">{item.name || item.title}</CardTitle>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" /> <span>{item.city || 'Available'}</span>
                        </div>
                      </CardHeader>
                      <CardFooter className="mt-auto">
                        <Button asChild className="w-full font-bold h-11">
                          <Link href={item.itemType === 'business' ? `/find-wash/${item.id}` : `/marketplace/${item.itemType === 'car' ? 'cars' : 'spare-parts'}/${item.id}`}>
                            View Details
                          </Link>
                        </Button>
                      </CardFooter>
                    </Card>
                  ))
              ) : (
                  <div className="col-span-full py-24 text-center border-2 border-dashed rounded-3xl bg-card/50">
                      <Store className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
                      <p className="text-muted-foreground font-bold italic">No trending activity in this marketplace yet.</p>
                  </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <footer className="py-16 border-t bg-card text-center">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">© 2024 {tenant?.name}. Powered by Retail Assist Multi-Tenant Platform.</p>
      </footer>
    </div>
  );
}
