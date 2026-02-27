
'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Business } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, Sparkles, Banknote, AlertCircle } from 'lucide-react';
import { generateServiceDescription } from '@/ai/flows/business-owner-service-description-flow';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';

export default function AddServicePage() {
  const router = useRouter();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);

  const [serviceName, setServiceName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');

  const fetchLatestBusiness = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setBusiness(data as Business);
      } else {
        router.push('/business/profile');
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Load Error', description: e.message });
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchLatestBusiness();
  }, [fetchLatestBusiness]);

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
      toast({ variant: 'destructive', title: "AI Error", description: "Failed to generate description." });
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!business) return;

    // 1. Authorization Check
    if (business.verification_status !== 'verified') {
      toast({ variant: 'destructive', title: "Verification Pending", description: "Access will be granted once verified." });
      return;
    }

    if (business.subscription_status !== 'active') {
      toast({ variant: 'destructive', title: "Subscription Required", description: "Your professional features are currently paused." });
      return;
    }

    // 2. Validation
    if (!serviceName.trim() || !price) {
      toast({ variant: 'destructive', title: 'Fields Required', description: 'Please enter a name and price for the service.' });
      return;
    }

    const priceVal = parseFloat(price);
    if (isNaN(priceVal) || priceVal <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Price', description: 'Please enter a valid numeric price.' });
      return;
    }

    setSubmitting(true);
    try {
        // 3. Exact Schema Insertion (RLS compliant)
        // Schema: business_id, name, price, description, currency_code
        const { error } = await supabase
          .from('services')
          .insert([{
            business_id: business.id, // Business UUID
            name: serviceName.trim(),
            description: description.trim(),
            price: priceVal,
            currency_code: 'BWP'
          }]);

        if (error) throw error;

        toast({ title: 'Service Published', description: `${serviceName} is now live in your catalog.` });
        router.push('/business/services');
    } catch (error: any) {
        console.error("Supabase Insertion Error:", error.message);
        toast({ 
            variant: 'destructive', 
            title: 'Creation Failed', 
            description: error.message || 'Unable to save service. Please check your connection.' 
        });
    } finally {
        setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  if (!business) return null;

  const isUnverified = business.verification_status !== 'verified';
  const isInactive = business.subscription_status !== 'active';

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Add New Service</h1>
        <p className="text-muted-foreground">Define a professional wash package for your business.</p>
      </div>

      {isUnverified ? (
        <Alert variant="destructive" className="bg-orange-50 border-orange-200 text-orange-800">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="font-bold">Verification Required</AlertTitle>
          <AlertDescription>
            Verification pending. Access will be granted once an administrator reviews your documents.
          </AlertDescription>
        </Alert>
      ) : isInactive ? (
        <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertTitle className="font-bold">Service Paused</AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2">
            <span>Your professional features are currently paused. Please select a plan to continue.</span>
            <Button size="sm" variant="outline" className="border-red-200 hover:bg-red-100" asChild>
              <Link href="/business/subscription">View Plans</Link>
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <Card className={`shadow-lg border-2 ${(isUnverified || isInactive) ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
        <CardHeader className="bg-muted/10 border-b">
          <CardTitle>Service Details</CardTitle>
          <CardDescription>Enter specifications for your wash package.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="sname">Service Name *</Label>
              <Input 
                id="sname" 
                value={serviceName} 
                onChange={(e) => setServiceName(e.target.value)} 
                placeholder="e.g. Interior Steam Clean" 
                required 
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="sdesc">Description (Optional)</Label>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  className="text-primary h-8 px-3 rounded-full text-xs font-bold" 
                  onClick={handleAiDescription} 
                  disabled={generatingAi}
                >
                  {generatingAi ? <Loader2 className="animate-spin h-3 w-3 mr-2" /> : <Sparkles className="h-3 w-3 mr-2" />}
                  Generate with AI
                </Button>
              </div>
              <Textarea 
                id="sdesc" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="Describe what is included in this package..." 
                className="min-h-[120px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sprice">Price (BWP) *</Label>
              <div className="relative">
                <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="sprice" 
                  type="number" 
                  step="0.01"
                  className="pl-10"
                  value={price} 
                  onChange={(e) => setPrice(e.target.value)} 
                  placeholder="0.00" 
                  required 
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-12 text-lg shadow-xl" disabled={submitting || isUnverified || isInactive}>
              {submitting ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <Plus className="mr-2 h-5 w-5" />}
              Publish Service
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
