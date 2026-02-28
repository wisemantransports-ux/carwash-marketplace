
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { MapPin, Star, ShieldCheck, UserCheck, TrendingUp, Store, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function BusinessCard({ business }: { business: any }) {
  const rating = Number(business.rating || business.avg_rating || 0);
  const reviews = Number(business.review_count || 0);

  return (
    <Card className="flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/50 bg-card border-2 rounded-2xl">
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
        <div className="absolute top-3 right-3">
          <Badge variant="secondary" className="backdrop-blur-md bg-white/80 text-black font-bold uppercase text-[10px] px-3 py-1">
            {business.type === 'station' ? 'Station' : 'Mobile'}
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
        <div className="flex items-center gap-1.5">
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
          <Link href={`/find-wash/${business.id}`}>View Services</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function Home() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    async function load() {
      setLoading(true);
      try {
        // High resiliency query for verified partners
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
    <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
        <p className="text-muted-foreground animate-pulse">Entering marketplace...</p>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
             <div className="bg-primary text-primary-foreground font-bold p-1 rounded text-xs">CWM</div>
            <span className="font-bold text-primary tracking-tight">Carwash Marketplace</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <Link href="#how-it-works" className="text-sm font-medium hover:text-primary transition-colors">How it Works</Link>
            <Link href="#safety" className="text-sm font-medium hover:text-primary transition-colors">Safety & Trust</Link>
            <Link href="/find-wash" className="text-sm font-medium hover:text-primary transition-colors font-bold">Find a Wash</Link>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push('/login')}>Sign In</Button>
            <Button size="sm" onClick={() => router.push('/signup')}>Get Started</Button>
          </div>
        </div>
      </header>

      <section className="pt-32 pb-20 md:pt-48 md:pb-32 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 text-center lg:text-left space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border shadow-sm text-sm font-medium text-primary mb-2">
                <ShieldCheck className="h-4 w-4" />
                <span>Verified Platform Partners</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1]">
                Grow Your Car Wash Business with <span className="text-primary italic">Verified</span> Bookings.
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0">
                A secure platform where registered car wash businesses connect with nearby customers — at the station or on-site.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
                <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-lg font-bold" onClick={() => router.push('/signup?role=business-owner')}>
                  Register Your Car Wash
                </Button>
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full font-bold" onClick={() => router.push('/find-wash')}>
                  Find a Verified Wash
                </Button>
              </div>
            </div>
            <div className="flex-1 relative w-full aspect-square max-w-[500px] mx-auto">
              <div className="absolute inset-0 bg-primary/10 rounded-[2.5rem] -rotate-3" />
              <div className="absolute inset-0 overflow-hidden rounded-[2rem] border-4 border-white shadow-2xl rotate-3 transition-transform hover:rotate-0 duration-500">
                <Image 
                  src="https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&q=80&w=1080" 
                  alt="Car Wash Service" 
                  fill 
                  className="object-cover"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 border-y bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto space-y-12 text-center">
            <div className="space-y-4">
                <h2 className="text-4xl font-extrabold tracking-tight">Marketplace Directory</h2>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Trusted businesses providing high-quality service across Botswana.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
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
                      <p className="text-muted-foreground font-bold">Newly verified partners will appear here.</p>
                  </div>
              )}
            </div>
            {businesses.length > 0 && (
                <Button variant="outline" size="lg" asChild className="rounded-full px-10 h-12 font-bold">
                    <Link href="/find-wash">View Full Marketplace</Link>
                </Button>
            )}
          </div>
        </div>
      </section>

      <section id="safety" className="py-24 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-12">
            <div className="space-y-4">
                <h2 className="text-4xl font-extrabold tracking-tight">Safety, Accountability, and Trust</h2>
                <p className="text-xl opacity-90 max-w-2xl mx-auto">Only professional, registered businesses are allowed on the platform.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-12 text-left">
              <div className="bg-white/10 p-8 rounded-3xl backdrop-blur-sm border border-white/10 space-y-4">
                <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center">
                    <UserCheck className="h-6 w-6" />
                </div>
                <h4 className="text-xl font-bold">Employee Verification</h4>
                <p className="text-sm opacity-80 leading-relaxed">Every staff member has a verified Omang/ID reference for your security. You always know who is working on your vehicle.</p>
              </div>
              <div className="bg-white/10 p-8 rounded-3xl backdrop-blur-sm border border-white/10 space-y-4">
                <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center">
                    <TrendingUp className="h-6 w-6" />
                </div>
                <h4 className="text-xl font-bold">Digital Accountability</h4>
                <p className="text-sm opacity-80 leading-relaxed">Full digital paper trail for every booking, including timestamped status updates and verified customer feedback.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-16 border-t bg-card text-center">
        <p className="text-xs text-muted-foreground">© 2024 HydroFlow Carwash Marketplace Botswana. Secure platform for verified businesses.</p>
      </footer>
    </div>
  );
}
