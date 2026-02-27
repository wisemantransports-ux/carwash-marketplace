
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, User, Store, FileText, Camera, CheckCircle2, Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import Link from 'next/link';
import Image from 'next/image';

const signupSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["customer", "business-owner"]),
  phone: z.string().optional(),
  businessType: z.enum(["individual", "registered"]).optional(),
  idNumber: z.string().optional(),
  businessName: z.string().optional(),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      role: 'customer',
      businessType: 'individual',
    },
  });

  const role = form.watch('role');
  const businessType = form.watch('businessType');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.size > 5 * 1024 * 1024) {
        toast({ variant: 'destructive', title: 'File Too Large', description: 'Upload must be under 5MB.' });
        return;
      }
      setFile(selected);
      if (selected.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => setFilePreview(reader.result as string);
        reader.readAsDataURL(selected);
      } else {
        setFilePreview(null);
      }
    }
  };

  const onSubmit = async (values: SignupFormValues) => {
    if (role === 'business-owner' && step === 1) {
      setStep(2);
      return;
    }

    if (role === 'business-owner' && !file) {
      toast({ variant: 'destructive', title: 'Upload Required', description: `Please upload your ${businessType === 'individual' ? 'Selfie' : 'Registration Certificate'}.` });
      return;
    }

    setLoading(true);
    try {
      // 1. Auth Signup
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            name: values.fullName,
            role: values.role,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user && role === 'business-owner') {
        // 2. Upload Verification Document
        let uploadedUrl = null;
        const fileExt = file!.name.split('.').pop();
        const filePath = `verification/${authData.user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('business-assets')
          .upload(filePath, file!);
        
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('business-assets')
          .getPublicUrl(filePath);
        
        uploadedUrl = publicUrl;

        // 3. Create Business Record
        const { error: bizError } = await supabase.from('businesses').insert({
          owner_id: authData.user.id,
          name: values.businessName || `${values.fullName}'s Wash`,
          type: 'station', // default
          business_type: values.businessType,
          verification_status: 'pending',
          id_number: values.idNumber,
          whatsapp_number: values.phone,
          special_tag: values.businessType === 'registered' ? 'CIPA Verified' : null,
          selfie_url: values.businessType === 'individual' ? uploadedUrl : null,
          certificate_url: values.businessType === 'registered' ? uploadedUrl : null,
        });

        if (bizError) throw bizError;
      }

      toast({
        title: "Registration Successful",
        description: "Account created! Please check your email to verify.",
      });
      router.push('/login');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: error.message || "An error occurred during signup.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-lg border-2 shadow-xl overflow-hidden">
        <div className="bg-primary h-2 w-full" />
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="bg-primary p-3 rounded-2xl shadow-lg">
              <ShieldCheck className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Join the Marketplace</CardTitle>
          <CardDescription>Secure registrations for car wash services.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {step === 1 ? (
                <>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>I want to...</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="grid grid-cols-2 gap-4"
                            >
                              <div>
                                <RadioGroupItem value="customer" id="customer" className="peer sr-only" />
                                <Label
                                  htmlFor="customer"
                                  className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                                >
                                  <User className="mb-3 h-6 w-6" />
                                  <span className="text-sm font-bold">Book a Wash</span>
                                </Label>
                              </div>
                              <div>
                                <RadioGroupItem value="business-owner" id="business" className="peer sr-only" />
                                <Label
                                  htmlFor="business"
                                  className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                                >
                                  <Store className="mb-3 h-6 w-6" />
                                  <span className="text-sm font-bold">Offer Services</span>
                                </Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-4">
                      <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl><Input placeholder="you@example.com" {...field} /></FormControl>
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
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-12 text-lg shadow-md" disabled={loading}>
                    {role === 'customer' ? 'Create Account' : 'Next: Business Details'}
                  </Button>
                </>
              ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center gap-2 text-sm font-bold text-primary">
                    <Button variant="ghost" size="sm" className="h-8 p-0 hover:bg-transparent" onClick={() => setStep(1)}>← Back</Button>
                    <span>Verification Details</span>
                  </div>

                  <FormField
                    control={form.control}
                    name="businessType"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Business Legal Structure</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="grid grid-cols-2 gap-4"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="individual" id="r1" />
                              <Label htmlFor="r1" className="text-xs font-bold cursor-pointer">Individual / Micro</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="registered" id="r2" />
                              <Label htmlFor="r2" className="text-xs font-bold cursor-pointer">Registered (CIPA)</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4">
                    <FormField
                      control={form.control}
                      name="businessName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Trading Name (Optional)</FormLabel>
                          <FormControl><Input placeholder="Sparkle Wash Gabs" {...field} /></FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number (Required)</FormLabel>
                          <FormControl><Input placeholder="26771234567" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="idNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{businessType === 'individual' ? 'Omang / ID Number' : 'CIPA Registration Number'}</FormLabel>
                          <FormControl><Input placeholder="ID Number" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>{businessType === 'individual' ? 'Verification Selfie' : 'Registration Certificate'}</Label>
                    <div 
                      className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {filePreview ? (
                        <div className="relative h-32 w-32 rounded-lg overflow-hidden shadow-lg border-2 border-white">
                          <Image src={filePreview} alt="Preview" fill className="object-cover" />
                        </div>
                      ) : file ? (
                        <div className="flex items-center gap-2 text-primary font-bold">
                          <FileText className="h-8 w-8" />
                          <span className="text-xs truncate max-w-[150px]">{file.name}</span>
                        </div>
                      ) : (
                        <>
                          <div className="bg-primary/10 p-3 rounded-full">
                            {businessType === 'individual' ? <Camera className="h-6 w-6 text-primary" /> : <Upload className="h-6 w-6 text-primary" />}
                          </div>
                          <p className="text-xs font-bold text-center text-muted-foreground leading-relaxed">
                            Click to upload {businessType === 'individual' ? 'clear selfie with ID' : 'CIPA document'}<br />
                            <span className="font-normal opacity-60">PNG, JPG or PDF up to 5MB</span>
                          </p>
                        </>
                      )}
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept={businessType === 'individual' ? "image/*" : ".pdf,image/*"} onChange={handleFileChange} />
                  </div>

                  <Button type="submit" className="w-full h-12 text-lg shadow-xl" disabled={loading}>
                    {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verifying...</> : "Complete Registration"}
                  </Button>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 border-t bg-muted/10 p-6">
          <div className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-bold hover:underline">Log in</Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
