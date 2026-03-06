'use client';

import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, LayoutDashboard, Phone, CheckCircle2, History, Droplets, MapPin, Calendar, Clock, XCircle, Mail, MoreHorizontal, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Business, Employee } from "@/lib/types";

/**
 * @fileOverview Business Dashboard for Carwash Management
 * Strictly follows the wash_bookings schema and operational rules.
 */

export default function BusinessDashboardPage() {
    const [business, setBusiness] = useState<Business | null>(null);
    const [bookings, setBookings] = useState<any[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Resolve Business Record
            const { data: biz } = await supabase
                .from('businesses')
                .select('*')
                .eq('owner_id', user.id)
                .maybeSingle();
            
            if (biz) setBusiness(biz as Business);

            // 2. Fetch Bookings (Strictly following the wash_bookings schema)
            const { data: bData, error: bErr } = await supabase
                .from('wash_bookings')
                .select('*')
                .eq('seller_business_id', user.id)
                .order('requested_time', { ascending: false });
            
            if (bErr) throw bErr;

            // 3. Fetch Employees for assignment resolution (Manual Wiring)
            const { data: eData } = await supabase
                .from('employees')
                .select('*')
                .eq('business_id', biz?.id);
            
            setEmployees(eData || []);
            const empMap = (eData || []).reduce((acc: any, e: any) => ({ ...acc, [e.id]: e }), {});

            // 4. Fetch Service Names (Manual Wiring from listings table)
            const { data: sData } = await supabase
                .from('listings')
                .select('id, name')
                .eq('listing_type', 'wash_service');
            
            const sMap = (sData || []).reduce((acc: any, s: any) => ({ ...acc, [s.id]: s }), {});

            // 5. Manual Wiring: Map IDs to display names while respecting NULL fallbacks
            const wiredBookings = (bData || []).map(b => ({
                ...b,
                service_display_name: sMap[b.wash_service_id]?.name || 'Standard Wash',
                employee_display_name: empMap[b.assigned_employee_id]?.name || 'Unassigned'
            }));

            setBookings(wiredBookings);

        } catch (e: any) {
            console.error("Dashboard Sync Error:", e);
            toast({ 
                variant: 'destructive', 
                title: 'Sync Error', 
                description: e.message || 'Unable to sync dashboard data.' 
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        // Supabase Real-time Subscription for immediate dashboard updates
        const channel = supabase
            .channel('wash-realtime-dashboard')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'wash_bookings' }, () => fetchData(true))
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [fetchData]);

    const handleAssignEmployee = async (bookingId: string, employeeId: string) => {
        try {
            const { error } = await supabase
                .from('wash_bookings')
                .update({ 
                    assigned_employee_id: employeeId,
                    employee_id: employeeId, 
                    status: 'assigned',
                    updated_at: new Date().toISOString()
                })
                .eq('id', bookingId);

            if (error) throw error;
            toast({ title: 'Employee Assigned' });
            fetchData(true);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Assignment Failed', description: e.message });
        }
    };

    const handleConfirmBooking = async (bookingId: string) => {
        try {
            const { error } = await supabase
                .from('wash_bookings')
                .update({ 
                    status: 'confirmed',
                    updated_at: new Date().toISOString()
                })
                .eq('id', bookingId);

            if (error) throw error;
            toast({ title: 'Booking Confirmed' });
            fetchData(true);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Confirmation Failed', description: e.message });
        }
    };

    const handleStatusUpdate = async (bookingId: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('wash_bookings')
                .update({ 
                    status: newStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('id', bookingId);

            if (error) throw error;
            toast({ title: `Status set to ${newStatus.toUpperCase()}` });
            fetchData(true);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
        }
    };

    if (loading && !refreshing) return (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Loader2 className="animate-spin h-10 w-10 text-primary" />
            <p className="text-sm font-black text-muted-foreground uppercase tracking-widest animate-pulse">Syncing Operational Hub...</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-extrabold tracking-tight text-primary flex items-center gap-3 italic">
                        <LayoutDashboard className="h-10 w-10" />
                        Operational Hub
                    </h1>
                    <p className="text-muted-foreground font-medium">Real-time management for {business?.name || 'Your Car Wash'}.</p>
                </div>
                <Button variant="outline" onClick={() => fetchData(true)} className="rounded-full bg-white shadow-sm h-10 px-6 border-primary/20">
                    <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} /> Sync Hub
                </Button>
            </div>

            <Card className="shadow-2xl border-2 rounded-2xl overflow-hidden bg-white/50 backdrop-blur-sm">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 border-b-2">
                                <TableHead className="font-black py-4 pl-6 uppercase text-[10px] tracking-widest text-slate-500">Customer Details</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-500">Service & Time</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-500">Staff Assignment</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest text-center text-slate-500">Status</TableHead>
                                <TableHead className="text-right pr-6 font-black uppercase text-[10px] tracking-widest text-slate-500">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {bookings.length > 0 ? bookings.map((booking) => (
                                <TableRow key={booking.id} className="hover:bg-primary/5 transition-colors border-b group">
                                    <TableCell className="pl-6 py-5">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-bold text-sm text-slate-900">{booking.customer_name || 'Unknown Customer'}</span>
                                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold">
                                                <Phone className="h-3 w-3" /> {booking.customer_whatsapp || 'No contact'}
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                                <Mail className="h-3 w-3 opacity-60" /> 
                                                {booking.customer_email || 'No email'}
                                            </div>
                                            {booking.location && (
                                                <div className="flex items-center gap-2 text-[10px] text-primary mt-1 font-medium">
                                                    <MapPin className="h-3 w-3 opacity-60" /> 
                                                    {booking.location}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-primary font-black uppercase flex items-center gap-1 mb-1">
                                                <Droplets className="h-2.5 w-2.5" /> {booking.service_display_name}
                                            </span>
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                                                <Calendar className="h-3 w-3 opacity-60" /> 
                                                {new Date(booking.booking_date).toLocaleDateString()}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                                <Clock className="h-3 w-3 opacity-60" /> 
                                                {new Date(booking.requested_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="min-w-[180px]">
                                        <select 
                                            className="h-9 w-full rounded-lg border-2 bg-white px-2 text-[11px] font-black uppercase outline-none focus:border-primary transition-all cursor-pointer shadow-sm disabled:opacity-50"
                                            value={booking.assigned_employee_id || ""}
                                            onChange={(e) => handleAssignEmployee(booking.id, e.target.value)}
                                            disabled={['completed', 'cancelled'].includes(booking.status)}
                                        >
                                            <option value="">-- Unassigned --</option>
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
                                            {booking.assigned_employee_id ? booking.status.replace('_', ' ') : 'Unassigned'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <div className="flex justify-end gap-2">
                                            {booking.status === 'assigned' && booking.assigned_employee_id && (
                                                <Button 
                                                    size="sm" 
                                                    onClick={() => handleConfirmBooking(booking.id)} 
                                                    className="h-8 text-[10px] font-black uppercase bg-primary shadow-md"
                                                >
                                                    Confirm
                                                </Button>
                                            )}
                                            {['pending_assignment', 'assigned', 'confirmed'].includes(booking.status) && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border shadow-sm">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48 shadow-xl border-2">
                                                        <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest opacity-50">Operational Controls</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => handleStatusUpdate(booking.id, 'completed')} className="text-green-600 font-bold">
                                                            <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Completed
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleStatusUpdate(booking.id, 'cancelled')} className="text-destructive font-bold">
                                                            <XCircle className="mr-2 h-4 w-4" /> Cancel Request
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4 opacity-40">
                                            <History className="h-12 w-12" />
                                            <p className="font-black uppercase text-xs tracking-widest">No bookings yet</p>
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
