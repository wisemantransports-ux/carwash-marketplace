
'use client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { User, Shield, Briefcase, ChevronRight } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();

    /**
     * NO-AUTH NOTE:
     * This login page is purely a simulation for prototype navigation.
     * No actual sessions or passwords are used.
     */

    const roles = [
        { 
            id: 'customer', 
            name: 'Customer', 
            desc: 'Find and book car wash services.', 
            icon: User, 
            href: '/customer/home',
            color: 'bg-blue-100 text-blue-600'
        },
        { 
            id: 'business-owner', 
            name: 'Business Owner', 
            desc: 'Manage your car wash operations.', 
            icon: Briefcase, 
            href: '/business/dashboard',
            color: 'bg-purple-100 text-purple-600'
        },
        { 
            id: 'admin', 
            name: 'Platform Admin', 
            desc: 'Global marketplace administration.', 
            icon: Shield, 
            href: '/admin/dashboard',
            color: 'bg-orange-100 text-orange-600'
        },
    ];

    return (
        <div className="flex items-center justify-center min-h-screen bg-muted/30 px-4">
            <div className="w-full max-w-lg space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-extrabold tracking-tight text-primary">Carwash Marketplace</h1>
                    <p className="text-muted-foreground italic">Prototype Environment - Select a Role to Continue</p>
                </div>

                <div className="grid gap-4">
                    {roles.map((role) => (
                        <Card 
                            key={role.id} 
                            className="cursor-pointer hover:border-primary hover:shadow-md transition-all group"
                            onClick={() => router.push(role.href)}
                        >
                            <CardContent className="p-6 flex items-center gap-6">
                                <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${role.color}`}>
                                    <role.icon className="h-6 w-6" />
                                </div>
                                <div className="flex-1">
                                    <CardTitle className="text-xl">{role.name}</CardTitle>
                                    <CardDescription>{role.desc}</CardDescription>
                                </div>
                                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                    <p className="text-xs text-center text-muted-foreground leading-relaxed">
                        <strong>Developer Note:</strong> Real authentication is intentionally excluded from this prototype. 
                        In a production build, this step would be handled by <strong>Supabase Auth</strong>.
                    </p>
                </div>
            </div>
        </div>
    );
}
