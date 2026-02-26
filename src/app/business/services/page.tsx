'use client';
import { supabase } from "@/lib/supabase";
import type { Service, Business } from "@/lib/types";
import { useEffect, useState } from "react";
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

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.user) {
                    setLoading(false);
                    return;
                }

                // 1. Fetch Business Profile using owner_id = auth.uid()
                const { data: biz, error: bizError } = await supabase
                    .from('businesses')
                    .select('*')
                    .eq('owner_id', session.user.id)
                    .maybeSingle();
                
                if (bizError) {
                    console.error("Business fetch error details:", bizError);
                    throw bizError;
                }

                if (biz) {
                    setBusiness(biz as Business);
                    
                    // 2. Fetch Services for this business using the correct foreign key business_id
                    const { data, error: servicesError } = await supabase
                        .from('services')
                        .select('*')
                        .eq('business_id', biz.id)
                        .order('created_at', { ascending: false });

                    if (servicesError) {
                        console.error("Services fetch error details:", servicesError);
                        throw servicesError;
                    }
                    if (data) {
                        setServices(data as Service[]);
                    }
                } else {
                    console.warn("No business profile found for this authenticated user.");
                }
            } catch (e: any) {
                // Improved error logging to capture full context
                console.error("Detailed Fetch Error:", e?.message || e, e);
                toast({ 
                    variant: 'destructive', 
                    title: 'Fetch Error', 
                    description: e?.message || 'Could not load your services catalog. Please ensure your profile is set up and verified.' 
                });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleDelete = async (id: string) => {
        try {
            const { error } = await supabase
                .from('services')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setServices(services.filter(s => s.id !== id));
            toast({ title: 'Service Deleted', description: 'The service has been removed from your catalog.' });
        } catch (e: any) {
            console.error("Delete Error:", e);
            toast({ variant: 'destructive', title: 'Delete Failed', description: e.message });
        }
    }

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

    // Access Logic: Check verified status and subscription/trial
    const now = new Date();
    const subEndDate = business?.sub_end_date ? new Date(business.sub_end_date) : null;
    const isTrialActive = subEndDate ? subEndDate > now : false;
    const isPaid = business?.subscriptionStatus === 'active';
    const isVerified = business?.status === 'verified';
    
    const isAccessLocked = !isVerified || (!isPaid && !isTrialActive);

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
                            {!isVerified 
                                ? "Your account is awaiting admin verification. Access will be granted once verified." 
                                : "Your trial has ended. Please submit payment to continue managing services."}
                        </span>
                        {isVerified && (
                            <Button size="sm" variant="outline" asChild className="border-destructive/20 hover:bg-destructive/10">
                                <Link href="/business/subscription">Renew Now</Link>
                            </Button>
                        )}
                    </AlertDescription>
                </Alert>
            )}

            {!business && !loading && (
                <Alert className="bg-orange-50 border-orange-200 text-orange-800">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Profile Incomplete</AlertTitle>
                    <AlertDescription>
                        We couldn't find a business profile linked to your account. Please visit the Profile page to complete your registration.
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
                                        <TableCell className="font-bold">{service.currency_code} {service.price.toFixed(2)}</TableCell>
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
                                        No services found. Click "Add Service" to get started.
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
