
'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Business } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, Camera, Banknote, Package, ArrowLeft, Layers, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

/**
 * @fileOverview Add Spare Part Page
 * Provides a professional form for business owners to list new products.
 * 
 * SECURITY:
 * - Uses supabase.auth.getSession() to verify identity.
 * - Enforces business_id association for all records.
 * - Performs server-side validation through RLS policies.
 */

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
      // 1. Retrieve the authenticated session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push('/login');

      // 2. Resolve the business profile linked to the user's OWNER_ID
      const { data: biz, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', session.user.id)
        .maybeSingle();

      if (error) {
        console.error("Auth context error:", error);
        toast({ variant: 'destructive', title: 'Connection Error', description: 'Unable to verify business profile.' });
      }

      if (biz) {
        setBusiness(biz as Business);
      } else {
        // Business profile missing, redirect to setup
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
    
    // 1. Frontend Validation
    if (!imageFile) {
      toast({ variant: 'destructive', title: 'Incomplete', description: 'A product image is mandatory for your listing.' });
      return;
    }

    if (!name.trim() || !price) {
      toast({ variant: 'destructive', title: 'Fields Required', description: 'Please provide a name and price.' });
      return;
    }

    const priceNum = parseFloat(price);
    const stockNum = parseInt(stock);

    if (isNaN(priceNum) || priceNum < 0) {
      toast({ variant: 'destructive', title: 'Invalid Price', description: 'Enter a valid numeric price.' });
      return;
    }

    setSubmitting(true);
    try {
      // 2. High-Fidelity Image Upload to Storage
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `parts/${business.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('business-assets')
        .upload(filePath, imageFile);
      
      if (uploadError) throw new Error(`Image Upload Error: ${uploadError.message}`);
      
      const { data: { publicUrl } } = supabase.storage
        .from('business-assets')
        .getPublicUrl(filePath);

      // 3. Authenticated Insert into spare_parts Table
      const { error: insertError } = await supabase.from('spare_parts').insert({
        business_id: business.id, // Links item to current business
        name: name.trim(),
        category,
        price: priceNum,
        condition,
        stock_quantity: isNaN(stockNum) ? 0 : stockNum,
        description: description.trim(),
        images: [publicUrl],
        status: 'active'
      });

      if (insertError) throw new Error(`Database Error: ${insertError.message}`);

      // 4. Success Navigation
      toast({ 
        title: 'Product Published!', 
        description: `${name} is now available in the marketplace.` 
      });
      router.push('/business/spare-shop');
    } catch (e: any) {
      console.error("Save process failure:", e);
      toast({ 
        variant: 'destructive', 
        title: 'Save Failed', 
        description: e.message || 'An unexpected error occurred while saving.' 
      });
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
          <h1 className="text-3xl font-extrabold tracking-tight text-primary">Add Spare Part</h1>
          <p className="text-muted-foreground">List a new genuine automotive component.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-2 shadow-lg">
            <CardHeader className="bg-muted/10 border-b">
              <CardTitle>Specifications</CardTitle>
              <CardDescription>Enter the technical details for this component.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Part Name *</Label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Brake Pads for Toyota Hilux" className="pl-10" required />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
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
                    <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
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
                  <Label htmlFor="price">Market Price (BWP) *</Label>
                  <div className="relative">
                    <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="price" type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className="pl-10 h-12 bg-white" placeholder="0.00" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock">Initial Stock *</Label>
                  <div className="relative">
                    <Layers className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="stock" type="number" value={stock} onChange={e => setStock(e.target.value)} className="pl-10 h-12 bg-white" required />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="desc">Full Description</Label>
                <Textarea id="desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Provide specifications, compatible models, and warranty details..." className="min-h-[150px] bg-white" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-2 shadow-lg overflow-hidden">
            <CardHeader className="bg-muted/10 border-b">
              <CardTitle>Product Media *</CardTitle>
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
                    <p className="text-[10px] font-black uppercase text-muted-foreground">Upload Main Photo</p>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs">
                  Change Image
                </div>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
              <p className="text-[10px] text-muted-foreground mt-4 italic text-center leading-relaxed">
                Clear, high-resolution photos increase buyer confidence by up to 70%.
              </p>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full h-14 text-lg shadow-xl" disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShieldCheck className="mr-2 h-5 w-5" />}
            Publish Listing
          </Button>
        </div>
      </form>
    </div>
  );
}
