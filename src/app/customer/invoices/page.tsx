
'use client';
import { mockGetInvoicesForCustomer } from "@/lib/mock-api";
import type { Invoice } from "@/lib/types";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Receipt, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CustomerInvoicesPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            const { data } = await mockGetInvoicesForCustomer('user-1');
            setInvoices(data);
            setLoading(false);
        };
        fetch();
    }, []);

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold">My Invoices</h1>
                <p className="text-muted-foreground">Review your booking bills and payment history.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Invoices</CardTitle>
                    <CardDescription>Legal proof of car wash services provided to your registered vehicles.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Invoice #</TableHead>
                                <TableHead>Issued On</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoices.length > 0 ? invoices.map(inv => (
                                <TableRow key={inv.id}>
                                    <TableCell className="font-mono text-xs font-bold">{inv.id.slice(-8).toUpperCase()}</TableCell>
                                    <TableCell className="text-xs">{new Date(inv.issuedAt).toLocaleDateString()}</TableCell>
                                    <TableCell className="font-bold">P{inv.amount}</TableCell>
                                    <TableCell>
                                        <Badge variant={inv.status === 'paid' ? 'secondary' : 'outline'}>
                                            {inv.status.toUpperCase()}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" className="text-xs">
                                            <Receipt className="h-3 w-3 mr-2" /> Details
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">You have no issued invoices yet.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="bg-muted/30 p-6 rounded-xl border border-dashed flex flex-col items-center gap-2 text-center">
                <ShieldAlert className="h-8 w-8 text-muted-foreground" />
                <h4 className="font-bold">Dispute Resolution</h4>
                <p className="text-sm text-muted-foreground max-w-sm">If you believe an invoice is incorrect or you have paid but it's not marked, please contact the business directly or open a dispute with platform admins.</p>
            </div>
        </div>
    );
}
