'use client';

import { useEffect, useState, Suspense, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Search, ShieldCheck, Store, Filter, Droplets, ShoppingCart, Car as CarIcon, Building2, UserCheck, Zap, Star, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { BookingModal } from '@/components/app/booking-modal';
import { LeadModal } from '@/components/app/lead-modal';

const CATEGORIES = [
  { id: 'all', label: 'All Partners', icon: Filter },
  { id: 'wash_service', label: 'Car Wash', icon: Droplets },
  { id: 'spare_part', label: 'Spare Parts', icon: ShoppingCart },
  { id: 'car', label: 'Car Sales', icon: CarIcon },
];

function MarketplaceContent() {
  const searchParams = useSearchParams();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [allListings, setAllListings] = useState<any[]>([]);
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'all');
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Modal states
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  const calculatePerformance = useCallback(async (bizData: any[]) => {
    return bizData.map(biz => {
      const score = (biz.rating || 4.5) / 5;
      let performanceBadge = "Reliable Partner";
      if (score > 0.85) performanceBadge = "Top Performer";

      return { ...biz, performanceScore: score, performanceBadge };
    });
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // STAGE 1: Fetch Verified Businesses
      const { data: bizData } = await supabase
          .from('businesses')
          .select('id, name, city, logo_url, verification_status, category, address, business_type, special_tag, rating, subscription_plan')
          .eq('verification_status', 'verified')
          .order('name', { ascending: true });
      
      const partnerBusinesses = await calculatePerformance(bizData || []);
      const verifiedIds = partnerBusinesses.map(b => b.id);
      const bizMap = partnerBusinesses.reduce((acc: any, b: any) => {
        acc[b.id] = b;
        return acc;
      }, {});

      setBusinesses(partnerBusinesses);

      if (verifiedIds.length > 0) {
        // STAGE 2: Fetch Listings for Verified IDs
        const { data: listingData } = await supabase
          .from('listings')
          .select('id, business_id, name, description, price, listing_type, type, image_url, service_image_url, created_at')
          .in('business_id', verifiedIds)
          .order('created_at', { ascending: false });

        setAllListings((listingData || []).map(l => ({ 
          ...l, 
          business: bizMap[l.business_id] || { name: 'Verified Partner', performanceBadge: 'Reliable Partner' }
        })));
      }
    } catch (e: any) {
      console.error('Marketplace discovery failure:', e.message || e);
    } finally {
      setLoading(false);
    }
  }, [calculatePerformance]);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, [loadData]);

  const filteredItems = useMemo(() => {
    const sTerm = search.toLowerCase();
    const s = sTerm;
    
    return allListings.filter(l => {
      const matchesSearch = l.name.toLowerCase().includes(s) || (l.description || '').toLowerCase().includes(s) || (l.business?.city || '').toLowerCase().includes(s);
      const type = l.listing_type || l.type || 'wash_service';
      const matchesCategory = category === 'all' || type === category;
      return matchesSearch && matchesCategory;
    }).sort((a, b) => {
      const scoreA = a.business?.performanceScore || 0;
      const scoreB = b.business?.performanceScore || 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
  }, [allListings, search, category]);

  const handleAction = (item: any) => {
    setSelectedListing(item);
    const type = item.listing_type || item.type || 'wash_service';
    if (type === 'wash_service') {
      setBookingModalOpen(true);
    } else {
      setLeadModalOpen(true);
    }
  };

  if (!mounted) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <div className="flex-1 space-y-4 w-full">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
            <ShieldCheck className="h-3 w-3" />
            <span>High-Performance Marketplace Network</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-primary uppercase italic">Partner Discovery</h1>
          
          <div className="space-y-6">
            <div className="relative max-w-2xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search models, services, or cities..." 
                className="pl-10 h-12 bg-card shadow-sm border-2"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <div className="bg-muted/30 p-1.5 rounded-2xl border-2 flex flex-wrap gap-1.5 w-fit">
              {CATEGORIES.map(cat => (
                <Button 
                  key={cat.id} 
                  variant={category === cat.id ? 'default' : 'ghost'} 
                  size="sm" 
                  className={cn(
                    "rounded-xl px-5 font-bold h-10 transition-all uppercase text-[10px] tracking-wider",
                    category === cat.id ? "shadow-md" : "hover:bg-white/50"
                  )}
                  onClick={() => setCategory(cat.id)}
                >
                  <cat.icon className={cn("h-3.5 w-3.5 mr-2", category === cat.id ? "text-white" : "text-primary")} />
                  {cat.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden bg-card rounded-2xl h-[500px]"><Skeleton className="h-full w-full" /></Card>
          ))
        ) : filteredItems.length > 0 ? (
          filteredItems.map((item: any) => {
            const biz = item.business;
            const type = item.listing_type || item.type || 'wash_service';
            
            let displayImage = `https://picsum.photos/seed/${item.id}/600/400`;
            displayImage = item.service_image_url || item.image_url || biz?.logo_url || displayImage;

            const performanceBadge = biz?.performanceBadge;

            return (
              <Card key={item.id} className="flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl border-2 rounded-2xl h-full group">
                <div className="relative h-48 bg-muted overflow-hidden">
                  <Image 
                    src={displayImage} 
                    alt={item.name} fill className="object-cover transition-transform duration-500 group-hover:scale-110" 
                  />
                  <div className="absolute top-2 left-2 flex flex-col gap-1.5">
                    <Badge className="bg-white/90 text-black uppercase text-[9px] font-black shadow-sm w-fit">
                      {type.replace('_', ' ')}
                    </Badge>
                    <Badge className={cn(
                      "text-[8px] font-black uppercase shadow-sm w-fit border-none",
                      performanceBadge === "Top Performer" ? "bg-yellow-500 text-black" : 
                      "bg-slate-800 text-white"
                    )}>
                      <Zap className="h-2 w-2 mr-1" /> {performanceBadge}
                    </Badge>
                  </div>
                  {item.price && <div className="absolute bottom-2 right-2"><Badge className="bg-primary text-white font-black px-3 py-1 shadow-lg">P{Number(item.price).toLocaleString()}</Badge></div>}
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl font-bold line-clamp-1 group-hover:text-primary transition-colors">{item.name}</CardTitle>
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-bold uppercase tracking-wider">
                    <div className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-primary opacity-60" /><span>{biz?.city || 'Botswana'}</span></div>
                    <div className="flex items-center gap-1 text-yellow-600"><Star className="h-3 w-3 fill-current" /><span>{biz?.rating || '4.5'}</span></div>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow"><p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed italic">{item.description}</p></CardContent>
                <CardFooter className="mt-auto pt-4 bg-muted/5 border-t">
                  <Button onClick={() => handleAction(item)} className="w-full font-black h-11 shadow-sm uppercase tracking-tighter">
                    {type === 'wash_service' ? 'Book Service' : 'Inquire Now'}
                  </Button>
                </CardFooter>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full py-24 text-center border-2 border-dashed rounded-3xl bg-muted/20">
            <Store className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
            <p className="text-xl font-bold">No partners found.</p>
            <Button variant="link" onClick={() => setSearch('')} className="font-bold">Reset Filters</Button>
          </div>
        )}
      </div>

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

export default function CustomerHomePage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>}>
      <MarketplaceContent />
    </Suspense>
  );
}