
'use client';

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, XCircle, Droplets, Calendar, Clock, MapPin, History, UserCheck, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Booking {
  id: string;
  customer_name: string | null;
  customer_whatsapp: string | null;
  customer_email: string | null;
  status: string;
  requested_time: string;
  updated_at: string;
  location: string | null;
  assigned_employee_id: string | null;
  wash_service_id: string;
  business?: { name: string; city: string };
  employee_name?: string;
  service_name?: string;
}

export default function CustomerDashboardPage() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);

        try {
            // 1. Get Identity from Auth OR LocalStorage (for frictionless tracking)
            const { data: { user } } = await supabase.auth.getUser();
            const storedId = typeof window !== 'undefined' ? localStorage.getItem('customer_id') : null;
            const targetId = user?.id || storedId;

            if (!targetId) {
                setBookings([]);
                return;
            }

            // 2. Fetch Wash Bookings - STAGE 1 (The source of truth)
            const { data: bData, error: bErr } = await supabase
                .from('wash_bookings')
                .select('*')
                .eq('customer_id', targetId)
                .order('requested_time', { ascending: false });
            
            if (bErr) throw bErr;

            if (bData && bData.length > 0) {
                // 3. STAGE 2: Parallel Fetching for Metadata (Manual Wiring Pattern)
                const bizIds = [...new Set(bData.map(b => b.seller_business_id))];
                const empIds = [...new Set(bData.filter(b => b.assigned_employee_id).map(b => b.assigned_employee_id))];
                const svcIds = [...new Set(bData.map(b => b.wash_service_id))];

                const [bizRes, empRes, svcRes] = await Promise.all([
                    supabase.from('businesses').select('id, name, city').in('id', bizIds),
                    supabase.from('employees').select('id, name').in('id', empIds),
                    supabase.from('listings').select('id, name').in('id', svcIds)
                ]);

                const bizMap = (bizRes.data || []).reduce((acc: any, b: any) => ({ ...acc, [b.id]: b }), {});
                const empMap = (empRes.data || []).reduce((acc: any, e: any) => ({ ...acc, [e.id]: e.name }), {});
                const svcMap = (svcRes.data || []).reduce((acc: any, s: any) => ({ ...acc, [s.id]: s.name }), {});

                // 4. STAGE 3: In-Memory Wiring
                const enriched = bData.map(b => ({
                    ...b,
                    business: bizMap[b.seller_business_id],
                    employee_name: empMap[b.assigned_employee_id || ''] || 'Not assigned',
                    service_name: svcMap[b.wash_service_id] || 'Wash Service'
                }));

                setBookings(enriched);
            } else {
                setBookings([]);
            }

        } catch (e: any) {
            console.error("Dashboard Fetch Error:", e);
            toast({ variant: 'destructive', title: 'Sync Error', description: e.message });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        
        // Real-time subscription for instant status updates
        const channel = supabase
            .channel('customer-realtime')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'wash_bookings' 
            }, () => fetchData(true))
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [fetchData]);

    const handleCancel = async (id: string) => {
        if (!confirm('Are you sure you want to cancel this request?')) return;
        try {
            const { error } = await supabase
                .from('wash_bookings')
                .update({ status: 'cancelled', updated_at: new Date().toISOString() })
                .eq('id', id);
            
            if (error) throw error;
            toast({ title: 'Request Cancelled' });
            fetchData(true);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Action Failed', description: e.message });
        }
    };

    if (loading && !refreshing) return (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Loader2 className="animate-spin h-10 w-10 text-primary" />
            <p className="text-sm font-black text-muted-foreground uppercase tracking-widest animate-pulse">Syncing Tracker...</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-extrabold tracking-tight text-primary uppercase italic flex items-center gap-3">
                        <Droplets className="h-10 w-10" />
                        Activity Tracker
                    </h1>
                    <p className="text-muted-foreground font-medium">Real-time management for your carwash requests.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => fetchData(true)} className="rounded-full h-10 px-6 border-primary/20 bg-white shadow-sm">
                    <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} /> Sync Live
                </Button>
            </div>

            <Card className="shadow-2xl border-2 overflow-hidden rounded-2xl bg-white/50 backdrop-blur-sm">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 border-b-2">
                                <TableHead className="font-black py-4 pl-6 uppercase text-[10px] tracking-widest">Business & Service</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest">Status</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest">Team Assignment</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest">Time & Location</TableHead>
                                <TableHead className="text-right pr-6 font-black uppercase text-[10px] tracking-widest">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {bookings.length > 0 ? bookings.map((booking) => (
                                <TableRow key={booking.id} className="hover:bg-primary/5 transition-colors border-b">
                                    <TableCell className="pl-6 py-5">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-bold text-sm text-slate-900">{booking.business?.name ?? 'Verified Partner'}</span>
                                            <Badge variant="outline" className="w-fit text-[10px] font-black uppercase text-primary border-primary/20 bg-primary/5">
                                                {booking.service_name}
                                            </Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={cn(
                                            "uppercase text-[9px] font-black px-3 py-1 shadow-sm",
                                            booking.status === 'confirmed' ? "bg-green-50 text-green-700 border-green-200" : 
                                            booking.status === 'completed' ? "bg-blue-50 text-blue-700 border-blue-200" : 
                                            booking.status === 'cancelled' || booking.status === 'rejected' ? "bg-red-50 text-red-700 border-red-200" : 
                                            "bg-slate-50 text-slate-700"
                                        )}>
                                            {booking.status.replace('_', ' ')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                            <UserCheck className="h-3.5 w-3.5 text-primary opacity-60" />
                                            {booking.employee_name}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                                                <Calendar className="h-3 w-3 text-primary opacity-60" /> 
                                                {new Date(booking.requested_time).toLocaleDateString()}
                                                <Clock className="h-3 w-3 ml-1 text-primary opacity-60" />
                                                {new Date(booking.requested_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                                                <MapPin className="h-3 w-3 shrink-0" />
                                                {booking.location ?? 'Station Service'}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        {['pending_assignment', 'assigned'].includes(booking.status) && (
                                            <Button size="sm" variant="ghost" className="text-destructive h-8 font-black uppercase text-[10px] hover:bg-red-50" onClick={() => handleCancel(booking.id)}>
                                                <XCircle className="h-3.5 w-3.5 mr-1" /> Cancel
                                            </Button>
                                        )}
                                        {booking.status === 'completed' && (
                                            <Badge variant="ghost" className="text-[10px] font-black text-green-600">
                                                <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Verified
                                            </Badge>
                                        )}
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4 opacity-40">
                                            <History className="h-12 w-12" />
                                            <div className="space-y-1">
                                                <p className="font-black uppercase text-[10px] tracking-widest text-slate-900">No active bookings</p>
                                                <p className="text-xs italic">Your service history will appear here.</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    );
}
