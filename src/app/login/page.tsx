
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import Link from 'next/link';

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const handleRoleRedirect = useCallback(async (userId: string) => {
    // DETERMINISTIC ROLE GATE: Query public.users for the verified role
    const { data: profile, error } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error("Profile load error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load user profile. Please try again.",
      });
      setCheckingSession(false);
      setLoading(false);
      return;
    }

    if (!profile) {
      toast({
        variant: "destructive",
        title: "Profile Not Found",
        description: "Your user record hasn't been created yet. This may take a few seconds after signup.",
      });
      setCheckingSession(false);
      setLoading(false);
      return;
    }

    // Redirect strictly based on the database role
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
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "No recognized dashboard for your role.",
        });
        setCheckingSession(false);
        setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    async function checkExistingSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await handleRoleRedirect(session.user.id);
      } else {
        setCheckingSession(false);
      }
    }
    checkExistingSession();
  }, [handleRoleRedirect]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (authError) throw authError;

      if (authData.user) {
        await handleRoleRedirect(authData.user.id);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message || "Please check your credentials.",
      });
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Establishing secure connection...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/30 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="bg-primary p-3 rounded-2xl shadow-lg">
              <ShieldCheck className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-primary">Carwash Marketplace</h1>
          <p className="text-muted-foreground">Sign in to manage your bookings and services.</p>
        </div>

        <Card className="border-2 shadow-xl">
          <CardHeader>
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>Enter your credentials to continue.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input placeholder="name@example.com" {...field} />
                      </FormControl>
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
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full h-12 text-lg shadow-md" disabled={loading}>
                  {loading ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Authenticating...</>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 border-t bg-muted/10 p-6">
            <div className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-primary font-bold hover:underline">
                Register here
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
