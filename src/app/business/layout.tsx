
'use client';
import SharedLayout from "@/components/app/shared-layout";
import { LayoutDashboard, Car, Users, DollarSign, CreditCard, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { mockGetBusinessById } from "@/lib/mock-api";
import { Business } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  const [business, setBusiness] = useState<Business | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await mockGetBusinessById('biz-2'); // Pula Mobile Wash
      setBusiness(data);
    };
    fetch();
  }, []);

  const navItems = [
    { href: "/business/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/business/services", label: "Services", icon: Car },
    { href: "/business/employees", label: "Employees", icon: Users },
    { href: "/business/earnings", label: "Earnings", icon: DollarSign },
    { href: "/business/subscription", label: "Subscription", icon: CreditCard },
  ];

  return (
    <SharedLayout navItems={navItems} role="business">
      <div className="space-y-6">
        {business && business.subscriptionStatus !== 'active' && business.subscriptionStatus !== 'payment_submitted' && (
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
      </div>
    </SharedLayout>
  );
}
