
'use client';

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
    Loader2, 
    RefreshCw, 
    User,
    CheckCircle2,
    MessageCircle,
    ShieldCheck,
    TrendingUp,
    LayoutDashboard,
    Package,
    Car,
    Clock,
    MoreHorizontal,
    Phone,
    UserCheck,
    AlertCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuLabel, 
    DropdownMenuSeparator, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Business, Lead, WashBooking, Employee } from "@/lib/types";

export default function BusinessDashboardPage() {
    const [business, setBusiness] = useState<Business | null>(null);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [bookings, setBookings] = useState<WashBooking[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [mounted, setMounted] = useState(false);

    const fetchData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // 1. Fetch Business
            const { data: biz } = await supabase
                .from('businesses')
                .select('*')
                .eq('owner_id', session.user.id)
                .maybeSingle();
            
            if (!biz) return;
            const typedBiz = biz as Business;
            setBusiness(typedBiz);

            // 2. Fetch Category-Specific Data
            if (typedBiz.category === 'Wash') {
                const { data: bData } = await supabase
                    .from('wash_bookings')
                    .select(`
                        *,
                        user:user_id ( name, is_verified ),
                        employee:employee_id ( name, image_url )
                    `)
                    .eq('wash_business_id', typedBiz.id)
                    .order('created_at', { ascending: false });
                
                setBookings((bData as any) || []);

                const { data: eData } = await supabase
                    .from('employees')
                    .select('*')
                    .eq('business_id', typedBiz.id);
                setEmployees(eData || []);
            } else {
                // Cars or Spare Parts
                const { data: lData } = await supabase
                    .from('leads')
                    .select(`
                        *,
                        user:user_id ( name, is_verified )
                    `)
                    .eq('seller_id', typedBiz.id)
                    .order('created_at', { ascending: false });
                
                // Manual Wiring for listing titles (Simplified for prototype)
                setLeads((lData as any) || []);
            }

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Fetch Error', description: e.message });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        setMounted(true);
        fetchData();
    }, [fetchData]);

    const handleUpdateLeadStatus = async (leadId: string, status: Lead['status']) => {
        try {
            const updatePayload: any = { status };
            if (status === 'contacted') updatePayload.contacted_at = new Date().toISOString();

            const { error } = await supabase.from('leads').update(updatePayload).eq('id', leadId);
            if (error) throw error;
            toast({ title: "Status Updated", description: `Lead marked as ${status.toUpperCase()}.` });
            fetchData(true);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
        }
    };

    const handleAssignEmployee = async (bookingId: string, employeeId: string) => {
        try {
            const { error } = await supabase
                .from('wash_bookings')
                .update({ 
                    employee_id: employeeId,
                    status: 'assigned' 
                })
                .eq('id', bookingId);
            
            if (error) throw error;
            toast({ title: "Staff Assigned", description: "Detailer assigned to booking." });
            fetchData(true);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Assignment Failed', description: e.message });
        }
    };

    const handleConfirmBooking = async (bookingId: string, booking: WashBooking) => {
        if (!booking.employee_id) {
            toast({ variant: 'destructive', title: 'Action Required', description: "You must assign an employee before confirming." });
            return;
        }
        try {
            const { error } = await supabase.from('wash_bookings').update({ status: 'confirmed' }).eq('id', bookingId);
            if (error) throw error;
            toast({ title: "Booking Confirmed" });
            fetchData(true);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Failed to Confirm', description: e.message });
        }
    };

    const metrics = useMemo(() => {
        if (business?.category === 'Wash') {
            const completed = bookings.filter(b => b.status === 'completed').length;
            const revenue = bookings.filter(b => b.status === 'completed').reduce((acc, b) => acc + Number(b.price), 0);
            return {
                primaryLabel: "Total Revenue",
                primaryValue: `P${revenue.toLocaleString()}`,
                secondaryLabel: "Completed Jobs",
                secondaryValue: completed.toString(),
                tertiaryLabel: "Active Requests",
                tertiaryValue: bookings.filter(b => b.status === 'pending_assignment').length.toString()
            };
        } else {
            const total = leads.length;
            const verified = leads.filter(l => l.user?.is_verified).length;
            const converted = leads.filter(l => l.status === 'converted').length;
            return {
                primaryLabel: "Total Leads",
                primaryValue: total.toString(),
                secondaryLabel: "Verified Leads",
                secondaryValue: `${total > 0 ? Math.round((verified/total)*100) : 0}%`,
                tertiaryLabel: "Conversion Rate",
                tertiaryValue: `${total > 0 ? Math.round((converted/total)*100) : 0}%`
            };
        }
    }, [business, leads, bookings]);

    if (!mounted || loading) return <div className="flex justify-center py-24"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-extrabold tracking-tight text-primary flex items-center gap-3">
                        <LayoutDashboard className="h-10 w-10" />
                        {business?.name} Dashboard
                    </h1>
                    <p className="text-muted-foreground font-medium">Lead intelligence and operations control center.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => fetchData(true)} className="rounded-full h-10 px-4">
                    <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} /> Refresh
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="border-2 shadow-sm relative overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">{metrics.primaryLabel}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-primary">{metrics.primaryValue}</div>
                        <p className="text-[10px] font-bold text-muted-foreground mt-1 flex items-center gap-1 uppercase">
                            <TrendingUp className="h-3 w-3 text-green-500" /> Platform Gross
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-2 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">{metrics.secondaryLabel}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black">{metrics.secondaryValue}</div>
                        <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase">Metric Performance</p>
                    </CardContent>
                </Card>
                <Card className="border-2 shadow-sm bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-primary">{metrics.tertiaryLabel}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-primary">{metrics.tertiaryValue}</div>
                        <p className="text-[10px] font-bold text-primary/60 mt-1 uppercase">Action Required</p>
                    </CardContent>
                </Card>
            </div>

            {business?.category === 'Wash' ? (
                <Tabs defaultValue="inbox" className="w-full">
                    <TabsList className="mb-8 grid w-full grid-cols-3 max-w-2xl bg-muted/50 p-1 rounded-xl">
                        <TabsTrigger value="inbox" className="rounded-lg font-bold">Booking Queue</TabsTrigger>
                        <TabsTrigger value="active" className="rounded-lg font-bold">Active Jobs</TabsTrigger>
                        <TabsTrigger value="history" className="rounded-lg font-bold">History</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="inbox">
                        <Card className="shadow-xl overflow-hidden border-2 rounded-2xl">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50 border-b-2">
                                        <TableHead className="font-bold py-4 pl-6">Customer</TableHead>
                                        <TableHead className="font-bold">Service</TableHead>
                                        <TableHead className="font-bold">Assign Detailer</TableHead>
                                        <TableHead className="font-bold">Time</TableHead>
                                        <TableHead className="text-right font-bold pr-6">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {bookings.filter(b => ['pending_assignment', 'assigned'].includes(b.status)).map((booking) => (
                                        <TableRow key={booking.id} className="hover:bg-muted/10 border-b">
                                            <TableCell className="pl-6">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm flex items-center gap-1.5">
                                                        {booking.user?.name || 'Anonymous'}
                                                        {booking.user?.is_verified && <ShieldCheck className="h-3 w-3 text-primary" />}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground font-medium">{booking.whatsapp_number}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-bold text-[10px] uppercase">{booking.service_type}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <select 
                                                    className="h-8 w-full rounded-md border bg-background px-2 text-[11px] font-bold"
                                                    value={booking.employee_id || ""}
                                                    onChange={(e) => handleAssignEmployee(booking.id, e.target.value)}
                                                >
                                                    <option value="">Select Staff</option>
                                                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                                </select>
                                            </TableCell>
                                            <TableCell className="text-[11px] font-medium">
                                                {new Date(`${booking.booking_date}T${booking.booking_time}`).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <Button 
                                                    size="sm" 
                                                    disabled={!booking.employee_id}
                                                    onClick={() => handleConfirmBooking(booking.id, booking)}
                                                    className={cn("h-8 text-[10px] font-black uppercase", !booking.employee_id && "opacity-50")}
                                                >
                                                    Confirm
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {bookings.filter(b => ['pending_assignment', 'assigned'].includes(b.status)).length === 0 && (
                                        <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">No new requests.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </Card>
                    </TabsContent>
                    
                    <TabsContent value="active">
                        <Card className="shadow-xl overflow-hidden border-2 rounded-2xl">
                            {/* Similar Table for Active Statuses */}
                            <div className="p-12 text-center text-muted-foreground italic">Active jobs tracking section.</div>
                        </Card>
                    </TabsContent>
                </Tabs>
            ) : (
                <Tabs defaultValue="new" className="w-full">
                    <TabsList className="mb-8 grid w-full grid-cols-2 max-w-md bg-muted/50 p-1 rounded-xl">
                        <TabsTrigger value="new" className="rounded-lg font-bold">New Leads</TabsTrigger>
                        <TabsTrigger value="active" className="rounded-lg font-bold">Active Pipeline</TabsTrigger>
                    </TabsList>

                    <TabsContent value="new">
                        <Card className="shadow-xl overflow-hidden border-2 rounded-2xl">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50 border-b-2">
                                        <TableHead className="font-bold py-4 pl-6">Prospect</TableHead>
                                        <TableHead className="font-bold">Identity</TableHead>
                                        <TableHead className="font-bold">Listing Ref</TableHead>
                                        <TableHead className="font-bold">Captured</TableHead>
                                        <TableHead className="text-right font-bold pr-6">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {leads.filter(l => l.status === 'new').map((lead) => (
                                        <TableRow key={lead.id} className="hover:bg-muted/10 border-b group">
                                            <TableCell className="pl-6">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm">{lead.user?.name || 'Captured Prospect'}</span>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <MessageCircle className="h-3 w-3 text-green-600" />
                                                        <span className="text-[10px] font-bold text-muted-foreground">{lead.whatsapp_number}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {lead.user?.is_verified ? (
                                                    <Badge className="bg-green-100 text-green-800 border-green-200 text-[9px] font-black uppercase">
                                                        <ShieldCheck className="h-3 w-3 mr-1" /> OTP Verified
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-[9px] font-black uppercase text-muted-foreground opacity-60">
                                                        Unverified
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-mono text-[10px] font-black uppercase opacity-60">
                                                #{lead.listing_id.slice(-6)}
                                            </TableCell>
                                            <TableCell className="text-[11px] font-medium text-muted-foreground">
                                                {new Date(lead.created_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <Button 
                                                    size="sm" 
                                                    variant="outline"
                                                    onClick={() => handleUpdateLeadStatus(lead.id, 'contacted')}
                                                    className="h-8 text-[10px] font-black uppercase border-primary/20 hover:bg-primary/5"
                                                >
                                                    Mark Contacted
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {leads.filter(l => l.status === 'new').length === 0 && (
                                        <TableRow><TableCell colSpan={5} className="h-48 text-center">
                                            <div className="flex flex-col items-center gap-2 opacity-40">
                                                <AlertCircle className="h-10 w-10" />
                                                <p className="font-bold">No new leads in your inbox.</p>
                                            </div>
                                        </TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </Card>
                    </TabsContent>

                    <TabsContent value="active">
                        <Card className="shadow-xl overflow-hidden border-2 rounded-2xl">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50 border-b-2">
                                        <TableHead className="font-bold py-4 pl-6">Prospect</TableHead>
                                        <TableHead className="font-bold">Contacted On</TableHead>
                                        <TableHead className="font-bold">Current Status</TableHead>
                                        <TableHead className="text-right pr-6 font-bold">Pipeline Control</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {leads.filter(l => l.status !== 'new').map((lead) => (
                                        <TableRow key={lead.id} className="hover:bg-muted/10 border-b">
                                            <TableCell className="pl-6">
                                                <span className="font-bold text-sm">{lead.user?.name || 'Prospect'}</span>
                                            </TableCell>
                                            <TableCell className="text-[11px] font-medium">
                                                {lead.contacted_at ? new Date(lead.contacted_at).toLocaleString() : '---'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={lead.status === 'converted' ? 'secondary' : 'default'} className="uppercase text-[9px] font-black">
                                                    {lead.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border"><MoreHorizontal className="h-4 w-4" /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48">
                                                        <DropdownMenuLabel>Update Status</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => handleUpdateLeadStatus(lead.id, 'converted')} className="text-green-600 font-bold">
                                                            Mark Converted
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleUpdateLeadStatus(lead.id, 'closed')} className="text-destructive font-bold">
                                                            Close Lead
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {leads.filter(l => l.status !== 'new').length === 0 && (
                                        <TableRow><TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic">No active pipeline items.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </Card>
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}
