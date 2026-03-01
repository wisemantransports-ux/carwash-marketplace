
'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Business } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, Camera, Banknote, Package, ShieldCheck, ArrowLeft, Info, Tag, Layers } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function AddSparePartPage() {
  const router = useRouter();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Engine');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState<'new' | 'used' | 'refurbished'>('new');
  const [stock, setStock] = useState('1');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');

      const { data: biz } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (biz) {
        setBusiness(biz as Business);
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
      if (file.size > 2 * 1024 * 1024) {
        toast({ variant: 'destructive', title: 'File Too Large', description: 'Image must be under 2MB.' });
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;
    
    if (!imageFile) {
      toast({ variant: 'destructive', title: 'Incomplete', description: 'Product image is mandatory.' });
      return;
    }

    if (!name.trim() || !price) {
      toast({ variant: 'destructive', title: 'Fields Required', description: 'Please enter a name and price.' });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // 1. Upload Image
      const fileExt = imageFile.name.split('.').pop();
      const filePath = `parts/${business.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('business-assets').upload(filePath, imageFile);
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage.from('business-assets').getPublicUrl(filePath);

      // 2. Insert Part with explicit business_id and owner context
      const { error } = await supabase.from('spare_parts').insert({
        business_id: business.id,
        name: name.trim(),
        category,
        price: parseFloat(price),
        condition,
        stock_quantity: parseInt(stock),
        description: description.trim(),
        images: [publicUrl],
        status: 'active'
      });

      if (error) throw error;

      toast({ title: 'Product Added', description: `${name} is now available in your shop.` });
      router.push('/business/spare-shop');
    } catch (e: any) {
      console.error("Save error:", e);
      toast({ variant: 'destructive', title: 'Error', description: e.message });
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
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight">Add Spare Part</h1>
          <p className="text-muted-foreground">List a new automotive component in the marketplace.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-2 shadow-lg">
            <CardHeader className="bg-muted/10 border-b">
              <CardTitle>Product Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Part Name *</Label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Brake Pads for Toyota Corolla" className="pl-10" required />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Engine">Engine Components</SelectItem>
                      <SelectItem value="Brakes">Braking System</SelectItem>
                      <SelectItem value="Suspension">Suspension & Steering</SelectItem>
                      <SelectItem value="Electrical">Electrical & Lighting</SelectItem>
                      <SelectItem value="Interior">Interior Accessories</SelectItem>
                      <SelectItem value="Exterior">Exterior & Body</SelectItem>
                      <SelectItem value="Filters">Filters & Fluids</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Condition *</Label>
                  <Select value={condition} onValueChange={(v: any) => setCondition(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Brand New</SelectItem>
                      <SelectItem value="used">Used / Second Hand</SelectItem>
                      <SelectItem value="refurbished">Refurbished</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price (BWP) *</Label>
                  <div className="relative">
                    <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="price" type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className="pl-10" placeholder="0.00" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock">Stock Quantity *</Label>
                  <div className="relative">
                    <Layers className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="stock" type="number" value={stock} onChange={e => setStock(e.target.value)} className="pl-10" required />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="desc">Description</Label>
                <Textarea id="desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Provide specifications, compatible models, and warranty details..." className="min-h-[120px]" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-2 shadow-lg overflow-hidden">
            <CardHeader className="bg-muted/10 border-b">
              <CardTitle>Product Image *</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div 
                className="relative aspect-square rounded-xl border-4 border-dashed bg-muted flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors group overflow-hidden"
                onClick={() => fileInputRef.current?.click()}
              >
                {imagePreview ? (
                  <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                ) : (
                  <div className="text-center space-y-2">
                    <Camera className="h-10 w-10 mx-auto text-muted-foreground opacity-40 group-hover:scale-110 transition-transform" />
                    <p className="text-[10px] font-black uppercase text-muted-foreground">Upload Photo</p>
                  </div>
                )}
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            </CardContent>
          </Card>

          <Button type="submit" className="w-full h-14 text-lg shadow-xl" disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShieldCheck className="mr-2 h-5 w-5" />}
            List Product
          </Button>
        </div>
      </form>
    </div>
  );
}
