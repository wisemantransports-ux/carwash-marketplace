'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { User as ProfileUser } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Loader2, Store, MapPin, Globe, ShieldCheck, Clock, CreditCard, Upload, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

export default function BusinessProfilePage() {
  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Editable fields
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  
  // File upload state
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchProfile() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('users_with_access')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (data) {
        setProfile(data as ProfileUser);
        setName(data.name || '');
        setAddress(data.address || '');
        setCity(data.city || '');
        setDescription(data.description || '');
        setAvatarUrl(data.avatarUrl || '');
      }
      setLoading(false);
    }
    fetchProfile();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      // Create a preview URL
      setAvatarUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ variant: 'destructive', title: 'Name Required', description: 'Please enter your business name.' });
      return;
    }

    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    let finalAvatarUrl = avatarUrl;

    // Handle file upload if a new file was selected
    if (file) {
      setUploading(true);
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${session.user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `logos/${fileName}`;

        // Note: Ensure the 'business-assets' bucket is created and public in Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('business-assets')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('business-assets')
          .getPublicUrl(filePath);

        finalAvatarUrl = publicUrl;
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Upload Failed', description: error.message || 'Could not upload image.' });
        setSaving(false);
        setUploading(false);
        return;
      }
      setUploading(false);
    }
    
    const { error } = await supabase
      .from('users')
      .update({
        name,
        address,
        city,
        description,
        avatar_url: finalAvatarUrl,
      })
      .eq('id', session?.user.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    } else {
      setAvatarUrl(finalAvatarUrl);
      setFile(null);
      toast({ title: 'Profile Updated', description: 'Your business details have been saved.' });
    }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  if (!profile) return <div className="text-center py-20">Profile not found.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Business Profile</h1>
        <p className="text-muted-foreground">Manage your public presence and account status.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Business Details</CardTitle>
              <CardDescription>This information will be visible to customers in the marketplace.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-6 items-center">
                  <div className="relative h-32 w-32 rounded-2xl overflow-hidden border bg-muted shrink-0 shadow-sm">
                    {avatarUrl ? (
                      <Image src={avatarUrl} alt="Logo" fill className="object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Store className="h-10 w-10 text-muted-foreground" />
                      </div>
                    )}
                    {uploading && (
                      <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 w-full space-y-3">
                    <Label>Business Logo</Label>
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading || saving}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {avatarUrl ? 'Change Logo' : 'Upload Logo'}
                      </Button>
                      {file && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          className="text-destructive"
                          onClick={() => {
                            setFile(null);
                            setAvatarUrl(profile.avatarUrl || '');
                          }}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel
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
                      onChange={handleFileChange}
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
                  <Label htmlFor="description">Business Description</Label>
                  <Textarea 
                    id="description" 
                    rows={5} 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    placeholder="Tell customers about your services and expertise..."
                  />
                </div>

                <Button type="submit" className="w-full" disabled={saving || uploading}>
                  {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                  {file ? 'Upload and Save Changes' : 'Save Changes'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="text-lg">Account Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Current Plan</p>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <span className="font-semibold">{profile.plan || 'None'}</span>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Payment Status</p>
                <div className="flex items-center gap-2">
                  {profile.paid ? (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
                      <ShieldCheck className="h-3 w-3 mr-1" /> Paid
                    </Badge>
                  ) : (
                    <Badge variant="outline">Unpaid</Badge>
                  )}
                </div>
              </div>

              {!profile.paid && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Trial Status</p>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-medium">
                      {profile.trial_remaining! > 0 
                        ? `${profile.trial_remaining} days left` 
                        : 'Trial Expired'}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
               <Button variant="outline" className="w-full" asChild>
                 <a href="/business/subscription">Manage Subscription</a>
               </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
