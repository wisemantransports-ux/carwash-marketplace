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
import { Loader2, Save, ArrowLeft, Type, Calendar, Banknote, ShieldCheck, Camera, Upload } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function EditCarListingPage() {
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

  const fetchListing = useCallback(async () => {
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

      const { data: car, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', id)
        .eq('business_id', biz.id)
        .eq('type', 'car')
        .maybeSingle();

      if (error) throw error;
      if (!car) {
        toast({ variant: 'destructive', title: 'Not Found', description: 'Listing unavailable or unauthorized.' });
        return router.push('/business/cars');
      }

      setName(car.name || '');
      setPrice(car.price?.toString() || '');
      setDescription(car.description || '');
      setCurrentImage(car.images?.[0] || null);

    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Load Error', description: e.message });
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchListing();
  }, [fetchListing]);

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
      let finalImages = currentImage ? [currentImage] : [];

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const filePath = `cars/${business.id}/${Date.now()}.${fileExt}`;
        await supabase.storage.from('business-assets').upload(filePath, imageFile);
        const { data: { publicUrl } } = supabase.storage.from('business-assets').getPublicUrl(filePath);
        finalImages = [publicUrl];
      }

      const { error } = await supabase
        .from('listings')
        .update({
          name: name.trim(),
          price: parseFloat(price),
          description: description.trim(),
          images: finalImages,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('business_id', business.id);

      if (error) throw error;

      toast({ title: 'Listing Updated', description: 'Changes saved successfully.' });
      router.push('/business/cars');
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
          <Link href="/business/cars"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <h1 className="text-3xl font-extrabold tracking-tight">Edit Car</h1>
      </div>

      <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-2 shadow-lg">
            <CardHeader className="bg-muted/10 border-b">
              <CardTitle>Specifications</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Listing Title *</Label>
                <Input id="title" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price (BWP) *</Label>
                <Input id="price" type="number" value={price} onChange={e => setPrice(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">Description</Label>
                <Textarea id="desc" value={description} onChange={e => setDescription(e.target.value)} className="min-h-[150px]" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-2 shadow-lg overflow-hidden">
            <CardHeader className="bg-muted/10 border-b">
              <CardTitle>Photo</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div 
                className="relative aspect-video rounded-xl border-4 border-dashed bg-muted flex flex-col items-center justify-center cursor-pointer group overflow-hidden"
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
            {submitting ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <Save className="mr-2 h-5 w-5" />}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}