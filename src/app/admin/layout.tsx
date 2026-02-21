'use client';
import SharedLayout from "@/components/app/shared-layout";
import { LayoutDashboard, CheckCircle, Percent, Book, ShieldAlert } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const navItems = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/verification", label: "Verification", icon: CheckCircle },
    { href: "/admin/commissions", label: "Commissions", icon: Percent },
    { href: "/admin/audit", label: "Booking Audit", icon: Book },
    { href: "/admin/disputes", label: "Disputes", icon: ShieldAlert },
  ];

  return <SharedLayout navItems={navItems} role="admin">{children}</SharedLayout>;
}
