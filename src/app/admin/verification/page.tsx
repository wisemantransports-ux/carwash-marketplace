'use client';
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, Store, AlertCircle } from "lucide-react";

export default function BusinessVerificationPage() {
    const [businesses, setBusinesses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBusinesses = async () => {
            setLoading(true);
            try {
                // Fetch businesses that are currently active
                const { data, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('role', 'business-owner')
                    .eq('access_active', true);
                
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

    const handleAccessUpdate = async (businessId: string, active: boolean) => {
        try {
            const { error } = await supabase
                .from('users')
                .update({ access_active: active })
                .eq('id', businessId);
            
            if (error) throw error;

            setBusinesses(businesses.filter(b => b.id !== businessId));
            toast({
                title: active ? "Partner Activated" : "Partner Suspended",
                description: `The business access status has been updated.`,
            });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Action Failed', description: e.message });
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Partner Access Control</h1>
                <p className="text-muted-foreground text-lg">Manage active partners and suspend access for accounts that violate terms.</p>
            </div>

            <Card className="shadow-lg border-muted/50 overflow-hidden">
                <CardHeader className="bg-muted/10 border-b">
                    <CardTitle>Active Partners</CardTitle>
                    <CardDescription>Verified businesses currently operating in the marketplace.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30">
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
                                        <TableCell className="text-right"><Skeleton className="h-9 w-24 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : businesses.length > 0 ? (
                                businesses.map(business => (
                                    <TableRow key={business.id} className="hover:bg-muted/5 transition-colors">
                                        <TableCell className="font-bold">
                                            <div className="flex items-center gap-2">
                                                <Store className="h-4 w-4 text-primary" />
                                                {business.name}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Mail className="h-3 w-3" />
                                                {business.email}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono text-[10px] text-muted-foreground">
                                            {business.id.slice(-8).toUpperCase()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button 
                                                size="sm" 
                                                variant="destructive" 
                                                className="shadow-sm"
                                                onClick={() => handleAccessUpdate(business.id, false)}
                                            >
                                                <AlertCircle className="mr-2 h-3.5 w-3.5" />
                                                Suspend Access
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-48 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <Store className="h-10 w-10 opacity-20" />
                                            <p className="italic">No active business partners found in this view.</p>
                                        </div>
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
