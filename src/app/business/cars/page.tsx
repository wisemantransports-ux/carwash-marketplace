'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Business } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, CarFront, MoreHorizontal, Trash2, Edit, ExternalLink, AlertCircle, ShieldAlert, History } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function BusinessCarsPage() {
  const [listings, setListings] = useState<any[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: biz } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (biz) {
        setBusiness(biz as Business);
        const { data: cars } = await supabase
          .from('listings')
          .select('*')
          .eq('business_id', biz.id)
          .eq('type', 'car')
          .order('created_at', { ascending: false });
        
        setListings(cars || []);
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Load Error', description: e.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;
    try {
      const { error } = await supabase.from('listings').delete().eq('id', id);
      if (error) throw error;
      setListings(prev => prev.filter(l => l.id !== id));
      toast({ title: 'Listing Deleted' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Delete Failed', description: e.message });
    }
  };

  if (!mounted || loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

  const isStarter = business?.subscription_plan === 'Starter';
  const isUnverified = business?.verification_status !== 'verified';

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-extrabold tracking-tight text-primary flex items-center gap-3">
            <CarFront className="h-10 w-10" />
            Car Inventory
          </h1>
          <p className="text-muted-foreground font-medium">List vehicles for sale and manage test drive interest.</p>
        </div>
        <div className="flex gap-3">
          <Button asChild disabled={isStarter || isUnverified} className="rounded-full shadow-lg">
            <Link href="/business/cars/add">
              <Plus className="mr-2 h-4 w-4" /> List New Car
            </Link>
          </Button>
        </div>
      </div>

      {(isStarter || isUnverified) && (
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="pt-6 flex items-start gap-4">
            <ShieldAlert className="h-6 w-6 text-orange-600 shrink-0 mt-1" />
            <div className="space-y-2">
              <p className="font-bold text-orange-900">
                {isUnverified 
                  ? "Verification Required: Your business must be verified before listing vehicles." 
                  : "Upgrade Required: Car sales listings are exclusive to Pro and Enterprise tiers."}
              </p>
              <Button size="sm" variant="outline" className="border-orange-300" asChild>
                <Link href={isUnverified ? "/business/profile" : "/business/subscription"}>
                  {isUnverified ? "Review Profile" : "View Premium Plans"}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {listings.length > 0 ? (
          listings.map(car => (
            <Card key={car.id} className="overflow-hidden border-2 hover:border-primary/50 transition-all group">
              <div className="relative aspect-video bg-muted">
                <Image 
                  src={car.images?.[0] || 'https://picsum.photos/seed/car/600/400'} 
                  alt={car.name} 
                  fill 
                  className="object-cover"
                />
                <div className="absolute top-2 right-2">
                  <Badge className="bg-white/90 text-primary font-black backdrop-blur">
                    P{Number(car.price || 0).toLocaleString()}
                  </Badge>
                </div>
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">{car.name}</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground uppercase font-black">Listed {new Date(car.created_at).toLocaleDateString()}</span>
                </CardDescription>
              </CardHeader>
              <CardFooter className="bg-muted/10 border-t pt-4 flex justify-between">
                <Button variant="secondary" size="sm" className="h-8 text-xs font-bold" asChild>
                  <Link href={`/business/cars/edit/${car.id}`}>
                    <Edit className="mr-1 h-3 w-3" /> Edit
                  </Link>
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(car.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-20 text-center border-2 border-dashed rounded-3xl bg-muted/10">
            <CarFront className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
            <p className="text-lg font-bold text-muted-foreground">No active listings.</p>
            <Button asChild variant="outline" disabled={isStarter}>
              <Link href="/business/cars/add">Start Listing</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}