'use client';
import SharedLayout from "@/components/app/shared-layout";
import { LayoutDashboard, Users, DollarSign, CreditCard, AlertCircle, Lock, UserCircle, Receipt, Package, Loader2, MapPin, CarFront, Droplets } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { Business } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

/**
 * @fileOverview Business Dashboard Layout
 * Implements high-level subscription gating.
 * Blocks all operations if trial expired and not paid.
 */
export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [isRestricted, setIsRestricted] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // 1. Status Check (RBAC & Subscription)
      const { data: profile } = await supabase
        .from('users')
        .select('paid, trial_expiry, role')
        .eq('id', user.id)
        .maybeSingle();

      const now = new Date();
      const isPaid = profile?.paid === true;
      const trialExpiry = profile?.trial_expiry ? new Date(profile.trial_expiry) : null;
      const isTrialValid = trialExpiry ? trialExpiry > now : false;
      
      const restricted = profile?.role === 'business-owner' && !isPaid && !isTrialValid;
      setIsRestricted(restricted);

      // 2. Fetch Business Record
      const { data: biz } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();
      
      if (biz) setBusiness(biz as Business);
    } catch (e) {
      console.error("[BIZ-LAYOUT] Access check failed:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [authLoading, fetchData]);

  const sensitivePaths = [
    "/business/dashboard", 
    "/business/locations", 
    "/business/services", 
    "/business/cars", 
    "/business/spare-shop", 
    "/business/invoices", 
    "/business/employees", 
    "/business/earnings"
  ];
  const isBlocked = isRestricted && sensitivePaths.includes(pathname);

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

  if (authLoading || loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-4 bg-slate-50">
      <Loader2 className="animate-spin h-10 w-10 text-primary" />
      <p className="text-sm text-muted-foreground animate-pulse font-black tracking-widest uppercase">ALM Partner Gating</p>
    </div>
  );

  return (
    <SharedLayout navItems={filteredNavItems} role="business-owner">
      <div className="space-y-6">
        {isRestricted && (
          <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800 shadow-lg rounded-2xl animate-in slide-in-from-top duration-500">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <AlertTitle className="font-black uppercase tracking-tight text-sm">Action Required: Subscription Expired</AlertTitle>
            <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2">
              <span className="font-medium text-xs">Your professional tools are currently locked. Upgrade to an active tier to resume managing bookings and sales.</span>
              <Button size="sm" variant="destructive" className="font-black text-[10px] uppercase px-6 h-9 rounded-xl shadow-xl" asChild>
                <Link href="/business/subscription">Select Active Tier</Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {isBlocked ? (
          <div className="flex flex-col items-center justify-center py-32 bg-white/50 border-2 border-dashed border-slate-200 rounded-[2.5rem] shadow-2xl space-y-8 text-center px-6 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-500">
            <div className="bg-destructive/10 p-8 rounded-full border-4 border-white shadow-inner">
              <Lock className="h-16 w-16 text-destructive" />
            </div>
            <div className="space-y-3 max-w-md">
              <h2 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">Access Restricted</h2>
              <p className="text-muted-foreground font-bold text-sm leading-relaxed px-4">
                Operations, staff management, and inventory tracking are locked. Choose a growth plan to unlock your partner dashboard.
              </p>
            </div>
            <Button size="lg" asChild className="h-16 shadow-[0_20px_50px_rgba(32,128,223,0.3)] rounded-2xl px-12 font-black text-xl uppercase tracking-tighter">
              <Link href="/business/subscription">Restore Full Access</Link>
            </Button>
          </div>
        ) : (
          children
        )}
      </div>
    </SharedLayout>
  );
}
