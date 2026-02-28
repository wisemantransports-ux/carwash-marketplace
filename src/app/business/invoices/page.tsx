
'use client';

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Receipt, CheckCircle, Mail, User, Car, UserCheck, Calendar, Banknote, Filter, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function BusinessInvoicesPage() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const fetchInvoices = useCallback(async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // Deep relational join to pull the 10 required data points for businesses
            const { data, error } = await supabase
                .from('invoices')
                .select(`
                    id,
                    status,
                    amount,
                    issued_at,
                    customer:users!invoices_customer_id_fkey ( name, email ),
                    booking:booking_id (
                        service:services ( name, price ),
                        car:cars ( make, model ),
                        staff:employees ( name )
                    )
                `)
                .eq('business_id', session.user.id)
                .order('issued_at', { ascending: false });

            if (error) throw error;
            setInvoices(data || []);
        } catch (e: any) {
            console.error("Business invoice load error:", e);
            toast({ variant: 'destructive', title: 'Load Error', description: 'Could not retrieve billing records.' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setMounted(true);
        fetchInvoices();
    }, [fetchInvoices]);

    const handleMarkPaid = async (invoiceId: string) => {
        setUpdatingId(invoiceId);
        try {
            const { error } = await supabase
                .from('invoices')
                .update({ status: 'paid' })
                .eq('id', invoiceId);

            if (error) throw error;

            setInvoices(prev => prev.map(inv => 
                inv.id === invoiceId ? { ...inv, status: 'paid' } : inv
            ));

            toast({ 
                title: "Payment Confirmed ✅", 
                description: "Invoice status updated to PAID." 
            });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Update Failed", description: e.message });
        } finally {
            setUpdatingId(null);
        }
    };

    if (!mounted) return (
        <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
            <Loader2 className="animate-spin h-10 w-10 text-primary" />
            <p className="text-muted-foreground animate-pulse font-medium">Loading financial records...</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-extrabold tracking-tight text-primary">Invoices & Payments</h1>
                    <p className="text-muted-foreground text-lg font-medium">Verify manual payments and manage client accounts.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => fetchInvoices()} className="rounded-full h-10 px-6 border-primary/20">
                    <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} /> Refresh Records
                </Button>
            </div>

            <Card className="shadow-2xl border-muted/50 overflow-hidden rounded-2xl">
                <CardHeader className="bg-muted/10 border-b flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-lg">Issued Invoices</CardTitle>
                        <CardDescription>Manage and verify billing records for your wash services.</CardDescription>
                    </div>
                    <Badge className="bg-primary text-white font-black px-4 py-1.5 rounded-full uppercase text-[10px]">
                        {invoices.length} Total
                    </Badge>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/30 border-b-2">
                                    <TableHead className="font-bold py-4 pl-6">Invoice #</TableHead>
                                    <TableHead className="font-bold">Customer Details</TableHead>
                                    <TableHead className="font-bold">Service & Vehicle</TableHead>
                                    <TableHead className="font-bold">Staff</TableHead>
                                    <TableHead className="font-bold">Date</TableHead>
                                    <TableHead className="font-bold">Amount</TableHead>
                                    <TableHead className="font-bold text-center">Status</TableHead>
                                    <TableHead className="text-right pr-6 font-bold">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({length: 3}).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell colSpan={8} className="h-20 text-center">
                                                <Loader2 className="animate-spin h-5 w-5 mx-auto text-primary opacity-20" />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : invoices.length > 0 ? (
                                    invoices.map(inv => {
                                        const customerName = inv.customer?.name || "N/A";
                                        const customerEmail = inv.customer?.email || "N/A";
                                        const serviceName = inv.booking?.service?.name || "N/A";
                                        const carDetails = inv.booking?.car ? `${inv.booking.car.make} ${inv.booking.car.model}` : "N/A";
                                        const staffName = inv.booking?.staff?.name || "N/A";
                                        const dateStr = inv.issued_at ? new Date(inv.issued_at).toLocaleDateString() : "N/A";

                                        return (
                                            <TableRow key={inv.id} className="hover:bg-muted/10 transition-colors border-b group">
                                                <TableCell className="font-mono text-[10px] font-black uppercase pl-6 py-5">
                                                    #{inv.id.slice(-8)}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold flex items-center gap-1.5"><User className="h-3 w-3 opacity-40" /> {customerName}</span>
                                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1.5"><Mail className="h-3 w-3 opacity-40" /> {customerEmail}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-primary">{serviceName}</span>
                                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                                                            <Car className="h-2.5 w-2.5" /> {carDetails}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <UserCheck className="h-3 w-3 opacity-40 text-primary" />
                                                        {staffName}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-[11px] font-bold text-muted-foreground">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="h-3 w-3" />
                                                        {dateStr}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-black text-sm text-primary">
                                                    P{Number(inv.amount || 0).toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge 
                                                        variant={inv.status === 'paid' ? 'secondary' : 'outline'}
                                                        className={cn(
                                                            "text-[10px] uppercase font-black px-3 py-1",
                                                            inv.status === 'paid' ? "bg-green-100 text-green-800" : "text-orange-600 border-orange-200"
                                                        )}
                                                    >
                                                        {inv.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    {inv.status === 'pending' || inv.status === 'issued' ? (
                                                        <Button 
                                                            size="sm" 
                                                            className="h-8 text-[10px] font-black uppercase bg-green-600 hover:bg-green-700 shadow-md"
                                                            onClick={() => handleMarkPaid(inv.id)}
                                                            disabled={updatingId === inv.id}
                                                        >
                                                            {updatingId === inv.id ? <Loader2 className="animate-spin h-3 w-3 mr-1" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                                                            Mark Paid
                                                        </Button>
                                                    ) : (
                                                        <Badge variant="ghost" className="text-[10px] font-bold opacity-40">
                                                            <CheckCircle className="h-3 w-3 mr-1" /> Verified
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-72 text-center">
                                            <div className="flex flex-col items-center justify-center gap-4 opacity-40">
                                                <div className="bg-muted p-8 rounded-full border-2 border-dashed">
                                                    <Receipt className="h-12 w-12" />
                                                </div>
                                                <p className="text-lg font-bold">No invoices available.</p>
                                                <p className="text-sm max-w-xs mx-auto italic">Accept a booking request to generate your first invoice record.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
