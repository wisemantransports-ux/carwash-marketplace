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
import { Loader2, Plus, Sparkles, Clock, Banknote } from 'lucide-react';
import { generateServiceDescription } from '@/ai/flows/business-owner-service-description-flow';
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
      if (!session?.user) {
        router.push('/login');
        return;
      }

      // Fetch the latest business data to ensure we have current verification status
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', session.user.id)
        .maybeSingle();

      if (error) {
        console.error("Business fetch error:", error);
        toast({ variant: 'destructive', title: 'Load Error', description: 'Could not fetch your business details.' });
      }

      if (data) {
        const typedBiz = data as Business;
        setBusiness(typedBiz);
        
        // Comprehensive Verification & Access Check
        const isVerified = typedBiz.verification_status === 'verified';
        const now = new Date();
        const expiry = typedBiz.sub_end_date ? new Date(typedBiz.sub_end_date) : null;
        const isTrialOrPaid = (typedBiz.subscription_status === 'active') || (expiry && expiry >= now);

        if (!isVerified) {
            toast({ title: 'Verification Required', description: 'Features unlock once documents are verified.' });
            router.push('/business/services');
        } else if (!isTrialOrPaid) {
            toast({ title: 'Subscription Inactive', description: 'Please choose a plan to continue adding services.' });
            router.push('/business/subscription');
        }
      } else {
        toast({ variant: 'destructive', title: 'Profile Not Found', description: 'Please set up your business profile first.' });
        router.push('/business/profile');
      }
      setLoading(false);
    }
    fetchBusiness();
  }, [router]);

  const handleAiDescription = async () => {
    if (!serviceName || !price) {
      toast({ variant: 'destructive', title: "Details Required", description: "Enter name and price first." });
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
      toast({ variant: 'destructive', title: "AI Error", description: "Failed to generate description." });
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName || !description || !price || !duration || !business) {
      toast({ variant: 'destructive', title: 'Fields Required', description: 'Fill all required fields.' });
      return;
    }

    // Final Gate Check
    const expiry = business.sub_end_date ? new Date(business.sub_end_date) : null;
    const now = new Date();
    const isAccessActive = (business.verification_status === 'verified') && 
                          ((business.subscription_status === 'active') || (expiry && expiry >= now));

    if (!isAccessActive) {
        toast({ variant: 'destructive', title: 'Access Denied', description: 'Your account must be verified and have an active subscription.' });
        return;
    }

    const priceVal = parseFloat(price);
    const durationVal = parseInt(duration);

    if (isNaN(priceVal) || priceVal <= 0 || isNaN(durationVal) || durationVal <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Input', description: 'Values must be greater than zero.' });
      return;
    }

    setSubmitting(true);
    try {
        const { error } = await supabase
          .from('services')
          .insert({
            business_id: business.id,
            name: serviceName.trim(),
            description: description.trim(),
            price: priceVal,
            duration: durationVal,
            currency_code: currency
          });

        if (error) throw error;

        toast({ title: 'Service Added', description: `${serviceName} is now in your catalog.` });
        router.push('/business/services');
    } catch (error: any) {
        console.error("Service Insert Error:", error);
        toast({ variant: 'destructive', title: 'Creation Failed', description: 'Unable to save service. Please try again.' });
    } finally {
        setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  if (!business) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Add New Service</h1>
        <p className="text-muted-foreground">Define a new wash package for your catalog.</p>
      </div>

      <Card className="shadow-lg border-2">
        <CardHeader className="bg-muted/10 border-b">
          <CardTitle>Service Details</CardTitle>
          <CardDescription>Enter specifications for your car wash package.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="sname">Name *</Label>
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
                <Label htmlFor="sdesc">Description *</Label>
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
                placeholder="Describe what is included..." 
                className="min-h-[120px]"
                required 
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="sprice">Price *</Label>
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
              <div className="space-y-2">
                <Label htmlFor="sdur">Duration (Mins) *</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="sdur" 
                    type="number" 
                    className="pl-10"
                    value={duration} 
                    onChange={(e) => setDuration(e.target.value)} 
                    placeholder="45" 
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

            <Button type="submit" className="w-full h-12 text-lg" disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <Plus className="mr-2 h-5 w-5" />}
              Create Service Package
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
