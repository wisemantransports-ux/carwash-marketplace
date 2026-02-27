
'use client';
import { supabase } from "@/lib/supabase";
import type { Service, Business } from "@/lib/types";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, Loader2, AlertCircle, Trash2, MapPin, Store } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default function ServicesManagementPage() {
    const [services, setServices] = useState<Service[]>([]);
    const [business, setBusiness] = useState<Business | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }

            // 1. Fetch freshest business data
            const { data: biz, error: bizError } = await supabase
                .from('businesses')
                .select('*')
                .eq('owner_id', user.id)
                .maybeSingle();
            
            if (bizError) throw bizError;

            if (!biz) {
                setLoading(false);
                return;
            }

            setBusiness(biz as Business);

            // 2. Access Gate
            const isVerified = biz.verification_status === 'verified';
            const isActive = biz.subscription_status === 'active';
            
            if (isVerified && isActive) {
                const { data: svcs, error: servicesError } = await supabase
                    .from('services')
                    .select('*')
                    .eq('business_id', biz.id)
                    .order('created_at', { ascending: false });

                if (servicesError) throw servicesError;
                setServices(svcs || []);
            }

        } catch (e: any) {
            console.error("Service catalog load error:", e.message);
            toast({ 
                variant: 'destructive', 
                title: 'Load Error', 
                description: 'Unable to load catalog. Check your connection.' 
            });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleDelete = async (id: string) => {
        try {
            const { error } = await supabase
                .from('services')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setServices(prev => prev.filter(s => s.id !== id));
            toast({ title: 'Service Removed' });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: 'Could not remove the service.' });
        }
    };

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

    const isVerified = business?.verification_status === 'verified';
    const isActive = business?.subscription_status === 'active';
    const isAccessLocked = !isVerified || !isActive;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold">Services Catalog</h1>
                    <p className="text-muted-foreground">Manage your car wash packages and public pricing.</p>
                </div>
                {!isAccessLocked && (
                    <Button asChild className="shadow-md">
                        <Link href="/business/add-service">
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Package
                        </Link>
                    </Button>
                )}
            </div>

            {isAccessLocked && (
                <Alert variant="destructive" className="bg-destructive/5 border-destructive/20 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Catalog Locked</AlertTitle>
                    <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2">
                        <span>
                            {!isVerified
                                ? "Verification pending. Your account is under review." 
                                : "Your professional features are currently paused. Please renew your plan."}
                        </span>
                        {isVerified && !isActive && (
                            <Button size="sm" variant="outline" asChild className="border-destructive/20">
                                <Link href="/business/subscription">Manage Billing</Link>
                            </Button>
                        )}
                    </AlertDescription>
                </Alert>
            )}

            <Card className={cn("overflow-hidden shadow-lg", isAccessLocked && "opacity-60 pointer-events-none select-none")}>
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead className="font-bold">Service Package</TableHead>
                            <TableHead className="font-bold">Model</TableHead>
                            <TableHead className="font-bold">Price</TableHead>
                            <TableHead className="text-right font-bold pr-6">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {services.length > 0 ? (
                            services.map(service => (
                                <TableRow key={service.id} className="hover:bg-muted/30 transition-colors">
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-primary">{service.name}</span>
                                            <span className="text-xs text-muted-foreground line-clamp-1 max-w-xs">{service.description || 'No description provided'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="text-[10px] uppercase font-bold gap-1 px-2">
                                            {service.type === 'mobile' ? <MapPin className="h-3 w-3" /> : <Store className="h-3 w-3" />}
                                            {service.type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-mono font-bold text-sm">
                                        P{Number(service.price).toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48 shadow-xl border-2">
                                                <DropdownMenuItem onClick={() => handleDelete(service.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer font-bold">
                                                    <Trash2 className="h-4 w-4 mr-2" /> Delete Service
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-48 text-center text-muted-foreground italic">
                                    {isAccessLocked ? "Service management is locked." : "Your catalog is empty. Add your first service package to go live."}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
