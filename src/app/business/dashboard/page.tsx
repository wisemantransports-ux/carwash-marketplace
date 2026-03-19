'use client';

import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, LayoutDashboard, Phone, CheckCircle2, History, Droplets, MapPin, Calendar, Clock, XCircle, Mail, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

interface Booking {
  id: string;
  customer_name: string | null;
  customer_whatsapp: string | null;
  customer_email: string | null;
  verified: boolean;
  wash_service_id: string;
  seller_business_id: string;
  assigned_employee_id: string | null;
  status: string;
  scheduled_at: string;
  created_at: string;
  updated_at: string;
  customer_id: string | null;
  employee_id: string | null;
  business_id: string | null;
  location: string | null;
}

export default function BusinessDashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = useCallback(async (silent = false) => {
        if (!user) return;

        if (!silent) setLoading(true);
        else setRefreshing(true);

        try {
            // 1. Find the business ID for this owner
            const { data: biz } = await supabase
                .from('businesses')
                .select('id')
                .eq('owner_id', user.id)
                .maybeSingle();
            
            if (!biz) {
                console.warn("No business record found for owner:", user.id);
                setBookings([]);
                return;
            }

            // 2. Fetch Bookings using the business ID
            const { data: bData, error: bErr } = await supabase
                .from('bookings')
                .select('*')
                .eq('seller_business_id', biz.id)
                .in('status', ['pending', 'pending_assignment', 'assigned', 'confirmed', 'in_progress'])
                .order('scheduled_at', { ascending: false });

            console.log('BUSINESS ID', biz.id);
            console.log('FETCHED BOOKINGS:', bData);
            console.log('Bookings fetched', bData?.length || 0);
            
            if (bErr) throw bErr;

            // 3. Fetch Employees for the dropdown
            const { data: eData } = await supabase
                .from('employees')
                .select('*')
                .eq('business_id', biz.id);
            
            setEmployees(eData || []);
            setBookings(bData || []);

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
    }, [user]);

    useEffect(() => {
        if (!authLoading && user) {
            fetchData();
            
            const channel = supabase
                .channel(`wash-realtime-${user.id}`)
                .on('postgres_changes', { 
                    event: '*', 
                    schema: 'public', 
                    table: 'bookings' 
                }, () => fetchData(true))
                .subscribe();

            return () => { supabase.removeChannel(channel); };
        }
    }, [authLoading, user, fetchData]);

    const handleAssignEmployee = async (bookingId: string, employeeId: string) => {
        try {
            const { error } = await supabase
                .from('bookings')
                .update({ 
                    assigned_employee_id: employeeId,
                    employee_id: employeeId, 
                    status: 'assigned',
                    updated_at: new Date().toISOString()
                })
                .eq('id', bookingId);

            if (error) throw error;
            toast({ title: 'Employee Assigned' });
            setBookings(prev => prev.map(b => 
                b.id === bookingId ? { ...b, assigned_employee_id: employeeId, status: 'assigned' } : b
            ));
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Assignment Failed', description: e.message });
        }
    };

    const handleConfirmBooking = async (bookingId: string) => {
        try {
            const { error } = await supabase
                .from('bookings')
                .update({ 
                    status: 'confirmed',
                    updated_at: new Date().toISOString()
                })
                .eq('id', bookingId);

            if (error) throw error;
            toast({ title: 'Booking Confirmed' });
            setBookings(prev => prev.map(b => 
                b.id === bookingId ? { ...b, status: 'confirmed' } : b
            ));
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Confirmation Failed', description: e.message });
        }
    };

    if (authLoading || (loading && !refreshing)) return (
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
                    <p className="text-muted-foreground font-medium">Real-time management for your car wash.</p>
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
                                <TableHead className="font-black py-4 pl-6 uppercase text-[10px] tracking-widest">Customer Details</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest">Status</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest">Assignment</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest">Scheduled Time</TableHead>
                                <TableHead className="text-right pr-6 font-black uppercase text-[10px] tracking-widest">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {bookings.length > 0 ? bookings.map((booking) => (
                                <TableRow key={booking.id} className="hover:bg-primary/5 transition-colors border-b">
                                    <TableCell className="pl-6 py-5">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-bold text-sm text-slate-900">{booking.customer_name ?? 'Unknown Customer'}</span>
                                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold">
                                                <Phone className="h-3 w-3" /> {booking.customer_whatsapp ?? 'No contact'}
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                                <Mail className="h-3 w-3 opacity-60" /> 
                                                {booking.customer_email ?? 'No email'}
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
                                        <Badge variant="outline" className={cn(
                                            "uppercase text-[9px] font-black px-3 py-1 shadow-sm",
                                            booking.status === 'confirmed' ? "bg-green-50 text-green-700 border-green-200" : 
                                            booking.status === 'assigned' ? "bg-blue-50 text-blue-700 border-blue-200" :
                                            "bg-slate-50 text-slate-700"
                                        )}>
                                            {booking.status.replace('_', ' ')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="min-w-[180px]">
                                        <select 
                                            className="h-9 w-full rounded-lg border-2 bg-white px-2 text-[11px] font-black uppercase outline-none focus:border-primary cursor-pointer disabled:opacity-50"
                                            value={booking.assigned_employee_id || ""}
                                            onChange={(e) => handleAssignEmployee(booking.id, e.target.value)}
                                            disabled={['completed', 'cancelled'].includes(booking.status)}
                                        >
                                            <option value="">-- Unassigned --</option>
                                            {employees.map(e => <option key={e.id} value={e.id}>{e.name.toUpperCase()}</option>)}
                                        </select>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-xs">
                                            <div className="flex items-center gap-1.5 font-bold text-slate-600">
                                                <Calendar className="h-3 w-3 opacity-60" /> 
                                                {new Date(booking.scheduled_at).toLocaleDateString()}
                                            </div>
                                            <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
                                                <Clock className="h-3 w-3 opacity-60" /> 
                                                {new Date(booking.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <div className="flex justify-end gap-2">
                                            {booking.status === 'assigned' && booking.assigned_employee_id && (
                                                <Button 
                                                    size="sm" 
                                                    onClick={() => handleConfirmBooking(booking.id)} 
                                                    className="h-8 text-[10px] font-black uppercase bg-primary"
                                                >
                                                    Confirm
                                                </Button>
                                            )}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border shadow-sm">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48 shadow-xl border-2">
                                                    <DropdownMenuItem onClick={() => fetchData(true)} className="font-bold">
                                                        <RefreshCw className="mr-2 h-4 w-4" /> Refresh Status
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
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
