
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from '@/hooks/use-toast';
import { Loader2, Store, MapPin, ShieldCheck, Upload, FileText, CheckCircle2, Phone, Building2, User, Info, LayoutGrid, Camera } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Business, BusinessType, BusinessCategory } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function BusinessProfilePage() {
  const [profile, setProfile] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form fields
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [bizType, setBizType] = useState<BusinessType>('individual');
  const [category, setCategory] = useState<BusinessCategory>('Wash');
  const [idNumber, setIdNumber] = useState('');

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: biz } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

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
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Load Error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from('businesses')
        .update({
          name: name.trim(),
          address: address.trim(),
          city: city.trim(),
          whatsapp_number: whatsapp.trim(),
          business_type: bizType,
          category: category,
          id_number: idNumber.trim()
        })
        .eq('owner_id', profile?.owner_id);

      if (error) throw error;
      toast({ title: 'Profile Updated', description: 'Changes saved successfully.' });
      await fetchProfile();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
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
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Entity Name</Label>
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
                    <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="26777123456" />
                  </div>
                </div>

                <Button type="submit" className="w-full h-14 text-lg font-black shadow-xl" disabled={saving}>
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
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Verification Center
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="text-center space-y-4">
                <div className={cn(
                  "p-4 rounded-2xl border-2 flex flex-col items-center gap-2",
                  profile?.verification_status === 'verified' ? "bg-green-50 border-green-200" : "bg-orange-50 border-orange-200"
                )}>
                  {profile?.verification_status === 'verified' ? (
                    <>
                      <CheckCircle2 className="h-10 w-10 text-green-600" />
                      <p className="font-black text-green-800">FULLY VERIFIED</p>
                    </>
                  ) : (
                    <>
                      <Loader2 className="h-10 w-10 text-orange-600 animate-spin" />
                      <p className="font-black text-orange-800 uppercase">Awaiting Review</p>
                    </>
                  )}
                </div>
                <p className="text-[10px] font-bold text-muted-foreground leading-relaxed">
                  Admins manually inspect {bizType === 'individual' ? 'Selfie + Omang' : 'CIPA Certificates'} to maintain marketplace integrity.
                </p>
              </div>

              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start h-12 rounded-xl" asChild>
                  <label className="cursor-pointer">
                    <Camera className="mr-3 h-4 w-4 text-primary" />
                    Upload ID Selfie
                    <input type="file" className="hidden" />
                  </label>
                </Button>
                {bizType === 'registered' && (
                  <Button variant="outline" className="w-full justify-start h-12 rounded-xl" asChild>
                    <label className="cursor-pointer">
                      <FileText className="mr-3 h-4 w-4 text-primary" />
                      CIPA Certificate
                      <input type="file" className="hidden" />
                    </label>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
