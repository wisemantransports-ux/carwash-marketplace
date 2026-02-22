'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { Car, User, ShoppingCart, Shield, CheckCircle2, MapPin, Sparkles, Clock, Droplets, TrendingUp } from "lucide-react";
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
            <Link href="#features" className="text-sm font-medium hover:text-primary transition-colors">How it Works</Link>
            <Link href="#pricing" className="text-sm font-medium hover:text-primary transition-colors">Pricing</Link>
            <Link href="#roles" className="text-sm font-medium hover:text-primary transition-colors">Partners</Link>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push('/login')}>Sign In</Button>
            <Button size="sm" onClick={() => router.push('/signup')}>Get Started</Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 text-center lg:text-left space-y-8">
              <Badge variant="secondary" className="px-4 py-1 text-primary">Now Serving Gaborone & Francistown</Badge>
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1]">
                Your Car, <span className="text-primary italic">Perfectly</span> Clean. Anywhere.
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0">
                The first all-in-one car wash marketplace in Botswana. Book a professional mobile detailer to your doorstep or find the best stations nearby. Starting from just <span className="font-bold text-foreground">P25</span>.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-lg hover:shadow-primary/20 transition-all" onClick={() => router.push('/signup')}>
                  Book a Wash Now
                </Button>
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full" onClick={() => router.push('/signup?role=business-owner')}>
                  Register Your Business
                </Button>
              </div>
              <div className="flex items-center justify-center lg:justify-start gap-8 pt-4">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-10 w-10 rounded-full border-2 border-background bg-muted overflow-hidden relative">
                      <Image src={`https://picsum.photos/seed/${i + 10}/40/40`} alt="user" fill />
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="font-bold text-foreground">500+</span> happy car owners in BW
                </p>
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

      {/* Features Section */}
      <section id="features" className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-5xl font-bold">Why Carwash Marketplace?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">We're modernizing how Botswana cleans cars, one booking at a time.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { 
                icon: MapPin, 
                title: "Location Flexible", 
                description: "Book a mobile wash to your home in Phakalane, or visit a top-rated station in Broadhurst." 
              },
              { 
                icon: Clock, 
                title: "Save Time", 
                description: "Stop waiting in queues. Book a slot and our partners will be ready when you arrive, or come to you." 
              },
              { 
                icon: Shield, 
                title: "Secure Pula Payments", 
                description: "Your money is held in escrow and only released to the business after you're satisfied with the shine." 
              }
            ].map((feature, i) => (
              <Card key={i} className="border-none shadow-none bg-transparent group">
                <CardHeader className="text-center">
                  <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <feature.icon className="h-8 w-8" />
                  </div>
                  <CardTitle className="text-2xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-center text-muted-foreground">
                  {feature.description}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Local Pricing Section */}
      <section id="pricing" className="py-24">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 space-y-6">
              <h2 className="text-3xl md:text-5xl font-bold">Transparent Pricing for Every Budget</h2>
              <p className="text-lg text-muted-foreground">Whether it's a quick rinse after a dusty drive or a full premium detail, we have a service for you.</p>
              <ul className="space-y-4">
                {[
                  { label: "Express Exterior", price: "P25", desc: "Perfect for a quick dust off" },
                  { label: "Standard Wash & Dry", price: "P45", desc: "The Gabs daily commuter favorite" },
                  { label: "Premium Mobile Detail", price: "P150+", desc: "Full interior & exterior restoration" }
                ].map((item, i) => (
                  <li key={i} className="flex items-center justify-between p-4 rounded-xl border bg-card hover:border-primary transition-colors">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="text-primary h-5 w-5" />
                      <div>
                        <p className="font-bold">{item.label}</p>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                    <span className="text-xl font-bold text-primary">{item.price}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex-1 w-full grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="relative aspect-[3/4] rounded-2xl overflow-hidden border shadow-lg">
                  <Image src="https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&q=80&w=600" alt="Detailer" fill className="object-cover" />
                </div>
                <Card className="bg-primary text-primary-foreground">
                  <CardContent className="p-6">
                    <p className="text-3xl font-bold">100%</p>
                    <p className="text-sm opacity-90">Verified Partners</p>
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-4 pt-8">
                <Card className="bg-accent text-accent-foreground">
                  <CardContent className="p-6">
                    <Sparkles className="h-8 w-8 mb-2" />
                    <p className="font-bold">Eco-Friendly</p>
                    <p className="text-xs">Water-saving techniques</p>
                  </CardContent>
                </Card>
                <div className="relative aspect-[3/4] rounded-2xl overflow-hidden border shadow-lg">
                  <Image src="https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&q=80&w=600" alt="Clean Car" fill className="object-cover" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section id="roles" className="py-24 bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-16">Built for Everyone</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="text-left border-primary/20 hover:border-primary transition-all">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                  <Car className="h-6 w-6" />
                </div>
                <CardTitle className="text-2xl">For Car Owners</CardTitle>
                <CardDescription>Get your car cleaned without the hassle.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Book in seconds via mobile</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Track your detailer in real-time</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Pay safely via the platform</li>
                </ul>
                <Button className="w-full" onClick={() => router.push('/customer/home')}>Join as Customer</Button>
              </CardContent>
            </Card>

            <Card className="text-left border-accent/20 hover:border-accent transition-all">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-accent/10 text-accent flex items-center justify-center mb-2">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <CardTitle className="text-2xl">For Businesses</CardTitle>
                <CardDescription>Grow your car wash or mobile detailing business.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-accent" /> Manage bookings & staff easily</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-accent" /> Reach customers across the city</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-accent" /> Professional earnings dashboard</li>
                </ul>
                <Button variant="outline" className="w-full border-accent hover:bg-accent/10" onClick={() => router.push('/business/dashboard')}>Join as Partner</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-primary">Carwash Marketplace</span>
              <span className="text-xs text-muted-foreground">© 2024 Botswana.</span>
            </div>
            <div className="flex gap-8 text-sm text-muted-foreground">
              <Link href="#" className="hover:text-primary transition-colors">Privacy</Link>
              <Link href="#" className="hover:text-primary transition-colors">Terms</Link>
              <Link href="#" className="hover:text-primary transition-colors">Contact</Link>
            </div>
            <div className="flex items-center gap-4">
              <Button size="icon" variant="ghost" className="rounded-full"><Shield className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" className="rounded-full" onClick={() => router.push('/admin/dashboard')}><User className="h-4 w-4" /></Button>
            </div>
          </div>
          <p className="mt-8 text-center text-xs text-muted-foreground">
            A digital marketplace solution designed for modern mobile and stationary car wash services in Botswana.
          </p>
        </div>
      </footer>
    </div>
  );
}
