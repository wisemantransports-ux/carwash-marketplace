'use client';

import { useEffect, useState, Suspense, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Search, ShieldCheck, ArrowLeft, Store, Loader2, Filter, Droplets, ShoppingCart, Car as CarIcon, Star, Zap } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { LeadModal } from '@/components/app/lead-modal';
import { BookingModal } from '@/components/app/booking-modal';

const CATEGORIES = [
  { id: 'all', label: 'All Partners', icon: Filter },
  { id: 'wash_service', label: 'Car Wash', icon: Droplets },
  { id: 'spare_part', label: 'Spare Parts', icon: ShoppingCart },
  { id: 'car', label: 'Car Sales', icon: CarIcon },
];

function MarketplaceContent() {
  const searchParams = useSearchParams();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'all');
  
  // Modal states
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    try {
      // STAGE 1: Fetch Verified Businesses
      const { data: bizData } = await supabase
        .from('businesses')
        .select('id, name, city, logo_url, verification_status, category, subscription_plan, rating')
        .eq('verification_status', 'verified');

      if (!bizData) return;

      const verifiedIds = bizData.map(b => b.id);
      const bizMap = bizData.reduce((acc: any, b: any) => {
        acc[b.id] = b;
        return acc;
      }, {});

      // STAGE 2: Fetch Verified Listings
      const { data: listingData } = await supabase
        .from('listings')
        .select('id, business_id, name, description, price, listing_type, type, image_url, service_image_url, verified, created_at')
        .eq('verified', true)
        .in('business_id', verifiedIds)
        .order('created_at', { ascending: false });

      if (listingData) {
        const enriched = listingData.map(l => {
          const biz = bizMap[l.business_id];
          const score = (biz?.rating || 4.5) / 5;
          return {
            ...l,
            business: biz,
            performanceScore: score,
            performanceBadge: score > 0.85 ? 'Top Performer' : 'Reliable Partner'
          };
        });
        setListings(enriched);
      }
    } catch (e) {
      console.error('Marketplace load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return listings.filter(l => {
      const matchesSearch = l.name.toLowerCase().includes(s) || (l.business?.city || '').toLowerCase().includes(s);
      const matchesCategory = category === 'all' || l.listing_type === category || l.type === category;
      return matchesSearch && matchesCategory;
    }).sort((a, b) => b.performanceScore - a.performanceScore);
  }, [listings, search, category]);

  const handleAction = (listing: any) => {
    setSelectedListing(listing);
    const type = listing.listing_type || listing.type;
    if (type === 'wash_service') {
      setBookingModalOpen(true);
    } else {
      setLeadModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-primary font-bold">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Home</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground font-black p-1 rounded text-xs">ALM</div>
            <span className="text-sm font-bold text-primary uppercase italic">Directory</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" asChild><Link href="/login">Sign In</Link></Button>
            <Button size="sm" className="font-bold" asChild><Link href="/signup">Join Us</Link></Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 space-y-12">
        <div className="space-y-4 max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
            <ShieldCheck className="h-3 w-3" />
            <span>Verified Automotive Network</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 uppercase">Find Excellence</h1>
          <p className="text-muted-foreground text-lg">Browse genuine parts, detailing, and verified vehicles across Botswana.</p>
        </div>

        <div className="flex flex-col xl:flex-row gap-6 items-end justify-between bg-white/50 backdrop-blur-sm p-6 rounded-3xl border-2 shadow-sm">
          <div className="flex-1 w-full space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Search Directory</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                placeholder="Search model, service, or city..." 
                className="pl-10 h-14 bg-white border-2 rounded-2xl text-lg"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          
          <div className="w-full xl:w-auto space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Category</Label>
            <div className="flex flex-wrap bg-muted/50 p-1 rounded-xl border gap-1">
              {CATEGORIES.map(cat => (
                <Button 
                  key={cat.id} 
                  variant={category === cat.id ? 'default' : 'ghost'} 
                  size="sm" 
                  className={cn(
                    "flex-1 md:flex-none rounded-lg font-bold h-10 text-[10px] uppercase px-4",
                    category === cat.id ? "shadow-md" : "hover:bg-white/50"
                  )}
                  onClick={() => setCategory(cat.id)}
                >
                  <cat.icon className="h-3.5 w-3.5 mr-2" />
                  {cat.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="h-[400px] overflow-hidden rounded-2xl"><Skeleton className="h-full w-full" /></Card>
            ))
          ) : filtered.length > 0 ? (
            filtered.map((item) => {
              const type = item.listing_type || item.type;
              const displayImage = item.service_image_url || item.image_url || item.business?.logo_url || `https://picsum.photos/seed/${item.id}/600/400`;

              return (
                <Card key={item.id} className="flex flex-col overflow-hidden transition-all duration-300 hover:shadow-2xl border-2 rounded-2xl h-full group">
                  <div className="relative h-48 bg-muted overflow-hidden">
                    <Image 
                      src={displayImage} 
                      alt={item.name} 
                      fill 
                      className="object-cover transition-transform duration-500 group-hover:scale-110" 
                    />
                    <div className="absolute top-2 left-2 flex flex-col gap-1.5">
                      <Badge className="bg-white/90 text-black uppercase text-[9px] font-black shadow-sm">
                        {type.replace('_', ' ')}
                      </Badge>
                      <Badge className={cn(
                        "text-[8px] font-black uppercase shadow-sm border-none",
                        item.performanceBadge === "Top Performer" ? "bg-yellow-500 text-black" : "bg-slate-800 text-white"
                      )}>
                        <Zap className="h-2 w-2 mr-1" /> {item.performanceBadge}
                      </Badge>
                    </div>
                    {item.price && <div className="absolute bottom-2 right-2"><Badge className="bg-primary text-white font-black px-3 py-1 shadow-lg">P{Number(item.price).toLocaleString()}</Badge></div>}
                  </div>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl font-bold line-clamp-1 group-hover:text-primary transition-colors">{item.name}</CardTitle>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                      <div className="flex items-center gap-1"><MapPin className="h-3 w-3 text-primary opacity-60" /><span>{item.business?.city || 'Botswana'}</span></div>
                      <div className="flex items-center gap-1 text-yellow-600"><Star className="h-3 w-3 fill-current" /><span>{item.business?.rating || '4.5'}</span></div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed italic">{item.description}</p>
                  </CardContent>
                  <CardFooter className="mt-auto pt-4 bg-muted/5 border-t">
                    <Button onClick={() => handleAction(item)} className="w-full font-black h-11 uppercase tracking-tighter">
                      {type === 'wash_service' ? 'Book Service' : 'Request Info'}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })
          ) : (
            <div className="col-span-full py-24 text-center border-2 border-dashed rounded-3xl bg-muted/20">
              <Store className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
              <p className="text-xl font-bold">No verified listings found.</p>
            </div>
          )}
        </div>
      </main>

      {selectedListing && (
        <>
          <LeadModal 
            isOpen={leadModalOpen} 
            onClose={() => setLeadModalOpen(false)} 
            listingId={selectedListing.id} 
            listingTitle={selectedListing.name} 
          />
          <BookingModal 
            isOpen={bookingModalOpen} 
            onClose={() => setBookingModalOpen(false)} 
            service={selectedListing} 
          />
        </>
      )}
    </div>
  );
}

export default function PublicFindWashPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>}>
      <MarketplaceContent />
    </Suspense>
  );
}
