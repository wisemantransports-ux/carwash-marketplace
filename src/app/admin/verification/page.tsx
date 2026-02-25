'use client';
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Mail, Store } from "lucide-react";

export default function BusinessVerificationPage() {
    const [businesses, setBusinesses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBusinesses = async () => {
            setLoading(true);
            try {
                // Fetch business owners who are pending verification
                // Assuming status column in users table
                const { data, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('role', 'business-owner')
                    .eq('status', 'pending');
                
                if (error) throw error;
                setBusinesses(data || []);
            } catch (e: any) {
                toast({ variant: 'destructive', title: 'Fetch Error', description: e.message });
            } finally {
                setLoading(false);
            }
        };
        fetchBusinesses();
    }, []);

    const handleVerification = async (businessId: string, action: 'approve' | 'deny') => {
        try {
            const status = action === 'approve' ? 'verified' : 'suspended';
            
            const { error } = await supabase
                .from('users')
                .update({ status })
                .eq('id', businessId);
            
            if (error) throw error;

            setBusinesses(businesses.filter(b => b.id !== businessId));
            toast({
                title: `Business ${action === 'approve' ? 'Approved' : 'Denied'}`,
                description: `The business verification status has been updated.`,
            });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Action Failed', description: e.message });
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold mb-2">Partner Verification</h1>
                <p className="text-muted-foreground">Review and approve new car wash registrations before they appear in public search.</p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Pending Approvals</CardTitle>
                    <CardDescription>New business applications requiring profile review.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/10">
                                <TableHead>Business Name</TableHead>
                                <TableHead>Contact Info</TableHead>
                                <TableHead>ID Reference</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Skeleton className="h-9 w-20 inline-block" />
                                            <Skeleton className="h-9 w-20 inline-block" />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : businesses.length > 0 ? (
                                businesses.map(business => (
                                    <TableRow key={business.id}>
                                        <TableCell className="font-bold">
                                            <div className="flex items-center gap-2">
                                                <Store className="h-4 w-4 text-muted-foreground" />
                                                {business.name}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Mail className="h-3 w-3" />
                                                {business.email}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono text-[10px]">{business.id.slice(-8).toUpperCase()}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleVerification(business.id, 'approve')}>Approve</Button>
                                            <Button size="sm" variant="destructive" onClick={() => handleVerification(business.id, 'deny')}>Deny</Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground italic">
                                        No pending registrations in the queue.
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
