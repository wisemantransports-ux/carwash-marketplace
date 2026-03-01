
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { SparePart, Business } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from '@/hooks/use-toast';
import { Loader2, Save, ArrowLeft, Package, Banknote, ShieldCheck, Camera, Upload, Layers } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function EditSparePartPage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [business, setBusiness] = useState<Business | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState<'new' | 'used' | 'refurbished'>('new');
  const [stock, setStock] = useState('');
  const [description, setDescription] = useState('');
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  
  // Image Upload State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPart = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');

      const { data: biz } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (!biz) return router.push('/business/profile');
      setBusiness(biz as Business);

      const { data: part, error } = await supabase
        .from('spare_parts')
        .select('*')
        .eq('id', id)
        .eq('business_id', biz.id)
        .maybeSingle();

      if (error || !part) {
        toast({ variant: 'destructive', title: 'Not Found', description: 'Product not found or access denied.' });
        return router.push('/business/spare-shop');
      }

      setName(part.name);
      setCategory(part.category);
      setPrice(part.price.toString());
      setCondition(part.condition);
      setStock(part.stock_quantity.toString());
      setDescription(part.description || '');
      setCurrentImage(part.images?.[0] || null);

    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Load Error', description: e.message });
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchPart();
  }, [fetchPart]);

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
    if (!business) return;

    const priceNum = parseFloat(price);
    const stockNum = parseInt(stock);

    if (isNaN(priceNum) || priceNum < 0) {
      toast({ variant: 'destructive', title: 'Invalid Price', description: 'Please enter a valid numeric price.' });
      return;
    }

    setSubmitting(true);
    try {
      let finalImages = currentImage ? [currentImage] : [];

      if (imageFile) {
        const filePath = `parts/${business.id}/${Date.now()}.${imageFile.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage.from('business-assets').upload(filePath, imageFile);
        if (uploadError) throw new Error(`Upload Error: ${uploadError.message}`);
        
        const { data: { publicUrl } } = supabase.storage.from('business-assets').getPublicUrl(filePath);
        finalImages = [publicUrl];
      }

      // Update strictly filtering by business_id to comply with RLS
      const { error: updateError } = await supabase
        .from('spare_parts')
        .update({
          name: name.trim(),
          category,
          price: priceNum,
          condition,
          stock_quantity: isNaN(stockNum) ? 0 : stockNum,
          description: description.trim(),
          images: finalImages
        })
        .eq('id', id)
        .eq('business_id', business.id);

      if (updateError) throw new Error(`Database Error: ${updateError.message}`);

      toast({ title: 'Inventory Updated', description: `${name} has been updated successfully.` });
      router.push('/business/spare-shop');
    } catch (e: any) {
      console.error("Update process failed:", e);
      toast({ 
        variant: 'destructive', 
        title: 'Update Failed', 
        description: e.message || 'An unexpected error occurred during the update.' 
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
        <h1 className="text-3xl font-extrabold tracking-tight text-primary">Edit Product</h1>
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
                  <Label>Condition</Label>
                  <Select value={condition} onValueChange={(v: any) => setCondition(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Brand New</SelectItem>
                      <SelectItem value="used">Used</SelectItem>
                      <SelectItem value="refurbished">Refurbished</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Price (BWP)</Label>
                  <Input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Stock Quantity</Label>
                  <Input type="number" value={stock} onChange={e => setStock(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} className="min-h-[120px]" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-2 shadow-lg overflow-hidden">
            <CardHeader className="bg-muted/10 border-b"><CardTitle>Photo</CardTitle></CardHeader>
            <CardContent className="pt-6">
              <div 
                className="relative aspect-square rounded-xl border-4 border-dashed bg-muted flex items-center justify-center cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
              >
                {(imagePreview || currentImage) ? (
                  <Image src={imagePreview || currentImage!} alt="Preview" fill className="object-cover" />
                ) : <Camera className="h-10 w-10 opacity-20" />}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                  Change Photo
                </div>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            </CardContent>
          </Card>
          <Button type="submit" className="w-full h-14 text-lg shadow-xl" disabled={submitting}>
            {submitting ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Save className="h-5 w-5 mr-2" />}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
