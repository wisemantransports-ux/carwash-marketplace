'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User as ProfileUser } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, MapPin, Search, ShieldCheck, Store, Clock } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';

function BusinessCard({ business }: { business: ProfileUser }) {
  const trialDays = business.trial_remaining ?? 0;

  return (
    <Card className="flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/50 bg-card">
      <div className="relative h-48 w-full group overflow-hidden bg-muted">
        {business.avatarUrl ? (
          <Image
            src={business.avatarUrl}
            alt={business.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground">
            <Store className="h-12 w-12 opacity-20" />
          </div>
        )}
        <div className="absolute top-2 right-2 flex flex-col gap-2 items-end">
          <Badge variant="secondary" className="backdrop-blur-md bg-white/90 text-black shadow-sm font-bold">
            {business.plan || 'Verified Partner'}
          </Badge>
          {!business.paid && trialDays > 0 && (
            <Badge variant="outline" className="backdrop-blur-md bg-orange-50/90 text-orange-700 border-orange-200 text-[10px]">
              <Clock className="h-3 w-3 mr-1" /> {trialDays}d Trial
            </Badge>
          )}
        </div>
      </div>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-xl line-clamp-1">{business.name}</CardTitle>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 shrink-0">
            <ShieldCheck className="h-3 w-3 mr-1" /> Trust Seal
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span className="truncate">{business.address || 'Gaborone'}, {business.city || 'Botswana'}</span>
        </div>
      </CardHeader>
      <CardContent className="flex-grow pb-4">
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3 h-8">
          {business.description || 'Providing professional car wash and detailing services across the city.'}
        </p>
        <div className="flex items-center gap-1.5">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className="h-3 w-3 text-yellow-400 fill-yellow-400" />
            ))}
          </div>
          <span className="text-xs font-bold">5.0</span>
          <span className="text-[10px] text-muted-foreground ml-auto">
            {business.access_active ? 'Active Now' : 'Currently Unavailable'}
          </span>
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Button asChild className="w-full shadow-md" disabled={!business.access_active}>
          <Link href={`/customer/book/${business.id}`}>
            {business.access_active ? 'View & Book Services' : 'Service Paused'}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function CustomerHomePage() {
  const [businesses, setBusinesses] = useState<ProfileUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('users_with_access')
          .select('*')
          .eq('role', 'business-owner')
          .eq('access_active', true);
        
        if (error) throw error;
        
        const formatted = (data || []).map(u => ({
          ...u,
          avatarUrl: u.avatar_url,
          accessActive: u.access_active
        })) as ProfileUser[];
        
        setBusinesses(formatted);
      } catch (e: any) {
        console.error('Error loading businesses:', e);
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
          <ShieldCheck className="h-3 w-3" />
          <span>Active Trust Seals Only</span>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-primary">Discover Top Washes</h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Browse professional mobile detailers and stations verified for quality. Only businesses with active trust seals are shown.
        </p>
        
        <div className="flex gap-4 max-w-2xl pt-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by business name or city..." 
              className="pl-10 h-12 bg-card shadow-sm"
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
          <div className="col-span-full py-24 text-center border-2 border-dashed rounded-2xl bg-muted/20">
            <div className="max-w-xs mx-auto space-y-4">
              <Store className="h-12 w-12 mx-auto text-muted-foreground opacity-20" />
              <div className="space-y-1">
                <p className="text-xl font-bold">No verified businesses available</p>
                <p className="text-muted-foreground">Try adjusting your search or check back later for new partners.</p>
              </div>
              <Button variant="outline" onClick={() => setSearch('')}>Clear Search</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
