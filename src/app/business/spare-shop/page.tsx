
'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { SparePart, Business } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Package, MoreHorizontal, Trash2, Edit, RefreshCw, ShieldCheck } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

/**
 * @fileOverview Business Spare Shop Management Page
 * Handles listing and management of spare parts inventory for authenticated owners.
 * 
 * SECURITY:
 * - Uses session.user.id to find the associated business.
 * - All Supabase queries filter by 'business_id' to comply with RLS policies.
 */

export default function BusinessSpareShopPage() {
  const [parts, setParts] = useState<SparePart[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      // 1. Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 2. Fetch the business record for this user (OWNER_ID context)
      const { data: biz, error: bizError } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', session.user.id)
        .maybeSingle();

      if (bizError) throw bizError;

      if (biz) {
        setBusiness(biz as Business);
        
        // 3. Fetch spare parts filtered by business_id (RLS Enforcement)
        const { data: partData, error: partError } = await supabase
          .from('spare_parts')
          .select('*')
          .eq('business_id', biz.id)
          .order('created_at', { ascending: false });
        
        if (partError) throw partError;
        setParts((partData as SparePart[]) || []);
      }
    } catch (e: any) {
      console.error("Dashboard Load Error:", e);
      toast({ variant: 'destructive', title: 'Load Error', description: e.message });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: string) => {
    if (!business) return;
    if (!confirm('Delete this part from your inventory?')) return;
    
    try {
      // Must include business_id to satisfy RLS owner checks
      const { error } = await supabase
        .from('spare_parts')
        .delete()
        .eq('id', id)
        .eq('business_id', business.id);

      if (error) throw error;
      setParts(prev => prev.filter(p => p.id !== id));
      toast({ title: 'Part Removed Successfully' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Delete Failed', description: e.message });
    }
  };

  const updateStatus = async (id: string, status: SparePart['status']) => {
    if (!business) return;
    try {
      const { error } = await supabase
        .from('spare_parts')
        .update({ status })
        .eq('id', id)
        .eq('business_id', business.id);

      if (error) throw error;
      setParts(prev => prev.map(p => p.id === id ? { ...p, status } : p));
      toast({ title: `Item marked as ${status.toUpperCase()}` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
    }
  };

  if (!mounted || (loading && !refreshing)) return (
    <div className="flex justify-center py-20">
      <Loader2 className="animate-spin h-8 w-8 text-primary" />
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-extrabold tracking-tight text-primary flex items-center gap-3">
            <Package className="h-10 w-10" />
            Inventory Manager
          </h1>
          <p className="text-muted-foreground font-medium">Manage your spare parts and retail listings.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => fetchData(true)} disabled={refreshing} className="rounded-full">
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
          <Button asChild className="rounded-full shadow-lg h-12 px-6">
            <Link href="/business/spare-shop/add">
              <Plus className="mr-2 h-5 w-5" /> List New Product
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="mb-6 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="active" className="rounded-lg font-bold">Active Stock ({parts.filter(p => p.status === 'active').length})</TabsTrigger>
          <TabsTrigger value="archived" className="rounded-lg font-bold">Sold Out / Archived ({parts.filter(p => p.status !== 'active').length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {parts.filter(p => p.status === 'active').length > 0 ? (
              parts.filter(p => p.status === 'active').map(part => (
                <Card key={part.id} className="overflow-hidden border-2 hover:border-primary/50 transition-all group shadow-sm">
                  <div className="relative aspect-square bg-muted">
                    <Image 
                      src={part.images?.[0] || 'https://picsum.photos/seed/part/400/400'} 
                      alt={part.name} 
                      fill 
                      className="object-cover"
                    />
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-white/90 text-primary font-black backdrop-blur shadow-sm">
                        P{Number(part.price).toLocaleString()}
                      </Badge>
                    </div>
                    <div className="absolute top-2 left-2">
                      <Badge variant="secondary" className="text-[9px] font-black uppercase shadow-sm">
                        {part.condition}
                      </Badge>
                    </div>
                  </div>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg line-clamp-1">{part.name}</CardTitle>
                    <CardDescription className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">{part.category}</span>
                      <Badge variant="outline" className="text-[10px] font-bold">{part.stock_quantity} in stock</Badge>
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="bg-muted/10 border-t pt-4 flex justify-between">
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" className="h-8 text-xs font-bold" asChild>
                        <Link href={`/business/spare-shop/edit/${part.id}`}>
                          <Edit className="mr-1 h-3 w-3" /> Edit
                        </Link>
                      </Button>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => updateStatus(part.id, 'sold_out')}>
                          Mark Sold Out
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateStatus(part.id, 'archived')}>
                          Archive Product
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive font-bold" onClick={() => handleDelete(part.id)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete Permanently
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <div className="col-span-full py-24 text-center border-2 border-dashed rounded-3xl bg-muted/10">
                <Package className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
                <p className="text-lg font-bold text-muted-foreground">No active products in inventory.</p>
                <Button asChild variant="outline" className="mt-4">
                  <Link href="/business/spare-shop/add">Add Your First Product</Link>
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="archived">
          <Card className="shadow-lg border-2 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 border-b-2">
                  <TableHead className="font-bold py-4 pl-6">Product</TableHead>
                  <TableHead className="font-bold">Category</TableHead>
                  <TableHead className="font-bold">Price</TableHead>
                  <TableHead className="font-bold text-center">Status</TableHead>
                  <TableHead className="text-right pr-6 font-bold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parts.filter(p => p.status !== 'active').map(part => (
                  <TableRow key={part.id} className="opacity-70 group hover:opacity-100 transition-opacity border-b">
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 rounded overflow-hidden border bg-muted">
                          <Image src={part.images?.[0] || 'https://picsum.photos/seed/part/100/100'} alt="Part" fill className="object-cover" />
                        </div>
                        <span className="font-bold text-sm">{part.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-[10px] font-bold uppercase text-muted-foreground">{part.category}</TableCell>
                    <TableCell className="text-xs font-bold text-primary">P{part.price}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={part.status === 'sold_out' ? 'destructive' : 'outline'} className="uppercase text-[9px] font-black">
                        {part.status?.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button variant="ghost" size="sm" onClick={() => updateStatus(part.id, 'active')} className="h-8 text-[10px] font-black uppercase text-primary hover:bg-primary/5">
                        Relist Product
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {parts.filter(p => p.status !== 'active').length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">
                      No archived inventory found.
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
