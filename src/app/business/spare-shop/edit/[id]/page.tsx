'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Business } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Loader2, Save, ArrowLeft, Camera } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function EditSparePartPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [business, setBusiness] = useState<Business | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  
  // Image Upload State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPart = useCallback(async () => {
    if (!id) return;
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
        .from('listings')
        .select('id, name, price, description, image_url')
        .eq('id', id)
        .eq('business_id', biz.id)
        .eq('type', 'spare_part')
        .maybeSingle();

      if (error || !part) {
        toast({ variant: 'destructive', title: 'Not Found', description: 'Product not found or access denied.' });
        return router.push('/business/spare-shop');
      }

      setName(part.name || '');
      setPrice(part.price?.toString() || '');
      setDescription(part.description || '');
      setCurrentImage(part.image_url || null);

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

    setSubmitting(true);
    try {
      let finalImageUrl = currentImage;

      if (imageFile) {
        const filePath = `parts/${business.id}/${Date.now()}.${imageFile.name.split('.').pop()}`;
        await supabase.storage.from('business-assets').upload(filePath, imageFile);
        const { data: { publicUrl } } = supabase.storage.from('business-assets').getPublicUrl(filePath);
        finalImageUrl = publicUrl;
      }

      const { error } = await supabase
        .from('listings')
        .update({
          name: name.trim(),
          price: parseFloat(price),
          description: description.trim(),
          image_url: finalImageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('business_id', business.id);

      if (error) throw error;

      toast({ title: 'Inventory Updated', description: `${name} has been updated.` });
      router.push('/business/spare-shop');
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
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
        <h1 className="text-3xl font-extrabold tracking-tight">Edit Part</h1>
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
                <Input type="number" value={price} onChange={e => setPrice(e.target.value)} required />
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
                className="relative aspect-square rounded-xl border-4 border-dashed bg-muted flex flex-col items-center justify-center cursor-pointer group overflow-hidden"
                onClick={() => fileInputRef.current?.click()}
              >
                {(imagePreview || currentImage) ? (
                  <Image src={imagePreview || currentImage!} alt="Preview" fill className="object-cover" />
                ) : <Camera className="h-10 w-10 opacity-20" />}
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
