'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Search, Loader2, ArrowRight, ShieldCheck, ShoppingCart, ArrowLeft, Package, Store } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function SparePartCard({ part }: { part: any }) {
  const displayImage = `https://picsum.photos/seed/${part.id}/400/300`;

  return (
    <Card className="flex flex-col h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/50 bg-card border-2 rounded-2xl group">
      <div className="relative h-48 w-full overflow-hidden bg-muted">
        <Image
          src={displayImage}
          alt={part.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          <Badge className="bg-white/90 text-black backdrop-blur-sm border-none shadow-sm uppercase text-[9px] font-black">
            Verified Item
          </Badge>
        </div>
        <div className="absolute bottom-3 right-3">
          <Badge className="bg-primary text-white font-black px-3 py-1 text-sm shadow-lg">
            P{Number(part.price || 0).toLocaleString()}
          </Badge>
        </div>
      </div>
      
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-bold line-clamp-1">{part.name}</CardTitle>
        <div className="flex items-center justify-between text-[10px] font-bold uppercase text-muted-foreground pt-1">
          <div className="flex items-center gap-1">
            <Store className="h-3 w-3 text-primary" />
            <span className="truncate max-w-[100px]">{part.business?.name || 'Verified Seller'}</span>
          </div>
          <div className="flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-green-600" />
            <span>Verified</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-grow pb-4">
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 italic">
          {part.description || "Genuine automotive component available from a verified local retailer."}
        </p>
      </CardContent>

      <CardFooter className="pt-0">
        <Button asChild className="w-full font-bold rounded-xl h-10 shadow-sm" variant="outline">
          <Link href={`/marketplace/spare-parts/${part.id}`}>
            View Details <ArrowRight className="ml-2 h-3 w-3" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function SparePartsMarketplacePage() {
  const [parts, setParts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');

  const fetchParts = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    try {
      // 1. Fetch Verified Businesses
      const { data: verifiedBiz } = await supabase
        .from('businesses')
        .select('id, name, city')
        .eq('verification_status', 'verified');
      
      const verifiedIds = (verifiedBiz || []).map(b => b.id);
      const bizMap = (verifiedBiz || []).reduce((acc: any, b: any) => {
        acc[b.id] = b;
        return acc;
      }, {});
      
      // 2. Fetch Spare Part Listings for Verified IDs
      if (verifiedIds.length > 0) {
        const { data, error } = await supabase
          .from('listings')
          .select('id, business_id, name, description, price, created_at, listing_type')
          .eq('listing_type', 'spare_part')
          .in('business_id', verifiedIds)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setParts((data || []).map(p => ({ 
          ...p, 
          verified: true,
          business: bizMap[p.business_id] 
        })));
      } else {
        setParts([]);
      }
    } catch (e: any) {
      console.error("Spare Parts discovery failure:", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchParts();
  }, [fetchParts]);

  if (!mounted) return null;

  const filtered = parts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                         (p.description && p.description.toLowerCase().includes(search.toLowerCase()));
    return matchesSearch;
  }).sort((a, b) => {
    if (sortOrder === 'price-low') return a.price - b.price;
    if (sortOrder === 'price-high') return b.price - a.price;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/find-wash" className="flex items-center gap-2 text-primary font-bold hover:opacity-80 transition-opacity">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Directory</span>
          </Link>
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <span className="text-sm font-bold text-primary tracking-tight uppercase">Spare Parts Marketplace</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" asChild><Link href="/login">Sign In</Link></Button>
            <Button size="sm" asChild><Link href="/signup">Sign Up</Link></Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 space-y-12 animate-in fade-in duration-500">
        <div className="space-y-4 max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
            <ShieldCheck className="h-3 w-3" />
            <span>Verified Spare Parts Partners</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Genuine Automotive Components</h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Discover genuine parts from verified retailers across Botswana. Quality guaranteed through partner verification.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-6 items-end justify-between bg-white/50 backdrop-blur-sm p-6 rounded-3xl border-2 shadow-sm">
          <div className="flex-1 w-full space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Search Catalog</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Part name, category, or description..." 
                className="pl-10 h-12 rounded-xl bg-white"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          
          <div className="space-y-2 lg:w-48">
            <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Sort By</Label>
            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger className="h-12 rounded-xl bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-20">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="overflow-hidden bg-card rounded-2xl h-[450px]">
                <Skeleton className="h-48 w-full" />
                <div className="p-6 space-y-4">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </Card>
            ))
          ) : filtered.length > 0 ? (
            filtered.map(part => (
              <SparePartCard key={part.id} part={part} />
            ))
          ) : (
            <div className="col-span-full py-24 text-center border-2 border-dashed rounded-3xl bg-muted/20">
              <Package className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
              <p className="text-xl font-bold text-muted-foreground">No verified parts found matching your criteria.</p>
              <Button variant="link" onClick={() => setSearch('')} className="font-bold">
                Reset All Filters
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}