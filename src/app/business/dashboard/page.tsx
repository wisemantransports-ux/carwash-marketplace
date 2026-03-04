
'use client';

import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, LayoutDashboard, Phone, MapPin, ShieldCheck, UserCheck, CheckCircle2, MoreHorizontal, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Business, Lead, WashBooking, Employee } from "@/lib/types";

/**
 * @fileOverview Business Operational Command
 * Real-time management of car wash bookings and leads.
 * Implements WhatsApp masking until confirmation.
 */
export default function BusinessDashboardPage() {
    const [business, setBusiness] = useState<Business | null>(null);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [bookings, setBookings] = useState<WashBooking[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // 1. Fetch Business Profile
            const { data: biz } = await supabase.from('businesses').select('*').eq('owner_id', session.user.id).maybeSingle();
            if (!biz) return;
            setBusiness(biz as Business);

            // 2. Fetch Operational Feed
            const { data: bData } = await supabase
                .from('wash_bookings')
                .select(`*, user:user_id ( name ), employee:employee_id ( name, phone, image_url )`)
                .eq('wash_business_id', biz.id)
                .order('created_at', { ascending: false });
            setBookings((bData as any) || []);

            const { data: lData } = await supabase
                .from('leads')
                .select('*')
                .eq('seller_id', biz.id)
                .order('created_at', { ascending: false });
            setLeads((lData as any) || []);

            // 3. Fetch Staff for Assignment
            const { data: eData } = await supabase.from('employees').select('*').eq('business_id', biz.id);
            setEmployees(eData || []);

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Sync Error', description: e.message });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        
        // Supabase Realtime for instant operations oversight
        const channel = supabase
            .channel('business-ops-feed')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'wash_bookings' }, () => fetchData(true))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => fetchData(true))
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [fetchData]);

    const handleAssignEmployee = async (bookingId: string, employeeId: string) => {
        if (!employeeId) return;
        try {
            const { error } = await supabase.from('wash_bookings').update({ 
                employee_id: employeeId,
                status: 'assigned' 
            }).eq('id', bookingId);
            if (error) throw error;
            toast({ title: "Staff Allocated ✅", description: "Booking status updated to assigned." });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Assignment Failed', description: e.message });
        }
    };

    const handleConfirmBooking = async (bookingId: string) => {
        try {
            const { error } = await supabase.from('wash_bookings').update({ status: 'confirmed' }).eq('id', bookingId);
            if (error) throw error;
            toast({ title: "Booking Confirmed! ✅", description: "Customer WhatsApp number is now visible." });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Confirmation Error', description: e.message });
        }
    };

    const handleCompleteBooking = async (bookingId: string) => {
        try {
            const { error } = await supabase.from('wash_bookings').update({ status: 'completed' }).eq('id', bookingId);
            if (error) throw error;
            toast({ title: "Wash Completed! ✨", description: "Service record moved to history." });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
        }
    };

    // PRIVACY LOGIC: Mask WhatsApp number until booking is confirmed
    const formatPhone = (phone: string, status: string) => {
        if (!phone) return '---';
        if (['pending_assignment', 'assigned'].includes(status)) {
            return phone.slice(0, 3) + '••••' + phone.slice(-2);
        }
        return phone;
    };

    if (loading && !refreshing) return <div className="flex justify-center py-24"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-extrabold tracking-tight text-primary flex items-center gap-3">
                        <LayoutDashboard className="h-10 w-10" />
                        Command Center
                    </h1>
                    <p className="text-muted-foreground font-medium">Real-time operations for {business?.name}.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => fetchData(true)} className="rounded-full h-10 px-4 border-primary/20 bg-white shadow-sm">
                    <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} /> Refresh Feed
                </Button>
            </div>

            <Tabs defaultValue="ops" className="w-full">
                <TabsList className="mb-8 grid w-full grid-cols-2 max-w-md bg-muted/50 p-1 rounded-xl">
                    <TabsTrigger value="ops" className="rounded-lg font-bold">Car Wash Queue</TabsTrigger>
                    <TabsTrigger value="leads" className="rounded-lg font-bold">Marketplace Leads</TabsTrigger>
                </TabsList>
                
                <TabsContent value="ops">
                    <Card className="shadow-2xl overflow-hidden border-2 rounded-2xl bg-white/50 backdrop-blur-sm">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 border-b-2">
                                    <TableHead className="font-black py-4 pl-6 text-[10px] uppercase tracking-widest">Client & Time</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest">WhatsApp (Secured)</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest">Detailer Assignment</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest">Service Location</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest">Status</TableHead>
                                    <TableHead className="text-right pr-6 font-black text-[10px] uppercase tracking-widest">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {bookings.map((booking) => (
                                    <TableRow key={booking.id} className="hover:bg-primary/5 border-b transition-colors group">
                                        <TableCell className="pl-6">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm text-slate-900">{booking.user?.name || 'Customer'}</span>
                                                <span className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter">
                                                    {new Date(booking.booking_date).toLocaleDateString()} @ {booking.booking_time}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    "font-mono text-xs font-black",
                                                    booking.status === 'confirmed' ? "text-green-600" : "text-slate-400"
                                                )}>
                                                    {formatPhone(booking.whatsapp_number, booking.status)}
                                                </span>
                                                {booking.status === 'confirmed' && (
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-green-600 hover:bg-green-50" asChild>
                                                        <a href={`https://wa.me/${booking.whatsapp_number}`} target="_blank">
                                                            <MessageSquare className="h-3.5 w-3.5" />
                                                        </a>
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="min-w-[180px]">
                                            <select 
                                                className="h-9 w-full rounded-lg border-2 bg-white px-2 text-[11px] font-black uppercase cursor-pointer outline-none focus:border-primary transition-all"
                                                value={booking.employee_id || ""}
                                                onChange={(e) => handleAssignEmployee(booking.id, e.target.value)}
                                                disabled={['completed', 'cancelled', 'rejected'].includes(booking.status)}
                                            >
                                                <option value="">-- Choose Pro Detailer --</option>
                                                {employees.map(e => <option key={e.id} value={e.id}>{e.name.toUpperCase()}</option>)}
                                            </select>
                                        </TableCell>
                                        <TableCell>
                                            {booking.location_pin ? (
                                                <Button variant="outline" size="sm" className="h-8 text-[10px] font-black uppercase text-primary border-primary/20 bg-white" asChild>
                                                    <a href={booking.location_pin} target="_blank">
                                                        <MapPin className="h-3 w-3 mr-1.5" /> Track Pin
                                                    </a>
                                                </Button>
                                            ) : <span className="text-[10px] text-muted-foreground font-bold tracking-tight italic opacity-60">At Station</span>}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={cn(
                                                "uppercase text-[9px] font-black px-3 py-1",
                                                booking.status === 'confirmed' && "bg-green-50 text-green-700 border-green-200",
                                                booking.status === 'assigned' && "bg-blue-50 text-blue-700 border-blue-200",
                                                booking.status === 'completed' && "bg-slate-100 text-slate-700 border-slate-300 opacity-60",
                                                booking.status === 'pending_assignment' && "bg-orange-50 text-orange-700 border-orange-200"
                                            )}>
                                                {booking.status.replace('_', ' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            {booking.status === 'assigned' && (
                                                <Button size="sm" onClick={() => handleConfirmBooking(booking.id)} className="h-8 text-[10px] font-black uppercase bg-primary shadow-lg hover:scale-105 transition-transform">Confirm</Button>
                                            )}
                                            {booking.status === 'confirmed' && (
                                                <Button size="sm" onClick={() => handleCompleteBooking(booking.id)} className="h-8 text-[10px] font-black uppercase bg-green-600 shadow-lg hover:scale-105 transition-transform">Done</Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {bookings.length === 0 && <TableRow><TableCell colSpan={6} className="h-48 text-center text-muted-foreground font-black uppercase text-xs opacity-40">No incoming service requests.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                <TabsContent value="leads">
                    <Card className="shadow-2xl overflow-hidden border-2 rounded-2xl bg-white/50 backdrop-blur-sm">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 border-b-2">
                                    <TableHead className="font-black py-4 pl-6 text-[10px] uppercase tracking-widest">Marketplace Buyer</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest">Listing Type</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest">Discovery Date</TableHead>
                                    <TableHead className="text-right pr-6 font-black text-[10px] uppercase tracking-widest">Coordination</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {leads.map((lead) => (
                                    <TableRow key={lead.id} className="hover:bg-primary/5 border-b">
                                        <TableCell className="pl-6 font-bold text-sm text-slate-900">{lead.customer_name}</TableCell>
                                        <TableCell><Badge variant="secondary" className="uppercase text-[9px] font-black bg-slate-800 text-white">{lead.lead_type.replace('_', ' ')}</Badge></TableCell>
                                        <TableCell className="text-[10px] font-black text-muted-foreground uppercase">{new Date(lead.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right pr-6">
                                            <Button size="sm" variant="outline" className="h-9 text-[10px] font-black uppercase rounded-full border-primary text-primary hover:bg-primary hover:text-white transition-all shadow-sm" asChild>
                                                <a href={`https://wa.me/${lead.customer_whatsapp}`} target="_blank">
                                                    <Phone className="h-3 w-3 mr-2" /> Open WhatsApp
                                                </a>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {leads.length === 0 && <TableRow><TableCell colSpan={4} className="h-48 text-center text-muted-foreground font-black uppercase text-xs opacity-40">No sales inquiries captured yet.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
