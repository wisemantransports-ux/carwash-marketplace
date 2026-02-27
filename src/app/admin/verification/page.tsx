'use client';

import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, Store, AlertCircle, Filter, CheckCircle2, XCircle, FileText, Camera, Eye, User, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Image from "next/image";

export default function BusinessVerificationPage() {
    const [businesses, setBusinesses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Filter states
    const [statusFilter, setStatusFilter] = useState<string>('pending');
    const [typeFilter, setTypeFilter] = useState<string>('all');

    const fetchBusinesses = async () => {
        setLoading(true);
        try {
            // Join with users to get owner name and email
            let query = supabase
                .from('businesses')
                .select(`
                    *,
                    owner:owner_id ( name, email )
                `);
            
            if (statusFilter !== 'all') query = query.eq('verification_status', statusFilter);
            if (typeFilter !== 'all') query = query.eq('business_type', typeFilter);

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
    }, [statusFilter, typeFilter]);

    const handleVerificationUpdate = async (businessId: string, status: 'verified' | 'rejected', type: string) => {
        try {
            const updatePayload: any = { verification_status: status };
            
            // If approving a registered business, ensure the special tag is set
            if (status === 'verified' && type === 'registered') {
                updatePayload.special_tag = 'CIPA Verified';
            }

            const { error } = await supabase
                .from('businesses')
                .update(updatePayload)
                .eq('id', businessId);
            
            if (error) throw error;

            toast({
                title: status === 'verified' ? "Business Verified" : "Registration Rejected",
                description: `The verification status has been updated successfully.`,
            });
            fetchBusinesses();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Action Failed', description: e.message });
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-extrabold tracking-tight">Registration Review</h1>
                    <p className="text-muted-foreground">Verify identity documents and business certificates for marketplace entry.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[140px] h-9">
                                <SelectValue placeholder="Filter Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="pending">Pending Only</SelectItem>
                                <SelectItem value="verified">Verified Only</SelectItem>
                                <SelectItem value="rejected">Rejected Only</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="w-[140px] h-9">
                            <SelectValue placeholder="Account Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="individual">Individual</SelectItem>
                            <SelectItem value="registered">Registered</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Card className="shadow-2xl border-muted/50 overflow-hidden">
                <CardHeader className="bg-muted/10 border-b">
                    <CardTitle className="text-lg">Verification Queue</CardTitle>
                    <CardDescription>Reviewing {businesses.length} registration submissions.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                <TableHead className="font-bold">Business / Owner</TableHead>
                                <TableHead className="font-bold">Account Type</TableHead>
                                <TableHead className="font-bold">ID / Reg No.</TableHead>
                                <TableHead className="font-bold text-center">Documents</TableHead>
                                <TableHead className="text-right pr-6 font-bold">Actions</TableHead>
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
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <div className="font-bold text-primary flex items-center gap-2">
                                                    <Store className="h-3.5 w-3.5" /> {business.name}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                                                    <User className="h-3 w-3" /> {business.owner?.name}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                    <Mail className="h-3 w-3" /> {business.owner?.email}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={business.business_type === 'registered' ? 'default' : 'outline'} className="text-[10px] uppercase">
                                                {business.business_type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs font-bold">
                                            {business.id_number || '---'}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex justify-center gap-2">
                                                {business.business_type === 'individual' ? (
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <Button variant="outline" size="sm" className="h-8 text-[10px] gap-1 px-2">
                                                                <Camera className="h-3 w-3" /> View Selfie
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent className="max-w-md">
                                                            <DialogHeader>
                                                                <DialogTitle>Verification Selfie</DialogTitle>
                                                                <DialogDescription>Owner: {business.owner?.name}</DialogDescription>
                                                            </DialogHeader>
                                                            <div className="relative aspect-square w-full mt-4 rounded-xl overflow-hidden shadow-2xl border-4 border-muted">
                                                                <Image 
                                                                    src={business.selfie_url || 'https://picsum.photos/seed/selfie/600/600'} 
                                                                    alt="Selfie" 
                                                                    fill 
                                                                    className="object-cover" 
                                                                />
                                                            </div>
                                                        </DialogContent>
                                                    </Dialog>
                                                ) : (
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <Button variant="outline" size="sm" className="h-8 text-[10px] gap-1 px-2">
                                                                <FileText className="h-3 w-3" /> View CIPA
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent className="max-w-2xl">
                                                            <DialogHeader>
                                                                <DialogTitle>Registration Certificate</DialogTitle>
                                                                <DialogDescription>Business: {business.name} (Reg: {business.id_number})</DialogDescription>
                                                            </DialogHeader>
                                                            <div className="relative aspect-[3/4] w-full mt-4 rounded-xl overflow-hidden shadow-2xl border-4 border-muted bg-white">
                                                                <Image 
                                                                    src={business.certificate_url || 'https://picsum.photos/seed/cert/600/800'} 
                                                                    alt="Certificate" 
                                                                    fill 
                                                                    className="object-contain" 
                                                                />
                                                            </div>
                                                        </DialogContent>
                                                    </Dialog>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            {business.verification_status === 'pending' ? (
                                                <div className="flex justify-end gap-2">
                                                    <Button 
                                                        size="sm" 
                                                        className="h-8 text-[10px] bg-green-600 hover:bg-green-700 font-bold"
                                                        onClick={() => handleVerificationUpdate(business.id, 'verified', business.business_type)}
                                                    >
                                                        <CheckCircle2 className="mr-1.5 h-3 w-3" /> Approve
                                                    </Button>
                                                    <Button 
                                                        size="sm" 
                                                        variant="destructive" 
                                                        className="h-8 text-[10px] font-bold"
                                                        onClick={() => handleVerificationUpdate(business.id, 'rejected', business.business_type)}
                                                    >
                                                        <XCircle className="mr-1.5 h-3 w-3" /> Reject
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Badge variant={business.verification_status === 'verified' ? 'secondary' : 'destructive'} className="text-[10px] uppercase font-bold px-3">
                                                    {business.verification_status}
                                                </Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-48 text-center text-muted-foreground italic">
                                        <div className="flex flex-col items-center gap-2 opacity-40">
                                            <CheckCircle2 className="h-10 w-10" />
                                            <p>No businesses found matching your criteria.</p>
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
