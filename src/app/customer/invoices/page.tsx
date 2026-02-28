
'use client';

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Receipt, FileText, Store, Car, UserCheck, Calendar, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function CustomerInvoicesPage() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    const fetchInvoices = useCallback(async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // Deep relational join to match the 10 required data points
            const { data, error } = await supabase
                .from('invoices')
                .select(`
                    id,
                    status,
                    amount,
                    issued_at,
                    business:business_id ( name ),
                    booking:booking_id (
                        service:services ( name, price ),
                        car:cars ( make, model ),
                        staff:employees ( name )
                    )
                `)
                .eq('customer_id', session.user.id)
                .order('issued_at', { ascending: false });

            if (error) throw error;
            setInvoices(data || []);
        } catch (e: any) {
            console.error("Invoice fetch error:", e);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load your invoices.' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setMounted(true);
        fetchInvoices();
    }, [fetchInvoices]);

    if (!mounted) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
            <Loader2 className="animate-spin h-8 w-8 text-primary" />
            <p className="text-muted-foreground animate-pulse font-medium">Securing your billing records...</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-extrabold tracking-tight text-primary">My Invoices</h1>
                <p className="text-muted-foreground text-lg">Review your booking bills and digital service receipts.</p>
            </div>

            <Card className="shadow-2xl border-muted/50 overflow-hidden rounded-2xl">
                <CardHeader className="bg-muted/10 border-b">
                    <CardTitle className="text-lg">Service Billing History</CardTitle>
                    <CardDescription>Official digital proof of services rendered to your registered vehicles.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/30 border-b-2">
                                    <TableHead className="font-bold py-4 pl-6">Invoice #</TableHead>
                                    <TableHead className="font-bold">Partner</TableHead>
                                    <TableHead className="font-bold">Service & Vehicle</TableHead>
                                    <TableHead className="font-bold">Staff</TableHead>
                                    <TableHead className="font-bold">Date</TableHead>
                                    <TableHead className="font-bold">Amount</TableHead>
                                    <TableHead className="font-bold">Status</TableHead>
                                    <TableHead className="text-right pr-6 font-bold">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({length: 3}).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell colSpan={8} className="h-16 text-center">
                                                <Loader2 className="animate-spin h-4 w-4 mx-auto text-muted-foreground" />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : invoices.length > 0 ? (
                                    invoices.map(inv => {
                                        const serviceName = inv.booking?.service?.name || "N/A";
                                        const carDetails = inv.booking?.car ? `${inv.booking.car.make} ${inv.booking.car.model}` : "N/A";
                                        const staffName = inv.booking?.staff?.name || "N/A";
                                        const dateStr = inv.issued_at ? new Date(inv.issued_at).toLocaleDateString() : "N/A";

                                        return (
                                            <TableRow key={inv.id} className="hover:bg-muted/10 transition-colors border-b">
                                                <TableCell className="font-mono text-[10px] font-black uppercase pl-6 py-4">
                                                    #{inv.id.slice(-8)}
                                                </TableCell>
                                                <TableCell className="font-bold text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <Store className="h-3 w-3 opacity-40" />
                                                        {inv.business?.name || "Unknown Partner"}
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
                                                <TableCell>
                                                    <Badge 
                                                        variant={inv.status === 'paid' ? 'secondary' : 'outline'}
                                                        className={cn(
                                                            "text-[10px] uppercase font-black px-2 py-0.5",
                                                            inv.status === 'paid' ? "bg-green-100 text-green-800" : "text-orange-600 border-orange-200"
                                                        )}
                                                    >
                                                        {inv.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold">
                                                        <FileText className="h-3 w-3 mr-2" /> Details
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-64 text-center">
                                            <div className="flex flex-col items-center justify-center gap-4 opacity-40">
                                                <div className="bg-muted p-6 rounded-full border-2 border-dashed">
                                                    <Receipt className="h-12 w-12" />
                                                </div>
                                                <p className="text-lg font-bold">No invoices available.</p>
                                                <p className="text-sm max-w-xs mx-auto italic">Your billing history will appear here once your wash requests are accepted.</p>
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
