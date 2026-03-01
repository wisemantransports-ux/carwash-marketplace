'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, ShieldCheck, Mail, Save, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from '@/lib/utils';

type BusinessAdminRow = {
    id: string;
    name: string;
    subscription_plan: string;
    subscription_status: string;
    status: string;
    verification_status: string;
    owner: {
        name: string;
        email: string;
    } | null;
};

export default function AdminPartnersPage() {
    const [partners, setPartners] = useState<BusinessAdminRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [mounted, setMounted] = useState(false);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const fetchPartners = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('businesses')
                .select(`
                    id, 
                    name, 
                    subscription_plan, 
                    subscription_status, 
                    status, 
                    verification_status,
                    owner:owner_id ( name, email )
                `)
                .order('name');
            
            if (error) throw error;
            setPartners(data as any[] || []);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Fetch Error', description: e.message });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setMounted(true);
        fetchPartners();
    }, []);

    const handleUpdateField = async (businessId: string, field: string, value: string) => {
        setUpdatingId(businessId);
        try {
            const { error } = await supabase
                .from('businesses')
                .update({ [field]: value })
                .eq('id', businessId);

            if (error) throw error;

            setPartners(prev => prev.map(p => 
                p.id === businessId ? { ...p, [field]: value } : p
            ));

            toast({
                title: "Updated Successfully",
                description: `Business ${field.replace('_', ' ')} has been set to ${value.toUpperCase()}.`,
            });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
        } finally {
            setUpdatingId(null);
        }
    };

    const filtered = partners.filter(p => 
        p.name?.toLowerCase().includes(search.toLowerCase()) || 
        p.owner?.email?.toLowerCase().includes(search.toLowerCase())
    );

    if (!mounted) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-primary">Partner Management</h1>
                    <p className="text-muted-foreground">Admin master control for all car wash operators.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search by business or owner email..." 
                            className="pl-10 h-10 bg-white" 
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" size="icon" onClick={fetchPartners} className="shrink-0 h-10 w-10">
                        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    </Button>
                </div>
            </div>

            <Card className="shadow-2xl border-muted/50 overflow-hidden rounded-2xl">
                <CardHeader className="bg-muted/10 border-b flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-lg">Partner Directory</CardTitle>
                        <CardDescription>Live editing for {filtered.length} businesses.</CardDescription>
                    </div>
                    {updatingId && (
                        <div className="flex items-center gap-2 text-[10px] font-black text-primary animate-pulse">
                            <RefreshCw className="h-3 w-3 animate-spin" /> SYNCING...
                        </div>
                    )}
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/30 hover:bg-muted/30 border-b-2">
                                    <TableHead className="font-bold py-4 pl-6">Business & Owner</TableHead>
                                    <TableHead className="font-bold">Plan Tier</TableHead>
                                    <TableHead className="font-bold">Subscription Status</TableHead>
                                    <TableHead className="font-bold">Market Status</TableHead>
                                    <TableHead className="font-bold">Verification</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading && partners.length === 0 ? (
                                    Array.from({length: 5}).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell colSpan={5} className="h-20 text-center">
                                                <Loader2 className="animate-spin h-5 w-5 mx-auto text-primary opacity-20" />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : filtered.length > 0 ? (
                                    filtered.map(partner => (
                                        <TableRow key={partner.id} className="hover:bg-muted/5 transition-colors border-b">
                                            <TableCell className="pl-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm text-primary">{partner.name}</span>
                                                    <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                                                        <Mail className="h-2.5 w-2.5" /> {partner.owner?.email}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter opacity-60">ID: {partner.id.slice(-8)}</span>
                                                </div>
                                            </TableCell>
                                            
                                            <TableCell>
                                                <Select 
                                                    value={partner.subscription_plan || 'None'} 
                                                    onValueChange={(v) => handleUpdateField(partner.id, 'subscription_plan', v)}
                                                >
                                                    <SelectTrigger className="h-8 text-[10px] font-bold w-[110px] bg-white">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="None" className="text-[10px]">None</SelectItem>
                                                        <SelectItem value="Starter" className="text-[10px]">Starter</SelectItem>
                                                        <SelectItem value="Pro" className="text-[10px]">Pro</SelectItem>
                                                        <SelectItem value="Enterprise" className="text-[10px]">Enterprise</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>

                                            <TableCell>
                                                <Select 
                                                    value={partner.subscription_status || 'inactive'} 
                                                    onValueChange={(v) => handleUpdateField(partner.id, 'subscription_status', v)}
                                                >
                                                    <SelectTrigger className={cn(
                                                        "h-8 text-[10px] font-bold w-[140px] bg-white",
                                                        partner.subscription_status === 'active' ? "text-green-600" : "text-orange-600"
                                                    )}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="inactive" className="text-[10px]">Inactive</SelectItem>
                                                        <SelectItem value="awaiting_payment" className="text-[10px]">Awaiting Payment</SelectItem>
                                                        <SelectItem value="payment_submitted" className="text-[10px]">Payment Submitted</SelectItem>
                                                        <SelectItem value="active" className="text-[10px]">Active</SelectItem>
                                                        <SelectItem value="expired" className="text-[10px]">Expired</SelectItem>
                                                        <SelectItem value="suspended" className="text-[10px]">Suspended</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>

                                            <TableCell>
                                                <Select 
                                                    value={partner.status || 'pending'} 
                                                    onValueChange={(v) => handleUpdateField(partner.id, 'status', v)}
                                                >
                                                    <SelectTrigger className="h-8 text-[10px] font-bold w-[110px] bg-white">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="pending" className="text-[10px]">Pending</SelectItem>
                                                        <SelectItem value="verified" className="text-[10px]">Verified</SelectItem>
                                                        <SelectItem value="suspended" className="text-[10px]">Suspended</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>

                                            <TableCell>
                                                <Select 
                                                    value={partner.verification_status || 'pending'} 
                                                    onValueChange={(v) => handleUpdateField(partner.id, 'verification_status', v)}
                                                >
                                                    <SelectTrigger className={cn(
                                                        "h-8 text-[10px] font-bold w-[110px] bg-white",
                                                        partner.verification_status === 'verified' ? "text-blue-600" : "text-red-600"
                                                    )}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="pending" className="text-[10px]">Pending</SelectItem>
                                                        <SelectItem value="verified" className="text-[10px]">Verified</SelectItem>
                                                        <SelectItem value="rejected" className="text-[10px]">Rejected</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-48 text-center text-muted-foreground italic">
                                            No partners found matching your criteria.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
