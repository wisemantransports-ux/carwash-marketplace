'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Business } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Loader2, Save, Sparkles, Camera, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import { generateServiceDescription } from '@/ai/flows/business-owner-service-description-flow';
import Image from 'next/image';
import Link from 'next/link';

/**
 * @fileOverview Edit Service Page
 */

export default function EditServicePage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);

  const [serviceName, setServiceName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  
  // Image State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchService = useCallback(async () => {
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

      const { data: service, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', id)
        .eq('business_id', biz.id)
        .eq('type', 'wash_service')
        .maybeSingle();

      if (error || !service) {
        toast({ variant: 'destructive', title: 'Not Found', description: 'Service not found or access denied.' });
        return router.push('/business/services');
      }

      setServiceName(service.name || '');
      setDescription(service.description || '');
      setPrice(service.price?.toString() || '');
      setCurrentImageUrl(service.service_image_url || null);

    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Load Error', description: e.message });
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchService();
  }, [fetchService]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAiDescription = async () => {
    if (!serviceName || !price) {
      toast({ variant: 'destructive', title: "Details Required", description: "Enter service name and price first." });
      return;
    }
    setGeneratingAi(true);
    try {
      const result = await generateServiceDescription({
        serviceName: serviceName,
        price: `P${price}`,
      });
      setDescription(result.generatedDescription);
    } catch (e) {
      toast({ variant: 'destructive', title: "AI Error" });
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;

    setSubmitting(true);
    try {
        let finalImageUrl = currentImageUrl;

        // 1. Handle Image Upload if new file present
        if (imageFile) {
          const fileExt = imageFile.name.split('.').pop();
          const filePath = `services/${business.id}/${Date.now()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('business-assets').upload(filePath, imageFile);
          
          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage.from('business-assets').getPublicUrl(filePath);
          finalImageUrl = publicUrl;
        }

        // 2. Update Listing
        const { error } = await supabase
          .from('listings')
          .update({
            name: serviceName.trim(),
            description: description.trim(),
            price: parseFloat(price),
            service_image_url: finalImageUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .eq('business_id', business.id);

        if (error) throw error;

        toast({ title: 'Service Updated', description: `${serviceName} has been updated.` });
        router.push('/business/services');
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
    } finally {
        setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link href="/business/services"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <h1 className="text-4xl font-black tracking-tight text-primary uppercase italic">Edit Service</h1>
      </div>

      <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-lg border-2">
            <CardHeader className="bg-muted/10 border-b">
              <CardTitle className="text-lg">Service Specifications</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Service Name *</Label>
                <Input 
                  value={serviceName} 
                  onChange={(e) => setServiceName(e.target.value)} 
                  placeholder="e.g. Deluxe Interior Detailing"
                  required 
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Description</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={handleAiDescription} disabled={generatingAi} className="h-7 text-[10px] font-black uppercase">
                    {generatingAi ? <Loader2 className="animate-spin h-3 w-3 mr-2" /> : <Sparkles className="h-3 w-3 mr-2 text-primary" />}
                    Write with AI
                  </Button>
                </div>
                <Textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="Describe what's included in this wash package..."
                  className="min-h-[150px] bg-slate-50/50" 
                />
              </div>

              <div className="space-y-2">
                <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Price (BWP) *</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  value={price} 
                  onChange={(e) => setPrice(e.target.value)} 
                  placeholder="0.00"
                  className="h-12 text-lg font-bold"
                  required 
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-2 shadow-lg overflow-hidden">
            <CardHeader className="bg-muted/10 border-b">
              <CardTitle className="text-sm font-black uppercase tracking-widest">Service Visual</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div 
                className="relative aspect-square rounded-2xl border-4 border-dashed bg-muted flex flex-col items-center justify-center cursor-pointer group overflow-hidden hover:border-primary transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {(imagePreview || currentImageUrl) ? (
                  <Image src={imagePreview || currentImageUrl!} alt="Preview" fill className="object-cover" />
                ) : (
                  <div className="text-center space-y-2 opacity-40">
                    <ImageIcon className="h-10 w-10 mx-auto" />
                    <p className="text-[10px] font-black uppercase tracking-tighter">Click to change image</p>
                  </div>
                )}
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
              <p className="text-[10px] text-muted-foreground mt-4 italic text-center">
                High-quality images attract more bookings.
              </p>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full h-14 text-lg font-black shadow-xl uppercase tracking-tight" disabled={submitting}>
            {submitting ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <Save className="mr-2 h-5 w-5" />}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
