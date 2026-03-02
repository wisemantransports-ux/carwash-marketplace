
'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { BusinessLocation, Business } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, MapPin, Phone, Trash2, Home, Building2, ShieldAlert } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Link from 'next/link';

export default function BusinessLocationsPage() {
  const [locations, setLocations] = useState<BusinessLocation[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');

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
        const { data: locs } = await supabase
          .from('business_locations')
          .select('*')
          .eq('business_id', biz.id)
          .order('name', { ascending: true });
        
        setLocations(locs || []);
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Load Error', description: e.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;

    if (business.subscription_plan !== 'Enterprise' && locations.length >= 1) {
      toast({ 
        variant: 'destructive', 
        title: 'Upgrade Required', 
        description: 'Multi-location management is an Enterprise feature.' 
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('business_locations')
        .insert({
          business_id: business.id,
          name: name.trim(),
          address: address.trim(),
          city: city.trim(),
          phone: phone.trim()
        });

      if (error) throw error;

      toast({ title: 'Branch Added', description: `${name} is now active in your network.` });
      setIsAddOpen(false);
      setName(''); setAddress(''); setCity(''); setPhone('');
      fetchData();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Action Failed', description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this branch? This will orphan any listings assigned to it.')) return;
    try {
      const { error } = await supabase.from('business_locations').delete().eq('id', id);
      if (error) throw error;
      setLocations(prev => prev.filter(l => l.id !== id));
      toast({ title: 'Branch Removed' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Delete Failed', description: e.message });
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

  const isEnterprise = business?.subscription_plan === 'Enterprise';

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-extrabold tracking-tight text-primary flex items-center gap-3">
            <Building2 className="h-10 w-10" />
            Branch Registry
          </h1>
          <p className="text-muted-foreground font-medium">Manage your multi-location network and branch contact details.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button disabled={!isEnterprise && locations.length >= 1} className="rounded-full shadow-lg">
              <Plus className="mr-2 h-4 w-4" /> Add New Branch
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Business Branch</DialogTitle>
              <DialogDescription>Register a new physical location for your operations.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddLocation} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="lname">Branch Name *</Label>
                <Input id="lname" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. G-West Branch" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="laddr">Physical Address *</Label>
                <Input id="laddr" value={address} onChange={e => setAddress(e.target.value)} placeholder="Plot 1234, Main Mall" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lcity">City *</Label>
                  <Input id="lcity" value={city} onChange={e => setCity(e.target.value)} placeholder="Gaborone" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lphone">Branch Phone</Label>
                  <Input id="lphone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="77123456" />
                </div>
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                  Register Branch
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!isEnterprise && (
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="pt-6 flex items-start gap-4">
            <ShieldAlert className="h-6 w-6 text-orange-600 shrink-0 mt-1" />
            <div className="space-y-2">
              <p className="font-bold text-orange-900">Enterprise Feature: Multi-Location Management</p>
              <p className="text-sm text-orange-800">
                You are currently on the {business?.subscription_plan} plan which supports a single primary location. 
                Upgrade to Enterprise to manage unlimited branches and inventory per location.
              </p>
              <Button size="sm" variant="outline" className="border-orange-300" asChild>
                <Link href="/business/subscription">Explore Enterprise Plan</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {locations.map((loc) => (
          <Card key={loc.id} className="relative group overflow-hidden border-2 hover:border-primary/50 transition-all">
            <CardHeader className="bg-muted/10 border-b">
              <div className="flex justify-between items-start">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                {locations.length > 1 && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDelete(loc.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <CardTitle className="text-xl mt-2">{loc.name}</CardTitle>
              <CardDescription className="flex items-center gap-1 font-medium">
                {loc.city}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3 text-sm">
                <Home className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{loc.address}</span>
              </div>
              {loc.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-bold">{loc.phone}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {locations.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed rounded-3xl bg-muted/10">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
            <p className="text-lg font-bold text-muted-foreground">No branches registered.</p>
            <p className="text-sm text-muted-foreground mb-6">Your primary business address will be used until you register branches.</p>
          </div>
        )}
      </div>
    </div>
  );
}
