
'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Business, BusinessLocation } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, Camera, Banknote, Package, ArrowLeft, Layers, ShieldCheck, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function AddSparePartPage() {
  const router = useRouter();
  const [business, setBusiness] = useState<Business | null>(null);
  const [locations, setLocations] = useState<BusinessLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Engine');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState<'new' | 'used' | 'refurbished'>('new');
  const [stock, setStock] = useState('1');
  const [locationId, setLocationId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push('/login');

      const { data: biz } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', session.user.id)
        .maybeSingle();

      if (biz) {
        setBusiness(biz as Business);
        const { data: locs } = await supabase
          .from('business_locations')
          .select('*')
          .eq('business_id', biz.id);
        
        const locList = locs || [];
        setLocations(locList);
        if (locList.length > 0) setLocationId(locList[0].id);
      } else {
        router.push('/business/profile');
      }
      setLoading(false);
    }
    checkAuth();
  }, [router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business || !imageFile) {
      toast({ variant: 'destructive', title: 'Incomplete', description: 'Product image required.' });
      return;
    }

    setSubmitting(true);
    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `parts/${business.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage.from('business-assets').upload(filePath, imageFile);
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage.from('business-assets').getPublicUrl(filePath);

      const { error: insertError } = await supabase.from('spare_parts').insert({
        business_id: business.id,
        location_id: locationId || null,
        name: name.trim(),
        category,
        price: parseFloat(price),
        condition,
        stock_quantity: parseInt(stock),
        description: description.trim(),
        images: [publicUrl],
        status: 'active'
      });

      if (insertError) throw insertError;

      toast({ title: 'Product Published!', description: `${name} is now available.` });
      router.push('/business/spare-shop');
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link href="/business/spare-shop"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <h1 className="text-3xl font-extrabold tracking-tight">List Spare Part</h1>
      </div>

      <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-2 shadow-lg">
            <CardHeader className="bg-muted/10 border-b"><CardTitle>Specifications</CardTitle></CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <Label>Part Name *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} required />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Engine">Engine Components</SelectItem>
                      <SelectItem value="Brakes">Braking System</SelectItem>
                      <SelectItem value="Suspension">Suspension</SelectItem>
                      <SelectItem value="Electrical">Electrical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Retail Branch *</Label>
                  <Select value={locationId} onValueChange={setLocationId}>
                    <SelectTrigger className="bg-white">
                      <MapPin className="h-4 w-4 mr-2 text-primary" />
                      <SelectValue placeholder="Select Branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map(loc => (
                        <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                      ))}
                      {locations.length === 0 && <SelectItem value="default">Main Showroom</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Price (BWP) *</Label>
                  <Input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Initial Stock</Label>
                  <Input type="number" value={stock} onChange={e => setStock(e.target.value)} required />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} className="min-h-[120px] bg-white" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-2 shadow-lg overflow-hidden">
            <CardHeader className="bg-muted/10 border-b"><CardTitle>Product Photo</CardTitle></CardHeader>
            <CardContent className="pt-6">
              <div 
                className="relative aspect-square rounded-xl border-4 border-dashed bg-muted flex items-center justify-center cursor-pointer hover:border-primary transition-colors group overflow-hidden"
                onClick={() => fileInputRef.current?.click()}
              >
                {imagePreview ? <Image src={imagePreview} alt="Preview" fill className="object-cover" /> : <Camera className="h-10 w-10 opacity-20" />}
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            </CardContent>
          </Card>
          <Button type="submit" className="w-full h-14 text-lg shadow-xl" disabled={submitting}>
            {submitting ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <ShieldCheck className="mr-2 h-5 w-5" />}
            Publish Listing
          </Button>
        </div>
      </form>
    </div>
  );
}
