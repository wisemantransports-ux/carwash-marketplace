
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ShieldCheck, ArrowLeft, MessageCircle, Smartphone, CheckCircle2, Mail, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // WhatsApp State
  const [whatsappStep, setWhatsappStep] = useState<'phone' | 'otp'>('phone');
  const [whatsapp, setWhatsapp] = useState('');
  const [otp, setOtp] = useState('');

  // Email State
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

      // Fetch role for redirect
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single();

      toast({ title: "Welcome Back", description: "Accessing your dashboard..." });
      
      if (profile?.role === 'admin') router.push('/admin/dashboard');
      else router.push('/business/dashboard');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Login Failed", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatsapp.trim()) return;

    setLoading(true);
    try {
      const cleanWa = whatsapp.trim().replace(/\D/g, '');
      const { data: user, error: findError } = await supabase
        .from('users')
        .select('*')
        .eq('whatsapp_number', cleanWa)
        .maybeSingle();

      if (!user) {
        toast({ 
          variant: "destructive", 
          title: "Number Not Found", 
          description: "This WhatsApp number isn't registered yet. Please book a wash or contact a seller first." 
        });
        setLoading(false);
        return;
      }

      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiry = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      await supabase
        .from('users')
        .update({ otp_code: generatedOtp, otp_expires_at: expiry })
        .eq('id', user.id);

      console.log(`[DEV] WhatsApp OTP for ${cleanWa}: ${generatedOtp}`);
      toast({ title: "Code Sent", description: "Check your WhatsApp for the code." });
      setWhatsappStep('otp');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const cleanWa = whatsapp.trim().replace(/\D/g, '');
      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('whatsapp_number', cleanWa)
        .single();

      if (user.otp_code !== otp) throw new Error("Invalid verification code.");
      
      const { error: sessionError } = await supabase.auth.signInAnonymously({
        options: { data: { role: 'customer', name: user.name, whatsapp: cleanWa } }
      });

      if (sessionError) throw sessionError;

      toast({ title: "Verified Successfully!" });
      router.push('/customer/home');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Verification Failed", description: error.message });
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">AutoLink Africa</h1>
          <p className="text-slate-400 font-medium">Secure platform authentication center.</p>
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
                  <MessageCircle className="h-5 w-5 text-green-500" />
                  WhatsApp OTP
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {whatsappStep === 'phone' ? 'Enter your registered number.' : 'Enter the 6-digit code.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-8">
                {whatsappStep === 'phone' ? (
                  <form onSubmit={handleSendOtp} className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-slate-300 font-bold uppercase text-[10px] tracking-widest ml-1">WhatsApp Number</Label>
                      <Input 
                        placeholder="26777123456" 
                        className="h-14 bg-white/5 border-white/10 text-white text-lg rounded-2xl" 
                        value={whatsapp}
                        onChange={e => setWhatsapp(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full h-14 text-lg font-black shadow-xl" disabled={loading}>
                      {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : "Send Code"}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-slate-300 font-bold uppercase text-[10px] tracking-widest ml-1">Verification Code</Label>
                      <Input 
                        placeholder="••••••" 
                        maxLength={6}
                        className="h-16 bg-white/5 border-white/10 text-white text-3xl font-black text-center tracking-[0.5em] rounded-2xl" 
                        value={otp}
                        onChange={e => setOtp(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full h-14 text-lg font-black shadow-xl bg-green-600 hover:bg-green-700" disabled={loading}>
                      {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : "Verify Identity"}
                    </Button>
                    <Button variant="link" className="w-full text-slate-500 font-bold text-xs" onClick={() => setWhatsappStep('phone')}>
                      Use a different number
                    </Button>
                  </form>
                )}
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
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                      <Input 
                        type="email"
                        placeholder="partner@example.com" 
                        className="pl-10 h-14 bg-white/5 border-white/10 text-white rounded-2xl" 
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300 font-bold uppercase text-[10px] tracking-widest ml-1">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                      <Input 
                        type="password"
                        placeholder="••••••••" 
                        className="pl-10 h-14 bg-white/5 border-white/10 text-white rounded-2xl" 
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                      />
                    </div>
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
