'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { CheckCircle2, MapPin, Star, ShieldCheck, UserCheck, TrendingUp, XCircle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { mockGetVerifiedBusinesses } from "@/lib/mock-api";
import { Business } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

function BusinessCard({ business }: { business: Business }) {
  return (
    <Card className="flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/50">
      <div className="relative h-48 w-full group overflow-hidden">
        <Image
          src={business.imageUrl}
          alt={business.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute top-2 right-2">
            <Badge variant={business.type === 'station' ? 'secondary' : 'default'} className="backdrop-blur-md bg-white/80 text-black">
                {business.type.charAt(0).toUpperCase() + business.type.slice(1)}
            </Badge>
        </div>
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">{business.name}</CardTitle>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span>{business.address}, {business.city}</span>
        </div>
      </CardHeader>
      <CardContent className="flex-grow pb-4">
        <div className="flex items-center gap-1.5">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className={`h-3 w-3 ${s <= Math.floor(business.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
            ))}
          </div>
          <span className="text-xs font-bold">{business.rating}</span>
          <span className="text-[10px] text-muted-foreground">({business.reviewCount} reviews)</span>
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Button asChild className="w-full shadow-md">
          <Link href={`/customer/book/${business.id}`}>View Services</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function Home() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await mockGetVerifiedBusinesses();
      setBusinesses(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const pricingPlans = [
    {
      name: "Starter",
      price: "P150",
      desc: "For small or single-station car wash businesses",
      features: [
        "1 registered car wash location",
        "Up to 3 verified employees",
        "Station-based bookings only",
        "Business profile in search",
        "Admin verification badge"
      ],
      notIncluded: [
        "Mobile/on-site service",
        "Priority listing"
      ]
    },
    {
      name: "Pro",
      price: "P300",
      desc: "For established stations offering mobile service",
      features: [
        "Up to 10 verified employees",
        "Mobile / on-site services",
        "Employee ID + photo verification",
        "Service area radius selection",
        "Higher search ranking"
      ],
      notIncluded: [
        "Unlimited employees",
        "Multiple locations"
      ]
    },
    {
      name: "Enterprise",
      price: "P600",
      desc: "For large operators & multi-location businesses",
      features: [
        "Unlimited employees",
        "Multiple locations",
        "Priority search results",
        "Advanced business analytics",
        "Dedicated admin support"
      ]
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Navigation */}
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
             <div className="bg-primary text-primary-foreground font-bold p-1 rounded text-xs">CWM</div>
            <span className="text-xl font-bold text-primary tracking-tight">Carwash Marketplace</span>
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

      {/* Hero Section */}
      <section className="pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden bg-gradient-to-b from-primary/5 to-transparent">
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
              
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-sm font-medium text-muted-foreground">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-green-600" /> Registered Businesses Only</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-green-600" /> Verified Employees with ID</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-green-600" /> No Random Workers</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
                <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-lg hover:shadow-primary/20 transition-all" onClick={() => router.push('/signup?role=business-owner')}>
                  Register Your Car Wash
                </Button>
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full" onClick={() => router.push('/customer/home')}>
                  Find a Verified Car Wash
                </Button>
              </div>
            </div>
            <div className="flex-1 relative w-full aspect-square md:aspect-video lg:aspect-square">
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

      {/* Trust Filter Section */}
      <section className="py-24 border-y bg-muted/30 text-center">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-8">
            <h2 className="text-4xl font-bold">Discover Top Washes</h2>
            <p className="text-muted-foreground">Only verified businesses with active trust seals are listed here for your safety.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
              {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                      <Card key={i} className="overflow-hidden"><Skeleton className="h-48 w-full" /><div className="p-4 space-y-2"><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-1/2" /></div></Card>
                  ))
              ) : businesses.length > 0 ? (
                  businesses.slice(0, 3).map(business => (
                      <BusinessCard key={business.id} business={business} />
                  ))
              ) : (
                  <div className="col-span-full py-12 text-center border-2 border-dashed rounded-xl">
                      <p className="text-muted-foreground">No verified businesses available at the moment.</p>
                  </div>
              )}
            </div>
            <Button variant="outline" size="lg" asChild>
              <Link href="/customer/home">View All Verified Washes</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Safety & Trust Section */}
      <section id="safety" className="py-24 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl space-y-8">
            <h2 className="text-4xl font-bold">Built for Safety, Accountability, and Trust</h2>
            <p className="text-xl opacity-90 leading-relaxed">
              We are not a gig app. We are a marketplace for professional, registered car wash businesses.
            </p>
            <div className="grid sm:grid-cols-2 gap-8">
              <div className="space-y-4">
                <UserCheck className="h-8 w-8" />
                <h4 className="text-xl font-bold">Employee Verification</h4>
                <p className="text-sm opacity-80">
                  Business owners must upload employee photos and ID references. Customers always know exactly who is coming to their home.
                </p>
              </div>
              <div className="space-y-4">
                <TrendingUp className="h-8 w-8" />
                <h4 className="text-xl font-bold">Traceable Operations</h4>
                <p className="text-sm opacity-80">
                  Every booking is linked to a registered business. We provide a digital paper trail for every job performed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-background">
        <div className="container mx-auto px-4 text-center space-y-12">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold">Simple Monthly Pricing for Businesses</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that fits your operation size. 
            </p>
            <p className="text-sm text-primary font-medium italic">
              Customers do not pay the platform. Only verified car wash businesses subscribe to use the system.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
             {pricingPlans.map((plan, i) => (
               <Card key={i} className="flex flex-col border-2 hover:border-primary transition-all text-left">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {plan.name}
                      {plan.name === 'Pro' && <Badge>Popular</Badge>}
                    </CardTitle>
                    <CardDescription>{plan.desc}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow space-y-6">
                    <p className="text-4xl font-bold text-primary">{plan.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                    <ul className="space-y-3">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                      {plan.notIncluded?.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground opacity-60">
                          <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button variant={plan.name === 'Pro' ? 'default' : 'outline'} className="w-full" onClick={() => router.push('/signup?role=business-owner')}>Select {plan.name} Plan</Button>
                  </CardFooter>
               </Card>
             ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 border-t bg-card">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-xs text-muted-foreground">© 2024 Carwash Marketplace Botswana. All Rights Reserved.</p>
            <div className="flex gap-4">
                <Link href="/login" className="text-xs text-muted-foreground hover:underline">Admin Login</Link>
                <Link href="#" className="text-xs text-muted-foreground hover:underline">Privacy Policy</Link>
                <Link href="#" className="text-xs text-muted-foreground hover:underline">Safety & Trust</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
