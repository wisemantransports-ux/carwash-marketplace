'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Business } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, Sparkles, Clock, Banknote, Store } from 'lucide-react';
import { generateServiceDescription } from '@/ai/flows/business-owner-service-description-flow';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function AddServicePage() {
  const router = useRouter();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);

  const [serviceName, setServiceName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [currency, setCurrency] = useState('BWP');

  useEffect(() => {
    async function fetchBusiness() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', session.user.id)
        .maybeSingle();

      if (data) {
        setBusiness(data as Business);
        
        // Trial check
        const now = new Date();
        const expiry = data.sub_end_date ? new Date(data.sub_end_date) : null;
        const isVerified = data.status === 'verified';
        const isPaid = data.subscriptionStatus === 'active';
        const isTrialActive = expiry ? expiry >= now : false;

        if (!isVerified || (!isPaid && !isTrialActive)) {
           toast({ variant: 'destructive', title: 'Access Denied', description: 'Verification or active subscription required to add services.' });
           router.push('/business/subscription');
        }
      }
      setLoading(false);
    }
    fetchBusiness();
  }, [router]);

  const handleAiDescription = async () => {
    if (!serviceName || !price) {
      toast({ variant: 'destructive', title: "Details Required", description: "Enter service name and price first." });
      return;
    }
    setGeneratingAi(true);
    try {
      const result = await generateServiceDescription({
        serviceName: serviceName,
        price: `${currency}${price}`,
      });
      setDescription(result.generatedDescription);
    } catch (e) {
      toast({ variant: 'destructive', title: "AI Error", description: "Could not generate description." });
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName || !description || !price || !duration || !business) {
      toast({ variant: 'destructive', title: 'Fields Required', description: 'Please fill out all required fields.' });
      return;
    }

    if (parseFloat(price) <= 0 || parseInt(duration) <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Values', description: 'Price and duration must be positive numbers.' });
      return;
    }

    setSubmitting(true);
    try {
        const { error } = await supabase
          .from('services')
          .insert({
            business_id: business.id,
            name: serviceName,
            description,
            price: parseFloat(price),
            duration: parseInt(duration),
            currency_code: currency
          });

        if (error) throw error;

        toast({ title: 'Service Added', description: `${serviceName} is now in your catalog.` });
        router.push('/business/services');
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Creation Failed', description: error.message });
    } finally {
        setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  if (!business) return <div className="text-center py-20">Business profile not found.</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Add New Service</h1>
        <p className="text-muted-foreground">Define a new wash package for your customers.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Service Information</CardTitle>
              <CardDescription>Fill in the details for your new wash package.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="sname">Service Name *</Label>
                  <Input 
                    id="sname" 
                    value={serviceName} 
                    onChange={(e) => setServiceName(e.target.value)} 
                    placeholder="e.g. Eco Interior Steam Clean" 
                    required 
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="sdesc">Description *</Label>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className="text-primary text-[10px] h-6" 
                      onClick={handleAiDescription} 
                      disabled={generatingAi}
                    >
                      {generatingAi ? <Loader2 className="animate-spin h-3 w-3 mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                      Generate with AI
                    </Button>
                  </div>
                  <Textarea 
                    id="sdesc" 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    placeholder="Describe what's included in this wash..." 
                    rows={4} 
                    required 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sprice">Price *</Label>
                    <div className="relative">
                      <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="sprice" 
                        type="number" 
                        step="0.01"
                        className="pl-9"
                        value={price} 
                        onChange={(e) => setPrice(e.target.value)} 
                        placeholder="e.g. 150" 
                        required 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sdur">Duration (Minutes) *</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="sdur" 
                        type="number" 
                        className="pl-9"
                        value={duration} 
                        onChange={(e) => setDuration(e.target.value)} 
                        placeholder="e.g. 45" 
                        required 
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BWP">Botswana Pula (BWP)</SelectItem>
                      <SelectItem value="USD">US Dollar (USD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" className="w-full h-12 text-lg shadow-lg" disabled={submitting}>
                  {submitting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                  Create Service
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="text-lg">Context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="relative h-20 w-20 rounded-xl overflow-hidden border bg-background mx-auto">
                   {business.imageUrl ? (
                     <Image src={business.imageUrl} alt="Logo" fill className="object-cover" />
                   ) : (
                     <div className="h-full w-full flex items-center justify-center">
                       <Store className="h-8 w-8 text-muted-foreground" />
                     </div>
                   )}
                </div>
                <div className="text-center">
                   <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Active Business</p>
                   <p className="text-sm font-semibold">{business.name}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                  Only verified businesses with active subscriptions can add services. Your services will be visible to all customers in Botswana.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
