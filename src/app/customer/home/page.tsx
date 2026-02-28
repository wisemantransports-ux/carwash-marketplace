'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, MapPin, Search, ShieldCheck, Store, Package, ArrowRight, CheckCircle2, Phone, Tags, Trophy, Award } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

function BusinessCard({ business }: { business: any }) {
  const isCipa = business.special_tag === 'CIPA Verified';
  const hasHighRating = business.avgRating >= 4.5;
  const isTrusted = business.reviewCount >= 5;

  return (
    <Card className="flex flex-col h-[580px] overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/50 bg-card border-2">
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
            <span className="absolute bottom-4 text-[10px] font-bold uppercase tracking-widest opacity-40">Professional Partner</span>
          </div>
        )}
        <div className="absolute top-2 right-2 flex flex-col gap-2 items-end">
          {hasHighRating && (
            <Badge className="bg-yellow-500 text-black shadow-lg font-bold border-2 border-white/20 px-2 py-1">
              <Trophy className="h-3 w-3 mr-1" /> TOP RATED
            </Badge>
          )}
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
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 shrink-0 text-[10px]">
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
                            <span className="font-bold text-primary">BWP {Number(svc.price).toFixed(2)}</span>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>

        <div className="flex items-center gap-1.5 pt-2 border-t border-dashed shrink-0">
          <div className="flex text-yellow-400">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star 
                key={s} 
                className={cn(
                  "h-3.5 w-3.5", 
                  s <= Math.round(business.avgRating) ? "fill-current" : "text-gray-200"
                )} 
              />
            ))}
          </div>
          <span className="text-sm font-bold">{business.avgRating.toFixed(1)}</span>
          <span className="text-[10px] text-muted-foreground ml-auto uppercase font-bold tracking-widest">
            {business.reviewCount} Verified Reviews
          </span>
        </div>
      </CardContent>

      <CardFooter className="pt-0 shrink-0">
        <Button asChild className="w-full shadow-md font-bold">
          <Link href={`/customer/book/${business.id}`}>
            Book This Business
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function CustomerHomePage() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    async function load() {
      setLoading(true);
      try {
        // Filter: verification_status = 'verified'
        // Include relational data for avg_rating and review_count (completed bookings only)
        const { data: bizData, error: bizError } = await supabase
            .from('businesses')
            .select(`
              *,
              services(*),
              bookings(
                status,
                ratings(rating)
              )
            `)
            .eq('verification_status', 'verified')
            .eq('status', 'verified');
        
        if (bizError) throw bizError;

        const formatted = (bizData || [])
          .filter(biz => biz.services && biz.services.length > 0)
          .map(biz => {
            const completedBookings = (biz.bookings || []).filter((b: any) => b.status === 'completed');
            const ratings = completedBookings.flatMap((b: any) => b.ratings || []);
            
            const totalStars = ratings.reduce((acc: number, curr: any) => acc + (curr.rating || 0), 0);
            const reviewCount = ratings.length;
            const avgRating = reviewCount > 0 ? totalStars / reviewCount : 0;

            return {
              ...biz,
              avgRating,
              reviewCount
            };
          });

        // Sorting logic: avg_rating DESC, name ASC
        formatted.sort((a, b) => {
            if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating;
            return a.name.localeCompare(b.name);
        });
        
        setBusinesses(formatted);
      } catch (e: any) {
        console.error("Marketplace Load Error:", e);
        toast({ variant: 'destructive', title: 'Load Error', description: 'Could not fetch verified car washes.' });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = businesses.filter(b => 
    b.name.toLowerCase().includes(search.toLowerCase()) || 
    (b.city && b.city.toLowerCase().includes(search.toLowerCase()))
  );

  if (!mounted) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <div className="flex-1 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
            <ShieldCheck className="h-3 w-3" />
            <span>Verified Partners Only</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-primary">Discover Top Washes</h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Browse professional mobile detailers and stations. Only verified partners with active services are featured here.
          </p>
          
          <div className="flex gap-4 max-w-2xl pt-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by business name or city..." 
                className="pl-10 h-12 bg-card shadow-sm border-2"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <Card className="w-full lg:w-80 bg-primary/5 border-primary/20 border-dashed shrink-0">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <Badge variant="secondary" className="text-[10px]">COMING SOON</Badge>
            </div>
            <CardTitle className="text-lg pt-2">Spare Shop</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Soon you can add air fresheners, shampoos, and wipers to your wash booking.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="ghost" size="sm" className="w-full text-[10px] h-8 text-muted-foreground cursor-not-allowed group">
              Preview Catalog <ArrowRight className="ml-2 h-3 w-3 transition-transform group-hover:translate-x-1" />
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden bg-card">
              <Skeleton className="h-48 w-full" />
              <div className="p-6 space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-10 w-full" />
              </div>
            </Card>
          ))
        ) : filtered.length > 0 ? (
          filtered.map(business => (
            <BusinessCard key={business.id} business={business} />
          ))
        ) : (
          <div className="col-span-full py-24 text-center border-2 border-dashed rounded-3xl bg-muted/20">
            <div className="max-w-xs mx-auto space-y-4">
              <Store className="h-12 w-12 mx-auto text-muted-foreground opacity-20" />
              <div className="space-y-1">
                <p className="text-xl font-bold">No verified businesses available</p>
                <p className="text-muted-foreground text-sm">Try adjusting your search or check back later for new partners.</p>
              </div>
              <Button variant="outline" className="rounded-full" onClick={() => setSearch('')}>Clear Search</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
