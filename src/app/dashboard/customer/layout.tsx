'use client';

import React from "react";
import { AuthProvider } from "@/hooks/use-auth";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Clock, History, User, LogOut, Droplets } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";

/**
 * @fileOverview Marketplace Customer Layout
 * Mobile-first navigation focused on the booking lifecycle.
 */

function CustomerNav() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const navItems = [
    { href: "/dashboard/customer", label: "Home", icon: Home },
    { href: "/dashboard/customer/book", label: "Book Wash", icon: Droplets },
    { href: "/dashboard/customer/bookings", label: "My Bookings", icon: Clock },
    { href: "/dashboard/customer/history", label: "History", icon: History },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 hidden h-screen w-64 border-r bg-white lg:flex flex-col p-6 z-50">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="bg-primary text-white font-black p-1.5 rounded-lg text-xs shadow-lg">ALM</div>
          <span className="font-black text-xl tracking-tight uppercase italic">AutoLink</span>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all",
                pathname === item.href 
                  ? "bg-primary text-white shadow-lg shadow-primary/20" 
                  : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="pt-6 border-t space-y-4">
          <div className="flex items-center gap-3 px-2">
            <Avatar className="h-10 w-10 border-2 border-primary/10">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="font-bold bg-slate-100">{user?.user_metadata?.name?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate">{user?.user_metadata?.name || 'Customer'}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start text-destructive font-bold hover:bg-red-50 hover:text-destructive" onClick={() => signOut()}>
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white border-t flex items-center justify-around px-4 lg:hidden z-50 pb-safe">
        {navItems.map((item) => (
          <Link 
            key={item.href} 
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 transition-colors",
              pathname === item.href ? "text-primary" : "text-slate-400"
            )}
          >
            <item.icon className="h-6 w-6" />
            <span className="text-[10px] font-black uppercase tracking-tighter">{item.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}

export default function CustomerDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-slate-50">
        <CustomerNav />
        <main className="lg:ml-64 p-4 md:p-8 pb-24 lg:pb-8">
          <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
            {children}
          </div>
        </main>
      </div>
    </AuthProvider>
  );
}
