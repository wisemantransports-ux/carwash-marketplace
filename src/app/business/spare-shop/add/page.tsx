
'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Business } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, Camera, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

/**
 * @fileOverview List Spare Part Page
 * Aligned with unified 'listings' table schema.
 * Strictly uses image_url (string) instead of images (array).
 */

export default function AddSparePartPage() {
  const router = useRouter();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
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

      if (biz) setBusiness(biz as Business);
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
      // 1. Storage Upload with unique path
      const fileExt = imageFile.name.split('.').pop();
      const filePath = `parts/${business.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('business-assets').upload(filePath, imageFile);
      
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('business-assets').getPublicUrl(filePath);

      // 2. Database Insert - TARGETING image_url column
      const { error } = await supabase.from('listings').insert({
        business_id: business.id,
        type: 'spare_part',
        listing_type: 'spare_part',
        name: name.trim(),
        price: parseFloat(price),
        description: description.trim(),
        image_url: publicUrl // Corrected from legacy 'images' array
      });

      if (error) throw error;

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
              <div className="space-y-2">
                <Label>Price (BWP) *</Label>
                <Input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} required />
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
          <Button type="submit" className="w-full h-14 text-lg font-black shadow-xl" disabled={submitting}>
            {submitting ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <ShieldCheck className="mr-2 h-5 w-5" />}
            Publish Listing
          </Button>
        </div>
      </form>
    </div>
  );
}
