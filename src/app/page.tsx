'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { MapPin, ShieldCheck, Search, ShoppingCart, Car as CarIcon, Droplets, ArrowRight, Loader2, Store, Check, Star, MessageCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState, useMemo } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

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
      if (parts.length > 0 && parts[0]) return parts[0].replace(/"/g, '').trim();
    } catch { return images; }
  }
  return fallback;
}

const CATEGORIES = [
  { id: 'Wash', label: 'Car Wash', icon: Droplets, desc: 'Premium wash & detailing services.', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', href: '/find-wash?category=wash_service' },
  { id: 'Spare', label: 'Spare Parts', icon: ShoppingCart, desc: 'Genuine parts from verified sellers.', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', href: '/find-wash?category=spare_part' },
  { id: 'Cars', label: 'Car Sales', icon: CarIcon, desc: 'Verified vehicles & dealerships.', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', href: '/find-wash?category=car' },
];

const PLANS = [
  { name: 'Starter', price: 199, desc: 'For small specialists', features: ['15 booking requests/mo', '3 verified employees', 'Business profile in search', 'Basic analytics'] },
  { name: 'Pro', price: 350, desc: 'For established shops', features: ['Unlimited bookings', '10 verified employees', 'Mobile wash support', 'Priority ranking', 'Review management'], popular: true },
  { name: 'Enterprise', price: 599, desc: 'For auto groups', features: ['Unlimited everything', 'Multi-location controls', 'Advanced performance reports', 'Dedicated Account Manager'] }
];

export default function LandingPage() {
  const router = useRouter();
  const [listings, setListings] = useState<any[]>([]);
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
        // Stage 1: Verified Businesses Only
        const { data: bizData } = await supabase
            .from('businesses')
            .select('id, name, city, logo_url, verification_status')
            .eq('verification_status', 'verified');
        
        const allBusinesses = bizData || [];
        const verifiedIds = allBusinesses.map(b => b.id);
        const bizMap = allBusinesses.reduce((acc: any, b: any) => {
          acc[b.id] = b;
          return acc;
        }, {});

        // Stage 2: Fetch Listings linked to Verified Partners
        let wiredListings: any[] = [];
        if (verifiedIds.length > 0) {
          const { data: listingData, error: listingError } = await supabase
            .from('listings')
            .select('id, business_id, type, listing_type, name, description, price, created_at')
            .in('business_id', verifiedIds)
            .order('created_at', { ascending: false })
            .limit(12);
          
          if (listingError) throw listingError;

          // Stage 3: Manual Wiring
          wiredListings = (listingData || []).map(l => ({ 
            ...l, 
            verified: true,
            business: bizMap[l.business_id] || { name: 'Verified Partner', city: 'Botswana' }
          }));
        }

        setListings(wiredListings);
      } catch (e: any) {
        console.error("Landing discovery failure:", e?.message || e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex flex-col min-h-screen bg-[#020617] text-white selection:bg-primary/30">
      <header className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="bg-primary shadow-[0_0_20px_rgba(32,128,223,0.4)] text-white font-black p-1.5 rounded-lg text-sm tracking-tighter">ALM</div>
            <span className="font-black text-xl tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">AutoLink Africa</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <Link href="#categories" className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">Categories</Link>
            <Link href="#pricing" className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">Partner Plans</Link>
            <Link href="/find-wash" className="text-sm font-black text-primary hover:brightness-125 transition-all">Marketplace</Link>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="font-bold text-slate-300 hover:text-white hover:bg-white/5" onClick={() => router.push('/login')}>Sign In</Button>
            <Button size="sm" className="font-black px-6 rounded-full shadow-[0_0_20px_rgba(32,128,223,0.3)]" onClick={() => router.push('/signup')}>Get Started</Button>
          </div>
        </div>
      </header>

      <section className="relative pt-40 pb-24 md:pt-56 md:pb-40 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full opacity-50" />
            <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[100px] rounded-full opacity-30" />
        </div>

        <div className="container relative mx-auto px-4 text-center space-y-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl animate-in fade-in slide-in-from-top-4 duration-700">
            <Sparkles className="h-4 w-4 text-primary fill-primary" />
            <span className="text-xs font-black uppercase tracking-widest text-primary">Africa's Elite Automotive Network</span>
          </div>
          
          <div className="space-y-6 max-w-5xl mx-auto">
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.95] text-white animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
              Drive with Confidence. <br />
              <span className="bg-gradient-to-r from-primary via-blue-400 to-white bg-clip-text text-transparent">Find Everything You Need.</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed font-medium animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
              Connect with verified local businesses for premium car sales, genuine parts, and elite detailing. 
              Powered by AI for instant WhatsApp coordination and guaranteed trust.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
            <Button size="lg" className="h-16 px-8 text-md font-black rounded-2xl shadow-2xl hover:scale-[1.03] transition-all bg-green-600 hover:bg-green-700" asChild>
              <Link href="/find-wash?category=car">
                <CarIcon className="mr-2 h-5 w-5" /> Search Cars
              </Link>
            </Button>
            <Button size="lg" className="h-16 px-8 text-md font-black rounded-2xl shadow-2xl hover:scale-[1.03] transition-all bg-orange-600 hover:bg-orange-700" asChild>
              <Link href="/find-wash?category=spare_part">
                <ShoppingCart className="mr-2 h-5 w-5" /> Find Spare Parts
              </Link>
            </Button>
            <Button size="lg" className="h-16 px-8 text-md font-black rounded-2xl shadow-2xl hover:scale-[1.03] transition-all bg-blue-600 hover:bg-blue-700" asChild>
              <Link href="/find-wash?category=wash_service">
                <Droplets className="mr-2 h-5 w-5" /> Book Carwash
              </Link>
            </Button>
          </div>

          <div className="relative max-w-2xl mx-auto pt-12 animate-in fade-in zoom-in-95 duration-1000 delay-500">
            <div className="flex flex-col sm:flex-row gap-3 p-3 bg-slate-900/50 backdrop-blur-2xl rounded-[2rem] shadow-2xl border border-white/10 ring-1 ring-white/5">
              <div className="flex-1 relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-primary transition-colors" />
                <Input 
                  placeholder="Search car model, spare part, or location…" 
                  className="pl-12 h-14 border-none bg-transparent shadow-none focus-visible:ring-0 text-lg placeholder:text-slate-600 font-medium"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button size="lg" className="h-14 px-10 font-black rounded-2xl shadow-lg hover:brightness-110" onClick={() => router.push(`/find-wash?q=${searchQuery}`)}>
                Discover
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section id="categories" className="py-24 bg-slate-950 border-y border-white/5">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {CATEGORIES.map((cat) => (
              <Link key={cat.id} href={cat.href} className="group">
                <Card className="h-full bg-slate-900/40 border-white/5 hover:border-primary/40 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(32,128,223,0.1)] group-hover:-translate-y-2 overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                    <cat.icon className="h-32 w-32" />
                  </div>
                  <CardHeader className="relative z-10">
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500 group-hover:scale-110 shadow-lg border", cat.bg, cat.color, cat.border)}>
                      <cat.icon className="h-7 w-7" />
                    </div>
                    <CardTitle className="text-3xl font-black text-white">{cat.label}</CardTitle>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <p className="text-slate-400 font-medium leading-relaxed text-lg">{cat.desc}</p>
                  </CardContent>
                  <CardFooter className="relative z-10 text-primary font-black flex items-center gap-2 group-hover:gap-4 transition-all uppercase tracking-widest text-xs">
                    Access Catalog <ArrowRight className="h-4 w-4" />
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="trending" className="py-32 bg-[#020617] relative">
        <div className="container mx-auto px-4 max-w-7xl space-y-16">
          <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/5 pb-12">
              <div className="space-y-3">
                <h2 className="text-5xl font-black tracking-tighter text-white">Trending Discovery</h2>
                <p className="text-slate-400 text-lg font-medium">The latest elite listings from our verified partners.</p>
              </div>
              <Button variant="outline" size="lg" asChild className="rounded-full border-white/10 hover:bg-white/5 h-14 px-10 font-black tracking-tight shadow-2xl transition-all">
                  <Link href="/find-wash">Full Marketplace</Link>
              </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="overflow-hidden bg-slate-900/50 border-white/5 rounded-[2rem] h-[500px]">
                      <Skeleton className="h-56 w-full" />
                      <div className="p-8 space-y-6">
                        <Skeleton className="h-8 w-3/4 bg-white/5" />
                        <Skeleton className="h-20 w-full bg-white/5" />
                        <Skeleton className="h-12 w-full bg-white/5" />
                      </div>
                    </Card>
                ))
            ) : listings.length > 0 ? (
                listings.map((item: any) => (
                  <Card key={item.id} className="flex flex-col overflow-hidden transition-all duration-500 hover:shadow-[0_30px_60px_rgba(0,0,0,0.5)] border-white/5 hover:border-primary/30 bg-slate-900/30 rounded-[2rem] h-full group">
                    <div className="relative h-56 bg-slate-800 overflow-hidden">
                      <Image src={getDisplayImage(item.images, 'https://picsum.photos/seed/auto/600/400')} alt={item.name} fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent opacity-60" />
                      <div className="absolute top-4 left-4">
                        <Badge className="bg-slate-950/80 backdrop-blur-md text-white border-none uppercase text-[10px] font-black tracking-widest px-3 py-1 shadow-2xl">
                          {(item.listing_type || item.type).replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="absolute top-4 right-4">
                        {item.verified && (
                          <div className="bg-green-500/20 backdrop-blur-md border border-green-500/30 p-1.5 rounded-full shadow-2xl">
                            <ShieldCheck className="h-4 w-4 text-green-400" />
                          </div>
                        )}
                      </div>
                      {item.price && (
                        <div className="absolute bottom-4 right-4">
                          <div className="bg-primary shadow-2xl text-white font-black px-4 py-2 rounded-xl text-sm">
                            P{Number(item.price).toLocaleString()}
                          </div>
                        </div>
                      )}
                    </div>
                    <CardHeader className="p-8 pb-4">
                      <CardTitle className="text-2xl font-black text-white line-clamp-1 group-hover:text-primary transition-colors duration-300">{item.name}</CardTitle>
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-bold uppercase tracking-widest mt-2">
                        <MapPin className="h-4 w-4 text-primary" /> <span>{item.business?.city || 'Available Nationwide'}</span>
                      </div>
                    </CardHeader>
                    <CardFooter className="p-8 pt-0 mt-auto flex flex-col gap-3">
                      <Button asChild className="w-full font-black rounded-xl h-14 shadow-2xl transition-all hover:scale-[1.02]">
                        <Link href={item.type === 'wash_service' ? `/find-wash/${item.business_id}` : `/marketplace/${item.type === 'car' ? 'cars' : 'spare-parts'}/${item.id}`}>
                          View Particulars
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" className="w-full h-10 font-bold border-white/10 hover:bg-green-600/10 hover:text-green-400">
                        <MessageCircle className="h-4 w-4 mr-2" /> AI Help → WhatsApp
                      </Button>
                    </CardFooter>
                  </Card>
                ))
            ) : (
                <div className="col-span-full py-32 text-center border-2 border-dashed border-white/5 rounded-[3rem] bg-white/[0.02]">
                    <div className="bg-white/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Store className="h-10 w-10 text-slate-600" />
                    </div>
                    <p className="text-slate-500 font-bold text-xl italic">Verified listings are currently being refreshed.</p>
                    <p className="text-sm text-slate-600 mt-2">Discover elite automotive solutions in your area.</p>
                </div>
            )}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-32 bg-slate-950 border-t border-white/5">
        <div className="container mx-auto px-4 max-w-6xl space-y-20">
          <div className="text-center space-y-6 max-w-3xl mx-auto">
            <h2 className="text-5xl md:text-6xl font-black tracking-tighter text-white">Partner Growth Plans</h2>
            <p className="text-slate-400 text-lg font-medium">Join the professional network scaling automotive commerce in Botswana.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {PLANS.map((plan) => (
              <Card key={plan.name} className={cn(
                "flex flex-col border-white/5 bg-slate-900/40 relative overflow-hidden transition-all duration-500 hover:scale-[1.05] hover:shadow-[0_30px_60px_rgba(32,128,223,0.15)] rounded-[2.5rem]",
                plan.popular && "border-primary/40 ring-1 ring-primary/20 shadow-2xl"
              )}>
                {plan.popular && (
                    <div className="absolute top-0 right-0 bg-primary text-white text-[10px] font-black uppercase tracking-widest px-6 py-2 rounded-bl-3xl shadow-2xl">
                        Elite Choice
                    </div>
                )}
                <CardHeader className="text-center p-10 bg-white/[0.02] border-b border-white/5">
                  <CardTitle className="text-2xl font-black uppercase tracking-widest text-slate-400 mb-2">{plan.name}</CardTitle>
                  <p className="text-xs text-slate-500 font-bold mb-6">{plan.desc}</p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-6xl font-black text-white">P{plan.price}</span>
                    <span className="text-slate-500 font-bold">/mo</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow p-10 space-y-6">
                  <ul className="space-y-5">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-4 text-sm font-semibold text-slate-300">
                        <div className="bg-primary/20 p-1 rounded-full"><Check className="h-4 w-4 text-primary" /></div>
                        {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="p-10 pt-0">
                  <Button className={cn(
                    "w-full h-16 font-black rounded-2xl shadow-2xl transition-all",
                    !plan.popular && "bg-white/5 hover:bg-white/10 text-white"
                  )} asChild>
                    <Link href="/signup">Join Elite Network</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-24 border-t border-white/5 bg-slate-950 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        <div className="container mx-auto px-4 text-center space-y-10">
          <div className="flex flex-col items-center gap-6">
            <div className="flex justify-center gap-3 items-center text-white font-black text-2xl tracking-tighter">
                <div className="bg-primary p-1.5 rounded-lg text-sm">ALM</div>
                AutoLink Africa <span className="text-slate-500 font-medium">Marketplace</span>
            </div>
            <div className="flex gap-8 text-sm font-bold text-slate-500">
                <Link href="#" className="hover:text-primary transition-colors">Privacy Protocol</Link>
                <Link href="#" className="hover:text-primary transition-colors">Service Terms</Link>
                <Link href="#" className="hover:text-primary transition-colors">Safety Guide</Link>
            </div>
          </div>
          <p className="text-xs text-slate-600 font-black uppercase tracking-[0.3em]">© 2024. Engineering Automotive Excellence.</p>
        </div>
      </footer>
    </div>
  );
}