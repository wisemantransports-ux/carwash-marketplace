
'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { CarListing, Business } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, CarFront, MoreHorizontal, Trash2, MoreVertical, ExternalLink, AlertCircle, ShieldAlert, History } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function BusinessCarsPage() {
  const [listings, setListings] = useState<CarListing[]>([]);
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
          .from('car_listing')
          .select('*')
          .eq('business_id', biz.id)
          .order('created_at', { ascending: false });
        
        setListings((cars as CarListing[]) || []);
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
      const { error } = await supabase.from('car_listing').delete().eq('id', id);
      if (error) throw error;
      setListings(prev => prev.filter(l => l.id !== id));
      toast({ title: 'Listing Deleted' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Delete Failed', description: e.message });
    }
  };

  const updateStatus = async (id: string, status: CarListing['status']) => {
    try {
      const { error } = await supabase.from('car_listing').update({ status }).eq('id', id);
      if (error) throw error;
      setListings(prev => prev.map(l => l.id === id ? { ...l, status } : l));
      toast({ title: `Status Updated to ${status.toUpperCase()}` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
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
          <Button variant="outline" asChild className="rounded-full">
            <Link href="/business/cars/test-drives">
              <History className="mr-2 h-4 w-4" /> Test Drive Requests
            </Link>
          </Button>
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
              <p className="text-sm text-orange-800">
                {isUnverified 
                  ? "Please ensure your Omang or CIPA documents are uploaded in your profile." 
                  : "Starter plan accounts can view the inventory manager but cannot publish new listings."}
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

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="mb-6 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="active" className="rounded-lg font-bold">Active Listings ({listings.filter(l => l.status === 'available' || l.status === 'active').length})</TabsTrigger>
          <TabsTrigger value="sold" className="rounded-lg font-bold">Sold & Archived ({listings.filter(l => l.status !== 'available' && l.status !== 'active').length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.filter(l => l.status === 'available' || l.status === 'active').length > 0 ? (
              listings.filter(l => l.status === 'available' || l.status === 'active').map(car => (
                <Card key={car.id} className="overflow-hidden border-2 hover:border-primary/50 transition-all group">
                  <div className="relative aspect-video bg-muted">
                    <Image 
                      src={car.images?.[0] || 'https://picsum.photos/seed/car/600/400'} 
                      alt={`${car.make} ${car.model}`} 
                      fill 
                      className="object-cover"
                    />
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-white/90 text-primary font-black backdrop-blur">
                        P{Number(car.price).toLocaleString()}
                      </Badge>
                    </div>
                  </div>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl">{car.year} {car.make} {car.model}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] uppercase font-bold">{car.mileage.toLocaleString()} KM</Badge>
                      <span className="text-[10px] text-muted-foreground uppercase font-black">Listed {new Date(car.created_at).toLocaleDateString()}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="bg-muted/10 border-t pt-4 flex justify-between">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="h-8 text-xs font-bold" onClick={() => updateStatus(car.id, 'sold')}>
                        Mark Sold
                      </Button>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => updateStatus(car.id, 'archived')}>
                          Archive Listing
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive font-bold" onClick={() => handleDelete(car.id)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete Permanently
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <div className="col-span-full py-20 text-center border-2 border-dashed rounded-3xl bg-muted/10">
                <CarFront className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
                <p className="text-lg font-bold text-muted-foreground">No active listings.</p>
                <p className="text-sm text-muted-foreground mb-6">List your first vehicle to reach thousands of buyers.</p>
                <Button asChild variant="outline" disabled={isStarter}>
                  <Link href="/business/cars/add">Start Listing</Link>
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="sold">
          <Card className="shadow-lg overflow-hidden border-2">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 border-b-2">
                  <TableHead className="font-bold">Vehicle</TableHead>
                  <TableHead className="font-bold">Date Listed</TableHead>
                  <TableHead className="font-bold">Final Status</TableHead>
                  <TableHead className="text-right pr-6 font-bold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listings.filter(l => l.status !== 'available' && l.status !== 'active').map(car => (
                  <TableRow key={car.id} className="opacity-70 grayscale">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-16 rounded overflow-hidden border">
                          <Image src={car.images?.[0] || 'https://picsum.photos/seed/car/200/150'} alt="Car" fill className="object-cover" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm">{car.year} {car.make} {car.model}</span>
                          <span className="text-[10px] text-muted-foreground">P{car.price.toLocaleString()}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {new Date(car.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={car.status === 'sold' ? 'secondary' : 'outline'} className="uppercase text-[9px] font-black">
                        {car.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button variant="ghost" size="sm" onClick={() => updateStatus(car.id, 'active')} className="h-8 text-[10px] font-black uppercase">
                        Relist
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {listings.filter(l => l.status !== 'available' && l.status !== 'active').length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic">
                      No archived listings found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
