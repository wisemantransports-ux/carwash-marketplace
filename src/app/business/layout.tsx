'use client';
import SharedLayout from "@/components/app/shared-layout";
import { LayoutDashboard, Car, Users, DollarSign, CreditCard, AlertCircle, Clock, Lock, UserCircle, Receipt, Package } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { Business } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user?.id) {
      const { data: biz } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', session.user.id)
        .maybeSingle();
      
      if (biz) {
        setBusiness(biz as Business);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Access Gating Logic
  const now = new Date();
  const expiry = business?.sub_end_date ? new Date(business.sub_end_date) : null;
  const isVerified = business?.status === 'verified';
  const isPaid = business?.subscription_status === 'active';
  const isTrialActive = expiry ? expiry >= now : false;
  
  const hasAccess = isVerified && (isPaid || isTrialActive);
  const isBlocked = !hasAccess && pathname !== "/business/subscription" && pathname !== "/business/profile";
  
  const trialRemaining = expiry ? Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;

  const navItems = [
    { href: "/business/dashboard", label: "Operations", icon: LayoutDashboard },
    { href: "/business/services", label: "Services", icon: Car },
    { href: "/business/spare-shop", label: "Spare Shop", icon: Package },
    { href: "/business/invoices", label: "Invoices", icon: Receipt },
    { href: "/business/employees", label: "Employees", icon: Users },
    { href: "/business/earnings", label: "Earnings", icon: DollarSign },
    { href: "/business/subscription", label: "Subscription", icon: CreditCard },
    { href: "/business/profile", label: "Profile", icon: UserCircle },
  ];

  const filteredNavItems = hasAccess 
    ? navItems 
    : navItems.filter(item => ["/business/subscription", "/business/profile"].includes(item.href));

  if (loading) return <div className="flex justify-center items-center min-h-screen"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

  return (
    <SharedLayout navItems={filteredNavItems} role="business-owner">
      <div className="space-y-6">
        {/* Verification Alert */}
        {business && !isVerified && (
          <Alert variant="destructive" className="bg-orange-50 border-orange-200 text-orange-800">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertTitle>Verification Pending</AlertTitle>
            <AlertDescription>
              Your business profile is currently under review by our administrators. Some features will be available once verified.
            </AlertDescription>
          </Alert>
        )}

        {/* Trial Status Banner */}
        {isVerified && !isPaid && trialRemaining > 0 && (
          <Alert variant="default" className="bg-blue-50 border-blue-200">
            <Clock className="h-4 w-4 text-blue-600" />
            <AlertTitle>Free Trial Active</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-4">
              <span>Your trial ends in {trialRemaining} days. Subscribe anytime to avoid account interruption.</span>
              <Button size="sm" asChild>
                <Link href="/business/subscription">Choose Plan</Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Blocking Screen */}
        {isBlocked ? (
          <div className="flex flex-col items-center justify-center py-20 bg-background border rounded-xl shadow-lg space-y-6 text-center px-4 animate-in fade-in zoom-in duration-300">
            <div className="bg-destructive/10 p-4 rounded-full">
              <Lock className="h-12 w-12 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">Access Restricted</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                {!isVerified 
                  ? "Your account is awaiting admin verification. Please check back later."
                  : "Your trial has ended. Please submit payment to continue managing your services."}
              </p>
            </div>
            <div className="flex gap-4">
              {isVerified ? (
                <Button size="lg" asChild>
                  <Link href="/business/subscription">View Pricing Plans</Link>
                </Button>
              ) : (
                <Button size="lg" variant="outline" asChild>
                  <Link href="/business/profile">Review Profile</Link>
                </Button>
              )}
            </div>
          </div>
        ) : (
          <>
            {isVerified && !isPaid && !isTrialActive && !isBlocked && pathname === "/business/subscription" && (
              <Alert variant="destructive" className="border-red-200 bg-red-50 mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Trial Expired</AlertTitle>
                <AlertDescription>
                  Your access is restricted. Please select a plan and submit payment to reactivate your dashboard.
                </AlertDescription>
              </Alert>
            )}
            {children}
          </>
        )}
      </div>
    </SharedLayout>
  );
}
