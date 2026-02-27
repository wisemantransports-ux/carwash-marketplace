'use client';
import SharedLayout from "@/components/app/shared-layout";
import { LayoutDashboard, Car, Users, DollarSign, CreditCard, AlertCircle, Clock, Lock, UserCircle, Receipt, Package, Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";
import { Business } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { usePathname } from "next/navigation";
import { toast } from "@/hooks/use-toast";

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const trialTriggered = useRef(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user?.id) {
        const { data: biz, error } = await supabase
          .from('businesses')
          .select('*')
          .eq('owner_id', user.id)
          .maybeSingle();
        
        if (error) {
          console.error("Layout business fetch error:", error.message);
        } else if (biz) {
          const typedBiz = biz as Business;
          setBusiness(typedBiz);

          // AUTO-TRIAL LOGIC for Verified Individual Businesses
          if (
            typedBiz.verification_status === 'verified' && 
            typedBiz.business_type === 'individual' &&
            !typedBiz.sub_end_date && 
            typedBiz.subscription_status === 'inactive' &&
            !trialTriggered.current
          ) {
            trialTriggered.current = true;
            const expiry = new Date();
            expiry.setDate(expiry.getDate() + 14);

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
                description: "Your individual business is verified and your professional trial has started.",
              });
              setBusiness({
                ...typedBiz,
                subscription_status: 'active',
                subscription_plan: 'Starter',
                sub_end_date: expiry.toISOString()
              });
            }
          }
        }
      }
    } catch (e) {
      console.error("Layout session check error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Access Gating Logic
  const now = new Date();
  const expiry = business?.sub_end_date ? new Date(business.sub_end_date) : null;
  const isVerified = business?.verification_status === 'verified';
  const isTrialOrPaid = expiry ? expiry >= now : false;
  const isActive = business?.subscription_status === 'active';
  
  // Registered businesses might unlock features immediately upon verification in some models, 
  // but usually they also need a subscription. We'll follow the prompt logic:
  // For registered: Unlock all if verified.
  const hasAccess = isVerified && (business?.business_type === 'registered' || isActive || isTrialOrPaid);
  const isBlocked = !hasAccess && pathname !== "/business/subscription" && pathname !== "/business/profile";
  
  const daysRemaining = expiry ? Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;

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
        {/* Verification Alert: Pending */}
        {business && business.verification_status === 'pending' && (
          <Alert variant="destructive" className="bg-orange-50 border-orange-200 text-orange-800">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertTitle className="font-bold">Verification Pending</AlertTitle>
            <AlertDescription>
              Your business profile is under review. Some features are restricted until an administrator verifies your identity documents.
            </AlertDescription>
          </Alert>
        )}

        {/* Verification Alert: Rejected */}
        {business && business.verification_status === 'rejected' && (
          <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertTitle className="font-bold">Verification Rejected</AlertTitle>
            <AlertDescription>
              Your registration was not approved. Please review your profile details and documents or contact support.
            </AlertDescription>
          </Alert>
        )}

        {/* Trial Status Banner: Individual */}
        {isVerified && business?.business_type === 'individual' && isTrialOrPaid && (
          <Alert variant="default" className="bg-primary/10 border-primary/20 text-primary">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <AlertTitle className="font-bold">Account Verified</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-4">
              <span>Your business account is verified! {daysRemaining}-day free trial is active.</span>
              <Button size="sm" variant="outline" className="bg-white" asChild>
                <Link href="/business/subscription">Manage Billing</Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Verified Banner: Registered */}
        {isVerified && business?.business_type === 'registered' && (
          <Alert variant="default" className="bg-green-50 border-green-200 text-green-800">
            <ShieldCheck className="h-4 w-4 text-green-600" />
            <AlertTitle className="font-bold">Registered & Verified</AlertTitle>
            <AlertDescription>
              Your registered business is verified! All features unlocked.
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
                {!business 
                  ? "Please set up your business profile to continue."
                  : business.verification_status === 'pending'
                    ? "Your account is awaiting admin verification. Operations and staff management are restricted until review is complete."
                    : "Your professional access has expired. Please choose a plan to reactivate your dashboard."}
              </p>
            </div>
            <div className="flex gap-4">
              {business ? (
                isVerified ? (
                  <Button size="lg" asChild>
                    <Link href="/business/subscription">Renew Access</Link>
                  </Button>
                ) : (
                  <Button size="lg" variant="outline" asChild>
                    <Link href="/business/profile">Review Profile</Link>
                  </Button>
                )
              ) : (
                <Button size="lg" asChild>
                  <Link href="/business/profile">Set Up Profile</Link>
                </Button>
              )}
            </div>
          </div>
        ) : (
          <>
            {isVerified && !isTrialOrPaid && !isActive && business?.business_type === 'individual' && pathname === "/business/subscription" && (
              <Alert variant="destructive" className="border-red-200 bg-red-50 mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Access Expired</AlertTitle>
                <AlertDescription>
                  Your operations are currently paused. Select a plan below to resume receiving bookings and managing your team.
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
