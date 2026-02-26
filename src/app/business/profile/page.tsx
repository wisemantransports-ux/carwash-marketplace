
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from '@/hooks/use-toast';
import { Loader2, Store, MapPin, Globe, ShieldCheck, Clock, CreditCard, Upload, X, AlertCircle, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import Link from 'next/link';
import { ShareBusinessCard } from '@/components/app/share-business-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Business } from '@/lib/types';

export default function BusinessProfilePage() {
  const [profile, setProfile] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Editable fields managed as state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [type, setType] = useState('station');
  const [whatsapp, setWhatsapp] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Query businesses directly
      const { data: profileData, error: profileError } = await supabase
        .from('businesses')
        .select(`
          id, owner_id, name, address, city, type, rating, review_count,
          status, subscription_plan, subscription_status, sub_end_date, logo_url, whatsapp_number
        `)
        .eq('owner_id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Profile fetch error detail:", profileError.message || profileError);
        toast({
          variant: 'destructive',
          title: 'Load Error',
          description: profileError.message || 'Unable to load your profile.'
        });
      } else if (profileData) {
        const biz = profileData as Business;
        setProfile(biz);
        setName(biz.name || '');
        setAddress(biz.address || '');
        setCity(biz.city || '');
        setType(biz.type || 'station');
        setWhatsapp(biz.whatsapp_number || '');
        setLogoUrl(biz.logo_url || '');
      }
    } catch (error: any) {
      console.error("Fatal fetch error:", error.message || error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    if (file.size > 2 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'File Too Large', description: 'Logo must be under 2MB.' });
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const filePath = `logos/${user.id}.png`;
      const { error: uploadError } = await supabase.storage
        .from('business-assets')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('business-assets')
        .getPublicUrl(filePath);

      setLogoUrl(publicUrl);
      toast({ title: 'Logo Uploaded', description: 'Your new logo has been staged. Save changes to finalize.' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: error.message || 'Could not upload logo.'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ variant: 'destructive', title: 'Name Required', description: 'Please enter your business name.' });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Prepare payload for upsert
      const payload: any = {
        owner_id: user.id,
        name,
        address,
        city,
        type,
        whatsapp_number: whatsapp,
        logo_url: logoUrl
      };

      // If we already have an ID, include it to ensure we update the specific record
      if (profile?.id) {
        payload.id = profile.id;
      }

      const { error: saveError } = await supabase
        .from('businesses')
        .upsert(payload, { onConflict: 'owner_id' });

      if (saveError) {
        console.error("Profile save error detail:", saveError);
        throw saveError;
      }

      toast({
        title: 'Profile Saved',
        description: 'Your business profile has been updated successfully.'
      });
      
      await fetchProfile();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: error.message || 'Could not save profile.'
      });
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = profile 
    ? name !== (profile.name || '') || 
      address !== (profile.address || '') || 
      city !== (profile.city || '') || 
      type !== (profile.type || 'station') || 
      whatsapp !== (profile.whatsapp_number || '') ||
      logoUrl !== (profile.logo_url || '')
    : true;

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

  const now = Date.now();
  const subEndDate = profile?.sub_end_date ? new Date(profile.sub_end_date) : null;
  const trialRemaining = subEndDate 
    ? Math.max(0, Math.ceil((subEndDate.getTime() - now) / (1000 * 60 * 60 * 24)))
    : 0;

  const isStatusActive = profile?.subscription_status?.toLowerCase() === 'active' || (trialRemaining > 0 && profile?.status?.toLowerCase() === 'verified');

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Business Profile</h1>
        <p className="text-muted-foreground">Manage your public presence and account status.</p>
      </div>

      {!isStatusActive && profile && (
        <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Plan Inactive</AlertTitle>
          <AlertDescription>
            Your plan is inactive or trial has expired. Please complete payment to access full features.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-2 shadow-sm">
            <CardHeader className="bg-muted/10 border-b">
              <CardTitle>Business Details</CardTitle>
              <CardDescription>This information will be visible to customers in the marketplace.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSave} className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-6 items-center">
                  <div className="relative h-32 w-32 rounded-2xl overflow-hidden border-2 bg-muted shrink-0 shadow-inner group">
                    {logoUrl ? (
                      <Image src={logoUrl} alt="Logo" fill className="object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Store className="h-10 w-10 text-muted-foreground opacity-40" />
                      </div>
                    )}
                    {uploading && (
                      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 w-full space-y-3">
                    <Label className="text-base">Business Logo</Label>
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading || saving}
                        className="bg-white"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {logoUrl ? 'Change Logo' : 'Upload Logo'}
                      </Button>
                      {logoUrl && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => setLogoUrl('')}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Remove
                        </Button>
                      )}
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleLogoUpload}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Business Name *</Label>
                  <Input 
                    id="name" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="Enter business name"
                    required
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="address">Physical Address</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="address" 
                        className="pl-9"
                        value={address} 
                        onChange={(e) => setAddress(e.target.value)} 
                        placeholder="e.g. Plot 1234, Main Mall"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="city" 
                        className="pl-9"
                        value={city} 
                        onChange={(e) => setCity(e.target.value)} 
                        placeholder="e.g. Gaborone"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp Number (Optional)</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="whatsapp" 
                      className="pl-9"
                      value={whatsapp} 
                      onChange={(e) => setWhatsapp(e.target.value)} 
                      placeholder="e.g. 26771234567"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">Required for automatic WhatsApp redirection on mobile bookings.</p>
                </div>

                <div className="space-y-2">
                  <Label>Business Model</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="station">Fixed Station</SelectItem>
                      <SelectItem value="mobile">Mobile Detailing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" className="w-full h-12 text-lg shadow-md" disabled={saving || uploading || !hasChanges}>
                  {saving ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : null}
                  {profile ? 'Save Changes' : 'Create Profile'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <ShareBusinessCard businessId={profile?.id || ''} />
          
          <Card className="bg-muted/30 border-muted/50 overflow-hidden">
            <CardHeader className="bg-muted/5 border-b">
              <CardTitle className="text-lg">Account Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Current Plan</p>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <span className="font-semibold">{profile?.subscription_plan || 'Starter'}</span>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Payment Status</p>
                <div className="flex items-center gap-2">
                  <Badge variant={profile?.subscription_status?.toLowerCase() === 'active' ? 'secondary' : 'outline'} className={profile?.subscription_status?.toLowerCase() === 'active' ? "bg-green-100 text-green-800" : ""}>
                    {(profile?.subscription_status || 'INACTIVE').toUpperCase()}
                  </Badge>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Verification</p>
                <div className="flex items-center gap-2">
                  {profile?.status?.toLowerCase() === 'verified' ? (
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200">
                      <ShieldCheck className="h-3 w-3 mr-1" /> Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline">{(profile?.status || 'PENDING').toUpperCase()}</Badge>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/50 border-t pt-4">
               <Button variant="outline" className="w-full bg-white" asChild>
                 <Link href="/business/subscription">Update Subscription</Link>
               </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
