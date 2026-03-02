
'use client';
import SharedLayout from "@/components/app/shared-layout";
import { LayoutDashboard, Car, Users, DollarSign, CreditCard, AlertCircle, Lock, UserCircle, Receipt, Package, Loader2, RefreshCw, CarFront, MapPin } from "lucide-react";
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

      // 1. STATUS CHECK
      const { data: profile, error: profileError } = await supabase
        .from('users_with_access')
        .select('paid, trial_expiry')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        setFetchError(profileError.message);
        setLoading(false);
        return;
      }

      const now = new Date();
      const isPaid = profile?.paid === true;
      const trialExpiry = profile?.trial_expiry ? new Date(profile.trial_expiry) : null;
      const isTrialValid = trialExpiry ? trialExpiry > now : false;
      
      const restricted = !isPaid && !isTrialValid;
      setIsRestricted(restricted);

      if (restricted) {
        setBusiness(null);
        setLoading(false);
        return;
      }

      // 2. FETCH BUSINESS DATA
      const { data: biz, error: bizError } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();
      
      if (bizError) {
        setFetchError(bizError.message);
        setBusiness(null);
      } else if (biz) {
        setBusiness(biz as Business);
      } else {
        setBusiness(null);
      }
    } catch (e: any) {
      setFetchError(e.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isBlocked = isRestricted && pathname !== "/business/subscription" && pathname !== "/business/profile";

  const navItems = [
    { href: "/business/dashboard", label: "Operations", icon: LayoutDashboard },
    { href: "/business/locations", label: "Branch Locations", icon: MapPin },
    { href: "/business/services", label: "Services", icon: Car },
    { href: "/business/cars", label: "Car Sales", icon: CarFront },
    { href: "/business/spare-shop", label: "Spare Shop", icon: Package },
    { href: "/business/invoices", label: "Invoices", icon: Receipt },
    { href: "/business/employees", label: "Employees", icon: Users },
    { href: "/business/earnings", label: "Earnings", icon: DollarSign },
    { href: "/business/subscription", label: "Subscription", icon: CreditCard },
    { href: "/business/profile", label: "Profile", icon: UserCircle },
  ];

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
        {isRestricted && (
          <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800">
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

        {isBlocked ? (
          <div className="flex flex-col items-center justify-center py-20 bg-background border rounded-xl shadow-lg space-y-6 text-center px-4 animate-in fade-in zoom-in duration-300">
            <div className="bg-destructive/10 p-4 rounded-full">
              <Lock className="h-12 w-12 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">Dashboard Restricted</h2>
              <p className="text-muted-foreground max-md mx-auto">
                Access to operations, services, and earnings is disabled for inactive accounts. Please select a plan to resume your professional dashboard.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" asChild className="shadow-lg">
                <Link href="/business/subscription">Renew Access Now</Link>
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
