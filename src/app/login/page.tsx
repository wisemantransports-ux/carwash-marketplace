'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ShieldCheck, ArrowLeft, Mail, AlertCircle, Smartphone } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handlePartnerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle();

      toast({ title: "Welcome Back", description: "Accessing your dashboard..." });
      
      if (profile?.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/business/dashboard');
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Login Failed", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatsapp.trim()) {
      toast({ variant: 'destructive', title: 'Input Required', description: 'Please enter your WhatsApp number.' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/customer-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsapp })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      // Ensure we have a valid session before redirecting
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        await supabase.auth.signInAnonymously();
      }
      
      toast({ title: "Authenticated!", description: "Opening your activity hub..." });
      router.push('/customer/dashboard');
    } catch (error: any) {
      console.error("[LOGIN-CLIENT] Error:", error);
      toast({ 
        variant: "destructive", 
        title: "Access Denied", 
        description: error.message || 'Verification failed. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  }, [whatsapp, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950 px-4">
      <div className="w-full max-w-md space-y-8 animate-in fade-in duration-500">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>
        
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="bg-primary shadow-[0_0_20px_rgba(32,128,223,0.4)] p-3 rounded-2xl">
              <ShieldCheck className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase italic text-center">AutoLink Africa</h1>
          <p className="text-slate-400 font-medium text-center">Marketplace Authentication</p>
        </div>

        <Tabs defaultValue="customer" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white/5 border border-white/10 p-1 rounded-2xl mb-6 h-12">
            <TabsTrigger value="customer" className="rounded-xl data-[state=active]:bg-primary font-bold">Customer</TabsTrigger>
            <TabsTrigger value="partner" className="rounded-xl data-[state=active]:bg-primary font-bold">Partner</TabsTrigger>
          </TabsList>

          <TabsContent value="customer">
            <Card className="border-white/5 bg-slate-900 shadow-2xl rounded-3xl overflow-hidden">
              <CardHeader className="bg-white/5 border-b border-white/5">
                <CardTitle className="text-white text-xl flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-green-500" />
                  WhatsApp Access
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Access your inquiries and bookings instantly.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-8">
                <form onSubmit={handleCustomerLogin} className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-slate-300 font-bold uppercase text-[10px] tracking-widest ml-1">WhatsApp Number</Label>
                    <Input 
                      placeholder="26770000000" 
                      className="h-14 bg-white/5 border-white/10 text-white text-lg rounded-2xl" 
                      value={whatsapp}
                      onChange={e => setWhatsapp(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full h-14 text-lg font-black shadow-xl uppercase tracking-tighter" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : "Sign In to Dashboard"}
                  </Button>
                  <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex gap-3">
                    <AlertCircle className="h-5 w-5 text-primary shrink-0" />
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                      First time? We'll automatically set up your dashboard so you can track your automotive needs in real-time.
                    </p>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="partner">
            <Card className="border-white/5 bg-slate-900 shadow-2xl rounded-3xl overflow-hidden">
              <CardHeader className="bg-white/5 border-b border-white/5">
                <CardTitle className="text-white text-xl flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  Partner Login
                </CardTitle>
                <CardDescription className="text-slate-400">Admin and Business Owner access.</CardDescription>
              </CardHeader>
              <CardContent className="pt-8">
                <form onSubmit={handlePartnerLogin} className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-slate-300 font-bold uppercase text-[10px] tracking-widest ml-1">Email Address</Label>
                    <Input 
                      type="email"
                      placeholder="partner@example.com" 
                      className="h-14 bg-white/5 border-white/10 text-white rounded-2xl" 
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300 font-bold uppercase text-[10px] tracking-widest ml-1">Password</Label>
                    <Input 
                      type="password"
                      placeholder="••••••••" 
                      className="h-14 bg-white/5 border-white/10 text-white rounded-2xl" 
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full h-14 text-lg font-black shadow-xl" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : "Sign In to Dashboard"}
                  </Button>
                </form>
              </CardContent>
              <CardFooter className="justify-center border-t border-white/5 bg-white/[0.02] p-6">
                <p className="text-xs text-slate-500 text-center">
                  Don't have a business account? <Link href="/signup" className="text-primary font-bold">Register here</Link>
                </p>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}