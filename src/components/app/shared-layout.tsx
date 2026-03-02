'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import type { UserRole, User as ProfileUser } from "@/lib/types";
import { Home, LogOut, Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";

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

function AutoLinkLogo() {
    return (
        <Link href="/" className="flex items-center gap-2 px-2 py-4">
            <div className="bg-primary text-primary-foreground font-bold p-1 rounded text-xs">ALM</div>
            <span className="font-bold text-lg group-data-[collapsible=icon]:hidden">AutoLink Africa</span>
        </Link>
    );
}

function UserMenu({ userProfile, loading }: { userProfile: ProfileUser | null, loading: boolean }) {
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
                    <Avatar className="h-8 w-8 border">
                        <AvatarImage src={userProfile.avatarUrl} alt={userProfile.name} />
                        <AvatarFallback className="bg-primary/5 text-primary font-bold">{userProfile.name?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start group-data-[collapsible=icon]:hidden text-left overflow-hidden">
                        <span className="text-sm font-bold truncate w-full flex items-center gap-1.5">
                            {userProfile.name}
                            {userProfile.role === 'admin' && <ShieldCheck className="h-3 w-3 text-primary" />}
                        </span>
                        <span className="text-[10px] text-muted-foreground truncate w-full">{userProfile.email}</span>
                    </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 shadow-2xl border-2 rounded-xl">
                <DropdownMenuLabel className="text-xs uppercase font-bold text-muted-foreground px-3 py-2">Account Management</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => window.location.href = '/'} className="cursor-pointer">
                    <Home className="mr-2 h-4 w-4" />
                    <span>View Public Home</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-bold">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out Session</span>
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

    /**
     * fetchProfile
     * Replaces auth.uid() reliance with explicit UID from established session.
     */
    const fetchProfile = useCallback(async (userId: string) => {
        if (!userId) {
            setLoading(false);
            return;
        }

        try {
            // Using explicit userId to ensure RLS visibility during hydration
            const { data, error } = await supabase
                .from('users_with_access')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (error) {
                console.error("[LAYOUT] Profile error detail:", {
                    message: error.message,
                    details: error.details,
                    code: error.code
                });
                throw error;
            }
            
            if (data) {
                setUserProfile(data as ProfileUser);
            } else {
                console.warn("[LAYOUT] Session valid but profile missing for UID:", userId);
                router.replace('/login');
            }
        } catch (e) {
            console.error("[LAYOUT] Fatal load exception:", e);
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        let isMounted = true;
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session?.user?.id) {
                console.warn("[LAYOUT] No active session found. Redirecting to login.");
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

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
            <Loader2 className="animate-spin h-10 w-10 text-primary" />
            <p className="text-sm text-muted-foreground animate-pulse font-medium">Securing session context...</p>
        </div>
    );

    return (
        <SidebarProvider>
            <Sidebar collapsible="icon" className="border-r shadow-sm">
                <SidebarHeader><AutoLinkLogo /></SidebarHeader>
                <SidebarContent className="p-3">
                    <SidebarMenu>
                        {navItems.map(item => (
                            <SidebarMenuItem key={item.href} className="mb-1">
                                <SidebarMenuButton 
                                    asChild 
                                    isActive={item.active} 
                                    tooltip={item.label}
                                    className={item.active ? "bg-primary/10 text-primary font-bold" : ""}
                                >
                                    <Link href={item.href}>
                                        <item.icon className={item.active ? "text-primary" : "text-muted-foreground"} />
                                        <span>{item.label}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarContent>
                <div className="mt-auto p-3 border-t bg-muted/5">
                    <UserMenu userProfile={userProfile} loading={loading} />
                </div>
            </Sidebar>
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center justify-between px-6 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <SidebarTrigger className="-ml-1" />
                        <h1 className="text-lg font-bold text-slate-900 hidden sm:block">
                            {navItems.find(item => item.active)?.label || 'Dashboard'}
                        </h1>
                    </div>
                    {userProfile?.role === 'admin' && (
                        <Badge className="bg-primary/10 text-primary border-none font-black text-[10px] uppercase px-3 py-1">
                            Platform Administrator
                        </Badge>
                    )}
                </header>
                <main className="flex-1 overflow-auto bg-muted/10">
                   <div className="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto">
                        {children}
                   </div>
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}
