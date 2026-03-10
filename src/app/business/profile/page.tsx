'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from '@/hooks/use-toast';
import { Loader2, Store, ShieldCheck, CheckCircle2, User, Upload, MapPin, Smartphone, Tag } from 'lucide-react';
import { Business, BusinessType } from '@/lib/types';
import { cn, normalizePhone } from '@/lib/utils';
import Image from 'next/image';

/**
 * @fileOverview Business Profile Page
 * Refactored to strictly update ONLY editable columns in public.businesses.
 * Enforces ownership filtering and respects RLS by excluding restricted fields.
 * Includes detailed error logging for Supabase issues.
 */

export default function BusinessProfilePage() {
  const [profile, setProfile] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // State for editable columns per requirement:
  // name, whatsapp_number, address, city, logo_url, business_type, special_tag, type
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [bizType, setBizType] = useState<BusinessType>('individual');
  const [specialTag, setSpecialTag] = useState('');
  const [deliveryType, setDeliveryType] = useState<'station' | 'mobile'>('station');

  // Display-only info
  const [ownerName, setOwnerName] = useState('');
  const [idNumberDisplay, setIdNumberDisplay] = useState('');

  // Logo Upload
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      setOwnerName(session.user.user_metadata?.name || 'Authorized Owner');

      // Fetch Business Record
      const { data: biz, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', session.user.id)
        .maybeSingle();

      if (error) throw error;

      if (biz) {
        const typed = biz as Business;
        setProfile(typed);
        
        // Sync states with fetched data
        setName(typed.name || '');
        setWhatsapp(typed.whatsapp_number || '');
        setAddress(typed.address || '');
        setCity(typed.city || '');
        setLogoUrl(typed.logo_url || '');
        setBizType(typed.business_type || 'individual');
        setSpecialTag(typed.special_tag || '');
        setDeliveryType(typed.type || 'station');
        
        setIdNumberDisplay(typed.id_number || '');
      }
    } catch (error: any) {
      console.error("[PROFILE-LOAD] Error:", error.message || error);
      toast({ variant: 'destructive', title: 'Load Error', description: error.message || 'Unable to retrieve profile.' });
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
      toast({ title: 'Visual Updated', description: 'Save profile to finalize changes.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    // Frontend validation for required fields
    if (!name.trim() || !whatsapp.trim()) {
      toast({ variant: 'destructive', title: 'Required Fields', description: 'Business name and WhatsApp are mandatory.' });
      return;
    }

    setSaving(true);
    try {
      // Ensure we have a valid session before update
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Session expired. Please log in again.');

      // Validate and Normalize Phone per requirement: +<country_code><number>
      let cleanWa = whatsapp.trim();
      try {
        cleanWa = normalizePhone(whatsapp);
      } catch (err: any) {
        throw new Error(err.message || "Invalid WhatsApp number format.");
      }

      /**
       * STRICT DATABASE UPDATE:
       * Only include editable columns: name, whatsapp_number, address, city, logo_url, business_type, special_tag, type
       * Do NOT include restricted columns: verification_status, sub_end_date, etc.
       */
      const payload = {
        name: name.trim(),
        whatsapp_number: cleanWa,
        address: address.trim(),
        city: city.trim(),
        logo_url: logoUrl,
        business_type: bizType,
        special_tag: specialTag.trim(),
        type: deliveryType
      };

      const { error } = await supabase
        .from('businesses')
        .update(payload)
        .eq('id', profile.id)
        .eq('owner_id', session.user.id); // Enforce ownership filter via authenticated ID

      if (error) {
        // Log detailed Supabase error for debugging
        console.error("[PROFILE-UPDATE] Supabase Error:", {
          message: error.message,
          details: error.details,
          code: error.code,
          hint: error.hint
        });
        throw new Error(error.message || 'Update rejected by database security.');
      }

      toast({ 
        title: 'Profile Updated Successfully', 
        description: 'Your business particulars have been saved.' 
      });
      
      await fetchProfile();
    } catch (error: any) {
      console.error("[PROFILE-UPDATE] Fatal Error:", error);
      toast({ 
        variant: 'destructive', 
        title: 'Save Failed', 
        description: error.message || 'Check your internet connection and try again.' 
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
                
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Entity Name *</Label>
                    <Input value={name} onChange={e => setName(e.target.value)} required placeholder="Business Name" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">WhatsApp Business No. *</Label>
                    <div className="relative">
                      <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        value={whatsapp} 
                        onChange={e => setWhatsapp(e.target.value)} 
                        required 
                        placeholder="+26777123456" 
                        className="pl-10"
                      />
                    </div>
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
                    <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Service Delivery Model</Label>
                    <Select value={deliveryType} onValueChange={(v: any) => setDeliveryType(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="station">Fixed Station</SelectItem>
                        <SelectItem value="mobile">Mobile (On-Site)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Physical Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={address} onChange={e => setAddress(e.target.value)} className="pl-10" placeholder="Plot / Street / Mall" />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">City</Label>
                    <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Gaborone / Francistown" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Special Identification (ReadOnly)</Label>
                    <Input value={idNumberDisplay} disabled className="bg-slate-50 cursor-not-allowed opacity-60" />
                    <p className="text-[9px] text-muted-foreground italic">Verification credentials cannot be modified after initial review.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Special Tag (e.g. CIPA Verified)</Label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={specialTag} onChange={e => setSpecialTag(e.target.value)} className="pl-10" placeholder="Verification Status Badge" />
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
              <CardTitle className="text-sm font-black uppercase tracking-widest">Branding & Identity</CardTitle>
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
                <div className="space-y-2">
                  <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Account Status</Label>
                  <div className={cn(
                    "p-4 rounded-2xl border-2 flex flex-col items-center gap-2",
                    profile?.verification_status === 'verified' ? "bg-green-50 border-green-200" : "bg-orange-50 border-orange-200"
                  )}>
                    {profile?.verification_status === 'verified' ? (
                      <>
                        <CheckCircle2 className="h-10 w-10 text-green-600" />
                        <p className="font-black text-green-800 uppercase text-xs">Fully Verified</p>
                        {profile?.special_tag && <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200 font-bold text-[9px] uppercase">{profile.special_tag}</Badge>}
                      </>
                    ) : (
                      <>
                        <Loader2 className="h-10 w-10 text-orange-600 animate-spin" />
                        <p className="font-black text-orange-800 uppercase text-xs tracking-tight">Under Admin Review</p>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-3 w-3 text-slate-400" />
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Owner Record</span>
                  </div>
                  <p className="text-xs font-bold text-slate-600">{ownerName}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
