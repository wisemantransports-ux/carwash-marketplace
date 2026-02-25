'use client';
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2, Smartphone, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Image from "next/image";

export default function AdminPaymentVerificationPage() {
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchSubmissions = async () => {
        setLoading(true);
        try {
            // Join with users to get business name
            const { data, error } = await supabase
                .from('payment_submissions')
                .select(`
                    *,
                    business:business_id ( name, email )
                `)
                .eq('status', 'pending')
                .order('submitted_at', { ascending: false });
            
            if (error) throw error;
            setSubmissions(data || []);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Fetch Error', description: e.message });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubmissions();
    }, []);

    const handleAction = async (id: string, businessId: string, action: 'approve' | 'reject') => {
        try {
            const status = action === 'approve' ? 'approved' : 'rejected';
            
            // 1. Update payment submission status
            const { error: payError } = await supabase
                .from('payment_submissions')
                .update({ 
                    status,
                    reviewed_at: new Date().toISOString()
                })
                .eq('id', id);
            
            if (payError) throw payError;

            // 2. If approved, update user's paid status and extended access
            if (action === 'approve') {
                const { error: userError } = await supabase
                    .from('users')
                    .update({ 
                        paid: true,
                        // Extension logic would ideally be in a DB function, 
                        // but here we mark as paid to reactivate access_active in the view
                    })
                    .eq('id', businessId);
                
                if (userError) throw userError;
            }

            setSubmissions(submissions.filter(s => s.id !== id));
            toast({
                title: action === 'approve' ? "Subscription Activated" : "Payment Rejected",
                description: `The business subscription status has been updated.`,
            });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Action Failed', description: e.message });
        }
    };

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;

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
                                        <TableCell className="text-xs">{new Date(sub.submitted_at).toLocaleString()}</TableCell>
                                        <TableCell className="font-medium">
                                            {sub.business?.name || sub.business_id}
                                            <div className="text-[10px] text-muted-foreground font-mono">{sub.business_id}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{sub.plan_selected} (P{sub.amount})</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="text-xs">
                                                <Smartphone className="h-3 w-3 mr-1" />
                                                {sub.mobile_network}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs font-bold text-primary">{sub.reference_text}</TableCell>
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
                                                        <DialogDescription>Submitted Reference: <span className="font-bold">{sub.reference_text}</span></DialogDescription>
                                                    </DialogHeader>
                                                    <div className="relative aspect-[3/4] w-full mt-4 rounded-lg overflow-hidden border shadow-inner">
                                                        <Image 
                                                            src={sub.proof_image_url || 'https://picsum.photos/seed/proof/400/600'} 
                                                            alt="Payment Proof" 
                                                            fill 
                                                            className="object-cover" 
                                                        />
                                                    </div>
                                                    <div className="flex gap-4 mt-6">
                                                        <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleAction(sub.id, sub.business_id, 'approve')}>Approve & Activate</Button>
                                                        <Button className="flex-1" variant="destructive" onClick={() => handleAction(sub.id, sub.business_id, 'reject')}>Reject Payment</Button>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground italic">
                                        No pending verifications found in the queue.
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
