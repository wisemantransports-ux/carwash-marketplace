'use client';

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, XCircle, Droplets, Calendar, Clock, MapPin, History, UserCheck, ShieldCheck, Plus, RotateCcw, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";

interface Booking {
  id: string;
  customer_name: string | null;
  customer_whatsapp: string | null;
  customer_email: string | null;
  status: string;
  scheduled_at: string;
  updated_at: string;
  location: string | null;
  assigned_employee_id: string | null;
  wash_service_id: string;
  seller_business_id: string;
  business?: { name: string; city: string };
  employee_name?: string;
  service_name?: string;
  price?: number;
}

export default function CustomerDashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = useCallback(async (silent = false) => {
        if (!user) return;
        
        if (!silent) setLoading(true);
        else setRefreshing(true);

        try {
            if (!user?.id) {
                console.log('Customer book query skipped due to missing user.id', { user });
                setBookings([]);
                return;
            }

            const targetCustomerId = user.id;
            console.log('Session user.id:', user.id);

            // 1. Fetch Bookings - Filtered by current user
            const response = await supabase
                .from('bookings')
                .select('*')
                .eq('customer_id', targetCustomerId)
                .in('status', ['pending', 'confirmed', 'completed', 'cancelled'])
                .order('scheduled_at', { ascending: false });

            console.log('BOOKINGS QUERY RESPONSE:', response);
            console.log('bookings customer_id list:', (response.data || []).map((b: any) => b.customer_id));

            if (response.error) throw response.error;

            const bData = response.data;

            if (bData && bData.length > 0) {
                // 2. STAGE 2: Parallel Fetching for Metadata (Manual Wiring Pattern)
                const bizIds = [...new Set(bData.map(b => b.seller_business_id))];
                const empIds = [...new Set(bData.filter(b => b.assigned_employee_id).map(b => b.assigned_employee_id))];
                const svcIds = [...new Set(bData.map(b => b.wash_service_id))];

                const [bizRes, empRes, svcRes] = await Promise.all([
                    supabase.from('businesses').select('id, name, city').in('id', bizIds),
                    supabase.from('employees').select('id, name').in('id', empIds),
                    supabase.from('listings').select('id, name, price').in('id', svcIds)
                ]);

                const bizMap = (bizRes.data || []).reduce((acc: any, b: any) => ({ ...acc, [b.id]: b }), {});
                const empMap = (empRes.data || []).reduce((acc: any, e: any) => ({ ...acc, [e.id]: e.name }), {});
                const svcMap = (svcRes.data || []).reduce((acc: any, s: any) => ({ ...acc, [s.id]: s }), {});

                // 3. STAGE 3: In-Memory Wiring
                const enriched = bData.map(b => ({
                    ...b,
                    business: bizMap[b.seller_business_id],
                    employee_name: empMap[b.assigned_employee_id || ''] || 'Not assigned',
                    service_name: svcMap[b.wash_service_id]?.name || 'Wash Service',
                    price: svcMap[b.wash_service_id]?.price || 0
                }));

                setBookings(enriched);
            } else {
                setBookings([]);
            }

        } catch (e: any) {
            console.error("Dashboard Fetch Error:", e);
            const errMsg = e?.message || e?.error || JSON.stringify(e) || 'Unknown fetch error';
            toast({ variant: 'destructive', title: 'Sync Error', description: errMsg });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    useEffect(() => {
        if (!authLoading && user) {
            fetchData();
            
            // Real-time subscription for instant status updates
            const channel = supabase
                .channel(`customer-realtime-${user.id}`)
                .on('postgres_changes', { 
                    event: '*', 
                    schema: 'public', 
                    table: 'bookings',
                    filter: `customer_id=eq.${user.id}`
                }, () => fetchData(true))
                .subscribe();

            return () => { supabase.removeChannel(channel); };
        }
    }, [authLoading, user, fetchData]);

    const handleCancel = async (id: string) => {
        if (!confirm('Are you sure you want to cancel this request?')) return;
        try {
            const { error } = await supabase
                .from('bookings')
                .update({ status: 'cancelled', updated_at: new Date().toISOString() })
                .eq('id', id);
            
            if (error) throw error;
            toast({ title: 'Request Cancelled' });
            fetchData(true);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Action Failed', description: e.message });
        }
    };

    if (authLoading || (loading && !refreshing)) return (
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
                    <p className="text-muted-foreground font-medium">Real-time tracking for your carwash requests.</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <Button variant="outline" size="sm" onClick={() => fetchData(true)} className="rounded-full h-10 px-6 border-primary/20 bg-white shadow-sm flex-1 md:flex-none">
                        <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} /> Sync Live
                    </Button>
                    <Button asChild className="rounded-full h-10 px-6 shadow-lg flex-1 md:flex-none font-black uppercase text-[10px]">
                        <Link href="/customer/home">
                            <Plus className="h-4 w-4 mr-2" /> Request Wash
                        </Link>
                    </Button>
                </div>
            </div>

            {/* PENDING NOTIFICATION SECTION */}
            {bookings.some(b => b.status === 'pending') && (
                <div className="bg-orange-50 border-2 border-orange-200 p-4 rounded-2xl flex items-center gap-4 animate-pulse">
                    <div className="bg-orange-500 p-2 rounded-full text-white">
                        <AlertCircle className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-black text-orange-900 uppercase">Awaiting Business Response</p>
                        <p className="text-xs text-orange-700">You have wash requests waiting for partner assignment.</p>
                    </div>
                </div>
            )}

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
                                            <div className="flex flex-wrap gap-2">
                                                <Badge variant="outline" className="text-[9px] font-black uppercase text-primary border-primary/20 bg-primary/5">
                                                    {booking.service_name}
                                                </Badge>
                                                {booking.price && (
                                                    <Badge variant="secondary" className="text-[9px] font-black uppercase">
                                                        P{Number(booking.price).toFixed(2)}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={cn(
                                            "uppercase text-[9px] font-black px-3 py-1 shadow-sm",
                                            booking.status === 'confirmed' ? "bg-green-50 text-green-700 border-green-200" : 
                                            booking.status === 'completed' ? "bg-blue-50 text-blue-700 border-blue-200" : 
                                            booking.status === 'cancelled' ? "bg-red-50 text-red-700 border-red-200" : 
                                            booking.status === 'pending' ? "bg-orange-50 text-orange-700 border-orange-200 animate-pulse" :
                                            "bg-slate-50 text-slate-700"
                                        )}>
                                            {booking.status.replace('_', ' ')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                            <UserCheck className="h-3.5 w-3.5 text-primary opacity-60" />
                                            {booking.assigned_employee_id ? booking.employee_name : "Not assigned"}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                                                <Calendar className="h-3 w-3 text-primary opacity-60" /> 
                                                {new Date(booking.scheduled_at).toLocaleDateString()}
                                                <Clock className="h-3 w-3 ml-1 text-primary opacity-60" />
                                                {new Date(booking.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                                                <MapPin className="h-3 w-3 shrink-0" />
                                                {booking.location ?? 'Station Service'}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <div className="flex justify-end gap-2">
                                            {booking.status === 'pending' && (
                                                <Button size="sm" variant="ghost" className="text-destructive h-8 font-black uppercase text-[10px] hover:bg-red-50 border border-transparent hover:border-red-100" onClick={() => handleCancel(booking.id)}>
                                                    <XCircle className="h-3.5 w-3.5 mr-1" /> Cancel
                                                </Button>
                                            )}
                                            {booking.status === 'completed' && (
                                                <Badge variant="ghost" className="text-[10px] font-black text-green-600">
                                                    <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Verified
                                                </Badge>
                                            )}
                                            {['cancelled', 'completed'].includes(booking.status) && (
                                                <Button size="sm" variant="outline" className="h-8 text-[10px] font-black uppercase" asChild>
                                                    <Link href="/customer/home">
                                                        <RotateCcw className="h-3.5 w-3.5 mr-1" /> Rebook
                                                    </Link>
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-72 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4 opacity-40">
                                            <div className="bg-muted p-6 rounded-full border-2 border-dashed">
                                                <History className="h-12 w-12" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="font-black uppercase text-[10px] tracking-widest text-slate-900">No active bookings</p>
                                                <p className="text-xs italic">Your service history will appear here.</p>
                                            </div>
                                            <Button asChild className="mt-4 rounded-full font-black uppercase text-[10px] px-8 shadow-xl">
                                                <Link href="/customer/home">Request your first wash</Link>
                                            </Button>
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
