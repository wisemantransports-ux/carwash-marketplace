'use client';

import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, MapPin, Search, ShieldCheck, ArrowLeft, Store, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

function BusinessCard({ business }: { business: any }) {
  const rating = Number(business.avg_rating || business.rating || 0);
  const reviews = Number(business.review_count || 0);

  return (
    <Card className="flex flex-col h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/50 bg-card border-2 rounded-2xl">
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
      </div>
      
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-xl line-clamp-1 font-bold">{business.name}</CardTitle>
          <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200 font-bold shrink-0">
            <ShieldCheck className="h-3 w-3 mr-1" /> Verified
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{business.city || 'Botswana'}</span>
        </div>
      </CardHeader>

      <CardContent className="flex-grow pb-4">
        <div className="flex items-center gap-2 pt-2 border-t border-dashed">
          <div className="flex text-yellow-400" aria-label={`Rating: ${rating} stars`}>
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
          <span className="text-sm font-bold">{rating.toFixed(1)}</span>
          <span className="text-[10px] text-muted-foreground">({reviews} reviews)</span>
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <Button asChild className="w-full font-bold rounded-xl h-11">
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
      if (!isSupabaseConfigured) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase
            .from('businesses')
            .select('*')
            .eq('verification_status', 'verified')
            .order('rating', { ascending: false });
        
        if (error) throw error;
        setBusinesses(data || []);
      } catch (e) {
        console.error('Marketplace Fetch Failure:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (!mounted) return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-4 bg-background">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
        <p className="text-muted-foreground animate-pulse font-medium">Syncing marketplace...</p>
    </div>
  );

  const filtered = businesses.filter(b => 
    b.name?.toLowerCase().includes(search.toLowerCase()) || 
    (b.city && b.city.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-primary font-bold hover:opacity-80 transition-opacity">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Home</span>
          </Link>
          <div className="flex items-center gap-2">
             <div className="bg-primary text-primary-foreground font-bold p-1 rounded text-[10px]">CWM</div>
            <span className="text-sm font-bold text-primary tracking-tight">Marketplace</span>
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
            <span>Verified Platform Partners Only</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">Find a Verified Wash</h1>
          <p className="text-muted-foreground text-lg">Browse partners verified for quality and reliability across Botswana.</p>
          <div className="relative max-w-2xl pt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name or city..." 
                className="pl-10 h-12 bg-card border-2 rounded-xl shadow-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="overflow-hidden bg-card rounded-2xl">
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
              <div className="col-span-full py-24 text-center border-2 border-dashed rounded-3xl bg-muted/20">
                  <Store className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
                  <p className="text-muted-foreground font-bold text-lg">No verified partners found.</p>
                  <Button variant="link" onClick={() => setSearch('')} className="font-bold">View All Partners</Button>
              </div>
          )}
        </div>
      </main>
    </div>
  );
}