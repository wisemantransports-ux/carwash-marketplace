'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, ShieldCheck, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import Link from 'next/link';
import { useTenant } from '@/hooks/use-tenant';

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { tenant } = useTenant();
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const redirecting = useRef(false);

  /**
   * handleRoleRedirect
   * Fetches the user profile based on an EXPLICIT userId to satisfy RLS.
   * Session is established first to ensure auth.uid() context is ready.
   */
  const handleRoleRedirect = useCallback(async (userId: string) => {
    if (!userId || redirecting.current) return;
    redirecting.current = true;

    try {
      // 1. Double-check session existence to ensure JWT is in headers
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Authentication session lost.");

      console.log("[AUTH] Session established for UID:", userId);

      // 2. Fetch profile using explicit session-based UID
      const { data: profile, error } = await supabase
        .from('users_with_access')
        .select('id, role, tenant_id')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error("[AUTH] Profile Fetch Error Detail:", {
          message: error.message,
          details: error.details,
          code: error.code
        });
        throw new Error(`Profile access denied: ${error.message}`);
      }

      if (!profile) {
        console.warn("[AUTH] No profile found for UID:", userId);
        throw new Error("Account record not found in database.");
      }

      // 3. Role-Based Routing
      console.log(`[AUTH] Routing established: ${profile.role}`);
      
      switch (profile.role) {
        case 'admin': 
          router.replace('/admin/dashboard'); 
          break;
        case 'business-owner': 
          router.replace('/business/dashboard'); 
          break;
        case 'customer': 
          router.replace('/customer/home'); 
          break;
        default: 
          throw new Error(`Unrecognized role: ${profile.role}`);
      }
    } catch (e: any) {
      console.error("[AUTH] Redirect Failure:", e.message);
      toast({ 
        variant: "destructive", 
        title: "Access Error", 
        description: e.message || "Unable to retrieve account profile." 
      });
      setLoading(false);
      redirecting.current = false;
    }
  }, [router]);

  useEffect(() => {
    async function checkExistingSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        await handleRoleRedirect(session.user.id);
      } else {
        setCheckingSession(false);
      }
    }
    checkExistingSession();
  }, [handleRoleRedirect]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (authError) throw authError;

      if (authData.user?.id) {
        await handleRoleRedirect(authData.user.id);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Login Failed", description: error.message });
      setLoading(false);
    }
  };

  if (checkingSession) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <Loader2 className="animate-spin text-primary h-10 w-10" />
      <p className="text-sm text-muted-foreground animate-pulse font-medium">Authenticating...</p>
    </div>
  );

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/30 px-4">
      <div className="w-full max-w-md space-y-8 animate-in fade-in duration-500">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>
        
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="bg-primary p-3 rounded-2xl shadow-lg">
              <ShieldCheck className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-primary">
            {tenant?.name || 'AutoLink Africa'}
          </h1>
          <p className="text-muted-foreground">Sign in to your platform instance.</p>
        </div>

        <Card className="border-2 shadow-xl rounded-3xl overflow-hidden">
          <CardHeader className="bg-muted/10 border-b">
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>Use your registered email and password.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl><Input placeholder="admin@autolink.africa" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full h-12 text-lg font-bold shadow-md" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : "Sign In"}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 border-t bg-muted/5 p-6">
            <div className="text-center text-sm text-muted-foreground">
              Don't have an account? <Link href="/signup" className="text-primary font-bold hover:underline">Create Account</Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
