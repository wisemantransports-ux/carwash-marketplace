'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { Car, User, Shield, CheckCircle2, MapPin, Sparkles, Clock, TrendingUp, Info, ShieldCheck, UserCheck, AlertTriangle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Navigation */}
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
             <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-primary"
            >
                <path
                d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z"
                fill="currentColor"
                />
                <path
                d="M12 18C8.69 18 6 15.31 6 12C6 8.69 8.69 6 12 6C15.31 6 18 8.69 18 12C18 15.31 15.31 18 12 18ZM12 8C9.79 8 8 9.79 8 12C8 14.21 9.79 16 12 16C14.21 16 16 14.21 16 12C16 9.79 14.21 8 12 8Z"
                fill="currentColor"
                />
                <path
                d="M12 14C10.9 14 10 13.1 10 12C10 10.9 10.9 10 12 10C13.1 10 14 10.9 14 12C14 13.1 13.1 14 12 14Z"
                fill="currentColor"
                />
            </svg>
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

      {/* Problem -> Solution Section */}
      <section className="py-24 border-y bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold">The Challenge of Trust</h2>
              <div className="space-y-4">
                <div className="p-4 bg-white rounded-xl border border-destructive/20 shadow-sm">
                  <p className="font-bold text-destructive mb-1">For Car Owners</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• No time to visit a car wash station</li>
                    <li>• Safety concerns with random mobile washers</li>
                    <li>• Zero accountability if something goes wrong</li>
                  </ul>
                </div>
                <div className="p-4 bg-white rounded-xl border border-orange-200 shadow-sm">
                  <p className="font-bold text-orange-600 mb-1">For Car Wash Businesses</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Idle staff during slow morning hours</li>
                    <li>• No visibility to customers in nearby blocks</li>
                    <li>• Manual, messy booking systems</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg mb-4">
                <Sparkles className="h-6 w-6" />
              </div>
              <h2 className="text-3xl font-bold">The Carwash Marketplace Solution</h2>
              <p className="text-lg text-muted-foreground">
                We connect existing, registered car wash businesses with customers who need convenient, secure car wash services — without compromising on trust.
              </p>
              <ul className="space-y-3">
                <li className="flex gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
                  <p>Businesses send their <span className="font-bold">own verified employees</span> to customers.</p>
                </li>
                <li className="flex gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
                  <p>Real-time booking management for station and mobile services.</p>
                </li>
                <li className="flex gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
                  <p>Transparent platform built on <span className="font-bold">manual admin verification</span>.</p>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-24">
        <div className="container mx-auto px-4 text-center space-y-16">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold">How it Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto italic">Simple for owners, powerful for businesses.</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-8 text-left">
              <h3 className="text-2xl font-bold border-l-4 border-primary pl-4">For Car Owners</h3>
              <div className="space-y-6">
                {[
                  { step: "1", text: "Search nearby verified car wash businesses." },
                  { step: "2", text: "Choose between station wash or mobile doorstep service." },
                  { step: "3", text: "Track the assigned employee identity and photo." },
                  { step: "4", text: "Pay directly to the business after service." },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 items-center">
                    <span className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">{item.step}</span>
                    <p className="text-muted-foreground">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-8 text-left">
              <h3 className="text-2xl font-bold border-l-4 border-accent pl-4">For Car Wash Businesses</h3>
              <div className="space-y-6">
                {[
                  { step: "1", text: "Register your business and select a plan." },
                  { step: "2", text: "Add verified employees (ID + photo)." },
                  { step: "3", text: "Accept bookings for station or mobile jobs." },
                  { step: "4", text: "Grow your revenue with automated scheduling." },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 items-center">
                    <span className="h-8 w-8 rounded-full bg-accent/10 text-accent-foreground flex items-center justify-center font-bold text-sm shrink-0">{item.step}</span>
                    <p className="text-muted-foreground">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Safety & Trust Section */}
      <section id="safety" className="py-24 bg-primary text-primary-foreground overflow-hidden">
        <div className="container mx-auto px-4 relative">
          <Shield className="absolute -top-10 -right-10 h-64 w-64 opacity-5 rotate-12" />
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
            <div className="p-6 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-sm">
               <p className="text-sm font-medium">No freelancers. No anonymous workers. No risk.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24">
        <div className="container mx-auto px-4 text-center space-y-12">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold">Simple Monthly Pricing for Businesses</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that fits your operation size. Customers pay nothing to the platform.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
             {[
               { name: "Starter", price: "P150", desc: "For small car wash units" },
               { name: "Pro", price: "P300", desc: "For established stations" },
               { name: "Enterprise", price: "P600", desc: "For multi-location hubs" },
             ].map((plan, i) => (
               <Card key={i} className="flex flex-col border-2 hover:border-primary transition-all">
                  <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>{plan.desc}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-4xl font-bold text-primary">{plan.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full" onClick={() => router.push('/signup?role=business-owner')}>Select Plan</Button>
                  </CardFooter>
               </Card>
             ))}
          </div>
          <Button size="lg" className="rounded-full px-12 h-14" onClick={() => router.push('/business/subscription')}>View All Features</Button>
        </div>
      </section>

      {/* Trust Filter Section */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4 text-center max-w-4xl space-y-8">
          <div className="flex justify-center">
            <AlertTriangle className="h-12 w-12 text-orange-500" />
          </div>
          <h2 className="text-3xl font-bold">Who This Platform is NOT For</h2>
          <div className="grid sm:grid-cols-2 gap-4 text-left">
            <div className="p-4 bg-destructive/5 rounded-lg border border-destructive/10">
              <p className="text-sm font-bold text-destructive">❌ NOT FOR</p>
              <ul className="text-xs space-y-1 mt-2">
                <li>• Individual freelancers</li>
                <li>• Unregistered mobile washers</li>
                <li>• Anonymous workers</li>
              </ul>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-100">
              <p className="text-sm font-bold text-green-700">✔ ONLY FOR</p>
              <ul className="text-xs space-y-1 mt-2">
                <li>• Registered car wash businesses</li>
                <li>• Established mobile detailing services</li>
                <li>• Verified station partners</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 border-t bg-card">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-2 space-y-4">
              <span className="text-2xl font-bold text-primary">Carwash Marketplace</span>
              <p className="text-sm text-muted-foreground max-w-sm">
                The first all-in-one car wash marketplace in Botswana. Modernizing trust through verified business partnerships.
              </p>
            </div>
            <div className="space-y-4">
              <h5 className="font-bold">Platform</h5>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li><Link href="#pricing">Pricing</Link></li>
                <li><Link href="#safety">Safety & Trust</Link></li>
                <li><Link href="/login">Admin Login</Link></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h5 className="font-bold">Policies</h5>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li><Link href="#">Admin Approval Policy</Link></li>
                <li><Link href="#">Privacy Policy</Link></li>
                <li><Link href="#">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-xs text-muted-foreground">© 2024 Botswana. All Rights Reserved.</p>
            <div className="bg-muted px-4 py-2 rounded-lg border text-[10px] text-muted-foreground text-center">
              <strong>Disclaimer:</strong> Carwash Marketplace does not process customer payments. 
              Payments are handled directly between customers and businesses.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
