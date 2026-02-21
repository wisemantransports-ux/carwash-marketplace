'use client';
import { mockGetUnverifiedBusinesses } from "@/lib/mock-api";
import type { Business } from "@/lib/types";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function BusinessVerificationPage() {
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBusinesses = async () => {
            setLoading(true);
            const { data } = await mockGetUnverifiedBusinesses();
            setBusinesses(data);
            setLoading(false);
        };
        fetchBusinesses();
    }, []);

    const handleVerification = (businessId: string, action: 'approve' | 'deny') => {
        // In a real app, this would be an API call.
        console.log(`Business ${businessId} ${action}d`);
        setBusinesses(businesses.filter(b => b.id !== businessId));
        toast({
            title: `Business ${action === 'approve' ? 'Approved' : 'Denied'}`,
            description: `The business verification status has been updated.`,
        });
    };

    return (
        <div>
            <h1 className="text-3xl font-bold mb-2">Business Verification</h1>
            <p className="text-muted-foreground mb-6">Review and approve new business registrations.</p>
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Business Name</TableHead>
                                <TableHead>Owner ID</TableHead>
                                <TableHead>Type</TableHead>
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
                                        <TableCell className="font-medium">{business.name}</TableCell>
                                        <TableCell>{business.ownerId}</TableCell>
                                        <TableCell>{business.type}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button size="sm" onClick={() => handleVerification(business.id, 'approve')}>Approve</Button>
                                            <Button size="sm" variant="destructive" onClick={() => handleVerification(business.id, 'deny')}>Deny</Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No pending verifications.
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
