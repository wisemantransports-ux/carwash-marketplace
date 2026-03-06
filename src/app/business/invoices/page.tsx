
'use client';

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Receipt, CheckCircle, Mail, User, Car, UserCheck, Calendar, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

export default function BusinessInvoicesPage() {
    const { user, loading: authLoading } = useAuth();
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const fetchInvoices = useCallback(async (silent = false) => {
        if (!user) return;
        
        if (!silent) setLoading(true);
        else setRefreshing(true);

        try {
            // 1. Fetch Flat Invoices for this Business
            const { data: invData, error: invError } = await supabase
                .from('invoices')
                .select('*')
                .eq('business_id', user.id)
                .order('issued_at', { ascending: false });

            if (invError) throw invError;

            if (invData && invData.length > 0) {
                // 2. STAGE 2: Parallel Fetching for Metadata (Manual Wiring Pattern)
                const customerIds = [...new Set(invData.map(i => i.customer_id))];
                const bookingIds = [...new Set(invData.map(i => i.booking_id))];

                const [custRes, bookingsRes] = await Promise.all([
                    supabase.from('users').select('id, name, email').in('id', customerIds),
                    supabase.from('wash_bookings').select('*').in('id', bookingIds)
                ]);

                const custMap = (custRes.data || []).reduce((acc: any, c: any) => ({ ...acc, [c.id]: c }), {});
                const bookingsData = bookingsRes.data || [];
                
                // Fetch service info from listings
                const serviceIds = [...new Set(bookingsData.map(b => b.wash_service_id))];
                const { data: svcData } = await supabase.from('listings').select('id, name').in('id', serviceIds);
                const svcMap = (svcData || []).reduce((acc: any, s: any) => ({ ...acc, [s.id]: s.name }), {});

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
                    customer: custMap[inv.customer_id] || { name: 'Unknown Customer', email: 'No email' },
                    booking: bookingsMap[inv.booking_id] || null
                }));

                setInvoices(enriched);
            } else {
                setInvoices([]);
            }
        } catch (e: any) {
            console.error("[BIZ-INVOICES] Fetch error details:", e);
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

    const handleMarkPaid = async (invoiceId: string) => {
        setUpdatingId(invoiceId);
        try {
            const { error } = await supabase
                .from('invoices')
                .update({ 
                    status: 'paid',
                    updated_at: new Date().toISOString()
                })
                .eq('id', invoiceId);

            if (error) throw error;

            setInvoices(prev => prev.map(inv => 
                inv.id === invoiceId ? { ...inv, status: 'paid' } : inv
            ));

            toast({ title: "Payment Confirmed ✅" });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Update Failed", description: e.message });
        } finally {
            setUpdatingId(null);
        }
    };

    if (!mounted || (authLoading && !refreshing)) return (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Loader2 className="animate-spin h-10 w-10 text-primary" />
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest animate-pulse">Syncing Billing Records...</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-extrabold tracking-tight text-primary uppercase italic">Invoices & Payments</h1>
                    <p className="text-muted-foreground text-lg font-medium">Verify manual payments and manage client accounts.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => fetchInvoices(true)} className="rounded-full h-10 px-6 border-primary/20 bg-white shadow-sm">
                    <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} /> Sync Records
                </Button>
            </div>

            <Card className="shadow-2xl border-muted/50 overflow-hidden rounded-2xl bg-white/50 backdrop-blur-sm">
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
                                    <TableHead className="font-black py-4 pl-6 uppercase text-[10px] tracking-widest">Invoice #</TableHead>
                                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Customer Details</TableHead>
                                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Service & Vehicle</TableHead>
                                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Date</TableHead>
                                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Amount</TableHead>
                                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-center">Status</TableHead>
                                    <TableHead className="text-right pr-6 font-black uppercase text-[10px] tracking-widest">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading && !refreshing ? (
                                    Array.from({length: 3}).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell colSpan={7} className="h-20 text-center">
                                                <Loader2 className="animate-spin h-5 w-5 mx-auto text-primary opacity-20" />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : invoices.length > 0 ? (
                                    invoices.map(inv => {
                                        const customerName = inv.customer?.name || "Unknown Customer";
                                        const serviceName = inv.booking?.service_name || "Wash Service";
                                        const dateStr = inv.issued_at ? new Date(inv.issued_at).toLocaleDateString() : "N/A";

                                        return (
                                            <TableRow key={inv.id} className="hover:bg-primary/5 transition-colors border-b group">
                                                <TableCell className="font-mono text-[10px] font-black uppercase pl-6 py-5">
                                                    #{inv.id.slice(-8)}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold flex items-center gap-1.5"><User className="h-3 w-3 text-primary opacity-40" /> {customerName}</span>
                                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1.5"><Mail className="h-3 w-3 opacity-40" /> {inv.customer?.email}</span>
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
                                                    {(inv.status === 'pending' || inv.status === 'issued') ? (
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
                                                        <Badge variant="ghost" className="text-[10px] font-bold opacity-40 uppercase tracking-tighter italic">
                                                            <CheckCircle className="h-3 w-3 mr-1 inline" /> Verified
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-72 text-center">
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
