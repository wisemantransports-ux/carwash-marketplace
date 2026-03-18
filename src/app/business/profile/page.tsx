'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from '@/hooks/use-toast';
import { Loader2, Store, CheckCircle2, User, Upload, MapPin, Smartphone, Tag, ListFilter } from 'lucide-react';
import Image from 'next/image';
import { cn, normalizePhone } from '@/lib/utils';
import { Business, BusinessType, BusinessCategory } from '@/lib/types';

/**
 * @fileOverview Safe Business Profile Management
 * - Only writes to businesses table.
 * - Owner name in auth.users is not modified from client.
 * - Whitelisted editable fields enforced.
 * - Respects RLS (owner_id = auth.uid()).
 */

export default function BusinessProfilePage() {
  const [profile, setProfile] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable fields in businesses table
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [category, setCategory] = useState<BusinessCategory>('Wash');
  const [bizType, setBizType] = useState<BusinessType>('individual');
  const [specialTag, setSpecialTag] = useState('');
  const [deliveryType, setDeliveryType] = useState<'station' | 'mobile'>('station');

  // Display-only fields (Source of truth is Auth metadata)
  const [ownerName, setOwnerName] = useState('');

  const logoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Fetch business profile
  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      // Identity source: Auth metadata (read-only for app)
      setOwnerName(session.user.user_metadata?.name || '');

      const { data: biz, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', session.user.id)
        .maybeSingle();

      if (error) throw error;

      if (biz) {
        setProfile(biz as Business);
        setName(biz.name || '');
        setWhatsapp(biz.whatsapp_number || '');
        setAddress(biz.address || '');
        setCity(biz.city || '');
        setLogoUrl(biz.logo_url || '');
        setCategory(biz.category || 'Wash');
        setBizType(biz.business_type || 'individual');
        setSpecialTag(biz.special_tag || '');
        setDeliveryType(biz.type || 'station');
      }
    } catch (err: any) {
      console.error("[PROFILE-LOAD] Fetch Error:", err);
      toast({ variant: 'destructive', title: 'Load Error', description: 'Unable to retrieve profile.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // Logo upload to Supabase Storage
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('LOGO UPLOAD START');
    if (!e.target.files || !e.target.files[0]) return;

    setUploadingLogo(true);
    try {
      const file = e.target.files[0];

      // 1. Get logged in user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 2. Upload file
      const fileExt = file.name.split('.').pop();
      const filePath = `logos/${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('business-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 3. Get public URL
      const { data } = supabase.storage
        .from('business-assets')
        .getPublicUrl(filePath);

      const sessionRes = await supabase.auth.getSession();
      const session = sessionRes.data.session;
      if (!session) throw new Error('No active session');

      const publicUrl = data.publicUrl;

      // 4. SAVE TO DATABASE through server API endpoint
      const payload = {
        owner_id: user.id,
        business_id: profile?.id,
        logo_url: publicUrl
      };

      console.log('[LOGO-UPDATE] payload:', payload);

      const response = await fetch('/api/business/update-profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      console.log('[LOGO-UPDATE] API response:', result);

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to save logo URL to business profile');
      }

      // 5. Update UI state
      setLogoUrl(publicUrl);

      // 6. Success feedback
      toast({
        title: 'Logo updated',
        description: 'Your logo has been saved successfully'
      });

    } catch (err: any) {
      console.error('Logo upload error:', err);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: err.message
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  // Save business profile via server API route (not direct users updates)
  const handleSave = async (e: React.FormEvent) => {
    console.log('PROFILE SAVE START');
    e.preventDefault();
    setSaving(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error('No active session', sessionError);
        throw new Error('User not authenticated');
      }

      const user = session.user;
      const cleanWa = normalizePhone(whatsapp);

      const payload = {
        owner_id: user.id,
        business_id: user.id,
        name,
        whatsapp_number: cleanWa,
        address,
        city,
        logo_url: logoUrl,
        category,
        special_tag,
        type: deliveryType,
      };

      console.log('[PROFILE-UPDATE] payload:', payload);

      const res = await fetch('/api/business/update-profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      console.log('[PROFILE-UPDATE] API response:', result);

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update business profile');
      }

      toast({ title: 'Profile Updated', description: 'Your business credentials have been saved.' });
      await fetchProfile();

    } catch (err: any) {
      console.error("[PROFILE-UPDATE] Fatal Error:", err);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: err.message || 'Check your permissions and try again.'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black uppercase italic tracking-tight text-primary">Partner Profile</h1>
        <p className="text-muted-foreground font-medium text-lg">Manage your public presence and entity details.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Business Details Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-xl border-2">
            <CardHeader className="bg-muted/10 border-b">
              <CardTitle className="text-xl flex items-center gap-2">
                <Store className="h-5 w-5 text-primary" />
                Business Particulars
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-8">
              <form onSubmit={handleSave} className="space-y-6">
                {/* Name & WhatsApp */}
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Entity Name *</Label>
                    <Input value={name} onChange={e => setName(e.target.value)} required placeholder="Business Name" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground ml-1">WhatsApp Business No. *</Label>
                    <div className="relative">
                      <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} required placeholder="+26777123456" className="pl-10"/>
                    </div>
                  </div>
                </div>

                {/* Owner & Category */}
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Owner Full Name (Identity)</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input value={ownerName} readOnly className="pl-10 bg-muted/50 cursor-not-allowed" placeholder="Managed in Account Settings" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Business Category</Label>
                    <Select value={category} onValueChange={(v: any) => setCategory(v)}>
                      <SelectTrigger className="relative">
                        <ListFilter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                        <div className="pl-6"><SelectValue /></div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Wash">Wash Service</SelectItem>
                        <SelectItem value="Spare">Spare Parts</SelectItem>
                        <SelectItem value="Cars">Car Showroom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Address & Delivery */}
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Service Delivery Model</Label>
                    <Select value={deliveryType} onValueChange={(v: any) => setDeliveryType(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="station">Fixed Station</SelectItem>
                        <SelectItem value="mobile">Mobile / On-Site</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground ml-1">City</Label>
                    <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Gaborone / Francistown" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Physical Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={address} onChange={e => setAddress(e.target.value)} className="pl-10" placeholder="Plot / Street / Mall" />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Business Structure</Label>
                    <Select value={bizType} onValueChange={(v: any) => setBizType(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">Individual / Micro</SelectItem>
                        <SelectItem value="registered">Registered Entity (CIPA)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Label className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Special Tag</Label>
                      <Badge variant="ghost" className="text-[8px] h-4 px-1 opacity-50 border">Descriptive Only</Badge>
                    </div>
                    <div className="relative">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input value={specialTag} onChange={e => setSpecialTag(e.target.value)} className="pl-10" placeholder="Interior Specialist" />
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full h-14 text-lg font-black shadow-xl uppercase tracking-tighter" disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                  Save Credentials
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Branding / Status */}
        <div className="space-y-6">
          <Card className="border-2 shadow-lg overflow-hidden">
            <CardHeader className="bg-primary/5 border-b">
              <CardTitle className="text-sm font-black uppercase tracking-widest">Branding & Identity</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4">
                <Label className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Business Logo</Label>
                <div className="relative group">
                  <div className="relative aspect-square rounded-3xl overflow-hidden border-4 border-dashed bg-muted flex items-center justify-center transition-all group-hover:border-primary">
                    {logoUrl ? (
                      <Image src={logoUrl} alt="Logo" fill className="object-cover" />
                    ) : (
                      <Store className="h-12 w-12 text-muted-foreground opacity-20" />
                    )}
                    {uploadingLogo && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <Button type="button" variant="secondary" size="sm" className="absolute bottom-2 right-2 rounded-xl shadow-lg" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
                    <Upload className="h-4 w-4 mr-2" /> Change
                  </Button>
                  <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className={cn(
                  "p-4 rounded-2xl border-2 flex flex-col items-center gap-2",
                  profile?.verification_status === 'verified' ? "bg-green-50 border-green-200" : "bg-orange-50 border-orange-200"
                )}>
                  {profile?.verification_status === 'verified' ? (
                    <>
                      <CheckCircle2 className="h-10 w-10 text-green-600" />
                      <p className="font-black text-green-800 uppercase text-xs">Fully Verified</p>
                    </>
                  ) : (
                    <>
                      <Loader2 className="h-10 w-10 text-orange-600 animate-spin" />
                      <p className="font-black text-orange-800 uppercase text-xs tracking-tight">Under Admin Review</p>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
