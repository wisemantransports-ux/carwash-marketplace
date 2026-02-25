
'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Business, User as ProfileUser } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, MapPin, Search, Filter, ShieldCheck, Store } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';

function BusinessCard({ business }: { business: ProfileUser }) {
  return (
    <Card className="flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/50">
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
            <Store className="h-12 w-12" />
          </div>
        )}
        <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="backdrop-blur-md bg-white/80 text-black">
                {business.plan || 'Verified Partner'}
            </Badge>
        </div>
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">{business.name}</CardTitle>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span>{business.address || 'Address on file'}, {business.city || 'Botswana'}</span>
        </div>
      </CardHeader>
      <CardContent className="flex-grow pb-4">
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
          {business.description || 'Professional car wash services.'}
        </p>
        <div className="flex items-center gap-1.5">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="h-3 w-3 text-yellow-400 fill-yellow-400" />
            ))}
          </div>
          <span className="text-xs font-bold">5.0</span>
          <Badge variant="outline" className="text-[10px] ml-auto bg-green-50 text-green-700 border-green-200">
            <ShieldCheck className="h-3 w-3 mr-1" /> Trust Seal
          </Badge>
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Button asChild className="w-full shadow-md">
          <Link href={`/customer/book/${business.id}`}>View Services</Link>
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
          .from('users')
          .select('*')
          .eq('role', 'business-owner')
          .eq('access_active', true);
        
        if (error) throw error;
        // Convert snake_case to camelCase for the component
        const formatted = (data || []).map(u => ({
          ...u,
          avatarUrl: u.avatar_url,
          accessActive: u.access_active
        })) as ProfileUser[];
        
        setBusinesses(formatted);
      } catch (e: any) {
        toast({ variant: 'destructive', title: 'Load Error', description: 'Could not fetch verified washes.' });
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
    <div className="space-y-8">
      <div className="space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight text-primary">Discover Top Washes</h1>
          <p className="text-muted-foreground text-lg">Browse only verified mobile detailers and stations with active trust seals.</p>
          
          <div className="flex gap-4 max-w-2xl">
              <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search by name or city..." 
                    className="pl-10 h-12"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="overflow-hidden"><Skeleton className="h-48 w-full" /><div className="p-4 space-y-2"><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-1/2" /></div></Card>
            ))
        ) : filtered.length > 0 ? (
            filtered.map(business => (
                <BusinessCard key={business.id} business={business} />
            ))
        ) : (
            <div className="col-span-full py-20 text-center border-2 border-dashed rounded-xl">
                <p className="text-muted-foreground">No verified businesses matching your criteria are active right now.</p>
            </div>
        )}
      </div>
    </div>
  );
}
