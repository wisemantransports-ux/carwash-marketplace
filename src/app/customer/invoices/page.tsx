
'use client';
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Invoice } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Receipt, ShieldAlert, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export default function CustomerInvoicesPage() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetch() {
            setLoading(true);
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;

                const { data, error } = await supabase
                    .from('invoices')
                    .select(`
                        *,
                        business:business_id ( name )
                    `)
                    .eq('customer_id', session.user.id)
                    .order('issued_at', { ascending: false });

                if (error) throw error;
                setInvoices(data || []);
            } catch (e: any) {
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load your invoices.' });
            } finally {
                setLoading(false);
            }
        }
        fetch();
    }, []);

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold">My Invoices</h1>
                <p className="text-muted-foreground">Review your booking bills and payment history.</p>
            </div>

            <Card className="shadow-lg border-muted/50">
                <CardHeader className="bg-muted/5 border-b">
                    <CardTitle className="text-xl">Invoices</CardTitle>
                    <CardDescription>Legal proof of car wash services provided to your registered vehicles.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/10">
                                <TableHead>Invoice #</TableHead>
                                <TableHead>Partner</TableHead>
                                <TableHead>Issued On</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoices.length > 0 ? invoices.map(inv => (
                                <TableRow key={inv.id} className="hover:bg-muted/5 transition-colors">
                                    <TableCell className="font-mono text-xs font-bold uppercase">{inv.id.slice(-8)}</TableCell>
                                    <TableCell className="text-sm font-semibold">{inv.business?.name}</TableCell>
                                    <TableCell className="text-xs">{new Date(inv.issued_at).toLocaleDateString()}</TableCell>
                                    <TableCell className="font-bold text-primary">P{inv.amount.toFixed(2)}</TableCell>
                                    <TableCell>
                                        <Badge 
                                          variant={inv.status === 'paid' ? 'secondary' : 'outline'}
                                          className="text-[10px] uppercase font-bold"
                                        >
                                            {inv.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" className="h-8 text-[10px]">
                                            <FileText className="h-3 w-3 mr-2" /> Details
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-48 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Receipt className="h-8 w-8 text-muted-foreground opacity-20" />
                                            <p className="text-muted-foreground font-medium italic">You have no issued invoices yet.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 flex flex-col md:flex-row items-center gap-6 text-center md:text-left transition-all hover:bg-primary/10">
                <div className="bg-white p-4 rounded-full shadow-sm border border-primary/20">
                    <ShieldAlert className="h-8 w-8 text-primary" />
                </div>
                <div className="space-y-1 flex-1">
                    <h4 className="font-bold text-lg">Dispute Resolution</h4>
                    <p className="text-sm text-muted-foreground">If you believe an invoice is incorrect or you have paid but it&apos;s not marked, please contact the business directly or open a dispute with platform admins.</p>
                </div>
                <Button variant="outline" className="shrink-0">Contact Support</Button>
            </div>
        </div>
    );
}
