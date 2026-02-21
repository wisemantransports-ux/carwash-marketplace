import SharedLayout from "@/components/app/shared-layout";
import { LayoutDashboard, Car, Users, DollarSign } from "lucide-react";

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  const navItems = [
    { href: "/business/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/business/services", label: "Services", icon: Car },
    { href: "/business/employees", label: "Employees", icon: Users },
    { href: "/business/earnings", label: "Earnings", icon: DollarSign },
  ];

  return <SharedLayout navItems={navItems} role="business-owner">{children}</SharedLayout>;
}
