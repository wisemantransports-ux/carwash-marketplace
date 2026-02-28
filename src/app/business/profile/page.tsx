'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from '@/hooks/use-toast';
import { Loader2, Store, MapPin, ShieldCheck, Upload, FileText, CheckCircle2, Phone, Tag, Building2, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { ShareBusinessCard } from '@/components/app/share-business-card';
import { Business, BusinessType } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function BusinessProfilePage() {
  const [profile, setProfile] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Editable fields state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [type, setType] = useState<'station' | 'mobile'>('station');
  const [whatsapp, setWhatsapp] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('individual');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData, error: profileError } = await supabase
        .from('businesses')
        .select(`*`)
        .eq('owner_id', user.id)
        .maybeSingle();

      if (profileError) {
        toast({ variant: 'destructive', title: 'Load Error', description: profileError.message });
      } else if (profileData) {
        const biz = profileData as Business;
        setProfile(biz);
        setName(biz.name || '');
        setAddress(biz.address || '');
        setCity(biz.city || '');
        setType(biz.type || 'station');
        setWhatsapp(biz.whatsapp_number || '');
        setLogoUrl(biz.logo_url || '');
        setBusinessType(biz.business_type || 'individual');
      }
    } catch (error: any) {
      console.error("Fatal fetch error:", error);
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

      const fileExt = file.name.split('.').pop();
      const filePath = `logos/${user.id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('business-assets')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('business-assets')
        .getPublicUrl(filePath);

      setLogoUrl(publicUrl);
      toast({ title: 'Logo Prepared', description: 'Your logo preview is ready. Click save to finalize.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // RLS-Safe Payload: Only send editable fields. 
      // Do NOT include owner_id, status, or subscription fields.
      const payload = {
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        type,
        whatsapp_number: whatsapp.trim(),
        logo_url: logoUrl,
        business_type: businessType
      };

      const { error: updateError } = await supabase
        .from('businesses')
        .update(payload)
        .eq('owner_id', user.id);

      if (updateError) throw updateError;

      toast({ title: 'Profile Updated', description: 'Business details saved successfully.' });
      await fetchProfile();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Update failed', description: 'Update failed. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  if (!mounted || loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Business Profile</h1>
        <p className="text-muted-foreground font-medium">Manage your credentials, branding, and contact information.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-lg border-2">
            <CardHeader className="bg-muted/10 border-b">
              <CardTitle>Business Branding</CardTitle>
              <CardDescription>Upload your logo to increase trust in the marketplace.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-6 items-center">
                <div className="relative h-32 w-32 rounded-2xl overflow-hidden border-2 bg-muted shadow-inner group">
                  {logoUrl ? (
                    <Image src={logoUrl} alt="Logo" fill className="object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Store className="h-10 w-10 text-muted-foreground opacity-40" />
                    </div>
                  )}
                  {uploading && (
                    <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  )}
                </div>
                <div className="space-y-2 flex-1">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => fileInputRef.current?.click()} 
                    disabled={uploading}
                    className="w-full sm:w-auto font-bold"
                  >
                    <Upload className="h-4 w-4 mr-2" /> Change Logo
                  </Button>
                  <p className="text-[10px] text-muted-foreground">Recommended: Square image, max 2MB.</p>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-2">
            <CardHeader className="bg-muted/10 border-b">
              <CardTitle>Contact & Identity</CardTitle>
              <CardDescription>Visible to all customers when browsing your services.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="font-bold text-xs uppercase">Business / Trading Name *</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sparkle Wash" required />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="address" className="font-bold text-xs uppercase">Physical Address</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="address" className="pl-10" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. Plot 1234, Main Mall" />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city" className="font-bold text-xs uppercase">Operating City</Label>
                      <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Gaborone" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type" className="font-bold text-xs uppercase">Service Model</Label>
                      <Select value={type} onValueChange={(v: any) => setType(v)}>
                        <SelectTrigger className="font-medium"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="station">Fixed Station Only</SelectItem>
                          <SelectItem value="mobile">Mobile Detailing Service</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="whatsapp" className="font-bold text-xs uppercase">WhatsApp Business Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="whatsapp" className="pl-10" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="e.g. 77123456" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="btype" className="font-bold text-xs uppercase">Business Structure</Label>
                      <Select value={businessType} onValueChange={(v: any) => setBusinessType(v)}>
                        <SelectTrigger className="font-medium"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="individual">Individual / Micro-Business</SelectItem>
                          <SelectItem value="registered">Registered Entity (CIPA)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full h-12 shadow-md text-lg font-bold" disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                  Save Profile Changes
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-2 overflow-hidden">
            <CardHeader className="bg-muted/10 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Legal Verification Status
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-xl border bg-card shadow-sm">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Verification</p>
                    <div className="flex items-center gap-2">
                      {profile?.verification_status === 'verified' ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200 font-black px-3">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> VERIFIED
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="animate-pulse font-black px-3">
                          {profile?.verification_status?.toUpperCase() || 'PENDING'}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Account Tier</p>
                    <div className="flex flex-col items-end gap-1">
                        <p className="text-sm font-extrabold capitalize">{profile?.business_type || 'Micro-Business'}</p>
                        {profile?.business_type === 'registered' && (
                            <Badge className="bg-primary text-white text-[10px] font-black">CIPA TRUST SEAL</Badge>
                        )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border bg-muted/20">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">
                        Reference Number
                    </p>
                    <p className="font-mono text-sm font-bold">{profile?.id_number || '---'}</p>
                  </div>
                  <div className="p-4 rounded-xl border bg-muted/20 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Documents</p>
                      <p className="text-xs font-bold text-primary">Stored Securely</p>
                    </div>
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <ShareBusinessCard businessId={profile?.id || ''} />
          
          <Card className="bg-primary/5 border-primary/20 overflow-hidden shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Trust Badge Guide</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4 text-center py-4">
                <div className="bg-white p-4 rounded-full shadow-inner border-2 border-primary/20">
                  {businessType === 'registered' ? (
                    <Building2 className="h-12 w-12 text-primary" />
                  ) : (
                    <User className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-2">
                  <p className="font-bold">{businessType === 'registered' ? 'Registered Entity' : 'Verified Individual'}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                    {businessType === 'registered' 
                        ? "Registered businesses receive the CIPA Trust Seal, increasing visibility and credibility in the marketplace." 
                        : "Micro-businesses are fully verified via Omang. Upgrade to a registered entity anytime to unlock the CIPA Trust Seal."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
