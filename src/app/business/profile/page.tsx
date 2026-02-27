
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from '@/hooks/use-toast';
import { Loader2, Store, MapPin, Globe, ShieldCheck, Clock, CreditCard, Upload, X, AlertCircle, Phone, FileText, CheckCircle2 } from 'lucide-react';
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

  // Editable fields
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
      toast({ title: 'Logo Uploaded' });
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

      const payload = {
        owner_id: user.id,
        name,
        address,
        city,
        type,
        whatsapp_number: whatsapp,
        logo_url: logoUrl
      };

      const { error: saveError } = await supabase
        .from('businesses')
        .upsert(payload, { onConflict: 'owner_id' });

      if (saveError) throw saveError;

      toast({ title: 'Profile Updated' });
      await fetchProfile();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Business Hub</h1>
        <p className="text-muted-foreground">Manage your credentials and operational settings.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-lg border-2">
            <CardHeader className="bg-muted/10 border-b">
              <CardTitle>Core Details</CardTitle>
              <CardDescription>Visible to customers across the platform.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSave} className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-6 items-center">
                  <div className="relative h-32 w-32 rounded-2xl overflow-hidden border-2 bg-muted shadow-inner">
                    {logoUrl ? (
                      <Image src={logoUrl} alt="Logo" fill className="object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Store className="h-10 w-10 text-muted-foreground opacity-40" />
                      </div>
                    )}
                    {uploading && <div className="absolute inset-0 bg-background/60 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    <Upload className="h-4 w-4 mr-2" /> Change Logo
                  </Button>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                </div>

                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Business Name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type">Service Model</Label>
                      <Select value={type} onValueChange={setType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="station">Fixed Station</SelectItem>
                          <SelectItem value="mobile">Mobile Detailing</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp">WhatsApp Number</Label>
                    <Input id="whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
                  </div>
                </div>

                <Button type="submit" className="w-full h-12 shadow-md" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Profile
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader className="bg-muted/10 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Identity Verification
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-xl border bg-card">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Verification Status</p>
                    <div className="flex items-center gap-2">
                      {profile?.verification_status === 'verified' ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Verified Partner
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="animate-pulse">
                          {profile?.verification_status?.toUpperCase() || 'PENDING'}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Entity Type</p>
                    <p className="text-sm font-bold capitalize">{profile?.business_type || 'Individual'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border bg-muted/20">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">ID / Reg Number</p>
                    <p className="font-mono text-sm font-bold">{profile?.id_number || '---'}</p>
                  </div>
                  <div className="p-4 rounded-xl border bg-muted/20 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Documents</p>
                      <p className="text-xs font-bold text-primary">Uploaded</p>
                    </div>
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>

                {profile?.special_tag && (
                  <Alert className="bg-primary/5 border-primary/20">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <AlertTitle className="text-primary font-bold">{profile.special_tag}</AlertTitle>
                    <AlertDescription className="text-xs">
                      Your CIPA verification is active. This badge is visible to all customers.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <ShareBusinessCard businessId={profile?.id || ''} />
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Trust Badge</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4 text-center py-4">
                <div className="bg-white p-4 rounded-full shadow-inner border-2 border-primary/20">
                  <ShieldCheck className="h-12 w-12 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold">Verified Operator</p>
                  <p className="text-xs text-muted-foreground">Verification builds trust and increases your booking conversion rate by up to 40%.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
