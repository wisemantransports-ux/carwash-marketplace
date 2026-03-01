
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { SparePart } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Search, Loader2, ArrowRight, ShieldCheck, ShoppingCart, ArrowLeft, Package, Store, History } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * @fileOverview Spare Parts Marketplace
 * Dynamic discovery page for verified automotive components.
 * Fetches data from 'spare_parts' table and adapts the professional showroom layout.
 */

export default function SparePartsMarketplacePage() {
  const [parts, setParts] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');

  const fetchParts = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      /**
       * Real-time fetch for active spare parts.
       * Joins with business to ensure only verified partners are displayed.
       */
      const { data, error } = await supabase
        .from('spare_parts')
        .select(`
          id, name, category, price, condition, images, stock_quantity, description, status, created_at,
          business:business_id!inner ( name, city, verification_status )
        `)
        .eq('status', 'active')
        .eq('business.verification_status', 'verified')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setParts((data as any[]) || []);
    } catch (e: any) {
      console.error("Spare parts fetch failure:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchParts();
  }, [fetchParts]);

  const filtered = parts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                         p.category.toLowerCase().includes(search.toLowerCase()) ||
                         p.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    if (sortOrder === 'price-low') return a.price - b.price;
    if (sortOrder === 'price-high') return b.price - a.price;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const categories = Array.from(new Set(parts.map(p => p.category))).sort();

  if (!mounted) return null;

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
            <span className="text-sm font-bold text-primary tracking-tight uppercase">Spare Parts</span>
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
            <span>Verified Genuine Parts</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Genuine Components</h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Discover high-quality spare parts and accessories from verified automotive retailers across the country.
          </p>
        </div>

        {/* Discovery Bar */}
        <div className="flex flex-col md:flex-row gap-6 items-end justify-between bg-white/50 backdrop-blur-sm p-6 rounded-3xl border-2 shadow-sm">
          <div className="flex-1 w-full space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Search Catalog</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search part name, category or description..." 
                className="pl-10 h-12 rounded-xl bg-white border-muted shadow-none"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 w-full md:w-auto">
            <div className="space-y-2 flex-1 md:w-40">
              <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-12 rounded-xl bg-white">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2 flex-1 md:w-40">
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
        </div>

        {/* Marketplace Feed */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="overflow-hidden bg-card rounded-2xl">
                <Skeleton className="h-48 w-full" />
                <div className="p-6 space-y-4">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </Card>
            ))
          ) : filtered.length > 0 ? (
            filtered.map(part => (
              <Card key={part.id} className="flex flex-col h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/50 bg-card border-2 rounded-2xl group">
                <div className="relative h-48 w-full overflow-hidden bg-muted">
                  <Image
                    src={(part.images && part.images.length > 0) ? part.images[0] : 'https://picsum.photos/seed/part/400/300'}
                    alt={part.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute top-3 left-3 flex flex-col gap-2">
                    <Badge className="bg-white/90 text-black backdrop-blur-sm border-none shadow-sm uppercase text-[9px] font-black">
                      {part.category}
                    </Badge>
                    <Badge className={cn(
                      "border-none shadow-sm uppercase text-[9px] font-black text-white",
                      part.condition === 'new' ? "bg-green-600" : "bg-orange-600"
                    )}>
                      {part.condition}
                    </Badge>
                  </div>
                  <div className="absolute bottom-3 right-3">
                    <Badge className="bg-primary text-white font-black px-3 py-1 text-sm shadow-lg">
                      P{Number(part.price).toLocaleString()}
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
                      <Package className="h-3 w-3 text-primary" />
                      <span>{part.stock_quantity} In Stock</span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-grow pb-4">
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 italic">
                    {part.description || "View details for this premium component from our verified partner."}
                  </p>
                </CardContent>

                <CardFooter className="pt-0">
                  <Button asChild className="w-full font-bold rounded-xl h-10 shadow-sm" variant="outline">
                    <Link href={`/marketplace/spare-parts/${part.id}`}>
                      Check Availability <ArrowRight className="ml-2 h-3 w-3" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))
          ) : (
            <div className="col-span-full py-24 text-center border-2 border-dashed rounded-3xl bg-muted/20">
              <History className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
              <p className="text-xl font-bold text-muted-foreground">No spare parts found matching your search.</p>
              <Button variant="link" onClick={() => { setSearch(''); setCategoryFilter('all'); }} className="font-bold">
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
