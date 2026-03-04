'use client';

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, XCircle, Droplets, ShoppingCart, MapPin, Calendar, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { WashBooking, Lead } from "@/lib/types";

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

            // 1. Fetch Wash Bookings correctly aligned with the wash_bookings schema
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
        const bChannel = supabase.channel('customer-wash').on('postgres_changes', { event: '*', schema: 'public', table: 'wash_bookings' }, () => fetchData(true)).subscribe();
        const lChannel = supabase.channel('customer-leads').on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => fetchData(true)).subscribe();
        return () => { 
            supabase.removeChannel(bChannel); 
            supabase.removeChannel(lChannel); 
        };
    }, [fetchData]);

    const handleCancel = async (id: string) => {
        if (!confirm('Cancel this carwash request?')) return;
        try {
            const { error } = await supabase
                .from('wash_bookings')
                .update({ status: 'cancelled' })
                .eq('id', id);
            
            if (error) throw error;
            toast({ title: 'Request Cancelled' });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Action Failed', description: e.message });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this completed booking from history?')) return;
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
                    <h1 className="text-4xl font-extrabold tracking-tight text-primary uppercase italic">Activity Tracking</h1>
                    <p className="text-muted-foreground font-medium">Manage your carwash requests and marketplace inquiries.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => fetchData(true)} className="rounded-full h-10 px-6">
                    <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} /> Sync Hub
                </Button>
            </div>

            <Tabs defaultValue="wash" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-md bg-muted/50 p-1 rounded-xl">
                    <TabsTrigger value="wash" className="rounded-lg font-bold">Wash Queue</TabsTrigger>
                    <TabsTrigger value="leads" className="rounded-lg font-bold">Marketplace Inquiries</TabsTrigger>
                </TabsList>

                <TabsContent value="wash" className="mt-8">
                    <Card className="shadow-2xl border-2 overflow-hidden rounded-2xl">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 border-b-2">
                                    <TableHead className="font-black py-4 pl-6 uppercase text-[10px] tracking-widest">Service & Partner</TableHead>
                                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Date & Time</TableHead>
                                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Status</TableHead>
                                    <TableHead className="text-right pr-6 font-black uppercase text-[10px] tracking-widest">Control</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {bookings.map((booking) => (
                                    <TableRow key={booking.id} className="hover:bg-primary/5 transition-colors border-b">
                                        <TableCell className="pl-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm text-primary">{booking.service?.name || 'Professional Wash'}</span>
                                                <span className="text-[10px] text-muted-foreground font-bold uppercase">{booking.business?.name} • {booking.business?.city}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs font-bold text-slate-600">
                                            <div className="flex flex-col">
                                                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(booking.booking_date).toLocaleDateString()}</span>
                                                <span className="flex items-center gap-1 opacity-60"><Clock className="h-3 w-3" /> {new Date(booking.booking_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={cn(
                                                "uppercase text-[9px] font-black px-2 py-0.5",
                                                booking.status === 'completed' ? "bg-green-50 text-green-700" : 
                                                booking.status === 'cancelled' ? "bg-red-50 text-red-700" : "bg-primary/5 text-primary"
                                            )}>
                                                {booking.status.replace('_', ' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="flex justify-end gap-2">
                                                {booking.status === 'pending_assignment' && (
                                                    <Button size="icon" variant="ghost" className="text-destructive h-8 w-8 hover:bg-red-50" onClick={() => handleCancel(booking.id)}>
                                                        <XCircle className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                {booking.status === 'completed' && (
                                                    <Button size="sm" variant="ghost" className="h-8 text-[10px] font-bold" onClick={() => handleDelete(booking.id)}>
                                                        Clear
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {bookings.length === 0 && <TableRow><TableCell colSpan={4} className="h-48 text-center text-muted-foreground italic font-medium opacity-40">No carwash bookings found.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                <TabsContent value="leads" className="mt-8">
                    <Card className="shadow-2xl border-2 overflow-hidden rounded-2xl">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 border-b-2">
                                    <TableHead className="font-black py-4 pl-6 uppercase text-[10px] tracking-widest">Marketplace Item</TableHead>
                                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Provider</TableHead>
                                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Logged Date</TableHead>
                                    <TableHead className="text-right pr-6 font-black uppercase text-[10px] tracking-widest">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {leads.map((lead) => (
                                    <TableRow key={lead.id} className="hover:bg-primary/5 border-b">
                                        <TableCell className="pl-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <ShoppingCart className="h-3.5 w-3.5 text-primary" />
                                                <span className="font-bold text-sm">Lead ID: #{lead.id.slice(-6).toUpperCase()}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs font-bold text-slate-600">{lead.business?.name}</TableCell>
                                        <TableCell className="text-[10px] text-muted-foreground font-black uppercase">{new Date(lead.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right pr-6">
                                            <Badge className="bg-slate-800 text-white font-black uppercase text-[9px] tracking-widest px-2">{lead.status}</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {leads.length === 0 && <TableRow><TableCell colSpan={4} className="h-48 text-center text-muted-foreground italic font-medium opacity-40">No vehicle or parts inquiries yet.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
