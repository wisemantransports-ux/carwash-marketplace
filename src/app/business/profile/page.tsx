'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from '@/hooks/use-toast';
import { Loader2, Store, ShieldCheck, CheckCircle2, User, Upload } from 'lucide-react';
import { Business, BusinessType, BusinessCategory } from '@/lib/types';
import { cn, normalizePhone } from '@/lib/utils';
import Image from 'next/image';

/**
 * @fileOverview Business Profile Page
 * Strictly updates public.businesses table via standard Supabase client.
 * Does NOT attempt to modify restricted auth.users fields or platform-controlled columns.
 */

export default function BusinessProfilePage() {
  const [profile, setProfile] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form fields (Application Data)
  const [ownerName, setOwnerName] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [bizType, setBizType] = useState<BusinessType>('individual');
  const [category, setCategory] = useState<BusinessCategory>('Wash');
  const [idNumber, setIdNumber] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  // Logo Upload
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Display Owner Name from metadata (Read-only in this context)
      setOwnerName(user.user_metadata?.name || '');

      // Fetch Business Record
      const { data: biz, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (biz) {
        const typed = biz as Business;
        setProfile(typed);
        setName(typed.name || '');
        setAddress(typed.address || '');
        setCity(typed.city || '');
        setWhatsapp(typed.whatsapp_number || '');
        setBizType(typed.business_type || 'individual');
        setCategory(typed.category || 'Wash');
        setIdNumber(typed.id_number || '');
        setLogoUrl(typed.logo_url || '');
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Load Error', description: error.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !profile) return;
    
    setUploadingLogo(true);
    try {
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `logos/${profile.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('business-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('business-assets')
        .getPublicUrl(filePath);

      setLogoUrl(publicUrl);
      toast({ title: 'Logo Uploaded', description: 'Save credentials to persist your branding.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    try {
      // 1. Validate and Normalize Phone
      const cleanWa = normalizePhone(whatsapp);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Session expired. Please log in again.');

      // 2. Direct update to businesses table (Application Data Only)
      // Strictly avoid restricted fields (status, verification_status, special_tag, updated_at)
      const { error } = await supabase
        .from('businesses')
        .update({
          name: name.trim(),
          address: address.trim(),
          city: city.trim(),
          whatsapp_number: cleanWa,
          business_type: bizType,
          category: category,
          id_number: idNumber.trim(),
          logo_url: logoUrl
        })
        .eq('owner_id', user.id); // Enforcement of ownership via RLS

      if (error) throw error;

      toast({ 
        title: 'Business profile updated successfully', 
        description: 'Your changes have been saved to the marketplace.' 
      });
      
      // 3. Refresh the local state to confirm changes without auth side-effects
      await fetchProfile();
    } catch (error: any) {
      console.error("[PROFILE-UPDATE] Error:", error);
      toast({ 
        variant: 'destructive', 
        title: 'Update Failed', 
        description: error.message 
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black uppercase italic tracking-tight text-primary">Business Credentials</h1>
        <p className="text-muted-foreground font-medium text-lg">Manage your identity and marketplace presence.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-xl border-2">
            <CardHeader className="bg-muted/10 border-b">
              <CardTitle className="text-xl flex items-center gap-2">
                <Store className="h-5 w-5 text-primary" />
                Partner Particulars
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-8">
              <form onSubmit={handleSave} className="space-y-6">
                
                <div className="space-y-2">
                  <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Owner (Contact Person)</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-10 bg-slate-50 cursor-not-allowed" value={ownerName} disabled />
                  </div>
                  <p className="text-[9px] text-muted-foreground italic">Owner name is managed by platform security.</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Entity Name (Business Name)</Label>
                    <Input value={name} onChange={e => setName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Primary Category</Label>
                    <Select value={category} onValueChange={(v: any) => setCategory(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Wash">Car Wash Service</SelectItem>
                        <SelectItem value="Spare">Spare Parts Shop</SelectItem>
                        <SelectItem value="Cars">Vehicle Dealership</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Business Structure</Label>
                    <Select value={bizType} onValueChange={(v: any) => setBizType(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">Individual (Micro-Business)</SelectItem>
                        <SelectItem value="registered">Registered Entity (CIPA)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">
                      {bizType === 'individual' ? 'Omang / ID Number' : 'CIPA Registration No.'}
                    </Label>
                    <Input value={idNumber} onChange={e => setIdNumber(e.target.value)} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Physical Address</Label>
                  <Input value={address} onChange={e => setAddress(e.target.value)} />
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">City</Label>
                    <Input value={city} onChange={e => setCity(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">WhatsApp Business No.</Label>
                    <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="+26777123456" />
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

        <div className="space-y-6">
          <Card className="border-2 shadow-lg overflow-hidden">
            <CardHeader className="bg-primary/5 border-b">
              <CardTitle className="text-sm font-black uppercase tracking-widest">Branding & Verification</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4">
                <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Business Logo</Label>
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
                  <Button 
                    type="button" 
                    variant="secondary" 
                    size="sm" 
                    className="absolute bottom-2 right-2 rounded-xl shadow-lg"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingLogo}
                  >
                    <Upload className="h-4 w-4 mr-2" /> Change
                  </Button>
                  <input 
                    type="file" 
                    ref={logoInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleLogoUpload} 
                  />
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
                      <p className="font-black text-orange-800 uppercase text-xs tracking-tight">Review in Progress</p>
                    </>
                  )}
                </div>
                <p className="text-[10px] font-bold text-muted-foreground leading-relaxed text-center px-2">
                  Admins manually inspect your credentials to confirm marketplace integrity.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
