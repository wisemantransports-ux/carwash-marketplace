
'use client';

import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, LayoutDashboard, Phone, MapPin, CheckCircle2, MoreHorizontal, MessageSquare, ShieldCheck, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: biz } = await supabase.from('businesses').select('*').eq('owner_id', user.id).maybeSingle();
            if (!biz) return;
            setBusiness(biz as Business);

            // Fetch mixed operations data
            const { data: bData } = await supabase.from('wash_bookings').select('*, user:user_id(name), employee:employee_id(name)').eq('wash_business_id', biz.id).order('created_at', { ascending: false });
            setBookings(bData as any || []);

            const { data: lData } = await supabase.from('leads').select('*').eq('seller_id', biz.id).order('created_at', { ascending: false });
            setLeads(lData as any || []);

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
        const channel = supabase.channel('biz-ops').on('postgres_changes', { event: '*', schema: 'public', table: 'wash_bookings' }, () => fetchData(true)).on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => fetchData(true)).subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [fetchData]);

    const handleUpdateStatus = async (id: string, status: string, empId?: string) => {
        try {
            const update: any = { status };
            if (empId) update.employee_id = empId;
            const { error } = await supabase.from('wash_bookings').update(update).eq('id', id);
            if (error) throw error;
            toast({ title: 'Status Updated ✅' });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
        }
    };

    const formatPhone = (phone: string, status: string) => {
        if (!phone) return '---';
        return ['pending_assignment', 'assigned'].includes(status) ? phone.slice(0, 3) + '••••' + phone.slice(-2) : phone;
    };

    if (loading && !refreshing) return <div className="flex justify-center py-24"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-extrabold tracking-tight text-primary flex items-center gap-3 italic">
                        <LayoutDashboard className="h-10 w-10" />
                        Operational Command
                    </h1>
                    <p className="text-muted-foreground font-medium">Real-time leads and wash operations for {business?.name}.</p>
                </div>
                <Button variant="outline" onClick={() => fetchData(true)} className="rounded-full bg-white shadow-sm h-10 px-6">
                    <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} /> Refresh Feed
                </Button>
            </div>

            <Tabs defaultValue="wash" className="w-full">
                <TabsList className="mb-8 bg-muted/50 p-1 rounded-xl w-fit">
                    <TabsTrigger value="wash" className="rounded-lg font-bold px-8">Car Wash Queue</TabsTrigger>
                    <TabsTrigger value="leads" className="rounded-lg font-bold px-8">Marketplace Leads</TabsTrigger>
                </TabsList>

                <TabsContent value="wash">
                    <Card className="shadow-2xl border-2 rounded-2xl overflow-hidden bg-white/50 backdrop-blur-sm">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 border-b-2">
                                    <TableHead className="font-black py-4 pl-6 uppercase text-[10px] tracking-widest">Client & Date</TableHead>
                                    <TableHead className="font-black uppercase text-[10px] tracking-widest">WhatsApp (Secure)</TableHead>
                                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Staff Assignment</TableHead>
                                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Status</TableHead>
                                    <TableHead className="text-right pr-6 font-black uppercase text-[10px] tracking-widest">Controls</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {bookings.map((booking: any) => (
                                    <TableRow key={booking.id} className="hover:bg-primary/5 transition-colors border-b group">
                                        <TableCell className="pl-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm">{booking.user?.name || 'Customer'}</span>
                                                <span className="text-[10px] text-muted-foreground font-black uppercase">{new Date(booking.booking_date).toLocaleDateString()} @ {booking.booking_time}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs font-black">
                                            {formatPhone(booking.whatsapp_number, booking.status)}
                                        </TableCell>
                                        <TableCell className="min-w-[180px]">
                                            <select 
                                                className="h-9 w-full rounded-lg border-2 bg-white px-2 text-[11px] font-black uppercase outline-none focus:border-primary transition-all"
                                                value={booking.employee_id || ""}
                                                onChange={(e) => handleUpdateStatus(booking.id, 'assigned', e.target.value)}
                                                disabled={['completed', 'cancelled', 'rejected'].includes(booking.status)}
                                            >
                                                <option value="">-- Choose Detailer --</option>
                                                {employees.map(e => <option key={e.id} value={e.id}>{e.name.toUpperCase()}</option>)}
                                            </select>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={cn(
                                                "uppercase text-[9px] font-black px-3 py-1",
                                                booking.status === 'confirmed' ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-700"
                                            )}>
                                                {booking.status.replace('_', ' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="flex justify-end gap-2">
                                                {booking.status === 'assigned' && <Button size="sm" onClick={() => handleUpdateStatus(booking.id, 'confirmed')} className="h-8 text-[10px] font-black uppercase bg-primary">Confirm</Button>}
                                                {booking.status === 'confirmed' && <Button size="sm" onClick={() => handleUpdateStatus(booking.id, 'completed')} className="h-8 text-[10px] font-black uppercase bg-green-600">Finish</Button>}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {bookings.length === 0 && <TableRow><TableCell colSpan={5} className="h-48 text-center text-muted-foreground font-black uppercase text-xs opacity-40">No active wash queue.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                <TabsContent value="leads">
                    <Card className="shadow-2xl border-2 rounded-2xl overflow-hidden bg-white/50 backdrop-blur-sm">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 border-b-2">
                                    <TableHead className="font-black py-4 pl-6 uppercase text-[10px] tracking-widest">Buyer Identity</TableHead>
                                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Category</TableHead>
                                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Captured On</TableHead>
                                    <TableHead className="text-right pr-6 font-black uppercase text-[10px] tracking-widest">WhatsApp Direct</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {leads.map((lead) => (
                                    <TableRow key={lead.id} className="hover:bg-primary/5 border-b">
                                        <TableCell className="pl-6 py-4 font-bold text-sm">{lead.customer_name}</TableCell>
                                        <TableCell><Badge variant="secondary" className="uppercase text-[9px] font-black">{lead.lead_type}</Badge></TableCell>
                                        <TableCell className="text-[10px] font-black text-muted-foreground uppercase">{new Date(lead.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right pr-6">
                                            <Button size="sm" variant="outline" className="h-9 text-[10px] font-black uppercase rounded-full border-primary text-primary hover:bg-primary hover:text-white transition-all shadow-sm" asChild>
                                                <a href={`https://wa.me/${lead.customer_whatsapp}`} target="_blank"><Phone className="h-3 w-3 mr-2" /> Connect</a>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {leads.length === 0 && <TableRow><TableCell colSpan={4} className="h-48 text-center text-muted-foreground font-black uppercase text-xs opacity-40">No sales leads captured yet.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
