
'use client';

import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, LayoutDashboard, Phone, CheckCircle2, History, UserCheck, Droplets, MapPin, Calendar, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { Business, Lead, WashBooking, Employee, WashService } from "@/lib/types";

/**
 * Robust error message extraction for Supabase/JS errors.
 */
const extractError = (err: any): string => {
    if (!err) return "An unknown error occurred.";
    if (typeof err === 'string') return err;
    return err.message || err.details || err.hint || "Check server logs.";
};

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

            // 1. Resolve Business
            const { data: biz, error: bizErr } = await supabase
                .from('businesses')
                .select('*')
                .eq('owner_id', user.id)
                .maybeSingle();
            
            if (bizErr) throw bizErr;
            if (!biz) return;
            setBusiness(biz as Business);

            // 2. Fetch Wash Bookings (seller_business_id = auth.uid())
            // Sorted by requested_time ascending as per requirement
            const { data: bData, error: bErr } = await supabase
                .from('wash_bookings')
                .select('*')
                .eq('seller_business_id', user.id)
                .order('requested_time', { ascending: true });
            
            if (bErr) throw bErr;

            // 3. Fetch Employees for the business
            const { data: eData, error: eErr } = await supabase
                .from('employees')
                .select('*')
                .eq('business_id', biz.id);
            
            if (eErr) throw eErr;
            setEmployees(eData || []);
            const empMap = (eData || []).reduce((acc: any, e: any) => ({ ...acc, [e.id]: e }), {});

            // 4. Fetch Wash Services details
            const serviceIds = (bData || []).map(b => b.wash_service_id).filter(Boolean);
            let sMap: Record<string, WashService> = {};
            
            if (serviceIds.length > 0) {
                const { data: sData, error: sErr } = await supabase
                    .from('wash_services')
                    .select('*')
                    .in('id', serviceIds);
                
                if (!sErr && sData) {
                    sMap = sData.reduce((acc: any, s: any) => ({ ...acc, [s.id]: s }), {});
                }
            }

            // 5. MANUAL WIRING: Interleave names into bookings
            const wiredBookings = (bData || []).map(b => ({
                ...b,
                service_name: sMap[b.wash_service_id]?.name || 'Standard Wash',
                employee_name: empMap[b.assigned_employee_id || b.employee_id]?.name || 'Unassigned'
            }));

            setBookings(wiredBookings);

            // 6. Fetch Marketplace Leads (Flat)
            const { data: lData } = await supabase
                .from('leads')
                .select('*')
                .eq('seller_business_id', biz.id)
                .order('created_at', { ascending: false });
            
            setLeads(lData as any || []);

        } catch (e: any) {
            console.error("Biz Dashboard Fetch Error:", e);
            toast({ 
                variant: 'destructive', 
                title: 'Sync Error', 
                description: extractError(e) 
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        // Set up real-time subscription for bookings
        const channel = supabase
            .channel('db-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'wash_bookings' }, () => fetchData(true))
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [fetchData]);

    const handleAssignEmployee = async (bookingId: string, employeeId: string) => {
        try {
            // Requirement: Assign employee to a booking by updating assigned_employee_id and employee_id
            const { error } = await supabase
                .from('wash_bookings')
                .update({ 
                    assigned_employee_id: employeeId,
                    employee_id: employeeId,
                    status: 'assigned', // Auto-move to assigned if currently pending
                    updated_at: new Date().toISOString()
                })
                .eq('id', bookingId);

            if (error) throw error;

            toast({ title: 'Employee Assigned ✅' });
            await fetchData(true); // Refetch to show latest status and info
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Assignment Failed', description: extractError(e) });
        }
    };

    const handleConfirmBooking = async (bookingId: string) => {
        try {
            // Requirement: Update status from pending_assignment → confirmed
            // Requirement: Update updated_at = now()
            const { error } = await supabase
                .from('wash_bookings')
                .update({ 
                    status: 'confirmed',
                    updated_at: new Date().toISOString()
                })
                .eq('id', bookingId);

            if (error) throw error;

            toast({ title: 'Booking Confirmed ✅' });
            await fetchData(true); // Refetch to show latest status
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Confirmation Failed', description: extractError(e) });
        }
    };

    if (loading && !refreshing) return <div className="flex justify-center py-24"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-extrabold tracking-tight text-primary flex items-center gap-3 italic">
                        <LayoutDashboard className="h-10 w-10" />
                        Operational Control
                    </h1>
                    <p className="text-muted-foreground font-medium">Real-time booking management for {business?.name || 'Your Business'}.</p>
                </div>
                <Button variant="outline" onClick={() => fetchData(true)} className="rounded-full bg-white shadow-sm h-10 px-6 border-primary/20">
                    <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} /> Sync Hub
                </Button>
            </div>

            <Tabs defaultValue="wash" className="w-full">
                <TabsList className="mb-8 bg-muted/50 p-1 rounded-xl w-fit">
                    <TabsTrigger value="wash" className="rounded-lg font-bold px-8">Wash Requests</TabsTrigger>
                    <TabsTrigger value="leads" className="rounded-lg font-bold px-8">Marketplace Leads</TabsTrigger>
                </TabsList>

                <TabsContent value="wash">
                    <Card className="shadow-2xl border-2 rounded-2xl overflow-hidden bg-white/50 backdrop-blur-sm">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 border-b-2">
                                    <TableHead className="font-black py-4 pl-6 uppercase text-[10px] tracking-widest">Customer & Service</TableHead>
                                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Requested Time</TableHead>
                                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Staff Assignment</TableHead>
                                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-center">Status</TableHead>
                                    <TableHead className="text-right pr-6 font-black uppercase text-[10px] tracking-widest">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {bookings.map((booking) => (
                                    <TableRow key={booking.id} className="hover:bg-primary/5 transition-colors border-b group">
                                        <TableCell className="pl-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm text-slate-900">{booking.customer_name}</span>
                                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                                    <Phone className="h-3 w-3" /> {booking.customer_whatsapp}
                                                </div>
                                                <span className="text-[10px] text-primary font-black uppercase flex items-center gap-1 mt-1">
                                                    <Droplets className="h-2.5 w-2.5" /> {booking.service_name}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                                                    <Calendar className="h-3 w-3 opacity-60" /> 
                                                    {new Date(booking.requested_time).toLocaleDateString()}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                                    <Clock className="h-3 w-3 opacity-60" /> 
                                                    {new Date(booking.requested_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="min-w-[180px]">
                                            <select 
                                                className="h-9 w-full rounded-lg border-2 bg-white px-2 text-[11px] font-black uppercase outline-none focus:border-primary transition-all cursor-pointer"
                                                value={booking.assigned_employee_id || ""}
                                                onChange={(e) => handleAssignEmployee(booking.id, e.target.value)}
                                                disabled={['completed', 'cancelled', 'rejected'].includes(booking.status)}
                                            >
                                                <option value="">-- Choose Detailer --</option>
                                                {employees.map(e => <option key={e.id} value={e.id}>{e.name.toUpperCase()}</option>)}
                                            </select>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className={cn(
                                                "uppercase text-[9px] font-black px-3 py-1 shadow-sm",
                                                booking.status === 'confirmed' ? "bg-green-50 text-green-700 border-green-200" : 
                                                booking.status === 'assigned' ? "bg-blue-50 text-blue-700 border-blue-200" :
                                                "bg-slate-50 text-slate-700"
                                            )}>
                                                {booking.status.replace('_', ' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="flex justify-end gap-2">
                                                {booking.status === 'assigned' && (
                                                    <Button size="sm" onClick={() => handleConfirmBooking(booking.id)} className="h-8 text-[10px] font-black uppercase bg-primary shadow-md">Confirm</Button>
                                                )}
                                                {booking.status === 'confirmed' && (
                                                    <Badge variant="secondary" className="bg-green-100 text-green-800 font-bold text-[10px]">VERIFIED</Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {bookings.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-48 text-center">
                                            <div className="flex flex-col items-center gap-2 opacity-40">
                                                <History className="h-10 w-10 text-muted-foreground" />
                                                <p className="font-black uppercase text-xs tracking-widest">No bookings found.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
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
                                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Listing Reference</TableHead>
                                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Captured On</TableHead>
                                    <TableHead className="text-right pr-6 font-black uppercase text-[10px] tracking-widest">WhatsApp Direct</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {leads.map((lead) => (
                                    <TableRow key={lead.id} className="hover:bg-primary/5 border-b group">
                                        <TableCell className="pl-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm text-slate-900">{lead.customer_name}</span>
                                                <span className="text-[10px] text-muted-foreground font-bold">{lead.customer_whatsapp}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="uppercase text-[9px] font-black bg-slate-100 text-slate-700">
                                                ID: #{lead.listing_id?.slice(-6).toUpperCase() || '---'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-[10px] font-black text-muted-foreground uppercase">
                                            {new Date(lead.created_at).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <Button size="sm" variant="outline" className="h-9 text-[10px] font-black uppercase rounded-full border-primary text-primary hover:bg-primary hover:text-white transition-all shadow-sm" asChild>
                                                <a href={`https://wa.me/${lead.customer_whatsapp.replace(/\D/g, '')}`} target="_blank">
                                                    <Phone className="h-3 w-3 mr-2" /> Connect
                                                </a>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {leads.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-48 text-center">
                                            <div className="flex flex-col items-center gap-2 opacity-40">
                                                <UserCheck className="h-10 w-10 text-muted-foreground" />
                                                <p className="font-black uppercase text-xs tracking-widest">No sales leads captured yet.</p>
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
