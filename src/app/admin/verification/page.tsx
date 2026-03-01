'use client';

import { supabase } from "@/lib/supabase";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, Store, Filter, CheckCircle2, XCircle, FileText, Camera, User, RefreshCw, MapPin, Phone, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Image from "next/image";
import { cn } from "@/lib/utils";

export default function BusinessVerificationPage() {
    const [businesses, setBusinesses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    
    // Filter states
    const [statusFilter, setStatusFilter] = useState<string>('pending');
    const [typeFilter, setTypeFilter] = useState<string>('all');

    const fetchBusinesses = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch all businesses with owner details
            // Explicitly selecting columns to avoid issues with large objects or restricted fields
            let query = supabase
                .from('businesses')
                .select(`
                    id,
                    name,
                    address,
                    city,
                    business_type,
                    verification_status,
                    status,
                    id_number,
                    whatsapp_number,
                    selfie_url,
                    certificate_url,
                    created_at,
                    owner:owner_id ( name, email )
                `);
            
            if (statusFilter !== 'all') query = query.eq('verification_status', statusFilter);
            if (typeFilter !== 'all') query = query.eq('business_type', typeFilter);

            const { data, error } = await query.order('created_at', { ascending: false });
            
            if (error) {
                console.error("PostgREST Error:", {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code
                });
                throw error;
            }
            
            setBusinesses(data || []);
        } catch (e: any) {
            console.error("Verification fetch error:", e);
            toast({ 
                variant: 'destructive', 
                title: 'Fetch Error', 
                description: e.message || 'Unable to retrieve verification queue. Check your connection.' 
            });
        } finally {
            setLoading(false);
        }
    }, [statusFilter, typeFilter]);

    useEffect(() => {
        setMounted(true);
        fetchBusinesses();
    }, [fetchBusinesses]);

    const handleVerificationUpdate = async (businessId: string, status: 'verified' | 'rejected', type: string) => {
        try {
            const updatePayload: any = { 
                verification_status: status,
                status: status === 'verified' ? 'verified' : 'pending' 
            };
            
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

    if (!mounted) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <RefreshCw className="animate-spin h-10 w-10 text-primary" />
                <p className="text-muted-foreground animate-pulse font-medium">Initializing registration center...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-extrabold tracking-tight">Registration Review</h1>
                    <p className="text-muted-foreground">Verify identity documents and business certificates for marketplace entry.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[140px] h-9 bg-white">
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
                        <SelectTrigger className="w-[140px] h-9 bg-white">
                            <SelectValue placeholder="Account Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="individual">Individual</SelectItem>
                            <SelectItem value="registered">Registered</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={fetchBusinesses} className="h-9 w-9 bg-white">
                        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    </Button>
                </div>
            </div>

            <Card className="shadow-2xl border-muted/50 overflow-hidden rounded-2xl">
                <CardHeader className="bg-muted/10 border-b">
                    <CardTitle className="text-lg">Verification Queue</CardTitle>
                    <CardDescription>Reviewing {businesses.length} registration submissions with full profiles.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/30 border-b-2">
                                    <TableHead className="font-bold py-4 pl-6 text-xs uppercase tracking-wider">Business & Location</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider">Owner Profile</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider text-center">Account Type</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider">ID / Reg No.</TableHead>
                                    <TableHead className="font-bold text-center text-xs uppercase tracking-wider">Documents</TableHead>
                                    <TableHead className="text-right pr-6 font-bold text-xs uppercase tracking-wider">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading && businesses.length === 0 ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="pl-6"><Skeleton className="h-12 w-48 rounded-lg" /></TableCell>
                                            <TableCell><Skeleton className="h-12 w-48 rounded-lg" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-20 mx-auto rounded-full" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-24 rounded" /></TableCell>
                                            <TableCell className="text-center"><Skeleton className="h-8 w-24 mx-auto rounded-full" /></TableCell>
                                            <TableCell className="text-right pr-6"><Skeleton className="h-9 w-32 ml-auto rounded-full" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : businesses.length > 0 ? (
                                    businesses.map(business => (
                                        <TableRow key={business.id} className="hover:bg-muted/5 transition-colors border-b last:border-0">
                                            <TableCell className="pl-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <div className="font-bold text-primary flex items-center gap-2 text-sm">
                                                        <Store className="h-3.5 w-3.5" /> {business.name}
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                                                        <MapPin className="h-3 w-3 opacity-60" /> 
                                                        {business.address || 'No Address'}, {business.city || 'N/A'}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <div className="text-[11px] font-bold flex items-center gap-1.5">
                                                        <User className="h-3 w-3 opacity-60" /> {business.owner?.name || 'Unknown'}
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 font-medium">
                                                        <Mail className="h-3 w-3 opacity-60" /> {business.owner?.email || 'N/A'}
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 font-bold">
                                                        <Phone className="h-3 w-3 opacity-60 text-primary" /> {business.whatsapp_number || 'No Phone'}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={business.business_type === 'registered' ? 'default' : 'outline'} className="text-[10px] uppercase font-bold px-2 py-0.5">
                                                    {business.business_type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs font-black tracking-tighter">
                                                {business.id_number || '---'}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex justify-center gap-2">
                                                    {business.business_type === 'individual' ? (
                                                        <Dialog>
                                                            <DialogTrigger asChild>
                                                                <Button variant="outline" size="sm" className="h-8 text-[10px] gap-1.5 px-3 font-bold border-primary/20 hover:bg-primary/5">
                                                                    <Camera className="h-3 w-3 text-primary" /> View Selfie
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent className="max-w-md">
                                                                <DialogHeader>
                                                                    <DialogTitle>Verification Selfie</DialogTitle>
                                                                    <DialogDescription>Owner: {business.owner?.name}</DialogDescription>
                                                                </DialogHeader>
                                                                <div className="relative aspect-square w-full mt-4 rounded-xl overflow-hidden shadow-2xl border-4 border-muted bg-muted/20">
                                                                    <Image 
                                                                        src={business.selfie_url || `https://picsum.photos/seed/${business.id}/600/600`} 
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
                                                                <Button variant="outline" size="sm" className="h-8 text-[10px] gap-1.5 px-3 font-bold border-primary/20 hover:bg-primary/5">
                                                                    <FileText className="h-3 w-3 text-primary" /> View CIPA
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent className="max-w-2xl">
                                                                <DialogHeader>
                                                                    <DialogTitle>Registration Certificate</DialogTitle>
                                                                    <DialogDescription>Business: {business.name} (Reg: {business.id_number})</DialogDescription>
                                                                </DialogHeader>
                                                                <div className="relative aspect-[3/4] w-full mt-4 rounded-xl overflow-hidden shadow-2xl border-4 border-muted bg-white">
                                                                    <Image 
                                                                        src={business.certificate_url || `https://picsum.photos/seed/cipa-${business.id}/600/800`} 
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
                                                            className="h-8 text-[10px] bg-green-600 hover:bg-green-700 font-black uppercase shadow-sm"
                                                            onClick={() => handleVerificationUpdate(business.id, 'verified', business.business_type)}
                                                        >
                                                            <CheckCircle2 className="mr-1.5 h-3 w-3" /> Approve
                                                        </Button>
                                                        <Button 
                                                            size="sm" 
                                                            variant="destructive" 
                                                            className="h-8 text-[10px] font-black uppercase shadow-sm"
                                                            onClick={() => handleVerificationUpdate(business.id, 'rejected', business.business_type)}
                                                        >
                                                            <XCircle className="mr-1.5 h-3 w-3" /> Reject
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <Badge 
                                                        variant={business.verification_status === 'verified' ? 'secondary' : 'destructive'} 
                                                        className={cn(
                                                            "text-[10px] uppercase font-black px-3 py-1",
                                                            business.verification_status === 'verified' ? "bg-green-100 text-green-800" : ""
                                                        )}
                                                    >
                                                        {business.verification_status}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-72 text-center text-muted-foreground italic">
                                            <div className="flex flex-col items-center gap-4 opacity-40">
                                                <div className="p-6 bg-muted rounded-full">
                                                    <CheckCircle2 className="h-12 w-12" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-xl font-bold">Verification Queue Clear</p>
                                                    <p className="text-sm">No registrations match your current filter criteria.</p>
                                                </div>
                                            </div>
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
