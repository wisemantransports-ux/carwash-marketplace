
'use client';

import { useEffect, useState, useCallback } from "react";
import { ShieldCheck, ArrowRight, Store, CheckCircle2, MessageCircle, Zap, Car as CarIcon, ShoppingCart, Droplets, MapPin, Loader2, Star } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardFooter, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const PRICING_PLANS = [
  {
    name: "Starter",
    price: "199",
    desc: "For micro-businesses starting their digital journey.",
    features: ["15 Monthly Leads", "Verified Badge", "WhatsApp Direct", "Free 14-Day Trial"],
    accent: "border-slate-800"
  },
  {
    name: "Pro",
    price: "350",
    desc: "The standard for established auto shops.",
    features: ["Unlimited Leads", "Priority Search", "Staff Management", "Advanced Analytics", "Free 14-Day Trial"],
    accent: "border-primary shadow-2xl scale-105 z-10",
    popular: true
  },
  {
    name: "Enterprise",
    price: "599",
    desc: "For groups and high-volume dealerships.",
    features: ["Multi-Location", "API Access", "Account Manager", "Custom Branding", "Free 14-Day Trial"],
    accent: "border-slate-800"
  }
];

export default function LandingPage() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFeatured = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data: bizData } = await supabase.from('businesses').select('id, name, city').eq('verification_status', 'verified');
      if (!bizData) return;
      const verifiedIds = bizData.map(b => b.id);
      const bizMap = bizData.reduce((acc: any, b: any) => { acc[b.id] = b; return acc; }, {});

      const { data } = await supabase.from('listings').select('*').eq('verified', true).in('business_id', verifiedIds).limit(3);
      if (data) setListings(data.map(l => ({ ...l, business: bizMap[l.business_id] })));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFeatured(); }, [loadFeatured]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-50 selection:bg-primary/30 font-body antialiased">
      <header className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="bg-primary shadow-lg text-white font-black p-1.5 rounded-lg text-sm">ALM</div>
            <span className="font-black text-xl tracking-tight text-white uppercase italic">AutoLink Africa</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="font-bold text-slate-300" asChild><Link href="/login">Sign In</Link></Button>
            <Button size="sm" className="font-black px-6 rounded-full" asChild><Link href="/signup">Join Now</Link></Button>
          </div>
        </div>
      </header>

      <section className="relative pt-48 pb-32 overflow-hidden">
        <div className="container relative mx-auto px-4 text-center space-y-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Verified Auto Ecosystem</span>
          </div>
          <div className="space-y-6 max-w-5xl mx-auto">
            <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-[0.9] text-white uppercase italic">
              Verified <span className="text-primary">Cars, Parts & Wash.</span>
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed font-medium">
              Buy from trusted, moderated businesses across Africa. Secure and transparent transactions.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Button size="lg" className="h-16 px-10 font-black rounded-2xl bg-primary" asChild><Link href="/find-wash?category=car">Browse Cars</Link></Button>
            <Button size="lg" className="h-16 px-10 font-black rounded-2xl bg-slate-800" asChild><Link href="/find-wash?category=spare_part">Spare Parts</Link></Button>
            <Button size="lg" className="h-16 px-10 font-black rounded-2xl bg-white text-slate-950" asChild><Link href="/find-wash?category=wash_service">Book Wash</Link></Button>
          </div>
        </div>
      </section>

      <section className="py-24 bg-white/[0.02] border-y border-white/5">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-black uppercase italic mb-12">Featured verified Listings</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {loading ? <Loader2 className="animate-spin mx-auto h-10 w-10 text-primary" /> : listings.map(l => (
              <Card key={l.id} className="bg-slate-900 border-white/5 rounded-3xl overflow-hidden text-left">
                <div className="relative h-48 bg-slate-800">
                  <Image src={l.image_url || `https://picsum.photos/seed/${l.id}/600/400`} alt={l.name} fill className="object-cover" />
                </div>
                <CardHeader>
                  <CardTitle className="text-xl text-white">{l.name}</CardTitle>
                  <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-slate-500">
                    <Store className="h-3 w-3" /> {l.business?.name} • {l.business?.city}
                  </div>
                </CardHeader>
                <CardFooter>
                  <Button className="w-full font-black uppercase text-[10px] h-12 bg-slate-800" asChild>
                    <Link href="/find-wash">View Marketplace</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-32">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-black uppercase italic mb-16">Growth Plans</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {PRICING_PLANS.map((plan) => (
              <Card key={plan.name} className={cn("bg-slate-900 border-2 rounded-[2.5rem] p-8 space-y-8 flex flex-col", plan.accent)}>
                <div className="space-y-4">
                  <h3 className="text-2xl font-black uppercase italic">{plan.name}</h3>
                  <div className="text-5xl font-black">P{plan.price}<span className="text-slate-500 text-xs">/mo</span></div>
                  <p className="text-sm text-slate-500 leading-relaxed">{plan.desc}</p>
                </div>
                <ul className="space-y-4 flex-grow text-left">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm text-slate-300">
                      <CheckCircle2 className="h-4 w-4 text-primary" /> {f}
                    </li>
                  ))}
                </ul>
                <Button className={cn("w-full h-14 font-black rounded-2xl", plan.popular ? "bg-primary" : "bg-slate-800")} asChild><Link href="/signup">Select Plan</Link></Button>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
