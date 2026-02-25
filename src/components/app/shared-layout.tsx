'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import type { UserRole, User as ProfileUser } from "@/lib/types";
import { Home, LogOut, Loader2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
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

function UserMenu({ userProfile, loading }: { userProfile: ProfileUser | null, loading: boolean }) {
    const router = useRouter();

    const handleSignOut = async () => {
        try {
            await supabase.auth.signOut();
            window.location.href = '/login';
        } catch (error) {
            console.error('Error signing out:', error);
            window.location.href = '/login';
        }
    };

    if (loading) return <div className="flex justify-center p-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>;
    if (!userProfile) return null;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 h-auto w-full justify-start p-2 hover:bg-sidebar-accent">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={userProfile.avatarUrl} alt={userProfile.name} />
                        <AvatarFallback>{userProfile.name?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start group-data-[collapsible=icon]:hidden text-left overflow-hidden">
                        <span className="text-sm font-medium truncate w-full">{userProfile.name}</span>
                        <span className="text-[10px] text-muted-foreground truncate w-full">{userProfile.email}</span>
                    </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 shadow-lg border-2">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/')}>
                    <Home className="mr-2 h-4 w-4" />
                    <span>View Landing Page</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default function SharedLayout({ children, navItems: rawNavItems, role }: SharedLayoutProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [userProfile, setUserProfile] = useState<ProfileUser | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = useCallback(async (userId: string) => {
        if (!userId) {
            setLoading(false);
            return;
        }

        const { data, error } = await supabase
            .from('users_with_access')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        if (error) {
            console.error("Profile load error in layout:", error);
        } else if (data) {
            setUserProfile(data as ProfileUser);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        let isMounted = true;
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user?.id) {
                if (isMounted) router.replace('/login');
                return;
            }
            if (isMounted) await fetchProfile(session.user.id);
        };
        checkSession();
        return () => { isMounted = false; };
    }, [router, fetchProfile]);

    const navItems: NavItem[] = rawNavItems.map(item => ({
        ...item,
        active: pathname === item.href,
    }));

    return (
        <SidebarProvider>
            <Sidebar collapsible="icon">
                <SidebarHeader><CarwashMarketplaceLogo /></SidebarHeader>
                <SidebarContent className="p-2">
                    <SidebarMenu>
                        {navItems.map(item => (
                            <SidebarMenuItem key={item.href}>
                                <SidebarMenuButton asChild isActive={item.active} tooltip={item.label}>
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
                    <UserMenu userProfile={userProfile} loading={loading} />
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
                <main className="flex-1 overflow-auto bg-muted/10">
                   <div className="p-4 md:p-6 lg:p-8">{children}</div>
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}
