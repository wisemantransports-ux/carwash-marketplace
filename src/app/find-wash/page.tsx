'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, MapPin, Search, ShieldCheck, ArrowLeft, Store, CheckCircle2, Phone, Tags } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

function BusinessCard({ business }: { business: any }) {
  const isCipa = business.special_tag === 'CIPA Verified';

  return (
    <Card className="flex flex-col h-[550px] overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/50 bg-card border-2">
      <div className="relative h-40 w-full group overflow-hidden bg-muted">
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
        <div className="absolute top-2 right-2 flex flex-col gap-2 items-end">
          {isCipa && (
            <Badge className="bg-primary text-white shadow-lg font-bold border-2 border-white/20 px-2 py-1">
              <CheckCircle2 className="h-3 w-3 mr-1" /> CIPA VERIFIED
            </Badge>
          )}
          <Badge variant="secondary" className="backdrop-blur-md bg-white/90 text-black shadow-sm font-bold">
            {business.services?.length || 0} Packages
          </Badge>
        </div>
      </div>
      
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-xl line-clamp-1">{business.name}</CardTitle>
          <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200 shrink-0">
            <ShieldCheck className="h-3 w-3 mr-1" /> Verified
          </Badge>
        </div>
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{business.address || 'No address provided'}, {business.city || 'Botswana'}</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-green-600 font-bold">
                <Phone className="h-3 w-3" />
                <span>{business.whatsapp_number || 'No contact provided'}</span>
            </div>
        </div>
      </CardHeader>

      <CardContent className="flex-grow space-y-4 pb-4 overflow-hidden flex flex-col">
        <div className="space-y-2 flex-1 flex flex-col min-h-0">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter flex items-center gap-1.5">
                <Tags className="h-3 w-3" /> Full Service Catalog
            </p>
            <ScrollArea className="flex-1 pr-2">
                <div className="space-y-1.5">
                    {business.services?.map((svc: any) => (
                        <div key={svc.id} className="flex justify-between items-center text-xs bg-muted/30 p-2 rounded-lg border border-transparent hover:border-primary/20 transition-colors">
                            <span className="font-medium truncate max-w-[120px]">{svc.name}</span>
                            <span className="font-bold text-primary">{svc.currency_code || 'BWP'} {Number(svc.price).toFixed(2)}</span>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>

        <div className="flex items-center gap-1.5 pt-2 border-t border-dashed shrink-0">
          <div className="flex text-yellow-400">
            {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="h-3 w-3 fill-current" />
            ))}
          </div>
          <span className="text-xs font-bold">5.0</span>
        </div>
      </CardContent>

      <CardFooter className="pt-0 shrink-0">
        <Button asChild className="w-full shadow-md font-bold">
          <Link href={`/find-wash/${business.id}`}>View Services</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function PublicFindWashPage() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: bizData, error: bizError } = await supabase
            .from('businesses')
            .select('*, services(*)')
            .eq('verification_status', 'verified')
            .eq('subscription_status', 'active');
        
        if (bizError) throw bizError;
        
        console.log(`[Public Marketplace Debug] Fetched ${bizData?.length || 0} verified active businesses.`);

        const formatted = (bizData || [])
          .filter(biz => biz.services && biz.services.length > 0);

        formatted.sort((a, b) => {
            const aHasLogo = !!a.logo_url ? 1 : 0;
            const bHasLogo = !!b.logo_url ? 1 : 0;
            
            if (bHasLogo !== aHasLogo) return bHasLogo - aHasLogo;
            
            const aSvcCount = a.services?.length || 0;
            const bSvcCount = b.services?.length || 0;
            if (bSvcCount !== aSvcCount) return bSvcCount - aSvcCount;
            
            return a.name.localeCompare(b.name);
        });
        
        setBusinesses(formatted);
      } catch (e) {
        console.error('Marketplace Load Error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = businesses.filter(b => 
    b.name.toLowerCase().includes(search.toLowerCase()) || 
    (b.city && b.city.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-primary font-bold hover:opacity-80 transition-opacity">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Home</span>
          </Link>
          <div className="flex items-center gap-2">
             <div className="bg-primary text-primary-foreground font-bold p-1 rounded text-[10px]">CWM</div>
            <span className="text-sm font-bold text-primary tracking-tight text-nowrap">Carwash Marketplace</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" asChild>
                <Link href="/login">Sign In</Link>
            </Button>
            <Button size="sm" asChild>
                <Link href="/signup">Sign Up</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 space-y-12">
        <div className="space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-2">
            <ShieldCheck className="h-3 w-3" />
            <span>Active Trust Seals Only</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">Verified Partners</h1>
          <p className="text-muted-foreground text-lg">Browse professional car wash businesses. Only partners with active trust seals and packages are listed here.</p>
          
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search by business name or city..." 
                    className="pl-10 h-12 bg-card border-2"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
              </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="overflow-hidden bg-card">
                    <Skeleton className="h-48 w-full" />
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </Card>
              ))
          ) : filtered.length > 0 ? (
              filtered.map(business => (
                  <BusinessCard key={business.id} business={business} />
              ))
          ) : (
              <div className="col-span-full py-24 text-center border-2 border-dashed rounded-xl bg-muted/20">
                  <p className="text-muted-foreground font-bold text-lg">No verified businesses available. Try adjusting your search or check back later.</p>
                  <p className="text-muted-foreground text-sm">Newly verified partners with services will appear here automatically.</p>
                  <Button variant="link" onClick={() => setSearch('')}>Clear Search</Button>
              </div>
          )}
        </div>
      </main>

      <footer className="py-12 border-t mt-20 bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">Looking to register your business? <Link href="/signup?role=business-owner" className="text-primary font-bold hover:underline">Get started here</Link></p>
        </div>
      </footer>
    </div>
  );
}
