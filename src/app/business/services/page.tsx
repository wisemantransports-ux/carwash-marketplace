'use client';
import { supabase } from "@/lib/supabase";
import type { Service, Business } from "@/lib/types";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, Loader2, AlertCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ServicesManagementPage() {
    const [services, setServices] = useState<Service[]>([]);
    const [business, setBusiness] = useState<Business | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.user) return;

                // 1. Fetch Business ID
                const { data: biz } = await supabase
                    .from('businesses')
                    .select('*')
                    .eq('owner_id', session.user.id)
                    .maybeSingle();
                
                if (biz) {
                    setBusiness(biz as Business);
                    
                    // 2. Fetch Services for this business
                    const { data, error } = await supabase
                        .from('services')
                        .select('*')
                        .eq('business_id', biz.id)
                        .order('created_at', { ascending: false });

                    if (error) throw error;
                    if (data) setServices(data as Service[]);
                }
            } catch (e: any) {
                console.error("Error fetching services:", e);
                toast({ variant: 'destructive', title: 'Fetch Error', description: 'Could not load your services catalog.' });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleDelete = async (id: string) => {
        const { error } = await supabase
            .from('services')
            .delete()
            .eq('id', id);

        if (error) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
        } else {
            setServices(services.filter(s => (s as any).id !== id));
            toast({ title: 'Service Deleted', description: 'The service has been removed from your catalog.' });
        }
    }

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

    const isAccessLocked = business?.status !== 'verified' || 
        (business?.subscriptionStatus !== 'active' && business?.subscriptionStatus !== 'payment_submitted' && new Date(business?.sub_end_date || '') < new Date());

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Services Catalog</h1>
                    <p className="text-muted-foreground">Manage your car wash packages and pricing.</p>
                </div>
                {!isAccessLocked && (
                    <Button asChild shadow-md>
                        <Link href="/business/add-service">
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Service
                        </Link>
                    </Button>
                )}
            </div>

            {isAccessLocked && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Action Required</AlertTitle>
                    <AlertDescription className="flex items-center justify-between gap-4">
                        <span>Your trial has ended or your account is not verified. Please submit payment to continue managing services.</span>
                        <Button size="sm" variant="outline" asChild>
                            <Link href="/business/subscription">Renew Now</Link>
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            <Card className={cn(isAccessLocked && "opacity-50 pointer-events-none")}>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
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
                                    <TableRow key={(service as any).id}>
                                        <TableCell className="font-medium">{service.name}</TableCell>
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
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleDelete((service as any).id)} className="text-destructive">Remove Service</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        No services found. Click &quot;Add Service&quot; to get started.
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
