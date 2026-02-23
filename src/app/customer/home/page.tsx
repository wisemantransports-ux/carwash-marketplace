
'use client';
import { useEffect, useState } from 'react';
import { mockGetVerifiedBusinesses } from '@/lib/mock-api';
import type { Business } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, MapPin, Search, Filter } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';

function BusinessCard({ business }: { business: Business }) {
  return (
    <Card className="flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/50">
      <div className="relative h-48 w-full group overflow-hidden">
        <Image
          src={business.imageUrl}
          alt={business.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute top-2 right-2">
            <Badge variant={business.type === 'station' ? 'secondary' : 'default'} className="backdrop-blur-md bg-white/80 text-black">
                {business.type.charAt(0).toUpperCase() + business.type.slice(1)}
            </Badge>
        </div>
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">{business.name}</CardTitle>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span>{business.address}, {business.city}</span>
        </div>
      </CardHeader>
      <CardContent className="flex-grow pb-4">
        <div className="flex items-center gap-1.5">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className={`h-3 w-3 ${s <= Math.floor(business.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
            ))}
          </div>
          <span className="text-xs font-bold">{business.rating}</span>
          <span className="text-[10px] text-muted-foreground">({business.reviewCount} reviews)</span>
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
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await mockGetVerifiedBusinesses();
      setBusinesses(data);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = businesses.filter(b => 
    b.name.toLowerCase().includes(search.toLowerCase()) || 
    b.city.toLowerCase().includes(search.toLowerCase())
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
              <Button variant="outline" className="h-12 px-6">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
              </Button>
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
