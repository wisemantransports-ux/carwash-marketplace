
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User as ProfileUser } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Loader2, Store, MapPin, Globe, ShieldCheck, Clock, CreditCard } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

export default function BusinessProfilePage() {
  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ variant: 'destructive', title: 'Name Required', description: 'Please enter your business name.' });
      return;
    }

    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    const { error } = await supabase
      .from('users')
      .update({
        name,
        address,
        city,
        description,
        avatar_url: avatarUrl,
      })
      .eq('id', session?.user.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    } else {
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
                <div className="flex flex-col sm:flex-row gap-6 items-start">
                  <div className="relative h-24 w-24 rounded-2xl overflow-hidden border bg-muted shrink-0">
                    {avatarUrl ? (
                      <Image src={avatarUrl} alt="Logo" fill className="object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Store className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 w-full space-y-2">
                    <Label htmlFor="logo">Logo URL</Label>
                    <Input 
                      id="logo" 
                      placeholder="https://example.com/logo.png" 
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                    />
                    <p className="text-[10px] text-muted-foreground italic">Provide a direct link to your business logo image.</p>
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

                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                  Save Changes
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
