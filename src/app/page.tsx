
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { MapPin, Star, ShieldCheck, UserCheck, TrendingUp, Store, Loader2, Search, ShoppingCart, Car as CarIcon, Droplets, Check, Zap } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

const CATEGORIES = [
  { id: 'Wash', label: 'Car Wash', icon: Droplets, desc: 'Book trusted wash services near you.', color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'Spare', label: 'Spare Parts', icon: ShoppingCart, desc: 'Find parts for any car, verified sellers.', color: 'text-orange-600', bg: 'bg-orange-50' },
  { id: 'Cars', label: 'Cars for Sale', icon: CarIcon, desc: 'Browse cars from verified individuals.', color: 'text-green-600', bg: 'bg-green-50' },
];

function BusinessCard({ business }: { business: any }) {
  const rating = Number(business.rating || 0);
  const reviews = Number(business.review_count || 0);

  return (
    <Card className="flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/50 bg-card border-2 rounded-2xl h-full">
      <div className="relative h-48 w-full group overflow-hidden bg-muted">
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
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 shrink-0 text-[10px] font-bold">
            <ShieldCheck className="h-3 w-3 mr-1" /> Verified
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span>{business.city || 'Botswana'}</span>
        </div>
      </CardHeader>
      <CardContent className="flex-grow pb-4">
        <div className="flex items-center gap-1.5 pt-2">
          <div className="flex text-yellow-400">
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
          <span className="text-xs font-bold">{rating.toFixed(1)}</span>
          <span className="text-[10px] text-muted-foreground">({reviews} reviews)</span>
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Button asChild className="w-full shadow-md font-bold rounded-xl h-11">
          <Link href={`/find-wash/${business.id}`}>View Listings</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setMounted(true);
    async function load() {
      if (!isSupabaseConfigured) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase
            .from('businesses')
            .select('*')
            .eq('verification_status', 'verified')
            .order('rating', { ascending: false });
        
        if (error) throw error;
        setBusinesses(data || []);
      } catch (e) {
        console.error("Landing page fetch error:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (!mounted) return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-4 bg-background">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
        <p className="text-muted-foreground animate-pulse font-medium">Entering marketplace...</p>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
             <div className="bg-primary text-primary-foreground font-bold p-1 rounded text-xs">CWM</div>
            <span className="font-bold text-primary tracking-tight">Marketplace</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <Link href="#categories" className="text-sm font-medium hover:text-primary transition-colors">Categories</Link>
            <Link href="/find-wash" className="text-sm font-medium hover:text-primary transition-colors font-bold">Find Listings</Link>
            <Link href="#pricing" className="text-sm font-medium hover:text-primary transition-colors">Partner Pricing</Link>
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
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border shadow-sm text-sm font-bold text-primary mb-2 animate-in fade-in slide-in-from-top-4">
              <Zap className="h-4 w-4" />
              <span>All-in-One Smart Automotive Platform</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1] text-slate-900">
              Find Automotive Services & <span className="text-primary italic">Cars</span> Near You.
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Botswana's most secure marketplace for verified car wash services, quality spare parts, and vehicle sales.
            </p>
            
            {/* Universal Search Bar */}
            <div className="relative max-w-2xl mx-auto pt-4">
              <div className="flex flex-col sm:flex-row gap-3 p-2 bg-white rounded-2xl shadow-2xl border-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input 
                    placeholder="Search wash, parts, or cars..." 
                    className="pl-10 h-12 border-none bg-transparent shadow-none focus-visible:ring-0 text-lg"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button size="lg" className="h-12 px-8 font-bold rounded-xl shadow-lg" onClick={() => router.push(`/find-wash?q=${searchQuery}`)}>
                  Search Marketplace
                </Button>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {CATEGORIES.map(cat => (
                  <Button key={cat.id} variant="outline" size="sm" className="rounded-full bg-white text-[10px] font-bold h-8" asChild>
                    <Link href={`/find-wash?category=${cat.id}`}>
                      <cat.icon className={cn("h-3 w-3 mr-1.5", cat.color)} />
                      {cat.label}
                    </Link>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Grid */}
      <section id="categories" className="py-24 border-y bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center space-y-4">
                <h2 className="text-4xl font-extrabold tracking-tight">Explore Categories</h2>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Connecting you with verified automotive experts across the country.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {CATEGORIES.map((cat) => (
                <Card key={cat.id} className="relative overflow-hidden group cursor-pointer hover:border-primary/50 transition-all duration-300 border-2 rounded-3xl" onClick={() => router.push(`/find-wash?category=${cat.id}`)}>
                  <CardHeader className={cn("pb-4", cat.bg)}>
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-2 shadow-sm bg-white", cat.color)}>
                      <cat.icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-2xl font-black">{cat.label}</CardTitle>
                    <CardDescription className="font-medium text-slate-600">{cat.desc}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <ul className="space-y-2 text-sm font-medium text-muted-foreground">
                      <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Verified Listings Only</li>
                      <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Direct Coordination</li>
                      <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Secure Accountability</li>
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button variant="ghost" className="w-full font-bold group-hover:text-primary">
                      Browse Category <TrendingUp className="ml-2 h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
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
                  <h2 className="text-4xl font-extrabold tracking-tight">Trending Discovery</h2>
                  <p className="text-muted-foreground text-lg">Top-rated partners providing exceptional quality.</p>
                </div>
                <Button variant="outline" size="lg" asChild className="rounded-full px-10 h-12 font-bold shadow-sm">
                    <Link href="/find-wash">View Full Marketplace</Link>
                </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                      <Card key={i} className="overflow-hidden bg-card rounded-2xl">
                        <Skeleton className="h-48 w-full" />
                        <div className="p-6 space-y-4">
                          <Skeleton className="h-6 w-3/4" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                      </Card>
                  ))
              ) : businesses.length > 0 ? (
                  businesses.slice(0, 6).map(business => (
                      <BusinessCard key={business.id} business={business} />
                  ))
              ) : (
                  <div className="col-span-full py-24 text-center border-2 border-dashed rounded-3xl bg-card/50">
                      <Store className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
                      <p className="text-muted-foreground font-bold">Verified partners will appear here.</p>
                  </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section (Landing Page Context) */}
      <section id="pricing" className="py-24 bg-slate-900 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto space-y-16">
            <div className="text-center space-y-4">
              <Badge className="bg-primary/20 text-primary border-none font-black px-4 py-1">FOR BUSINESSES</Badge>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight">Grow Your Automotive Business</h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto">Choose a plan that fits your business scale and reach more customers.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { name: 'Starter', price: '199', desc: 'Best for individual specialists.', features: ['15 Bookings/mo', 'Verified Badge', 'Basic Analytics'] },
                { name: 'Pro', price: '350', desc: 'Best for established shops.', features: ['Unlimited Bookings', 'Priority Listing', 'Team Management'] },
                { name: 'Enterprise', price: '599', desc: 'Best for multi-location groups.', features: ['Multi-Branch Control', 'Custom Reports', 'Premium Support'] },
              ].map((plan) => (
                <Card key={plan.name} className="bg-slate-800/50 border-slate-700 text-white hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                    <div className="flex items-baseline gap-1 pt-4">
                      <span className="text-4xl font-black">P{plan.price}</span>
                      <span className="text-slate-400 text-sm">/month</span>
                    </div>
                    <CardDescription className="text-slate-400 pt-2">{plan.desc}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {plan.features.map(f => (
                      <div key={f} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full font-bold h-11" variant={plan.name === 'Pro' ? 'default' : 'outline'} onClick={() => router.push('/signup?role=business-owner')}>
                      Register Now
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="py-16 border-t bg-card text-center">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">© 2024 HydroFlow Smart Automotive Platform. Secure & Verified.</p>
      </footer>
    </div>
  );
}
