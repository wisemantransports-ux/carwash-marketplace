'use client';
import SharedLayout from "@/components/app/shared-layout";
import { LayoutDashboard, Car, Users, DollarSign, CreditCard, AlertCircle, Lock, UserCircle, Receipt, Package, Loader2, MapPin, CarFront, Droplets } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { Business } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { usePathname } from "next/navigation";

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [business, setBusiness] = useState<Business | null>(null);
  const [isRestricted, setIsRestricted] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Status Check
      const { data: profile } = await supabase
        .from('users')
        .select('paid, trial_expiry')
        .eq('id', user.id)
        .maybeSingle();

      const now = new Date();
      const isPaid = profile?.paid === true;
      const trialExpiry = profile?.trial_expiry ? new Date(profile.trial_expiry) : null;
      const isTrialValid = trialExpiry ? trialExpiry > now : false;
      
      const restricted = !isPaid && !isTrialValid;
      setIsRestricted(restricted);

      // 2. Fetch Business Data
      const { data: biz } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();
      
      if (biz) setBusiness(biz as Business);
    } catch (e) {
      console.error("Layout fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Block sensitive pages if restricted
  const isBlocked = isRestricted && !["/business/subscription", "/business/profile"].includes(pathname);

  const navItems = [
    { href: "/business/dashboard", label: "Operations", icon: LayoutDashboard },
    { href: "/business/locations", label: "Branches", icon: MapPin },
    { href: "/business/services", label: "Services", icon: Droplets },
    { href: "/business/cars", label: "Inventory", icon: CarFront },
    { href: "/business/spare-shop", label: "Retail", icon: Package },
    { href: "/business/invoices", label: "Billing", icon: Receipt },
    { href: "/business/employees", label: "Team", icon: Users },
    { href: "/business/earnings", label: "Revenue", icon: DollarSign },
    { href: "/business/subscription", label: "Growth Plan", icon: CreditCard },
    { href: "/business/profile", label: "Credentials", icon: UserCircle },
  ];

  const filteredNavItems = !isRestricted 
    ? navItems 
    : navItems.filter(item => ["/business/subscription", "/business/profile"].includes(item.href));

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
      <Loader2 className="animate-spin h-10 w-10 text-primary" />
      <p className="text-sm text-muted-foreground animate-pulse font-medium tracking-widest uppercase">ALM Partner Session</p>
    </div>
  );

  return (
    <SharedLayout navItems={filteredNavItems} role="business-owner">
      <div className="space-y-6">
        {isRestricted && (
          <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertTitle className="font-bold">Subscription Required</AlertTitle>
            <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2">
              <span>Your access to professional tools has expired. Upgrade your plan to resume operations.</span>
              <Button size="sm" variant="outline" className="border-red-200 hover:bg-red-100" asChild>
                <Link href="/business/subscription">Select Plan</Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {isBlocked ? (
          <div className="flex flex-col items-center justify-center py-20 bg-background border rounded-2xl shadow-lg space-y-6 text-center px-4">
            <div className="bg-destructive/10 p-6 rounded-full">
              <Lock className="h-12 w-12 text-destructive" />
            </div>
            <div className="space-y-2 max-w-md">
              <h2 className="text-3xl font-black uppercase italic tracking-tight">Dashboard Restricted</h2>
              <p className="text-muted-foreground font-medium">
                Operations, inventory, and revenue tracking are locked. Upgrade to an active tier to unlock these features.
              </p>
            </div>
            <Button size="lg" asChild className="shadow-xl rounded-full px-8">
              <Link href="/business/subscription">Activate Now</Link>
            </Button>
          </div>
        ) : (
          children
        )}
      </div>
    </SharedLayout>
  );
}
