
'use client';

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Receipt, FileText, Store, Car, UserCheck, Calendar, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

export default function CustomerInvoicesPage() {
    const { user, loading: authLoading } = useAuth();
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [mounted, setMounted] = useState(false);

    const fetchInvoices = useCallback(async (silent = false) => {
        if (!user) return;
        
        if (!silent) setLoading(true);
        else setRefreshing(true);

        try {
            const targetCustomerId = user.id;
            console.log('Session user.id:', user.id);

            // 1. Fetch Flat Invoices
            const { data: invData, error: invError } = await supabase
                .from('invoices')
                .select('*')
                .eq('customer_id', targetCustomerId)
                .order('issued_at', { ascending: false });

            if (invError) throw invError;

            if (invData && invData.length > 0) {
                // 2. STAGE 2: Parallel Fetching for Metadata (Manual Wiring Pattern)
                // Filter out falsy IDs to prevent PostgREST errors
                const bizIds = [...new Set(invData.map(i => i.business_id).filter(Boolean))];
                const bookingIds = [...new Set(invData.map(i => i.booking_id).filter(Boolean))];

                const [bizRes, bookingsRes] = await Promise.all([
                    bizIds.length > 0 ? supabase.from('businesses').select('id, name').in('id', bizIds) : Promise.resolve({ data: [] }),
                    bookingIds.length > 0 ? supabase.from('bookings').select('*').in('id', bookingIds) : Promise.resolve({ data: [] })
                ]);

                const bizMap = (bizRes.data || []).reduce((acc: any, b: any) => ({ ...acc, [b.id]: b }), {});
                const bookingsData = bookingsRes.data || [];
                
                // Fetch service info for these bookings from listings
                const serviceIds = [...new Set(bookingsData.map(b => b.wash_service_id).filter(Boolean))];
                let svcMap: Record<string, string> = {};
                
                if (serviceIds.length > 0) {
                    const { data: svcData } = await supabase.from('listings').select('id, name').in('id', serviceIds);
                    svcMap = (svcData || []).reduce((acc: any, s: any) => ({ ...acc, [s.id]: s.name }), {});
                }

                const bookingsMap = bookingsData.reduce((acc: any, b: any) => ({
                    ...acc,
                    [b.id]: {
                        ...b,
                        service_name: svcMap[b.wash_service_id] || 'Wash Service'
                    }
                }), {});

                // 3. STAGE 3: In-Memory Wiring
                const enriched = invData.map(inv => ({
                    ...inv,
                    business: bizMap[inv.business_id] || { name: 'Verified Partner' },
                    booking: bookingsMap[inv.booking_id] || null
                }));

                setInvoices(enriched);
            } else {
                setInvoices([]);
            }
        } catch (e: any) {
            console.error("[CUSTOMER-INVOICES] Fetch failure details:", {
                message: e?.message || "Unknown Error",
                details: e?.details,
                code: e?.code
            });
            toast({ 
                variant: 'destructive', 
                title: 'Sync Error', 
                description: 'Could not load your billing records.' 
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    useEffect(() => {
        setMounted(true);
        if (!authLoading && user) {
            fetchInvoices();
        }
    }, [authLoading, user, fetchInvoices]);

    if (!mounted || (authLoading && !refreshing)) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
            <Loader2 className="animate-spin h-8 w-8 text-primary" />
            <p className="text-muted-foreground animate-pulse font-medium">Securing your billing records...</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="flex flex-col gap-2">
                    <h1 className="text-4xl font-extrabold tracking-tight text-primary uppercase italic">My Invoices</h1>
                    <p className="text-muted-foreground text-lg">Review your booking bills and digital service receipts.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => fetchInvoices(true)} className="rounded-full h-10 px-6 border-primary/20 bg-white shadow-sm">
                    <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} /> Sync Billing
                </Button>
            </div>

            <Card className="shadow-2xl border-muted/50 overflow-hidden rounded-2xl bg-white/50 backdrop-blur-sm">
                <CardHeader className="bg-muted/10 border-b">
                    <CardTitle className="text-lg">Service Billing History</CardTitle>
                    <CardDescription>Official digital proof of services rendered to your registered vehicles.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/30 border-b-2">
                                    <TableHead className="font-black py-4 pl-6 uppercase text-[10px] tracking-widest">Invoice #</TableHead>
                                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Partner</TableHead>
                                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Service & Vehicle</TableHead>
                                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Date</TableHead>
                                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Amount</TableHead>
                                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Status</TableHead>
                                    <TableHead className="text-right pr-6 font-black uppercase text-[10px] tracking-widest">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading && !refreshing ? (
                                    Array.from({length: 3}).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell colSpan={7} className="h-16 text-center">
                                                <Loader2 className="animate-spin h-4 w-4 mx-auto text-muted-foreground" />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : invoices.length > 0 ? (
                                    invoices.map(inv => {
                                        const serviceName = inv.booking?.service_name || "Wash Service";
                                        const dateStr = inv.issued_at ? new Date(inv.issued_at).toLocaleDateString() : "N/A";

                                        return (
                                            <TableRow key={inv.id} className="hover:bg-primary/5 transition-colors border-b group">
                                                <TableCell className="font-mono text-[10px] font-black uppercase pl-6 py-5">
                                                    #{inv.id.slice(-8)}
                                                </TableCell>
                                                <TableCell className="font-bold text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <Store className="h-3 w-3 text-primary opacity-60" />
                                                        {inv.business?.name || "Verified Partner"}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-slate-900">{serviceName}</span>
                                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                                                            <Car className="h-2.5 w-2.5" /> {inv.booking?.location || 'Station Wash'}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-[11px] font-bold text-slate-600">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="h-3 w-3 text-primary opacity-60" />
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
                                                    <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase tracking-tight">
                                                        <FileText className="h-3 w-3 mr-2" /> Details
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-64 text-center">
                                            <div className="flex flex-col items-center justify-center gap-4 opacity-40">
                                                <div className="bg-muted p-6 rounded-full">
                                                    <Receipt className="h-12 w-12" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="font-black uppercase text-[10px] tracking-widest text-slate-900">No invoices available</p>
                                                    <p className="text-xs italic">Billing history will appear here once requests are accepted.</p>
                                                </div>
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
