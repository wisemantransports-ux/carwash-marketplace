'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { MapPin, ShieldCheck, Search, ShoppingCart, Car as CarIcon, Droplets, ArrowRight, Loader2, Store, Check, Sparkles } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

const CATEGORIES = [
  { id: 'Wash', label: 'Car Wash', icon: Droplets, desc: 'Premium wash & detailing services.', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', href: '/find-wash?category=wash_service' },
  { id: 'Spare', label: 'Spare Parts', icon: ShoppingCart, desc: 'Genuine parts from verified sellers.', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', href: '/find-wash?category=spare_part' },
  { id: 'Cars', label: 'Car Sales', icon: CarIcon, desc: 'Verified vehicles & dealerships.', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', href: '/find-wash?category=car' },
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
        // 1. Fetch Verified Businesses
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

        // 2. Fetch Listings linked to Verified Partners
        if (verifiedIds.length > 0) {
          const { data: listingData, error: listingError } = await supabase
            .from('listings')
            .select('id, business_id, type, listing_type, name, description, price, created_at')
            .in('business_id', verifiedIds)
            .order('created_at', { ascending: false })
            .limit(12);
          
          if (listingError) throw listingError;

          setListings((listingData || []).map(l => ({ 
            ...l, 
            verified: true,
            business: bizMap[l.business_id] || { name: 'Verified Partner', city: 'Botswana' }
          })));
        }
      } catch (e: any) {
        console.error("Landing discovery failure:", e.message || e);
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
            <Link href="/find-wash" className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">Directory</Link>
            <Link href="/login" className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">Partner Access</Link>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="font-bold text-slate-300 hover:text-white hover:bg-white/5" onClick={() => router.push('/login')}>Sign In</Button>
            <Button size="sm" className="font-black px-6 rounded-full shadow-[0_0_20px_rgba(32,128,223,0.3)]" onClick={() => router.push('/signup')}>Join Us</Button>
          </div>
        </div>
      </header>

      <section className="relative pt-40 pb-24 md:pt-56 md:pb-40 overflow-hidden">
        <div className="container relative mx-auto px-4 text-center space-y-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl">
            <Sparkles className="h-4 w-4 text-primary fill-primary" />
            <span className="text-xs font-black uppercase tracking-widest text-primary">Elite Automotive Network</span>
          </div>
          
          <div className="space-y-6 max-w-5xl mx-auto">
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.95] text-white">
              The Hub for <br />
              <span className="bg-gradient-to-r from-primary via-blue-400 to-white bg-clip-text text-transparent">Automotive Excellence.</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed font-medium">
              Discover verified local partners for premium sales, parts, and elite detailing. 
              Frictionless coordination, maximum trust.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Button size="lg" className="h-16 px-8 text-md font-black rounded-2xl shadow-2xl hover:scale-[1.03] transition-all bg-green-600 hover:bg-green-700" asChild>
              <Link href="/find-wash?category=car">
                <CarIcon className="mr-2 h-5 w-5" /> Search Cars
              </Link>
            </Button>
            <Button size="lg" className="h-16 px-8 text-md font-black rounded-2xl shadow-2xl hover:scale-[1.03] transition-all bg-orange-600 hover:bg-orange-700" asChild>
              <Link href="/find-wash?category=spare_part">
                <ShoppingCart className="mr-2 h-5 w-5" /> Spare Parts
              </Link>
            </Button>
            <Button size="lg" className="h-16 px-8 text-md font-black rounded-2xl shadow-2xl hover:scale-[1.03] transition-all bg-blue-600 hover:bg-blue-700" asChild>
              <Link href="/find-wash?category=wash_service">
                <Droplets className="mr-2 h-5 w-5" /> Book Carwash
              </Link>
            </Button>
          </div>

          <div className="relative max-w-2xl mx-auto pt-12">
            <div className="flex flex-col sm:flex-row gap-3 p-3 bg-slate-900/50 backdrop-blur-2xl rounded-[2rem] shadow-2xl border border-white/10">
              <div className="flex-1 relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                <Input 
                  placeholder="What are you looking for today?..." 
                  className="pl-12 h-14 border-none bg-transparent shadow-none focus-visible:ring-0 text-lg placeholder:text-slate-600 font-medium"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button size="lg" className="h-14 px-10 font-black rounded-2xl shadow-lg" onClick={() => router.push(`/find-wash?q=${searchQuery}`)}>
                Explore
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section id="trending" className="py-32 bg-[#020617] relative">
        <div className="container mx-auto px-4 max-w-7xl space-y-16">
          <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/5 pb-12">
              <div className="space-y-3 text-left">
                <h2 className="text-5xl font-black tracking-tighter text-white">Live Catalog</h2>
                <p className="text-slate-400 text-lg font-medium">Recently listed by our verified elite partners.</p>
              </div>
              <Button variant="outline" size="lg" asChild className="rounded-full border-white/10 hover:bg-white/5 h-14 px-10 font-black tracking-tight shadow-2xl">
                  <Link href="/find-wash">View Full Directory</Link>
              </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="overflow-hidden bg-slate-900/50 border-white/5 rounded-[2rem] h-[450px]">
                      <Skeleton className="h-56 w-full" />
                      <div className="p-8 space-y-6">
                        <Skeleton className="h-8 w-3/4 bg-white/5" />
                        <Skeleton className="h-20 w-full bg-white/5" />
                      </div>
                    </Card>
                ))
            ) : listings.length > 0 ? (
                listings.map((item: any) => (
                  <Card key={item.id} className="flex flex-col overflow-hidden transition-all duration-500 hover:shadow-[0_30px_60px_rgba(32,128,223,0.1)] border-white/5 hover:border-primary/30 bg-slate-900/30 rounded-[2rem] h-full group">
                    <div className="relative h-56 bg-slate-800 overflow-hidden">
                      <Image src={`https://picsum.photos/seed/home-${item.id}/600/400`} alt={item.name} fill className="object-cover transition-transform duration-700 group-hover:scale-110" data-ai-hint="car parts wash" />
                      <div className="absolute top-4 left-4">
                        <Badge className="bg-slate-950/80 backdrop-blur-md text-white border-none uppercase text-[10px] font-black tracking-widest px-3 py-1">
                          {(item.listing_type || item.type || 'Verified Listing').replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="absolute top-4 right-4">
                        <div className="bg-green-500/20 backdrop-blur-md border border-green-500/30 p-1.5 rounded-full">
                          <ShieldCheck className="h-4 w-4 text-green-400" />
                        </div>
                      </div>
                      {item.price && (
                        <div className="absolute bottom-4 right-4">
                          <div className="bg-primary shadow-2xl text-white font-black px-4 py-2 rounded-xl text-sm">
                            P{Number(item.price).toLocaleString()}
                          </div>
                        </div>
                      )}
                    </div>
                    <CardHeader className="p-8 pb-4 text-left">
                      <CardTitle className="text-2xl font-black text-white line-clamp-1 group-hover:text-primary transition-colors">{item.name}</CardTitle>
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-bold uppercase tracking-widest mt-2">
                        <MapPin className="h-4 w-4 text-primary opacity-60" /> <span>{item.business?.city || 'Available Nationwide'}</span>
                      </div>
                    </CardHeader>
                    <CardFooter className="p-8 pt-0 mt-auto">
                      <Button asChild className="w-full font-black rounded-xl h-14 shadow-2xl transition-all">
                        <Link href={item.listing_type === 'wash_service' || item.type === 'wash_service' ? `/find-wash/${item.business_id}` : `/marketplace/${(item.listing_type || item.type) === 'car' ? 'cars' : 'spare-parts'}/${item.id}`}>
                          View Particulars
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ))
            ) : (
                <div className="col-span-full py-32 text-center border-2 border-dashed border-white/5 rounded-[3rem] bg-white/[0.02]">
                    <Store className="h-12 w-12 mx-auto text-slate-600 mb-4" />
                    <p className="text-slate-500 font-bold text-xl italic">Our elite catalog is being updated. Explore the full directory below.</p>
                    <Button className="mt-6" onClick={() => router.push('/find-wash')}>Full Directory</Button>
                </div>
            )}
          </div>
        </div>
      </section>

      <footer className="py-24 border-t border-white/5 bg-slate-950 relative">
        <div className="container mx-auto px-4 text-center space-y-10">
          <div className="flex flex-col items-center gap-6">
            <div className="flex justify-center gap-3 items-center text-white font-black text-2xl tracking-tighter">
                <div className="bg-primary p-1.5 rounded-lg text-sm">ALM</div>
                AutoLink Africa
            </div>
            <p className="text-slate-500 font-medium">The most trusted automotive marketplace in Botswana.</p>
          </div>
          <p className="text-xs text-slate-600 font-black uppercase tracking-[0.3em]">© 2024. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}