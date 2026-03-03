
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, ArrowLeft, MessageCircle, Smartphone, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import Link from 'next/link';

/**
 * @fileOverview WhatsApp OTP Login Page
 * Implements Phase 1.5 Progressive Identity Verification.
 * No password required. Users login via their registered WhatsApp number.
 */

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [whatsapp, setWhatsapp] = useState('');
  const [otp, setOtp] = useState('');

  // 1. Send OTP Logic
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatsapp.trim()) return;

    setLoading(true);
    try {
      // Find user by WhatsApp
      const { data: user, error: findError } = await supabase
        .from('users')
        .select('*')
        .eq('whatsapp_number', whatsapp.trim())
        .maybeSingle();

      if (findError) throw findError;
      if (!user) {
        toast({ 
          variant: "destructive", 
          title: "Number Not Found", 
          description: "This WhatsApp number isn't registered yet. Please contact a seller or book a wash first." 
        });
        setLoading(false);
        return;
      }

      // Generate 6-digit OTP
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiry = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min expiry

      // Save OTP to user record
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          otp_code: generatedOtp, 
          otp_expires_at: expiry 
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Mock Sending (In prod, this calls WhatsApp API)
      console.log(`[DEV] WhatsApp OTP for ${whatsapp}: ${generatedOtp}`);
      
      toast({ title: "Code Sent", description: "Check your WhatsApp for the 6-digit verification code." });
      setStep('otp');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  // 2. Verify OTP Logic
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;

    setLoading(true);
    try {
      const { data: user, error: findError } = await supabase
        .from('users')
        .select('*')
        .eq('whatsapp_number', whatsapp.trim())
        .maybeSingle();

      if (!user || findError) throw new Error("Verification session failed.");

      const now = new Date();
      const expiry = user.otp_expires_at ? new Date(user.otp_expires_at) : null;

      if (user.otp_code !== otp) throw new Error("Invalid verification code.");
      if (!expiry || expiry < now) throw new Error("Code has expired. Please request a new one.");

      // Verify User & Clear OTP
      const { error: verifyError } = await supabase
        .from('users')
        .update({
          is_verified: true,
          otp_code: null,
          otp_expires_at: null,
          last_login_at: now.toISOString()
        })
        .eq('id', user.id);

      if (verifyError) throw verifyError;

      // Identity Consolidation (Adopt orphan leads/bookings)
      await supabase.from('leads').update({ user_id: user.id }).eq('whatsapp_number', whatsapp.trim()).is('user_id', null);
      await supabase.from('wash_bookings').update({ user_id: user.id }).eq('whatsapp_number', whatsapp.trim()).is('user_id', null);

      toast({ title: "Verified Successfully!", description: "Accessing your dashboard..." });
      
      // Role-based redirect
      if (user.role === 'admin') router.push('/admin/dashboard');
      else if (user.role === 'wash_business' || user.role === 'seller') router.push('/business/dashboard');
      else router.push('/customer/home');

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
          <ArrowLeft className="h-4 w-4" /> Back to Marketplace
        </Link>
        
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="bg-primary shadow-[0_0_20px_rgba(32,128,223,0.4)] p-3 rounded-2xl">
              <ShieldCheck className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">Verification Center</h1>
          <p className="text-slate-400 font-medium">Verify your identity to track your requests.</p>
        </div>

        <Card className="border-white/5 bg-slate-900 shadow-2xl rounded-3xl overflow-hidden">
          <CardHeader className="bg-white/5 border-b border-white/5">
            <CardTitle className="text-white text-xl">
              {step === 'phone' ? 'WhatsApp Login' : 'Enter 6-Digit Code'}
            </CardTitle>
            <CardDescription className="text-slate-400">
              {step === 'phone' 
                ? 'Enter your WhatsApp number to receive an access code.' 
                : `We've sent a code to ${whatsapp}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-8">
            {step === 'phone' ? (
              <form onSubmit={handleSendOtp} className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-slate-300 font-bold uppercase text-[10px] tracking-widest ml-1">WhatsApp Number</Label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                    <Input 
                      placeholder="26777123456" 
                      className="pl-10 h-14 bg-white/5 border-white/10 text-white text-lg rounded-2xl" 
                      value={whatsapp}
                      onChange={e => setWhatsapp(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full h-14 text-lg font-black shadow-xl" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <MessageCircle className="mr-2 h-5 w-5" />}
                  Send Verification Code
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
                  {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                  Verify & Access Dashboard
                </Button>
                <Button variant="link" className="w-full text-slate-500 font-bold text-xs" onClick={() => setStep('phone')}>
                  Use a different number
                </Button>
              </form>
            )}
          </CardContent>
          <CardFooter className="justify-center border-t border-white/5 bg-white/[0.02] p-6">
            <p className="text-xs text-slate-500 text-center leading-relaxed">
              By continuing, you agree to our terms. We use WhatsApp to keep your account secure and frictionless.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
