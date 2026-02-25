'use client';

import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, Store, AlertCircle, Filter, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function BusinessVerificationPage() {
    const [businesses, setBusinesses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Filter states
    const [planFilter, setPlanFilter] = useState<string>('all');
    const [accessFilter, setAccessFilter] = useState<string>('all');

    const fetchBusinesses = async () => {
        setLoading(true);
        try {
            // Fetch from businesses_view
            let query = supabase.from('businesses_view').select('*');
            
            if (planFilter !== 'all') query = query.eq('plan', planFilter);
            if (accessFilter !== 'all') query = query.eq('access_active', accessFilter === 'active');

            const { data, error } = await query.order('name');
            
            if (error) throw error;
            setBusinesses(data || []);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Fetch Error', description: e.message });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBusinesses();
    }, [planFilter, accessFilter]);

    const handleAccessUpdate = async (businessId: string, active: boolean) => {
        try {
            // Update the underlying users table
            const { error } = await supabase
                .from('users')
                .update({ access_active: active })
                .eq('id', businessId);
            
            if (error) throw error;

            toast({
                title: active ? "Partner Activated" : "Partner Suspended",
                description: `The business access status has been updated.`,
            });
            fetchBusinesses();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Action Failed', description: e.message });
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">Partner Access Control</h1>
                    <p className="text-muted-foreground">Manage service availability and platform access for all registered businesses.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <Select value={planFilter} onValueChange={setPlanFilter}>
                            <SelectTrigger className="w-[140px] h-9">
                                <SelectValue placeholder="Filter Plan" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Plans</SelectItem>
                                <SelectItem value="Starter">Starter</SelectItem>
                                <SelectItem value="Pro">Pro</SelectItem>
                                <SelectItem value="Enterprise">Enterprise</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Select value={accessFilter} onValueChange={setAccessFilter}>
                        <SelectTrigger className="w-[140px] h-9">
                            <SelectValue placeholder="Access Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Access</SelectItem>
                            <SelectItem value="active">Active Only</SelectItem>
                            <SelectItem value="inactive">Inactive Only</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Card className="shadow-lg border-muted/50 overflow-hidden">
                <CardHeader className="bg-muted/10 border-b">
                    <CardTitle>Business Registry</CardTitle>
                    <CardDescription>Viewing {businesses.length} accounts from the live business view.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                <TableHead>Business Name</TableHead>
                                <TableHead>Plan</TableHead>
                                <TableHead>Contact Info</TableHead>
                                <TableHead>Access Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
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
                                            <Badge variant="outline" className="font-mono text-[10px]">
                                                {business.plan || 'NONE'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Mail className="h-3 w-3" />
                                                {business.email}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {business.access_active ? (
                                                <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                                                    <CheckCircle2 className="h-3 w-3 mr-1" /> ACTIVE
                                                </Badge>
                                            ) : (
                                                <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200">
                                                    <XCircle className="h-3 w-3 mr-1" /> SUSPENDED
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {business.access_active ? (
                                                <Button 
                                                    size="sm" 
                                                    variant="destructive" 
                                                    className="h-8 text-xs"
                                                    onClick={() => handleAccessUpdate(business.id, false)}
                                                >
                                                    <AlertCircle className="mr-2 h-3 w-3" />
                                                    Suspend
                                                </Button>
                                            ) : (
                                                <Button 
                                                    size="sm" 
                                                    variant="default" 
                                                    className="h-8 text-xs bg-green-600 hover:bg-green-700"
                                                    onClick={() => handleAccessUpdate(business.id, true)}
                                                >
                                                    <CheckCircle2 className="mr-2 h-3 w-3" />
                                                    Activate
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-48 text-center text-muted-foreground italic">
                                        No business accounts found matching these criteria.
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
