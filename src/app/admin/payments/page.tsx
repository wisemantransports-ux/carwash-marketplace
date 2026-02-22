
'use client';
import { mockGetPendingPayments, mockVerifyPayment } from "@/lib/mock-api";
import { PaymentSubmission } from "@/lib/types";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, ExternalLink, Loader2, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Image from "next/image";

export default function AdminPaymentVerificationPage() {
    const [submissions, setSubmissions] = useState<PaymentSubmission[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchSubmissions = async () => {
        setLoading(true);
        const { data } = await mockGetPendingPayments();
        setSubmissions(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchSubmissions();
    }, []);

    const handleAction = async (id: string, action: 'approve' | 'reject') => {
        await mockVerifyPayment(id, action);
        setSubmissions(submissions.filter(s => s.id !== id));
        toast({
            title: action === 'approve' ? "Subscription Activated" : "Payment Rejected",
            description: `The business subscription status has been updated.`,
        });
    };

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold">Subscription Verifications</h1>
                <p className="text-muted-foreground">Verify manual mobile money payments from business owners.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Pending Submissions</CardTitle>
                    <CardDescription>Review proof of payment and activate accounts.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Business</TableHead>
                                <TableHead>Plan</TableHead>
                                <TableHead>Network</TableHead>
                                <TableHead>Reference</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {submissions.length > 0 ? (
                                submissions.map((sub) => (
                                    <TableRow key={sub.id}>
                                        <TableCell className="text-xs">{new Date(sub.submittedAt).toLocaleString()}</TableCell>
                                        <TableCell className="font-medium">{sub.businessId}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{sub.planSelected} (P{sub.amount})</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="text-xs">
                                                <Smartphone className="h-3 w-3 mr-1" />
                                                {sub.mobileNetwork}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs font-bold text-primary">{sub.referenceText}</TableCell>
                                        <TableCell className="text-right flex items-center justify-end gap-2">
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="text-xs">
                                                        View Proof <ExternalLink className="ml-2 h-3 w-3" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-md">
                                                    <DialogHeader>
                                                        <DialogTitle>Proof of Payment</DialogTitle>
                                                        <DialogDescription>Submitted Reference: <span className="font-bold">{sub.referenceText}</span></DialogDescription>
                                                    </DialogHeader>
                                                    <div className="relative aspect-[3/4] w-full mt-4 rounded-lg overflow-hidden border shadow-inner">
                                                        <Image src={sub.proofImageUrl} alt="Payment Proof" fill className="object-cover" />
                                                    </div>
                                                    <div className="flex gap-4 mt-6">
                                                        <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleAction(sub.id, 'approve')}>Approve & Activate</Button>
                                                        <Button className="flex-1" variant="destructive" onClick={() => handleAction(sub.id, 'reject')}>Reject Payment</Button>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        No pending verifications found.
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
