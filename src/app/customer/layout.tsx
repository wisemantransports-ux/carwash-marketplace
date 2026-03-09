
'use client';
import SharedLayout from "@/components/app/shared-layout";
import { Car, Clock, Search, Receipt, LayoutDashboard, Droplets, MessageCircle } from "lucide-react";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const navItems = [
    { href: "/customer/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/customer/home", label: "Book a Wash", icon: Droplets },
    { href: "/customer/leads", label: "My Inquiries", icon: MessageCircle },
    { href: "/customer/bookings", label: "Activity Tracker", icon: Clock },
    { href: "/customer/invoices", label: "My Invoices", icon: Receipt },
    { href: "/customer/cars", label: "My Cars", icon: Car },
  ];

  return <SharedLayout navItems={navItems} role="customer">{children}</SharedLayout>;
}
