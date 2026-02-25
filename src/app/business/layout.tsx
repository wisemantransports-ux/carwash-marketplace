
'use client';
import SharedLayout from "@/components/app/shared-layout";
import { LayoutDashboard, Car, Users, DollarSign, CreditCard, AlertCircle, ShieldAlert, Lock, Clock } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { mockGetBusinessById } from "@/lib/mock-api";
import { Business, User as ProfileUser } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { usePathname } from "next/navigation";

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [business, setBusiness] = useState<Business | null>(null);
  const [userProfile, setUserProfile] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user?.id) {
      // Use users_with_access view
      const { data: profile } = await supabase
        .from('users_with_access')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();
      
      setUserProfile(profile as ProfileUser);

      // Fetch business associated with this owner (simplified for demo)
      const { data } = await mockGetBusinessById('biz-2'); 
      setBusiness(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const navItems = [
    { href: "/business/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/business/services", label: "Services", icon: Car },
    { href: "/business/employees", label: "Employees", icon: Users },
    { href: "/business/earnings", label: "Earnings", icon: DollarSign },
    { href: "/business/subscription", label: "Subscription", icon: CreditCard },
  ];

  // Logic to determine if access is blocked based on users_with_access view
  const isBlocked = userProfile?.access_active === false && pathname !== "/business/subscription";
  const trialRemaining = userProfile?.trial_remaining ?? 0;

  return (
    <SharedLayout navItems={navItems} role="business-owner">
      <div className="space-y-6">
        {/* Trial Status Banners */}
        {userProfile?.paid === false && trialRemaining > 0 && (
          <Alert variant="default" className="bg-blue-50 border-blue-200">
            <Clock className="h-4 w-4 text-blue-600" />
            <AlertTitle>Free Trial Active</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-4">
              <span>Your trial ends in {trialRemaining} days. Subscribe anytime to maintain full access and avoid account deletion.</span>
              <Button size="sm" asChild>
                <Link href="/business/subscription">Choose a Plan</Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Expired Blocker */}
        {isBlocked ? (
          <div className="flex flex-col items-center justify-center py-20 bg-background border rounded-xl shadow-lg space-y-6 text-center px-4">
            <div className="bg-destructive/10 p-4 rounded-full">
              <Lock className="h-12 w-12 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">Your trial expired</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Please subscribe to a plan to continue managing your car wash business and accepting bookings. Unpaid accounts with expired trials may be automatically removed.
              </p>
            </div>
            <div className="flex gap-4">
              <Button size="lg" asChild>
                <Link href="/business/subscription">View Pricing Plans</Link>
              </Button>
              <Button size="lg" variant="outline" onClick={() => window.location.reload()}>
                I've Paid
              </Button>
            </div>
          </div>
        ) : (
          <>
            {business && business.subscriptionStatus !== 'active' && business.subscriptionStatus !== 'payment_submitted' && !userProfile?.paid && trialRemaining <= 0 && !isBlocked && (
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Subscription Required</AlertTitle>
                <AlertDescription className="flex items-center justify-between gap-4">
                  <span>Your account is currently inactive. Please subscribe to a plan to start receiving customer bookings.</span>
                  <Button size="sm" variant="destructive" asChild>
                    <Link href="/business/subscription">Renew Now</Link>
                  </Button>
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
