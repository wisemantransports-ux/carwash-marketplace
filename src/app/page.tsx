
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { CheckCircle2, MapPin, Star, ShieldCheck, UserCheck, TrendingUp, XCircle, Store, Clock, Trophy } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Business } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function BusinessCard({ business }: { business: any }) {
  const isTrial = business.trial_start_date && business.trial_end_date && 
                  new Date(business.trial_start_date) <= new Date() && 
                  new Date(business.trial_end_date) >= new Date();
  
  const hasHighRating = (business.avg_rating || 0) >= 4.5;

  return (
    <Card className="flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/50 bg-card border-2">
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
            <Store className="h-12 w-12 opacity-10" />
          </div>
        )}
        <div className="absolute top-2 right-2 flex flex-col gap-2 items-end">
          {isTrial && (
            <Badge className="bg-orange-500 text-white shadow-lg font-bold border-2 border-white/20">
              <Clock className="h-3 w-3 mr-1" /> TRIAL
            </Badge>
          )}
          <Badge variant="secondary" className="backdrop-blur-md bg-white/80 text-black">
            {business.type === 'station' ? 'Station' : 'Mobile'}
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
                    s <= Math.round(business.avg_rating || 0) ? "fill-current" : "text-gray-200"
                  )} 
                />
            ))}
          </div>
          <span className="text-xs font-bold">{(business.avg_rating || 0).toFixed(1)}</span>
          <span className="text-[10px] text-muted-foreground">({business.review_count || 0} reviews)</span>
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Button asChild className="w-full shadow-md font-bold">
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
    const load = async () => {
      setLoading(true);
      try {
        const now = new Date().toISOString();
        const { data: bizData, error: bizError } = await supabase
            .from('businesses')
            .select(`
              *,
              bookings(
                status,
                ratings(rating)
              )
            `);
        
        if (bizError) throw bizError;

        const processed = (bizData || [])
            .filter(b => 
                b.verification_status === 'verified' || 
                (b.trial_start_date && b.trial_end_date && b.trial_start_date <= now && b.trial_end_date >= now)
            )
            .map(b => {
                const completedBookings = (b.bookings || []).filter((bk: any) => bk.status === 'completed');
                const ratings = completedBookings.flatMap((bk: any) => bk.ratings || []).filter(r => r.rating);
                const avg = ratings.length > 0 ? ratings.reduce((acc, r) => acc + r.rating, 0) / ratings.length : 0;
                return { ...b, avg_rating: avg, review_count: ratings.length };
            })
            .sort((a, b) => (b.avg_rating - a.avg_rating) || a.name.localeCompare(b.name));

        setBusinesses(processed);
      } catch (e) {
        console.error("Landing page fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const pricingPlans = [
    {
      name: "Starter",
      price: "P150",
      desc: "For small or single-station car wash businesses",
      features: ["1 registered location", "Up to 3 verified employees", "Station-based bookings", "Profile in search", "Verification badge"],
      notIncluded: ["Mobile service", "Priority listing"]
    },
    {
      name: "Pro",
      price: "P300",
      desc: "For established stations offering mobile service",
      features: ["Up to 10 verified employees", "Mobile services", "ID + photo verification", "Service area selection", "Higher ranking"],
      notIncluded: ["Unlimited employees", "Multi-locations"]
    },
    {
      name: "Enterprise",
      price: "P600",
      desc: "For multi-location operators",
      features: ["Unlimited employees", "Multiple locations", "Priority listing", "Advanced analytics", "Dedicated support"]
    }
  ];

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
            <Link href="#pricing" className="text-sm font-medium hover:text-primary transition-colors">Pricing</Link>
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
                <span>Verified Partners Only</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1]">
                Grow Your Car Wash Business with <span className="text-primary italic">Verified</span> Bookings.
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0">
                A secure platform where registered car wash businesses connect with nearby customers — at the station or on-site.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
                <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-lg" onClick={() => router.push('/signup?role=business-owner')}>
                  Register Your Car Wash
                </Button>
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full" onClick={() => router.push('/find-wash')}>
                  Find a Verified Wash
                </Button>
              </div>
            </div>
            <div className="flex-1 relative w-full aspect-square">
              <div className="absolute inset-0 bg-primary/10 rounded-3xl -rotate-2" />
              <div className="absolute inset-0 overflow-hidden rounded-3xl border shadow-2xl rotate-2 transition-transform hover:rotate-0 duration-500">
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

      <section className="py-24 border-y bg-muted/30 text-center">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto space-y-8">
            <h2 className="text-4xl font-bold">Verified Partners</h2>
            <p className="text-muted-foreground">Trusted businesses providing high-quality service across Botswana.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
              {!mounted || loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                      <Card key={i} className="overflow-hidden bg-card">
                        <Skeleton className="h-48 w-full" />
                        <div className="p-4 space-y-2">
                          <Skeleton className="h-6 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                        </div>
                      </Card>
                  ))
              ) : businesses.length > 0 ? (
                  businesses.slice(0, 6).map(business => (
                      <BusinessCard key={business.id} business={business} />
                  ))
              ) : (
                  <div className="col-span-full py-24 text-center border-2 border-dashed rounded-3xl bg-card">
                      <Store className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
                      <p className="text-muted-foreground font-bold">No verified businesses available at the moment.</p>
                  </div>
              )}
            </div>
            <Button variant="outline" size="lg" asChild>
              <Link href="/find-wash">View All Partners</Link>
            </Button>
          </div>
        </div>
      </section>

      <section id="safety" className="py-24 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl space-y-8">
            <h2 className="text-4xl font-bold">Safety, Accountability, and Trust</h2>
            <p className="text-xl opacity-90">Only professional, registered businesses are allowed on the platform.</p>
            <div className="grid sm:grid-cols-2 gap-8">
              <div className="space-y-4">
                <UserCheck className="h-8 w-8" />
                <h4 className="text-xl font-bold">Employee Verification</h4>
                <p className="text-sm opacity-80">Every staff member has a verified Omang/ID reference for your security.</p>
              </div>
              <div className="space-y-4">
                <TrendingUp className="h-8 w-8" />
                <h4 className="text-xl font-bold">Digital Accountability</h4>
                <p className="text-sm opacity-80">Full paper trail for every booking, ensuring quality and reliability.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-16 border-t bg-card text-center">
        <p className="text-xs text-muted-foreground">© 2024 Carwash Marketplace Botswana. Secure platform for verified businesses.</p>
      </footer>
    </div>
  );
}
