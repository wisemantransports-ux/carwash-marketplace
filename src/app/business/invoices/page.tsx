
'use client';
import { mockGetInvoicesForBusiness, mockMarkInvoicePaid } from "@/lib/mock-api";
import type { Invoice, PaymentMethod } from "@/lib/types";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Receipt, CheckCircle, FileText, Smartphone, CreditCard, Banknote } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

export default function BusinessInvoicesPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
    const [reference, setReference] = useState('');

    const fetchData = async () => {
        setLoading(true);
        const { data } = await mockGetInvoicesForBusiness('biz-2');
        setInvoices(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleMarkPaid = async () => {
        if (!selectedInvoice) return;
        await mockMarkInvoicePaid(selectedInvoice.id, paymentMethod, reference);
        toast({ title: "Invoice Paid", description: "Payment status has been updated manually." });
        setSelectedInvoice(null);
        fetchData();
    };

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold">Invoices & Payments</h1>
                <p className="text-muted-foreground">Verify manual payments and manage customer accounts.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Issued Invoices</CardTitle>
                    <CardDescription>Legal proof of services rendered through the marketplace.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Invoice ID</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoices.length > 0 ? invoices.map(inv => (
                                <TableRow key={inv.id}>
                                    <TableCell className="font-mono text-xs">{inv.id.slice(-8)}</TableCell>
                                    <TableCell className="text-xs">{new Date(inv.issuedAt).toLocaleDateString()}</TableCell>
                                    <TableCell className="font-bold text-primary">P{inv.amount}</TableCell>
                                    <TableCell>
                                        <Badge variant={inv.status === 'paid' ? 'secondary' : 'default'}>
                                            {inv.status.toUpperCase()}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {inv.status === 'issued' ? (
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button size="sm" onClick={() => setSelectedInvoice(inv)}>
                                                        Mark Paid
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Confirm Payment</DialogTitle>
                                                        <DialogDescription>Manually verify that you have received payment for Invoice #{inv.id.slice(-8)}.</DialogDescription>
                                                    </DialogHeader>
                                                    <div className="space-y-4 py-4">
                                                        <div className="space-y-2">
                                                            <Label>Payment Method</Label>
                                                            <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                                                                <SelectTrigger>
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="cash"><Banknote className="h-4 w-4 mr-2 inline" /> Cash</SelectItem>
                                                                    <SelectItem value="mobile_money"><Smartphone className="h-4 w-4 mr-2 inline" /> Mobile Money</SelectItem>
                                                                    <SelectItem value="card"><CreditCard className="h-4 w-4 mr-2 inline" /> Card Machine</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>Reference / Note (Optional)</Label>
                                                            <Input placeholder="e.g. Transaction ID or Receipt No." value={reference} onChange={e => setReference(e.target.value)} />
                                                        </div>
                                                    </div>
                                                    <DialogFooter>
                                                        <Button className="w-full" onClick={handleMarkPaid}>Confirm Receipt</Button>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                        ) : (
                                            <Badge variant="outline" className="text-[10px]">
                                                <CheckCircle className="h-3 w-3 mr-1" /> Verified
                                            </Badge>
                                        )}
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">No invoices found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
