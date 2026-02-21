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
        <Link href="/" className="flex items-center gap-2">
            <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-primary"
            >
                <path
                d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z"
                fill="currentColor"
                />
                <path
                d="M12 18C8.69 18 6 15.31 6 12C6 8.69 8.69 6 12 6C15.31 6 18 8.69 18 12C18 15.31 15.31 18 12 18ZM12 8C9.79 8 8 9.79 8 12C8 14.21 9.79 16 12 16C14.21 16 16 14.21 16 12C16 9.79 14.21 8 12 8Z"
                fill="currentColor"
                />
                <path
                d="M12 14C10.9 14 10 13.1 10 12C10 10.9 10.9 10 12 10C13.1 10 14 10.9 14 12C14 13.1 13.1 14 12 14Z"
                fill="currentColor"
                />
            </svg>
            <span className="font-bold text-lg group-data-[collapsible=icon]:hidden">Carwash Marketplace</span>
        </Link>
    );
}

function UserMenu({ user }: { user: User | null }) {
    const router = useRouter();

    if (!user) return null;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 h-auto w-full justify-start p-2">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatarUrl} alt={user.name} />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start group-data-[collapsible=icon]:hidden text-left">
                        <span className="text-sm font-medium">{user.name}</span>
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                    </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/')}>
                    <Home className="mr-2 h-4 w-4" />
                    <span>Switch Role</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/login')}>
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
            <Sidebar>
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
                                    tooltip={{ children: item.label, side: "right" }}
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
                <header className="flex items-center justify-between p-2 border-b md:justify-end">
                    <div className="md:hidden">
                        <SidebarTrigger/>
                    </div>
                     <div className="hidden md:block">
                        <h1 className="text-xl font-semibold">
                            {navItems.find(item => item.active)?.label || 'Dashboard'}
                        </h1>
                    </div>
                    <div className="w-8 md:hidden" />
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