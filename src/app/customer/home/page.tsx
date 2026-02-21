'use client';
import { useEffect, useState } from 'react';
import { mockGetBusinesses } from '@/lib/mock-api';
import type { Business } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, MapPin } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

function BusinessCard({ business }: { business: Business }) {
  return (
    <Card className="flex flex-col overflow-hidden transition-transform duration-200 hover:scale-[1.02] hover:shadow-xl">
      <div className="relative h-48 w-full">
        <Image
          src={business.imageUrl}
          alt={business.name}
          fill
          className="object-cover"
          data-ai-hint={business.type === 'station' ? 'car wash' : 'work van'}
        />
      </div>
      <CardHeader>
        <CardTitle className="flex justify-between items-start">
          <span>{business.name}</span>
          <Badge variant={business.type === 'station' ? 'outline' : 'default'}>
            {business.type.charAt(0).toUpperCase() + business.type.slice(1)}
          </Badge>
        </CardTitle>
        <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
          <MapPin className="h-4 w-4" />
          <span>{business.address}, {business.city}</span>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="flex items-center gap-1">
          <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
          <span className="font-semibold">{business.rating}</span>
          <span className="text-muted-foreground">({business.reviewCount} reviews)</span>
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
          <Link href={`/customer/book/${business.id}`}>View Services</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function BusinessCardSkeleton() {
    return (
        <Card className="flex flex-col overflow-hidden">
            <Skeleton className="h-48 w-full" />
            <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-5 w-1/3" />
            </CardContent>
            <CardFooter>
                <Skeleton className="h-10 w-full" />
            </CardFooter>
        </Card>
    )
}

export default function CustomerHomePage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBusinesses = async () => {
      setLoading(true);
      const { data } = await mockGetBusinesses();
      setBusinesses(data);
      setLoading(false);
    };
    loadBusinesses();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Find a Car Wash</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
            Array.from({ length: 3 }).map((_, i) => <BusinessCardSkeleton key={i} />)
        ) : (
            businesses.map(business => (
                <BusinessCard key={business.id} business={business} />
            ))
        )}
      </div>
    </div>
  );
}
