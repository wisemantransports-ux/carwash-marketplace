
'use client';
import SharedLayout from "@/components/app/shared-layout";
import { LayoutDashboard, Car, Users, DollarSign, CreditCard, AlertCircle, Lock, UserCircle, Receipt, Package, Loader2, CheckCircle2, ShieldCheck, RefreshCw } from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";
import { Business } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { usePathname } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [business, setBusiness] = useState<Business | null>(null);
  const [isRestricted, setIsRestricted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const trialTriggered = useRef(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    setIsRestricted(false);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user?.id) {
        setLoading(false);
        return;
      }

      // 1. CHECK USER STATUS FIRST (Prevents recursion by avoiding 'businesses' table if restricted)
      const { data: profile, error: profileError } = await supabase
        .from('users_with_access')
        .select('paid, trial_expiry')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      const now = new Date();
      const isPaid = profile?.paid === true;
      const trialExpiry = profile?.trial_expiry ? new Date(profile.trial_expiry) : null;
      const isTrialValid = trialExpiry ? trialExpiry > now : false;
      
      // Restricted if neither paid nor trial active
      const restricted = !isPaid && !isTrialValid;
      setIsRestricted(restricted);

      // 2. SKIP BUSINESS FETCH IF RESTRICTED
      if (restricted) {
        setBusiness(null);
        setLoading(false);
        return;
      }

      // 3. SAFE FETCH FOR ALLOWED USERS ONLY
      const { data: biz, error: bizError } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();
      
      if (bizError) {
        // If we still hit a policy error, catch it safely
        setFetchError(bizError.message);
        setBusiness(null);
      } else if (biz) {
        const typedBiz = biz as Business;
        
        // UNIFIED AUTO-TRIAL LOGIC for ALL Verified Businesses
        if (
          typedBiz.verification_status === 'verified' && 
          !typedBiz.sub_end_date && 
          typedBiz.subscription_status === 'inactive' &&
          !trialTriggered.current
        ) {
          trialTriggered.current = true;
          const expiry = new Date();
          expiry.setDate(expiry.getDate() + 14);

          try {
            const { error: updateError } = await supabase
              .from('businesses')
              .update({
                subscription_status: 'active',
                subscription_plan: 'Starter',
                sub_end_date: expiry.toISOString()
              })
              .eq('id', typedBiz.id);

            if (!updateError) {
              toast({
                title: "14-Day Trial Activated!",
                description: "Your business is verified and your professional trial has started.",
              });
              setBusiness({
                ...typedBiz,
                subscription_status: 'active',
                subscription_plan: 'Starter',
                sub_end_date: expiry.toISOString()
              });
            } else {
              setBusiness(typedBiz);
            }
          } catch (updateErr) {
            setBusiness(typedBiz);
          }
        } else {
          setBusiness(typedBiz);
        }
      } else {
        setBusiness(null);
      }
    } catch (e: any) {
      console.error("[LAYOUT ERROR] Fatal exception:", e);
      setFetchError(e.message || "An unexpected error occurred while loading your profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Navigation gating
  // User is blocked from most pages if restricted (except Profile and Subscription)
  const isBlocked = isRestricted && pathname !== "/business/subscription" && pathname !== "/business/profile";

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

  // Critical items that must always be accessible
  const criticalNavItems = navItems.filter(item => ["/business/subscription", "/business/profile"].includes(item.href));
  const filteredNavItems = !isRestricted ? navItems : criticalNavItems;

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
      <Loader2 className="animate-spin h-10 w-10 text-primary" />
      <p className="text-sm text-muted-foreground animate-pulse font-medium">Securing your session...</p>
    </div>
  );

  return (
    <SharedLayout navItems={filteredNavItems} role="business-owner">
      <div className="space-y-6">
        {/* Restricted Mode Banner */}
        {isRestricted && (
          <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800 animate-in slide-in-from-top duration-500">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertTitle className="font-bold">Restricted Access Mode</AlertTitle>
            <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2">
              <span>Your account data is currently restricted. Upgrade or extend your trial to access your business dashboard.</span>
              <Button size="sm" variant="outline" className="border-red-200 hover:bg-red-100" asChild>
                <Link href="/business/subscription">View Plans</Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* System Error Notification (RLS or Connection Issues) */}
        {fetchError && !isRestricted && (
          <Alert variant="destructive" className="bg-orange-50 border-orange-200 text-orange-800">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertTitle className="font-bold">System Connection Issue</AlertTitle>
            <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2">
              <span>Database error: {fetchError}. This may be a policy configuration issue.</span>
              <Button size="sm" variant="outline" onClick={() => fetchData()} className="border-orange-200">
                <RefreshCw className="h-3 w-3 mr-2" /> Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Restricted Access Screen (Blocks Page Content) */}
        {isBlocked ? (
          <div className="flex flex-col items-center justify-center py-20 bg-background border rounded-xl shadow-lg space-y-6 text-center px-4 animate-in fade-in zoom-in duration-300">
            <div className="bg-destructive/10 p-4 rounded-full">
              <Lock className="h-12 w-12 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">Dashboard Restricted</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Access to operations, services, and earnings is disabled for inactive accounts. Please select a plan to resume your professional dashboard.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" asChild className="shadow-lg">
                <Link href="/business/subscription">Renew Access Now</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/business/profile">Review My Profile</Link>
              </Button>
              <Button size="lg" variant="ghost" asChild>
                <a href="mailto:support@carwash.bw">Contact Support</a>
              </Button>
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    </SharedLayout>
  );
}
