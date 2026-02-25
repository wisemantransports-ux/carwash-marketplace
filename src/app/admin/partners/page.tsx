'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, ShieldCheck, ExternalLink, Mail } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function AdminPartnersPage() {
    const [partners, setPartners] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const fetchPartners = async () => {
            setLoading(true);
            try {
                // Fetch from businesses_view
                const { data, error } = await supabase
                    .from('businesses_view')
                    .select('*')
                    .order('name');
                
                if (error) throw error;
                setPartners(data || []);
            } catch (e: any) {
                toast({ variant: 'destructive', title: 'Fetch Error', description: e.message });
            } finally {
                setLoading(false);
            }
        };
        fetchPartners();
    }, []);

    const filtered = partners.filter(p => 
        p.name?.toLowerCase().includes(search.toLowerCase()) || 
        p.email?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Partner Management</h1>
                    <p className="text-muted-foreground">Monitor all car wash businesses using the unified businesses view.</p>
                </div>
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search partners..." 
                        className="pl-10" 
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Partner Directory</CardTitle>
                    <CardDescription>Showing {filtered.length} registered car wash operators.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/10">
                                <TableHead>Business Details</TableHead>
                                <TableHead>Plan</TableHead>
                                <TableHead>Payment Status</TableHead>
                                <TableHead>Access</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                                    </TableCell>
                                </TableRow>
                            ) : filtered.length > 0 ? (
                                filtered.map(partner => (
                                    <TableRow key={partner.id}>
                                        <TableCell>
                                            <div className="font-bold">{partner.name}</div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Mail className="h-3 w-3" /> {partner.email}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{partner.plan || 'None'}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            {partner.paid ? (
                                                <Badge className="bg-green-100 text-green-800 border-green-200">
                                                    <ShieldCheck className="h-3 w-3 mr-1" /> PAID
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-orange-600 border-orange-200">
                                                    UNPAID
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={partner.access_active ? 'secondary' : 'destructive'}>
                                                {partner.access_active ? 'ACTIVE' : 'EXPIRED'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" className="h-8 text-[10px]" asChild>
                                                <Link href="/admin/verification">
                                                    Manage Access <ExternalLink className="ml-2 h-3 w-3" />
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic">
                                        No partners found matching your search.
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
