
'use client';

import { useState, useRef } from 'react';
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
import { Loader2, ShieldCheck, User, Store, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import Link from 'next/link';
import { useTenant } from '@/hooks/use-tenant';

const signupSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["customer", "business-owner"]),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const { tenant } = useTenant();
  const [loading, setLoading] = useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: '', email: '', password: '', role: 'customer' },
  });

  const onSubmit = async (values: SignupFormValues) => {
    if (!tenant) return;
    setLoading(true);
    try {
      // 1. Auth Signup with Tenant metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            name: values.fullName,
            role: values.role,
            tenant_id: tenant.id
          },
        },
      });

      if (authError) throw authError;

      if (authData.user && values.role === 'business-owner') {
        // 2. Initial Business Placeholder for the Tenant
        await supabase.from('businesses').insert({
          owner_id: authData.user.id,
          tenant_id: tenant.id,
          name: `${values.fullName}'s Venture`,
          status: 'pending',
          verification_status: 'pending',
          category: 'Wash'
        });
      }

      toast({ title: "Registration Successful", description: `Welcome to ${tenant.name}!` });
      router.push('/login');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Signup Failed", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/30 px-4 py-12">
      <div className="w-full max-w-lg space-y-8 animate-in fade-in duration-500">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to {tenant?.name || 'Home'}
        </Link>

        <Card className="border-2 shadow-xl overflow-hidden rounded-3xl">
          <CardHeader className="text-center bg-muted/5 border-b">
            <div className="flex justify-center mb-4">
              <div className="bg-primary p-3 rounded-2xl shadow-lg">
                <ShieldCheck className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl font-black">Join {tenant?.name || 'Platform'}</CardTitle>
            <CardDescription>Register for your white-label account instance.</CardDescription>
          </CardHeader>
          <CardContent className="pt-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Register as...</FormLabel>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 gap-4">
                          <div>
                            <RadioGroupItem value="customer" id="customer" className="peer sr-only" />
                            <Label htmlFor="customer" className="flex flex-col items-center p-4 rounded-xl border-2 hover:bg-accent peer-data-[state=checked]:border-primary cursor-pointer">
                              <User className="mb-2 h-6 w-6" />
                              <span className="text-xs font-bold">Customer</span>
                            </Label>
                          </div>
                          <div>
                            <RadioGroupItem value="business-owner" id="business" className="peer sr-only" />
                            <Label htmlFor="business" className="flex flex-col items-center p-4 rounded-xl border-2 hover:bg-accent peer-data-[state=checked]:border-primary cursor-pointer">
                              <Store className="mb-2 h-6 w-6" />
                              <span className="text-xs font-bold">Operator</span>
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="grid gap-4">
                  <FormField control={form.control} name="fullName" render={({ field }) => (
                    <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="name@example.com" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl></FormItem>
                  )} />
                </div>

                <Button type="submit" className="w-full h-12 text-lg font-black shadow-xl" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : "Complete Signup"}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="justify-center border-t bg-muted/5 p-6">
            <p className="text-sm text-muted-foreground">Already have an account? <Link href="/login" className="text-primary font-bold hover:underline">Log in</Link></p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
