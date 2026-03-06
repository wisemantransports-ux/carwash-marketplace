'use client';

import { AuthProvider } from "@/hooks/use-auth";
import SharedLayout from "@/components/app/shared-layout";
import { LayoutDashboard, Droplets, Clock, History, Search } from "lucide-react";

export default function CustomerDashboardLayout({ children }: { children: React.ReactNode }) {
  const navItems = [
    { href: "/dashboard/customer", label: "Dashboard Hub", icon: LayoutDashboard },
    { href: "/customer/home", label: "Marketplace", icon: Search },
  ];

  return (
    <AuthProvider>
      <SharedLayout navItems={navItems} role="customer">
        {children}
      </SharedLayout>
    </AuthProvider>
  );
}
