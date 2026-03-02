
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { MapPin, Star, ShieldCheck, Search, ShoppingCart, Car as CarIcon, Droplets, Zap, ArrowRight, Loader2, Store, Check, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState, useMemo } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

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

const PLANS = [
  { name: 'Starter', price: 199, features: ['15 booking requests/mo', '3 verified employees', 'Profile in search', 'Basic analytics'] },
  { name: 'Pro', price: 350, features: ['Unlimited bookings', '10 verified employees', 'Mobile wash support', 'Priority ranking'] },
  { name: 'Enterprise', price: 599, features: ['Unlimited everything', 'Multi-location', 'Performance reports', 'Account Manager'] }
];

export default function LandingPage() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [cars, setCars] = useState<any[]>([]);
  const [spareParts, setSpareParts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setMounted(true);
    async function loadData() {
      if (!isSupabaseConfigured) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data: bizData } = await supabase
            .from('businesses')
            .select('*')
            .or('verification_status.eq.verified,status.eq.verified')
            .order('rating', { ascending: false });
        
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
            .in('business_id', verifiedIds)
            .order('created_at', { ascending: false })
            .limit(6);
          
          setCars((carData || []).map(c => ({ ...c, business: bizMap[c.business_id] })));

          const { data: partData } = await supabase
            .from('spare_parts')
            .select('*')
            .in('status', ['active', 'available'])
            .in('business_id', verifiedIds)
            .order('created_at', { ascending: false })
            .limit(6);
          
          setSpareParts((partData || []).map(p => ({ ...p, business: bizMap[p.business_id] })));
        }
      } catch (e: any) {
        console.error("Landing discovery failure:", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const unifiedTrending = useMemo(() => {
    const bizItems = businesses.map(b => ({ ...b, itemType: 'business' }));
    const carItems = cars.map(c => ({ ...c, itemType: 'car' }));
    const partItems = spareParts.map(p => ({ ...p, itemType: 'part' }));
    return [...bizItems, ...carItems, ...partItems].sort((a, b) => 
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
  }, [businesses, cars, spareParts]);

  if (!mounted) return null;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
             <div className="bg-primary text-primary-foreground font-bold p-1 rounded text-xs">ALM</div>
            <span className="font-bold text-primary tracking-tight">AutoLink Africa</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <Link href="#categories" className="text-sm font-medium hover:text-primary transition-colors">Categories</Link>
            <Link href="#pricing" className="text-sm font-medium hover:text-primary transition-colors">Pricing</Link>
            <Link href="/find-wash" className="text-sm font-bold text-primary">Marketplace</Link>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push('/login')}>Sign In</Button>
            <Button size="sm" onClick={() => router.push('/signup')}>Get Started</Button>
          </div>
        </div>
      </header>

      <section className="pt-32 pb-20 md:pt-48 md:pb-32 bg-gradient-to-b from-primary/5 via-transparent to-transparent">
        <div className="container mx-auto px-4 text-center space-y-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border shadow-sm text-sm font-bold text-primary mb-2">
            <Zap className="h-4 w-4" />
            <span>Premium Automotive Marketplace</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1] text-slate-900 max-w-5xl mx-auto">
            Everything for your car in <span className="text-primary italic">One Place</span>.
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Discover verified car wash services, quality spare parts, and premium car sales across Botswana.
          </p>
          
          <div className="relative max-w-2xl mx-auto pt-4">
            <div className="flex flex-col sm:flex-row gap-3 p-2 bg-white rounded-2xl shadow-2xl border-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                  placeholder="Search for services, parts or cars..." 
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
      </section>

      <section id="categories" className="py-20 bg-muted/30 border-y">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {CATEGORIES.map((cat) => (
              <Link key={cat.id} href={cat.href} className="group">
                <Card className="h-full border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl group-hover:-translate-y-1">
                  <CardHeader>
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110", cat.bg, cat.color)}>
                      <cat.icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-2xl font-bold">{cat.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">{cat.desc}</p>
                  </CardContent>
                  <CardFooter className="text-primary font-bold flex items-center gap-2 group-hover:gap-3 transition-all">
                    Explore Now <ArrowRight className="h-4 w-4" />
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="trending" className="py-24 bg-white">
        <div className="container mx-auto px-4 max-w-6xl space-y-12">
          <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b pb-8">
              <div className="space-y-2">
                <h2 className="text-4xl font-extrabold tracking-tight">Trending Now</h2>
                <p className="text-muted-foreground text-lg">The latest verified listings from our professional partners.</p>
              </div>
              <Button variant="outline" size="lg" asChild className="rounded-full px-10 h-12 font-bold shadow-sm">
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
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                        <MapPin className="h-3.5 w-3.5" /> <span>{item.city || 'Available'}</span>
                      </div>
                    </CardHeader>
                    <CardFooter className="mt-auto">
                      <Button asChild className="w-full font-bold h-11 shadow-sm">
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
                    <p className="text-muted-foreground font-bold italic">No active listings found. Check back later!</p>
                </div>
            )}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-24 bg-muted/30 border-t">
        <div className="container mx-auto px-4 max-w-6xl space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-black tracking-tight">Partner Tiers</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Scale your automotive business with the platform that drives customers directly to you.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {PLANS.map((plan) => (
              <Card key={plan.name} className="flex flex-col border-2 shadow-lg transition-transform hover:scale-105">
                <CardHeader className="text-center bg-muted/10 pb-8">
                  <CardTitle className="text-2xl font-black uppercase tracking-tighter">{plan.name}</CardTitle>
                  <div className="pt-4"><span className="text-5xl font-black">P{plan.price}</span><span className="text-muted-foreground font-bold">/mo</span></div>
                </CardHeader>
                <CardContent className="flex-grow pt-8">
                  <ul className="space-y-4">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-3 text-sm font-medium"><Check className="h-4 w-4 text-green-600" /> {f}</li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full h-12 font-bold" asChild><Link href="/signup">Join as Operator</Link></Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-16 border-t bg-card text-center">
        <div className="container mx-auto px-4 space-y-4">
          <div className="flex justify-center gap-2 items-center text-primary font-bold">
            <div className="bg-primary text-white p-1 rounded text-xs">ALM</div>
            AutoLink Africa Marketplace
          </div>
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">© 2024. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
