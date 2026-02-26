'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from '@/hooks/use-toast';
import { Loader2, Store, MapPin, Globe, ShieldCheck, Clock, CreditCard, Upload, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { ShareBusinessCard } from '@/components/app/share-business-card';

export default function BusinessProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Editable fields managed as state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [type, setType] = useState('station');
  const [logoUrl, setLogoUrl] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profileData, error: profileError } = await supabase
          .from('businesses')
          .select(`
            id, owner_id, name, address, city, type, rating, review_count,
            status, subscription_plan, subscription_status, sub_end_date, logo_url
          `)
          .eq('owner_id', user.id)
          .maybeSingle();

        if (profileError) {
          console.error("Profile fetch error:", profileError);
          toast({
            variant: 'destructive',
            title: 'Load Error',
            description: 'Unable to load your profile. Please try again later.'
          });
        } else if (profileData) {
          setProfile(profileData);
          // Populate form fields with fetched data
          setName(profileData.name || '');
          setAddress(profileData.address || '');
          setCity(profileData.city || '');
          setType(profileData.type || 'station');
          setLogoUrl(profileData.logo_url || '');
        } else {
          toast({
            variant: 'info',
            title: 'Profile Not Found',
            description: 'No profile exists. Please create your profile first.'
          });
        }
      } catch (error) {
        console.error("Fatal fetch error:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    // Basic size validation
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
      toast({ title: 'Logo Uploaded', description: 'Your new logo has been staged. Save profile to apply.' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: error.message || 'Could not upload logo. Please try again.'
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

      const { data, error: saveError } = await supabase
        .from('businesses')
        .upsert({
          owner_id: user.id,
          name,
          address,
          city,
          type,
          logo_url: logoUrl
        }, { onConflict: 'owner_id' })
        .select()
        .single();

      if (saveError) throw saveError;

      setProfile(data);
      toast({
        title: 'Profile Saved',
        description: 'Your business profile has been updated successfully.'
      });
    } catch (error: any) {
      console.error("Profile save error:", error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: error.message || 'Could not save profile. Please try again.'
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
      logoUrl !== (profile.logo_url || '')
    : true;

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

  const trialRemaining = profile?.sub_end_date 
    ? Math.max(0, Math.ceil((new Date(profile.sub_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Business Profile</h1>
        <p className="text-muted-foreground">Manage your public presence and account status.</p>
      </div>

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
                    <p className="text-[10px] text-muted-foreground italic">
                      Recommended: Square image, PNG or JPG (max 2MB).
                    </p>
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
          <ShareBusinessCard businessId={profile?.id} />
          
          {!profile && !loading && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg text-orange-800 text-sm">
              Please complete and save your profile to start using all business features.
            </div>
          )}

          <Card className="bg-muted/30 border-muted/50 overflow-hidden">
            <CardHeader className="bg-muted/50 border-b">
              <CardTitle className="text-lg">Account Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Current Plan</p>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <span className="font-semibold">{profile?.subscription_plan || 'None'}</span>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Payment Status</p>
                <div className="flex items-center gap-2">
                  <Badge variant={profile?.subscription_status === 'active' ? 'secondary' : 'outline'} className={profile?.subscription_status === 'active' ? "bg-green-100 text-green-800" : ""}>
                    {profile?.subscription_status?.toUpperCase() || 'INACTIVE'}
                  </Badge>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Verification</p>
                <div className="flex items-center gap-2">
                  {profile?.status === 'verified' ? (
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200">
                      <ShieldCheck className="h-3 w-3 mr-1" /> Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline">{profile?.status?.toUpperCase() || 'PENDING'}</Badge>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Trial Status</p>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium">
                    {trialRemaining > 0 ? `${trialRemaining} days left` : 'Trial Expired'}
                  </span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/50 border-t pt-4">
               <Button variant="outline" className="w-full bg-white" asChild>
                 <a href="/business/subscription">Update Subscription</a>
               </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
