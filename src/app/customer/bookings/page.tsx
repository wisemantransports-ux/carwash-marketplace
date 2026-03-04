'use client';

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, XCircle, Droplets, ShoppingCart, Calendar, Clock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { WashBooking, Lead } from "@/lib/types";

/**
 * Customer Dashboard
 * Displays wash_bookings and marketplace inquiries.
 * Refactored to strictly avoid leads table for carwash services.
 */
export default function CustomerDashboardPage() {
    const [bookings, setBookings] = useState<any[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch Wash Bookings directly from wash_bookings table
            // Aligned with seller_business_id and wash_service_id schema
            const { data: bData, error: bErr } = await supabase
                .from('wash_bookings')
                .select(`
                    *,
                    business:seller_business_id ( name, city ),
                    service:wash_service_id ( name, price )
                `)
                .eq('customer_id', user.id)
                .order('booking_date', { ascending: false });
            
            if (bErr) throw bErr;
            setBookings(bData || []);

            // 2. Fetch Inquiries (Leads) for Cars & Spare Parts ONLY
            const { data: lData, error: lErr } = await supabase
                .from('leads')
                .select('*, business:seller_business_id(name)')
                .eq('customer_id', user.id)
                .order('created_at', { ascending: false });
            
            if (lErr) throw lErr;
            setLeads(lData || []);

        } catch (e: any) {
            console.error("Dashboard Sync Error:", e);
            toast({ variant: 'destructive', title: 'Sync Error', description: e.message });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        // Subscribe to real-time status changes for the current customer
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
                .update({ status: 'cancelled' })
                .eq('id', id);
            
            if (error) throw error;
            toast({ title: 'Request Cancelled' });
            fetchData(true);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Action Failed', description: e.message });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Remove this completed booking from your history?')) return;
        try {
            const { error } = await supabase
                .from('wash_bookings')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            setBookings(prev => prev.filter(b => b.id !== id));
            toast({ title: 'Record Removed' });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: e.message });
        }
    };

    if (loading && !refreshing) return <div className="flex justify-center py-24"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-extrabold tracking-tight text-primary uppercase italic tracking-tighter">Activity Tracking</h1>
                    <p className="text-muted-foreground font-medium">Manage your active carwash requests and marketplace inquiries.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => fetchData(true)} className="rounded-full h-10 px-6 border-primary/20 bg-white">
                    <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} /> Sync Live
                </Button>
            </div>

            <Tabs defaultValue="wash" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-md bg-muted/50 p-1 rounded-xl">
                    <TabsTrigger value="wash" className="rounded-lg font-bold">Wash Requests</TabsTrigger>
                    <TabsTrigger value="leads" className="rounded-lg font-bold">Market Inquiries</TabsTrigger>
                </TabsList>

                <TabsContent value="wash" className="mt-8">
                    <Card className="shadow-2xl border-2 overflow-hidden rounded-2xl bg-white/50 backdrop-blur-sm">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 border-b-2">
                                    <TableHead className="font-black py-4 pl-6 uppercase text-[10px] tracking-widest">Package & Business</TableHead>
                                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Date & Location</TableHead>
                                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-center">Status</TableHead>
                                    <TableHead className="text-right pr-6 font-black uppercase text-[10px] tracking-widest">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {bookings.map((booking) => (
                                    <TableRow key={booking.id} className="hover:bg-primary/5 transition-colors border-b">
                                        <TableCell className="pl-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm text-primary">{booking.service?.name || 'Wash Service'}</span>
                                                <span className="text-[10px] text-muted-foreground font-bold uppercase">{booking.business?.name || 'Partner'} • {booking.business?.city}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                                                    <Calendar className="h-3 w-3 text-primary opacity-60" /> 
                                                    {new Date(booking.booking_date).toLocaleDateString()}
                                                    <Clock className="h-3 w-3 ml-1 text-primary opacity-60" />
                                                    {new Date(booking.booking_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium truncate max-w-[200px]">
                                                    <MapPin className="h-3 w-3 shrink-0" />
                                                    {booking.location || 'Location provided'}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className={cn(
                                                "uppercase text-[9px] font-black px-3 py-1 shadow-sm",
                                                booking.status === 'completed' ? "bg-green-50 text-green-700 border-green-200" : 
                                                booking.status === 'cancelled' || booking.status === 'rejected' ? "bg-red-50 text-red-700 border-red-200" : 
                                                "bg-primary/5 text-primary border-primary/20"
                                            )}>
                                                {booking.status.replace('_', ' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="flex justify-end gap-2">
                                                {booking.status === 'pending_assignment' && (
                                                    <Button size="sm" variant="ghost" className="text-destructive h-8 font-black uppercase text-[10px] hover:bg-red-50" onClick={() => handleCancel(booking.id)}>
                                                        <XCircle className="h-3.5 w-3.5 mr-1" /> Cancel
                                                    </Button>
                                                )}
                                                {(booking.status === 'completed' || booking.status === 'cancelled' || booking.status === 'rejected') && (
                                                    <Button size="sm" variant="ghost" className="h-8 text-[10px] font-black uppercase" onClick={() => handleDelete(booking.id)}>
                                                        Clear Entry
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {bookings.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-64 text-center">
                                            <div className="flex flex-col items-center justify-center gap-4 opacity-40">
                                                <Droplets className="h-12 w-12" />
                                                <div className="space-y-1">
                                                    <p className="font-bold text-lg">No active wash queue.</p>
                                                    <p className="text-sm italic">Find a professional partner to book your first wash.</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                <TabsContent value="leads" className="mt-8">
                    <Card className="shadow-2xl border-2 overflow-hidden rounded-2xl bg-white/50 backdrop-blur-sm">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 border-b-2">
                                    <TableHead className="font-black py-4 pl-6 uppercase text-[10px] tracking-widest">Listing Reference</TableHead>
                                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Provider</TableHead>
                                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Inquiry Date</TableHead>
                                    <TableHead className="text-right pr-6 font-black uppercase text-[10px] tracking-widest">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {leads.map((lead) => (
                                    <TableRow key={lead.id} className="hover:bg-primary/5 transition-colors border-b">
                                        <TableCell className="pl-6 py-5">
                                            <div className="flex items-center gap-2">
                                                <ShoppingCart className="h-4 w-4 text-primary opacity-60" />
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm">#{lead.id.slice(-6).toUpperCase()}</span>
                                                    <span className="text-[10px] text-muted-foreground font-bold uppercase">{lead.listing?.name || 'Automotive Item'}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs font-bold text-slate-600">{lead.business?.name || 'Verified Partner'}</TableCell>
                                        <TableCell className="text-[10px] font-black text-muted-foreground uppercase">{new Date(lead.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right pr-6">
                                            <Badge className="bg-slate-800 text-white font-black uppercase text-[9px] tracking-widest px-2.5 py-1">{lead.status}</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {leads.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-64 text-center">
                                            <div className="flex flex-col items-center justify-center gap-4 opacity-40">
                                                <ShoppingCart className="h-12 w-12" />
                                                <p className="font-bold text-lg">No car or part inquiries yet.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
