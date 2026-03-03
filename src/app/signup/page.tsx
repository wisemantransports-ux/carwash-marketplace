
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, User, Store, ArrowLeft, Mail, Lock, Building2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import Link from 'next/link';
import { cn } from '@/lib/utils';

const signupSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  whatsapp: z.string().min(8, "Valid WhatsApp number required"),
  role: z.literal("business-owner"),
  business_type: z.enum(["individual", "registered"]),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { 
      fullName: '', 
      email: '', 
      password: '', 
      whatsapp: '', 
      role: 'business-owner',
      business_type: 'individual'
    },
  });

  const onSubmit = async (values: SignupFormValues) => {
    setLoading(true);
    try {
      const cleanWa = values.whatsapp.trim().replace(/\D/g, '');
      
      // 1. Auth Signup
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            name: values.fullName,
            role: values.role,
            whatsapp: cleanWa
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Sync to public users table
        const { error: userError } = await supabase.from('users').insert({
          id: authData.user.id,
          name: values.fullName,
          email: values.email,
          whatsapp_number: cleanWa,
          role: values.role,
          is_verified: false,
          trial_expiry: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 Day Trial
        });

        if (userError) throw userError;

        // 3. Initial Business Profile with tiered type
        await supabase.from('businesses').insert({
          owner_id: authData.user.id,
          name: `${values.fullName}'s Professional Service`,
          status: 'pending',
          verification_status: 'pending',
          business_type: values.business_type,
          category: 'Wash',
          whatsapp_number: cleanWa
        });
      }

      toast({ 
        title: "Registration Successful", 
        description: "Welcome to AutoLink. Please sign in to verify your account." 
      });
      router.push('/login');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Signup Failed", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950 px-4 py-12">
      <div className="w-full max-w-lg space-y-8 animate-in fade-in duration-500">
        <Link href="/login" className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Login
        </Link>

        <Card className="border-white/5 bg-slate-900 shadow-2xl rounded-3xl overflow-hidden">
          <CardHeader className="text-center bg-white/5 border-b border-white/5 py-8">
            <div className="flex justify-center mb-4">
              <div className="bg-primary p-3 rounded-2xl shadow-lg">
                <ShieldCheck className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-black text-white">Partner Registration</CardTitle>
            <CardDescription className="text-slate-400">Join Africa's most trusted automotive marketplace.</CardDescription>
          </CardHeader>
          <CardContent className="pt-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                <FormField
                  control={form.control}
                  name="business_type"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-slate-300 font-bold uppercase text-[10px] tracking-widest">Business Structure</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="grid grid-cols-2 gap-4"
                        >
                          <Label
                            htmlFor="individual"
                            className={cn(
                              "flex flex-col items-center justify-between rounded-xl border-2 border-white/5 bg-white/5 p-4 hover:bg-white/10 cursor-pointer transition-all",
                              field.value === 'individual' && "border-primary bg-primary/10"
                            )}
                          >
                            <RadioGroupItem value="individual" id="individual" className="sr-only" />
                            <User className="mb-3 h-6 w-6 text-slate-400" />
                            <span className="text-[10px] font-black uppercase text-white">Micro Business</span>
                            <span className="text-[8px] text-slate-500 mt-1 text-center">Selfie + Omang</span>
                          </Label>
                          <Label
                            htmlFor="registered"
                            className={cn(
                              "flex flex-col items-center justify-between rounded-xl border-2 border-white/5 bg-white/5 p-4 hover:bg-white/10 cursor-pointer transition-all",
                              field.value === 'registered' && "border-primary bg-primary/10"
                            )}
                          >
                            <RadioGroupItem value="registered" id="registered" className="sr-only" />
                            <Building2 className="mb-3 h-6 w-6 text-slate-400" />
                            <span className="text-[10px] font-black uppercase text-white">Registered Entity</span>
                            <span className="text-[8px] text-slate-500 mt-1 text-center">CIPA Certificate</span>
                          </Label>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4">
                  <FormField control={form.control} name="fullName" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300 font-bold uppercase text-[10px]">Owner Full Name</FormLabel>
                      <FormControl><Input placeholder="John Doe" className="bg-white/5 border-white/10 text-white h-12" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300 font-bold uppercase text-[10px]">Business Email</FormLabel>
                      <FormControl><Input type="email" placeholder="shop@example.com" className="bg-white/5 border-white/10 text-white h-12" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="whatsapp" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300 font-bold uppercase text-[10px]">WhatsApp Business No.</FormLabel>
                      <FormControl><Input placeholder="26777123456" className="bg-white/5 border-white/10 text-white h-12" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300 font-bold uppercase text-[10px]">Dashboard Password</FormLabel>
                      <FormControl><Input type="password" placeholder="••••••••" className="bg-white/5 border-white/10 text-white h-12" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <Button type="submit" className="w-full h-14 text-lg font-black shadow-xl uppercase tracking-tighter" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : "Start 14-Day Free Trial"}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="justify-center border-t border-white/5 bg-white/[0.02] p-6">
            <p className="text-xs text-slate-500 text-center">
              By registering, you agree to our verification terms. <Link href="/login" className="text-primary font-bold">Sign In</Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
