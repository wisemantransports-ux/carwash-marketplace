'use client';
import { supabase } from "@/lib/supabase";
import type { Service, Business } from "@/lib/types";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, Loader2, AlertCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export default function ServicesManagementPage() {
    const [services, setServices] = useState<Service[]>([]);
    const [business, setBusiness] = useState<Business | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                setLoading(false);
                return;
            }

            // Fetch Fresh Business Data
            const { data: biz, error: bizError } = await supabase
                .from('businesses')
                .select('*')
                .eq('owner_id', session.user.id)
                .maybeSingle();
            
            if (bizError) throw bizError;

            if (!biz) {
                setLoading(false);
                return;
            }

            setBusiness(biz as Business);

            // Access Check Logic (Verified AND (Active OR Trial))
            const isVerified = biz.verification_status === 'verified';
            const now = new Date();
            const expiry = biz.sub_end_date ? new Date(biz.sub_end_date) : null;
            const isTrialActive = expiry && expiry >= now;
            const isActive = biz.subscription_status === 'active';
            
            const hasAccess = isVerified && (isActive || isTrialActive);

            if (hasAccess) {
                const { data: svcs, error: servicesError } = await supabase
                    .from('services')
                    .select('*')
                    .eq('business_id', biz.id);

                if (servicesError) throw servicesError;
                setServices(svcs || []);
            }

        } catch (e: any) {
            console.error("General fetch error:", e);
            toast({ 
                variant: 'destructive', 
                title: 'Load Error', 
                description: 'Unable to load services catalog.' 
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
            toast({ title: 'Service Deleted', description: 'The service has been removed.' });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: 'Could not remove the service.' });
        }
    };

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

    const isVerified = business?.verification_status === 'verified';
    const now = new Date();
    const expiry = business?.sub_end_date ? new Date(business.sub_end_date) : null;
    const isTrialActive = expiry && expiry >= now;
    const isActive = business?.subscription_status === 'active';
    
    const isAccessLocked = !isVerified || (!isActive && !isTrialActive);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Services Catalog</h1>
                    <p className="text-muted-foreground">Manage your car wash packages and pricing.</p>
                </div>
                {!isAccessLocked && (
                    <Button asChild className="shadow-md">
                        <Link href="/business/add-service">
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Service
                        </Link>
                    </Button>
                )}
            </div>

            {isAccessLocked && (
                <Alert variant="destructive" className="bg-destructive/5 border-destructive/20 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Action Required</AlertTitle>
                    <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <span>
                            {business?.verification_status === 'pending'
                                ? "Your business verification is pending. Access will be granted once documents are verified." 
                                : "Your professional access has expired. Please choose a plan to continue."}
                        </span>
                        {isVerified && !isActive && !isTrialActive && (
                            <Button size="sm" variant="outline" asChild className="border-destructive/20 hover:bg-destructive/10">
                                <Link href="/business/subscription">Renew Now</Link>
                            </Button>
                        )}
                    </AlertDescription>
                </Alert>
            )}

            <Card className={cn("overflow-hidden", isAccessLocked && "opacity-60 pointer-events-none")}>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead>Service Name</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Duration</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {services.length > 0 ? (
                                services.map(service => (
                                    <TableRow key={service.id} className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="font-bold text-primary">{service.name}</TableCell>
                                        <TableCell className="text-muted-foreground max-w-xs truncate">{service.description}</TableCell>
                                        <TableCell>{service.duration} min</TableCell>
                                        <TableCell className="font-bold">{service.currency_code} {Number(service.price).toFixed(2)}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48 shadow-lg border-2">
                                                    <DropdownMenuItem onClick={() => handleDelete(service.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                                        Remove Service
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-48 text-center text-muted-foreground italic">
                                        {isAccessLocked ? "Service management is locked." : "No services yet. Add your first service package above."}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
