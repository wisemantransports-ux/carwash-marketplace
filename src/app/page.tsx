
'use client';

import { useEffect, useState, useCallback } from "react";
import { 
  ShieldCheck, 
  ArrowRight, 
  Store, 
  CheckCircle2, 
  MessageCircle, 
  Users, 
  Zap,
  Clock,
  Car as CarIcon,
  ShoppingCart,
  Droplets,
  MapPin
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const PRICING_PLANS = [
  {
    name: "Starter",
    price: "199",
    desc: "For micro-businesses starting their digital journey.",
    features: ["15 Monthly Lead Requests", "Basic Profile", "WhatsApp Integration", "Verified Badge", "Free 14-Day Trial"],
    accent: "border-slate-800"
  },
  {
    name: "Pro",
    price: "350",
    desc: "The standard for established automotive shops.",
    features: ["Unlimited Lead Requests", "Priority Search Ranking", "Staff Management", "Advanced Analytics", "Free 14-Day Trial"],
    accent: "border-primary shadow-primary/10 shadow-2xl scale-105 z-10",
    popular: true
  },
  {
    name: "Enterprise",
    price: "599",
    desc: "For multi-location groups and dealerships.",
    features: ["Unlimited Everything", "Multi-Location Support", "Dedicated Manager", "Custom Branding", "Free 14-Day Trial"],
    accent: "border-slate-800"
  }
];

export default function LandingPage() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDiscoveryData = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // STAGE 1: Verified Businesses Only
      const { data: verifiedBiz } = await supabase
          .from('businesses')
          .select('id, name, city, logo_url, verification_status')
          .eq('verification_status', 'verified');
      
      const partners = verifiedBiz || [];
      const verifiedIds = partners.map(b => b.id);
      const bizMap = partners.reduce((acc: any, b: any) => {
        acc[b.id] = b;
        return acc;
      }, {});

      // STAGE 2: Fetch Listings for verified businesses
      if (verifiedIds.length > 0) {
        const { data: listingData, error } = await supabase
          .from('listings')
          .select('id, business_id, name, description, price, listing_type, image_url, created_at')
          .in('business_id', verifiedIds)
          .order('created_at', { ascending: false })
          .limit(6);
        
        if (error) throw error;

        // STAGE 3: In-Memory Wiring
        setListings((listingData || []).map(l => ({ 
          ...l, 
          business: bizMap[l.business_id] || { name: 'Verified Partner', city: 'Botswana' }
        })));
      }
    } catch (e: any) {
      console.error("Discovery failure:", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDiscoveryData();
  }, [loadDiscoveryData]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-50 selection:bg-primary/30 font-body antialiased">
      {/* NAVIGATION */}
      <header className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="bg-primary shadow-[0_0_25px_rgba(32,128,223,0.4)] text-white font-black p-1.5 rounded-lg text-sm tracking-tighter">ALM</div>
            <span className="font-black text-xl tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent uppercase italic">AutoLink Africa</span>
          </div>
          <nav className="hidden lg:flex items-center gap-8">
            <Link href="/find-wash" className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors">Marketplace</Link>
            <Link href="/login" className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors">Partner Access</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="font-bold text-slate-300 hover:text-white hover:bg-white/5" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button size="sm" className="font-black px-6 rounded-full shadow-[0_0_20px_rgba(32,128,223,0.3)] hover:scale-105 transition-transform" asChild>
              <Link href="/signup">Join Network</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-48 pb-32 md:pt-64 md:pb-48 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-50" />
        <div className="container relative mx-auto px-4 text-center space-y-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Africa's Trusted Auto Ecosystem</span>
          </div>
          
          <div className="space-y-6 max-w-5xl mx-auto">
            <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-[0.9] text-white uppercase italic">
              Find Verified <br />
              <span className="bg-gradient-to-r from-primary via-blue-400 to-white bg-clip-text text-transparent">Cars, Parts & Wash.</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed font-medium">
              Buy from trusted businesses. Secure. Verified. Transparent. The only automotive hub built for Africa.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Button size="lg" className="h-16 px-10 text-md font-black rounded-2xl shadow-2xl hover:scale-105 transition-all bg-primary hover:bg-primary/90" asChild>
              <Link href="/find-wash?category=car">Browse Cars</Link>
            </Button>
            <Button size="lg" className="h-16 px-10 text-md font-black rounded-2xl shadow-2xl hover:scale-105 transition-all bg-slate-800 hover:bg-slate-700" asChild>
              <Link href="/find-wash?category=spare_part">Find Spare Parts</Link>
            </Button>
            <Button size="lg" className="h-16 px-10 text-md font-black rounded-2xl shadow-2xl hover:scale-105 transition-all bg-white text-slate-950 hover:bg-slate-200" asChild>
              <Link href="/find-wash?category=wash_service">Book Car Wash</Link>
            </Button>
          </div>

          <div className="pt-8">
            <Button variant="link" className="text-slate-500 font-bold uppercase tracking-widest text-[10px] hover:text-primary transition-colors" asChild>
              <Link href="/signup">Professional? List Your Business →</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* TRUST SECTION */}
      <section className="py-24 bg-white/[0.02] border-y border-white/5 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight uppercase italic">Safe. Verified. Built for Africa.</h2>
            <p className="text-slate-500 font-medium max-w-xl mx-auto">We eliminate the risk from automotive commerce through strict partner moderation.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { icon: ShieldCheck, title: "Verified Partners", desc: "Every business undergoes Omang or CIPA verification before listing." },
              { icon: Zap, title: "Secure Platform", desc: "Advanced protection for your data and high-fidelity lead management." },
              { icon: Users, title: "Admin Moderation", desc: "Our local team manually reviews all high-value listings for authenticity." },
              { icon: MessageCircle, title: "WhatsApp Direct", desc: "Connect instantly with sellers through Africa's favorite chat platform." }
            ].map((item, i) => (
              <div key={i} className="p-8 rounded-3xl bg-slate-900/50 border border-white/5 space-y-4 hover:border-primary/50 transition-colors">
                <div className="bg-primary/10 p-3 rounded-2xl w-fit">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">{item.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed font-medium">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-32 relative">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-24">
            <div className="space-y-12">
              <div className="space-y-4">
                <Badge className="bg-primary text-white font-black uppercase text-[10px] tracking-widest px-4 py-1">For Customers</Badge>
                <h2 className="text-4xl font-black italic uppercase tracking-tight">Buy with Confidence</h2>
              </div>
              <div className="space-y-8">
                {[
                  { step: "01", title: "Browse Verified Listings", desc: "Filter through elite cars, genuine parts, or premium wash packages." },
                  { step: "02", title: "Contact Business Securely", desc: "No signup required to reach out. Start a secure WhatsApp chat instantly." },
                  { step: "03", title: "Buy with Confidence", desc: "Transact knowing you're dealing with a verified local operator." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-6">
                    <span className="text-4xl font-black text-primary/20">{item.step}</span>
                    <div className="space-y-1">
                      <h4 className="text-xl font-bold">{item.title}</h4>
                      <p className="text-slate-500 font-medium">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-12">
              <div className="space-y-4">
                <Badge className="bg-slate-800 text-white font-black uppercase text-[10px] tracking-widest px-4 py-1">For Businesses</Badge>
                <h2 className="text-4xl font-black italic uppercase tracking-tight">Grow Your Reach</h2>
              </div>
              <div className="space-y-8">
                {[
                  { step: "01", title: "Create Business Account", desc: "Register your shop and upload your verification credentials." },
                  { step: "02", title: "List Products or Services", desc: "Use our professional dashboard to manage your inventory and staff." },
                  { step: "03", title: "Receive Direct Leads", desc: "Get high-quality customer inquiries directly to your dashboard and phone." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-6">
                    <span className="text-4xl font-black text-slate-800">{item.step}</span>
                    <div className="space-y-1">
                      <h4 className="text-xl font-bold">{item.title}</h4>
                      <p className="text-slate-500 font-medium">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MARKETPLACE PREVIEW */}
      <section className="py-32 bg-white/[0.01]">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-16">
            <div className="space-y-4">
              <h2 className="text-4xl font-black italic uppercase tracking-tight">Featured Discovery</h2>
              <p className="text-slate-500 font-medium">Recently listed by our premium verified partners.</p>
            </div>
            <Button variant="outline" className="rounded-full font-black border-white/10 hover:bg-white/5" asChild>
              <Link href="/find-wash">View Full Directory <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {loading ? (
              Array.from({length: 3}).map((_, i) => <div key={i} className="h-96 rounded-3xl bg-white/5 animate-pulse" />)
            ) : listings.map((item) => (
              <Card key={item.id} className="bg-slate-900 border-white/5 rounded-3xl overflow-hidden group hover:border-primary/50 transition-all shadow-2xl">
                <div className="relative h-56 bg-slate-800">
                  <Image 
                    src={item.image_url || `https://picsum.photos/seed/${item.id}/600/400`} 
                    alt={item.name} 
                    fill 
                    className="object-cover transition-transform duration-500 group-hover:scale-110" 
                  />
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-slate-950/80 text-white font-black uppercase text-[9px] tracking-widest backdrop-blur-md border-none">
                      {item.listing_type?.replace('_', ' ')}
                    </Badge>
                  </div>
                  {item.price && (
                    <div className="absolute bottom-4 right-4">
                      <Badge className="bg-primary text-white font-black px-4 py-1.5 shadow-xl text-sm border-none">
                        P{Number(item.price).toLocaleString()}
                      </Badge>
                    </div>
                  )}
                </div>
                <CardHeader>
                  <CardTitle className="text-xl font-bold truncate text-white">{item.name}</CardTitle>
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    <Store className="h-3 w-3 text-primary" /> {item.business?.name}
                    <span className="opacity-20">•</span>
                    <MapPin className="h-3 w-3" /> {item.business?.city}
                  </div>
                </CardHeader>
                <CardFooter>
                  <Button className="w-full font-black uppercase text-[10px] tracking-[0.2em] h-12 rounded-xl bg-slate-800 hover:bg-primary transition-colors" asChild>
                    <Link href={`/marketplace/${item.listing_type === 'car' ? 'cars' : 'spare-parts'}/${item.id}`}>View Full Details</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-primary/5 blur-3xl rounded-full" />
        <div className="container mx-auto px-4 relative">
          <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
            <h2 className="text-4xl md:text-5xl font-black italic uppercase tracking-tight">Scale Your Business</h2>
            <p className="text-slate-500 font-medium">Choose a professional tier to unlock advanced marketplace tools and verified status.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {PRICING_PLANS.map((plan) => (
              <Card key={plan.name} className={cn("bg-slate-900 border-2 rounded-[2.5rem] p-8 space-y-8 flex flex-col transition-all duration-500", plan.accent)}>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter">{plan.name}</h3>
                    {plan.popular && <Badge className="bg-primary text-white font-black text-[9px] uppercase tracking-widest">Most Popular</Badge>}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-black">P{plan.price}</span>
                    <span className="text-slate-500 font-bold uppercase text-xs tracking-widest">/mo</span>
                  </div>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">{plan.desc}</p>
                </div>
                <div className="space-y-4 flex-grow">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Core Benefits:</p>
                  <ul className="space-y-4">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-3 text-sm font-medium text-slate-300">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <Button className={cn("w-full h-14 font-black text-lg rounded-2xl shadow-xl", plan.popular ? "bg-primary hover:bg-primary/90" : "bg-slate-800 hover:bg-slate-700")} asChild>
                  <Link href="/signup">Select {plan.name} Plan</Link>
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-24 border-t border-white/5 bg-slate-950 relative">
        <div className="container mx-auto px-4 text-center space-y-12">
          <div className="flex flex-col items-center gap-6">
            <div className="flex justify-center gap-3 items-center text-white font-black text-3xl tracking-tighter uppercase italic">
                <div className="bg-primary p-1.5 rounded-lg text-sm shadow-lg">ALM</div>
                AutoLink Africa
            </div>
            <p className="text-slate-500 font-medium max-w-md mx-auto">Providing verified automotive solutions through transparency and technology across the continent.</p>
          </div>
          <div className="flex justify-center gap-8 text-xs font-black uppercase tracking-widest text-slate-600">
            <Link href="/find-wash" className="hover:text-primary transition-colors">Directory</Link>
            <Link href="/login" className="hover:text-primary transition-colors">Partners</Link>
            <Link href="/signup" className="hover:text-primary transition-colors">Privacy</Link>
          </div>
          <p className="text-[10px] text-slate-700 font-black uppercase tracking-[0.4em]">© 2024 AutoLink Africa Marketplace. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
