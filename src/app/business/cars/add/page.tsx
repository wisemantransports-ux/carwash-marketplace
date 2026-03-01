
'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Business } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, Camera, Banknote, Calendar, ShieldCheck, ArrowLeft, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function AddCarListingPage() {
  const router = useRouter();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Form State
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [price, setPrice] = useState('');
  const [mileage, setMileage] = useState('');
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
        if (biz.subscription_plan === 'Starter') {
          toast({ variant: 'destructive', title: 'Access Denied', description: 'Starter plan accounts cannot create car listings.' });
          router.push('/business/cars');
        }
      }
      setLoading(false);
    }
    checkAuth();
  }, [router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast({ variant: 'destructive', title: 'File Too Large', description: 'Image must be under 5MB.' });
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
    if (!business || !imageFile) {
      toast({ variant: 'destructive', title: 'Incomplete', description: 'Vehicle image is mandatory.' });
      return;
    }

    setSubmitting(true);
    try {
      // 1. Upload Image
      const fileExt = imageFile.name.split('.').pop();
      const filePath = `cars/${business.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('business-assets').upload(filePath, imageFile);
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage.from('business-assets').getPublicUrl(filePath);

      // 2. Insert Listing
      const { error } = await supabase.from('car_listings').insert({
        business_id: business.id,
        make: make.trim(),
        model: model.trim(),
        year: parseInt(year),
        price: parseFloat(price),
        mileage: parseInt(mileage),
        description: description.trim(),
        image_url: publicUrl,
        status: 'available'
      });

      if (error) throw error;

      toast({ title: 'Listing Published', description: `${make} ${model} is now visible in the marketplace.` });
      router.push('/business/cars');
    } catch (e: any) {
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
          <Link href="/business/cars"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight">List Vehicle for Sale</h1>
          <p className="text-muted-foreground">Reach verified buyers with professional automotive listings.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-2 shadow-lg">
            <CardHeader className="bg-muted/10 border-b">
              <CardTitle>Core Specifications</CardTitle>
              <CardDescription>All fields are required for professional presentation.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="make">Make *</Label>
                  <Input id="make" value={make} onChange={e => setMake(e.target.value)} placeholder="e.g. Toyota" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Model *</Label>
                  <Input id="model" value={model} onChange={e => setModel(e.target.value)} placeholder="e.g. Fortuner" required />
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="year">Year *</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="year" type="number" className="pl-10" value={year} onChange={e => setYear(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mileage">Mileage (KM) *</Label>
                  <Input id="mileage" type="number" value={mileage} onChange={e => setMileage(e.target.value)} placeholder="0" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price (BWP) *</Label>
                  <div className="relative">
                    <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="price" type="number" className="pl-10" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" required />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="desc">Detailed Description</Label>
                <Textarea id="desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe vehicle condition, features, and service history..." className="min-h-[150px]" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-2 shadow-lg overflow-hidden">
            <CardHeader className="bg-muted/10 border-b">
              <CardTitle>Vehicle Image *</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div 
                className="relative aspect-[4/3] rounded-xl border-4 border-dashed bg-muted flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors group overflow-hidden"
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
              <p className="text-[10px] text-muted-foreground mt-4 italic text-center">
                Clear exterior photos perform 80% better in the marketplace.
              </p>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full h-14 text-lg shadow-xl" disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShieldCheck className="mr-2 h-5 w-5" />}
            Publish Listing
          </Button>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
            <Info className="h-5 w-5 text-blue-600 shrink-0" />
            <p className="text-[10px] text-blue-800 leading-relaxed font-medium">
              Verified partners receive a trust seal on their listings. Buyers can request test drives directly through your profile.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
