
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, MapPin, Search, ShieldCheck, ArrowLeft, Store, Clock, Trophy, Tags } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

function BusinessCard({ business }: { business: any }) {
  const isTrial = business.trial_start_date && business.trial_end_date && 
                  new Date(business.trial_start_date) <= new Date() && 
                  new Date(business.trial_end_date) >= new Date();
  
  const hasHighRating = (business.avg_rating || 0) >= 4.5;

  return (
    <Card className="flex flex-col h-[580px] overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/50 bg-card border-2">
      <div className="relative h-44 w-full group overflow-hidden bg-muted">
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
          {isTrial && (
            <Badge className="bg-orange-500 text-white shadow-lg font-bold border-2 border-white/20">
              <Clock className="h-3 w-3 mr-1" /> TRIAL
            </Badge>
          )}
          {hasHighRating && (
            <Badge className="bg-yellow-500 text-black shadow-lg font-bold border-2 border-white/20">
              <Trophy className="h-3 w-3 mr-1" /> TOP RATED
            </Badge>
          )}
          <Badge variant="secondary" className="backdrop-blur-md bg-white/90 text-black shadow-sm font-bold uppercase text-[10px]">
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
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{business.address || 'Gaborone'}, {business.city || 'Botswana'}</span>
        </div>
      </CardHeader>

      <CardContent className="flex-grow space-y-4 pb-4 overflow-hidden flex flex-col">
        <div className="space-y-2 flex-1 flex flex-col min-h-0">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter flex items-center gap-1.5">
                <Tags className="h-3 w-3" /> Service Preview
            </p>
            <ScrollArea className="flex-1 pr-2">
                <div className="space-y-1.5">
                    {business.services && business.services.length > 0 ? business.services.map((svc: any) => (
                        <div key={svc.id} className="flex justify-between items-center text-xs bg-muted/30 p-2 rounded-lg border border-transparent hover:border-primary/20 transition-colors">
                            <span className="font-medium truncate max-w-[120px]">{svc.name}</span>
                            <span className="font-bold text-primary">BWP {Number(svc.price).toFixed(2)}</span>
                        </div>
                    )) : (
                        <p className="text-[10px] text-muted-foreground italic py-4 text-center">Service catalog arriving soon...</p>
                    )}
                </div>
            </ScrollArea>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-dashed shrink-0">
          <div className="flex text-yellow-400" aria-label={`Rating: ${business.avg_rating || 0} out of 5 stars`}>
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
          <span className="text-sm font-bold">{(business.avg_rating || 0).toFixed(1)}</span>
          <span className="text-[10px] text-muted-foreground">({business.review_count || 0} reviews)</span>
        </div>
      </CardContent>

      <CardFooter className="pt-0 shrink-0">
        <Button asChild className="w-full shadow-md font-bold">
          <Link href={`/find-wash/${business.id}`}>View Details & Book</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function PublicFindWashPage() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const load = async () => {
      setLoading(true);
      try {
        const now = new Date().toISOString();
        // Robust query logic: Verified OR Active Trial
        const { data: bizData, error: bizError } = await supabase
            .from('businesses')
            .select(`
              *,
              services(*),
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
        console.error('Marketplace Fetch Failure:', e);
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

  if (!mounted) return null;

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
            <span className="text-sm font-bold text-primary tracking-tight">Carwash Marketplace</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" asChild><Link href="/login">Sign In</Link></Button>
            <Button size="sm" asChild><Link href="/signup">Sign Up</Link></Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 space-y-12">
        <div className="space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-2">
            <ShieldCheck className="h-3 w-3" />
            <span>Verified Partners & Active Trials</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">Find a Professional Wash</h1>
          <p className="text-muted-foreground text-lg">Browse car wash businesses verified for quality and reliability.</p>
          <div className="relative max-w-2xl pt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name or city..." 
                className="pl-10 h-12 bg-card border-2"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
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
                  <Store className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
                  <p className="text-muted-foreground font-bold text-lg">No verified partners found.</p>
                  <Button variant="link" onClick={() => setSearch('')}>View All Partners</Button>
              </div>
          )}
        </div>
      </main>
    </div>
  );
}
