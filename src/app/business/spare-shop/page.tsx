'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Business } from '@/lib/types';
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

export default function BusinessSpareShopPage() {
  const [parts, setParts] = useState<any[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: biz, error: bizError } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', session.user.id)
        .maybeSingle();

      if (bizError) throw bizError;

      if (biz) {
        setBusiness(biz as Business);
        
        const { data: partData, error: partError } = await supabase
          .from('listings')
          .select('*')
          .eq('business_id', biz.id)
          .eq('type', 'spare_part')
          .order('created_at', { ascending: false });
        
        if (partError) throw partError;
        setParts(partData || []);
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
    if (!confirm('Delete this part from your inventory?')) return;
    try {
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setParts(prev => prev.filter(p => p.id !== id));
      toast({ title: 'Part Removed Successfully' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Delete Failed', description: e.message });
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {parts.length > 0 ? (
          parts.map(part => (
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
                    P{Number(part.price || 0).toLocaleString()}
                  </Badge>
                </div>
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg line-clamp-1">{part.name}</CardTitle>
                <CardDescription>
                  <Badge variant="outline" className="text-[10px] font-bold">In Stock</Badge>
                </CardDescription>
              </CardHeader>
              <CardFooter className="bg-muted/10 border-t pt-4 flex justify-between">
                <Button variant="secondary" size="sm" className="h-8 text-xs font-bold" asChild>
                  <Link href={`/business/spare-shop/edit/${part.id}`}>
                    <Edit className="mr-1 h-3 w-3" /> Edit
                  </Link>
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(part.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
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
    </div>
  );
}