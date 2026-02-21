'use client';
import SharedLayout from "@/components/app/shared-layout";
import { Car, Clock, Search } from "lucide-react";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const navItems = [
    { href: "/customer/home", label: "Find a Wash", icon: Search },
    { href: "/customer/bookings", label: "My Bookings", icon: Clock },
    { href: "/customer/cars", label: "My Cars", icon: Car },
  ];

  return <SharedLayout navItems={navItems} role="customer">{children}</SharedLayout>;
}
