
'use client';

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, CheckCircle2, LayoutDashboard, Package, Clock, MoreHorizontal, UserCheck, Phone, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Business, Lead, WashBooking, Employee } from "@/lib/types";

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

            // 1. Fetch Business
            const { data: biz } = await supabase.from('businesses').select('*').eq('owner_id', session.user.id).maybeSingle();
            if (!biz) return;
            setBusiness(biz as Business);

            // 2. Fetch Operational Data
            const { data: bData } = await supabase
                .from('wash_bookings')
                .select(`*, user:user_id ( name ), employee:employee_id ( name, image_url )`)
                .eq('wash_business_id', biz.id)
                .order('created_at', { ascending: false });
            setBookings((bData as any) || []);

            const { data: lData } = await supabase
                .from('leads')
                .select('*')
                .eq('seller_id', biz.id)
                .order('created_at', { ascending: false });
            setLeads((lData as any) || []);

            const { data: eData } = await supabase.from('employees').select('*').eq('business_id', biz.id);
            setEmployees(eData || []);

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Fetch Error', description: e.message });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        
        // Supabase Realtime for Ops
        const channel = supabase
            .channel('dashboard-ops')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'wash_bookings' }, () => fetchData(true))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => fetchData(true))
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [fetchData]);

    const handleAssignEmployee = async (bookingId: string, employeeId: string) => {
        try {
            const { error } = await supabase.from('wash_bookings').update({ 
                employee_id: employeeId,
                status: 'assigned' 
            }).eq('id', bookingId);
            if (error) throw error;
            toast({ title: "Staff Assigned ✅" });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Failed', description: e.message });
        }
    };

    const handleConfirmBooking = async (bookingId: string) => {
        try {
            const { error } = await supabase.from('wash_bookings').update({ status: 'confirmed' }).eq('id', bookingId);
            if (error) throw error;
            toast({ title: "Booking Confirmed! ✅" });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        }
    };

    // Number Masking Logic: Hide WhatsApp until confirmed
    const formatPhone = (phone: string, status: string) => {
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
                        {business?.name} Dashboard
                    </h1>
                    <p className="text-muted-foreground font-medium">Ops center for {business?.category} services.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => fetchData(true)} className="rounded-full h-10 px-4">
                    <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} /> Refresh
                </Button>
            </div>

            <Tabs defaultValue="ops" className="w-full">
                <TabsList className="mb-8 grid w-full grid-cols-2 max-w-md bg-muted/50 p-1 rounded-xl">
                    <TabsTrigger value="ops" className="rounded-lg font-bold">Car Wash Ops</TabsTrigger>
                    <TabsTrigger value="leads" className="rounded-lg font-bold">Sales Leads</TabsTrigger>
                </TabsList>
                
                <TabsContent value="ops">
                    <Card className="shadow-xl overflow-hidden border-2 rounded-2xl">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 border-b-2">
                                    <TableHead className="font-bold py-4 pl-6">Customer</TableHead>
                                    <TableHead className="font-bold">Contact</TableHead>
                                    <TableHead className="font-bold">Assign Staff</TableHead>
                                    <TableHead className="font-bold">Status</TableHead>
                                    <TableHead className="text-right font-bold pr-6">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {bookings.map((booking) => (
                                    <TableRow key={booking.id} className="hover:bg-muted/10 border-b">
                                        <TableCell className="pl-6">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm">{booking.user?.name || 'Anonymous'}</span>
                                                <span className="text-[10px] text-muted-foreground font-medium uppercase">{new Date(booking.booking_date).toLocaleDateString()}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-mono text-xs font-bold">{formatPhone(booking.whatsapp_number, booking.status)}</span>
                                        </TableCell>
                                        <TableCell>
                                            <select 
                                                className="h-8 w-full rounded-md border bg-background px-2 text-[11px] font-bold"
                                                value={booking.employee_id || ""}
                                                onChange={(e) => handleAssignEmployee(booking.id, e.target.value)}
                                                disabled={['completed', 'cancelled'].includes(booking.status)}
                                            >
                                                <option value="">Select Professional</option>
                                                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                            </select>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="uppercase text-[9px] font-black">{booking.status.replace('_', ' ')}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            {booking.status === 'assigned' && (
                                                <Button size="sm" onClick={() => handleConfirmBooking(booking.id)} className="h-8 text-[10px] font-black uppercase">Confirm</Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {bookings.length === 0 && <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">No active operations.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                <TabsContent value="leads">
                    <Card className="shadow-xl overflow-hidden border-2 rounded-2xl">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 border-b-2">
                                    <TableHead className="font-bold py-4 pl-6">Prospect</TableHead>
                                    <TableHead className="font-bold">Contact (Hidden)</TableHead>
                                    <TableHead className="font-bold">Lead Type</TableHead>
                                    <TableHead className="font-bold">Captured</TableHead>
                                    <TableHead className="text-right font-bold pr-6">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {leads.map((lead) => (
                                    <TableRow key={lead.id} className="hover:bg-muted/10 border-b">
                                        <TableCell className="pl-6 font-bold text-sm">{lead.customer_name}</TableCell>
                                        <TableCell className="font-mono text-xs text-muted-foreground">••••••••••</TableCell>
                                        <TableCell><Badge variant="secondary" className="uppercase text-[9px] font-black">{lead.lead_type.replace('_', ' ')}</Badge></TableCell>
                                        <TableCell className="text-[10px] font-medium">{new Date(lead.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right pr-6">
                                            <Button size="sm" variant="outline" className="h-8 text-[10px] font-black uppercase" asChild>
                                                <a href={`https://wa.me/${lead.customer_whatsapp}`} target="_blank">Contact</a>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {leads.length === 0 && <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">No sales leads captured.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
