
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { CarListing, TestDriveRequest } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { MapPin, Calendar, Banknote, Car as CarIcon, Search, Loader2, Filter, ArrowRight, ShieldCheck, Phone, User, Clock } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function CarCard({ car, onBookTestDrive }: { car: CarListing; onBookTestDrive: (car: CarListing) => void }) {
  const isPremiumDealer = car.business?.subscription_plan === 'Pro' || car.business?.subscription_plan === 'Enterprise';

  return (
    <Card className="flex flex-col h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/50 bg-card border-2 rounded-2xl group">
      <Link href={`/marketplace/cars/${car.id}`} className="relative h-56 w-full overflow-hidden bg-muted">
        <Image
          src={car.image_url || 'https://picsum.photos/seed/car/600/400'}
          alt={`${car.make} ${car.model} ${car.year}`}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          data-ai-hint="car exterior"
        />
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          <Badge className="bg-white/90 text-black backdrop-blur-sm border-none shadow-sm uppercase text-[10px] font-black">
            {car.year}
          </Badge>
          {isPremiumDealer && (
            <Badge className="bg-primary text-white border-none shadow-sm uppercase text-[9px] font-black flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Verified Dealer
            </Badge>
          )}
        </div>
        <div className="absolute bottom-3 right-3">
          <Badge className="bg-primary text-white font-black px-3 py-1 text-sm shadow-lg">
            P{Number(car.price).toLocaleString()}
          </Badge>
        </div>
      </Link>
      
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-xl font-bold line-clamp-1">
            {car.title || `${car.make} ${car.model}`}
          </CardTitle>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span>{car.location || car.business?.city || 'Botswana'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{car.mileage.toLocaleString()} KM</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-grow pb-4">
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 italic">
          {car.description || "No description provided."}
        </p>
      </CardContent>

      <CardFooter className="pt-0 flex flex-col gap-2">
        <Button 
          onClick={() => onBookTestDrive(car)}
          className="w-full font-bold rounded-xl h-11 shadow-sm"
        >
          Book Test Drive
        </Button>
        <Button variant="ghost" asChild className="w-full text-xs font-bold h-8">
          <Link href={`/marketplace/cars/${car.id}`}>
            View Full Details <ArrowRight className="ml-2 h-3 w-3" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function CarMarketplace() {
  const [listings, setListings] = useState<CarListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [makeFilter, setMakeFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  
  // Test Drive Form State
  const [selectedCar, setSelectedCar] = useState<CarListing | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [isBooking, setIsBooking] = useState(false);

  const fetchListings = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('car_listings')
        .select(`
          *,
          business:business_id ( name, city, subscription_plan )
        `)
        .eq('status', 'available')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setListings(data || []);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Fetch Error', description: e.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handleBookTestDrive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCar) return;

    setIsBooking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'Authentication Required', description: 'Please sign in to book a test drive.' });
        return;
      }

      const { error } = await supabase.from('test_drive_requests').insert({
        car_listing_id: selectedCar.id,
        customer_id: session.user.id,
        requested_time: new Date(preferredTime).toISOString(),
        customer_name: customerName,
        customer_phone: customerPhone,
        status: 'pending'
      });

      if (error) throw error;

      toast({ title: 'Request Sent', description: 'The owner will contact you to confirm the time.' });
      setSelectedCar(null);
      setCustomerName(''); setCustomerPhone(''); setPreferredTime('');
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Booking Failed', description: e.message });
    } finally {
      setIsBooking(false);
    }
  };

  const filtered = listings.filter(l => {
    const matchesSearch = l.make.toLowerCase().includes(search.toLowerCase()) || 
                         l.model.toLowerCase().includes(search.toLowerCase()) ||
                         (l.location && l.location.toLowerCase().includes(search.toLowerCase()));
    const matchesMake = makeFilter === 'all' || l.make === makeFilter;
    return matchesSearch && matchesMake;
  }).sort((a, b) => {
    if (sortOrder === 'price-low') return a.price - b.price;
    if (sortOrder === 'price-high') return b.price - a.price;
    if (sortOrder === 'year-new') return b.year - a.year;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const makes = Array.from(new Set(listings.map(l => l.make))).sort();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row gap-6 items-end justify-between bg-white p-6 rounded-3xl border-2 shadow-sm">
        <div className="flex-1 w-full space-y-2">
          <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Universal Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search make, model, or location..." 
              className="pl-10 h-12 rounded-xl"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4 w-full md:w-auto">
          <div className="space-y-2 flex-1 md:w-40">
            <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Make</Label>
            <Select value={makeFilter} onValueChange={setMakeFilter}>
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue placeholder="All Makes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Makes</SelectItem>
                {makes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2 flex-1 md:w-40">
            <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Sort By</Label>
            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Latest Listings</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="year-new">Year: Newest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden bg-card rounded-2xl">
              <Skeleton className="h-56 w-full" />
              <div className="p-6 space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-10 w-full" />
              </div>
            </Card>
          ))
        ) : filtered.length > 0 ? (
          filtered.map(car => (
            <CarCard key={car.id} car={car} onBookTestDrive={setSelectedCar} />
          ))
        ) : (
          <div className="col-span-full py-24 text-center border-2 border-dashed rounded-3xl bg-muted/20">
            <CarIcon className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
            <p className="text-xl font-bold text-muted-foreground">No active car listings found.</p>
            <Button variant="link" onClick={() => { setSearch(''); setMakeFilter('all'); }} className="font-bold">
              View All Listings
            </Button>
          </div>
        )}
      </div>

      {/* Test Drive Modal */}
      <Dialog open={!!selectedCar} onOpenChange={(open) => !open && setSelectedCar(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request a Test Drive</DialogTitle>
            <DialogDescription>
              Submit your interest for the <span className="font-bold text-primary">{selectedCar?.year} {selectedCar?.make} {selectedCar?.model}</span>.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBookTestDrive} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="name" className="pl-10" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Enter your name" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="phone" className="pl-10" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="e.g. 77123456" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Preferred Date & Time</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="time" type="datetime-local" className="pl-10" value={preferredTime} onChange={e => setPreferredTime(e.target.value)} required />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button type="submit" className="w-full h-12 text-lg shadow-xl" disabled={isBooking}>
                {isBooking ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <ShieldCheck className="mr-2 h-5 w-5" />}
                Confirm Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
