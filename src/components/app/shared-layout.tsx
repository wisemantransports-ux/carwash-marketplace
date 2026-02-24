'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { mockGetCurrentUser } from "@/lib/mock-api";
import type { User, UserRole } from "@/lib/types";
import { Home, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type NavItem = {
    href: string;
    label: string;
    icon: React.ElementType;
    active: boolean;
};

type SharedLayoutProps = {
    children: React.ReactNode;
    navItems: Omit<NavItem, 'active'>[];
    role: UserRole;
};

function CarwashMarketplaceLogo() {
    return (
        <Link href="/" className="flex items-center gap-2 px-2 py-4">
            <div className="bg-primary text-primary-foreground font-bold p-1 rounded text-xs">CWM</div>
            <span className="font-bold text-lg group-data-[collapsible=icon]:hidden">Carwash Marketplace</span>
        </Link>
    );
}

function UserMenu({ user }: { user: User | null }) {
    const router = useRouter();

    if (!user) return null;

    const handleSignOut = async () => {
        try {
            await supabase.auth.signOut();
            router.replace('/login');
        } catch (error) {
            console.error('Error signing out:', error);
            // Fallback to login page even if signout fails
            router.replace('/login');
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 h-auto w-full justify-start p-2 hover:bg-sidebar-accent">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatarUrl} alt={user.name} />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start group-data-[collapsible=icon]:hidden text-left">
                        <span className="text-sm font-medium">{user.name}</span>
                        <span className="text-xs text-muted-foreground truncate w-32">{user.email}</span>
                    </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/')}>
                    <Home className="mr-2 h-4 w-4" />
                    <span>View Landing Page</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default function SharedLayout({ children, navItems: rawNavItems, role }: SharedLayoutProps) {
    const pathname = usePathname();
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            const currentUser = await mockGetCurrentUser(role);
            setUser(currentUser);
        };
        fetchUser();
    }, [role]);

    const navItems: NavItem[] = rawNavItems.map(item => ({
        ...item,
        active: pathname === item.href,
    }));

    return (
        <SidebarProvider>
            <Sidebar collapsible="icon">
                <SidebarHeader>
                    <CarwashMarketplaceLogo />
                </SidebarHeader>
                <SidebarContent className="p-2">
                    <SidebarMenu>
                        {navItems.map(item => (
                            <SidebarMenuItem key={item.href}>
                                <SidebarMenuButton
                                    asChild
                                    isActive={item.active}
                                    tooltip={item.label}
                                >
                                    <Link href={item.href}>
                                        <item.icon />
                                        <span>{item.label}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarContent>
                <div className="mt-auto p-2 border-t border-sidebar-border">
                    <UserMenu user={user} />
                </div>
            </Sidebar>

            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center justify-between px-4 border-b">
                    <div className="flex items-center gap-2">
                        <SidebarTrigger className="-ml-1" />
                        <h1 className="text-xl font-semibold hidden md:block">
                            {navItems.find(item => item.active)?.label || 'Dashboard'}
                        </h1>
                    </div>
                </header>
                <main className="flex-1 overflow-auto">
                   <div className="p-4 md:p-6 lg:p-8">
                    {children}
                   </div>
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}