'use client';

import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2, Smartphone, ShieldCheck, Mail } from "lucide-react";
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
            // Fetch submissions. 
            // We'll perform a manual look up for business details to avoid complex view-join errors
            const { data: subs, error: subError } = await supabase
                .from('payment_submissions')
                .select('*')
                .eq('status', 'pending')
                .order('submitted_at', { ascending: false });
            
            if (subError) throw subError;

            if (subs && subs.length > 0) {
                const businessIds = subs.map(s => s.business_id);
                const { data: bizData } = await supabase
                    .from('businesses_view')
                    .select('*')
                    .in('id', businessIds);
                
                const bizMap = (bizData || []).reduce((acc: any, b: any) => {
                    acc[b.id] = b;
                    return acc;
                }, {});

                const enriched = subs.map(s => ({
                    ...s,
                    business: bizMap[s.business_id] || null
                }));
                setSubmissions(enriched);
            } else {
                setSubmissions([]);
            }
        } catch (e: any) {
            console.error("Payment fetch error:", e);
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

            // 2. If approved, update user's paid status and ensure access is active
            if (action === 'approve') {
                const { error: userError } = await supabase
                    .from('users')
                    .update({ 
                        paid: true,
                        access_active: true
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
                <p className="text-muted-foreground">Verify manual mobile money payments and activate partner accounts.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Pending Queue</CardTitle>
                    <CardDescription>Review proof of payment from businesses using businesses_view data.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/10">
                                <TableHead>Submission</TableHead>
                                <TableHead>Business</TableHead>
                                <TableHead>Plan Details</TableHead>
                                <TableHead>Reference</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {submissions.length > 0 ? (
                                submissions.map((sub) => (
                                    <TableRow key={sub.id} className="hover:bg-muted/5">
                                        <TableCell className="text-xs">
                                            <div className="font-medium">{new Date(sub.submitted_at).toLocaleDateString()}</div>
                                            <div className="text-muted-foreground">{new Date(sub.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-bold">{sub.business?.name || 'Unknown Business'}</div>
                                            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                <Mail className="h-3 w-3" /> {sub.business?.email || 'No email on file'}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <Badge variant="outline" className="w-fit text-[10px] uppercase font-bold">{sub.plan_selected}</Badge>
                                                <div className="text-xs font-bold text-primary">P{sub.amount}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="text-[10px] mb-1">
                                                <Smartphone className="h-3 w-3 mr-1" />
                                                {sub.mobile_network}
                                            </Badge>
                                            <div className="font-mono text-xs font-bold">{sub.reference_text}</div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="outline" size="sm" className="h-8 text-xs">
                                                        Review Proof <ExternalLink className="ml-2 h-3 w-3" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-md">
                                                    <DialogHeader>
                                                        <DialogTitle>Verify Payment</DialogTitle>
                                                        <DialogDescription>
                                                            Reference: <span className="font-bold text-foreground">{sub.reference_text}</span>
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className="relative aspect-[3/4] w-full mt-4 rounded-xl overflow-hidden border-4 border-muted shadow-2xl">
                                                        <Image 
                                                            src={sub.proof_image_url || 'https://picsum.photos/seed/proof/400/600'} 
                                                            alt="Payment Proof" 
                                                            fill 
                                                            className="object-cover" 
                                                        />
                                                    </div>
                                                    <div className="flex gap-4 mt-6">
                                                        <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleAction(sub.id, sub.business_id, 'approve')}>
                                                            Approve & Activate
                                                        </Button>
                                                        <Button className="flex-1" variant="destructive" onClick={() => handleAction(sub.id, sub.business_id, 'reject')}>
                                                            Reject
                                                        </Button>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-48 text-center text-muted-foreground italic">
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
