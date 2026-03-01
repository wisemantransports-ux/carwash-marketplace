
'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { SparePart, Business } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Package, MoreHorizontal, Trash2, Edit, AlertCircle, ShieldAlert, History, ShoppingCart } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function BusinessSpareShopPage() {
  const [parts, setParts] = useState<SparePart[]>([]);
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
        const { data: partData } = await supabase
          .from('spare_parts')
          .select('*')
          .eq('business_id', biz.id)
          .order('created_at', { ascending: false });
        
        setParts((partData as SparePart[]) || []);
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
    if (!confirm('Delete this part from inventory?')) return;
    try {
      const { error } = await supabase.from('spare_parts').delete().eq('id', id);
      if (error) throw error;
      setParts(prev => prev.filter(p => p.id !== id));
      toast({ title: 'Part Removed' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Delete Failed', description: e.message });
    }
  };

  const updateStatus = async (id: string, status: SparePart['status']) => {
    try {
      const { error } = await supabase.from('spare_parts').update({ status }).eq('id', id);
      if (error) throw error;
      setParts(prev => prev.map(p => p.id === id ? { ...p, status } : p));
      toast({ title: `Status: ${status.toUpperCase()}` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
    }
  };

  if (!mounted || loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

  const isUnverified = business?.verification_status !== 'verified';

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-extrabold tracking-tight text-primary flex items-center gap-3">
            <Package className="h-10 w-10" />
            Spare Shop Inventory
          </h1>
          <p className="text-muted-foreground font-medium">Manage your automotive parts and retail listings.</p>
        </div>
        <Button asChild disabled={isUnverified} className="rounded-full shadow-lg h-12 px-6">
          <Link href="/business/spare-shop/add">
            <Plus className="mr-2 h-5 w-5" /> Add New Part
          </Link>
        </Button>
      </div>

      {isUnverified && (
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="pt-6 flex items-start gap-4">
            <ShieldAlert className="h-6 w-6 text-orange-600 shrink-0 mt-1" />
            <div className="space-y-2">
              <p className="font-bold text-orange-900">Verification Required</p>
              <p className="text-sm text-orange-800">
                Your business must be verified before listing products in the marketplace.
              </p>
              <Button size="sm" variant="outline" className="border-orange-300" asChild>
                <Link href="/business/profile">Complete Profile</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="mb-6 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="active" className="rounded-lg font-bold">Active Stock ({parts.filter(p => p.status === 'active').length})</TabsTrigger>
          <TabsTrigger value="archived" className="rounded-lg font-bold">Sold Out / Archived ({parts.filter(p => p.status !== 'active').length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {parts.filter(p => p.status === 'active').length > 0 ? (
              parts.filter(p => p.status === 'active').map(part => (
                <Card key={part.id} className="overflow-hidden border-2 hover:border-primary/50 transition-all group">
                  <div className="relative aspect-square bg-muted">
                    <Image 
                      src={part.images?.[0] || 'https://picsum.photos/seed/part/400/400'} 
                      alt={part.name} 
                      fill 
                      className="object-cover"
                    />
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-white/90 text-primary font-black backdrop-blur">
                        P{Number(part.price).toLocaleString()}
                      </Badge>
                    </div>
                    <div className="absolute top-2 left-2">
                      <Badge variant="secondary" className="text-[9px] font-black uppercase">
                        {part.condition}
                      </Badge>
                    </div>
                  </div>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg line-clamp-1">{part.name}</CardTitle>
                    <CardDescription className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">{part.category}</span>
                      <Badge variant="outline" className="text-[10px]">{part.stock_quantity} in stock</Badge>
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
                          Archive Listing
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive font-bold" onClick={() => handleDelete(part.id)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <div className="col-span-full py-20 text-center border-2 border-dashed rounded-3xl bg-muted/10">
                <Package className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
                <p className="text-lg font-bold text-muted-foreground">No active parts in inventory.</p>
                <Button asChild variant="outline" className="mt-4" disabled={isUnverified}>
                  <Link href="/business/spare-shop/add">Add Your First Product</Link>
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="archived">
          <Card className="shadow-lg border-2">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-bold">Product</TableHead>
                  <TableHead className="font-bold">Category</TableHead>
                  <TableHead className="font-bold">Price</TableHead>
                  <TableHead className="font-bold text-center">Status</TableHead>
                  <TableHead className="text-right pr-6 font-bold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parts.filter(p => p.status !== 'active').map(part => (
                  <TableRow key={part.id} className="opacity-70">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 rounded overflow-hidden border">
                          <Image src={part.images?.[0] || 'https://picsum.photos/seed/part/100/100'} alt="Part" fill className="object-cover" />
                        </div>
                        <span className="font-bold text-sm">{part.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-medium uppercase">{part.category}</TableCell>
                    <TableCell className="text-xs font-bold">P{part.price}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={part.status === 'sold_out' ? 'destructive' : 'outline'} className="uppercase text-[9px] font-black">
                        {part.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button variant="ghost" size="sm" onClick={() => updateStatus(part.id, 'active')} className="h-8 text-[10px] font-black uppercase text-primary">
                        Relist
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
