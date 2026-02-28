'use client';

import React, { useEffect, useState, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
    Clock, 
    Car, 
    Loader2, 
    CheckCircle2, 
    RefreshCw, 
    AlertCircle, 
    User, 
    UserCheck,
    Check,
    Truck,
    Lock,
    UserPlus,
    Phone
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function BusinessDashboardPage() {
    const [bookings, setBookings] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [business, setBusiness] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    
    // Assignment State
    const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
    const [selectedStaffId, setSelectedStaffId] = useState<string>("");
    const [assigning, setAssigning] = useState(false);

    const fetchData = useCallback(async () => {
        if (!isSupabaseConfigured) {
            setFetchError("Supabase Configuration Missing");
            setLoading(false);
            return;
        }

        setLoading(true);
        setFetchError(null);
        try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) {
                setLoading(false);
                return;
            }

            // 1. Resolve Business Info
            const { data: bizData, error: bizError } = await supabase
                .from('businesses')
                .select('*')
                .eq('owner_id', authUser.id)
                .maybeSingle();
            
            if (bizError) throw bizError;
            
            if (bizData) {
                setBusiness(bizData);

                // 2. Fetch Bookings with Joins
                const { data: bookingData, error: bookingError } = await supabase
                    .from('bookings')
                    .select(`
                        *,
                        customer:customer_id ( name, email ),
                        service:service_id ( name ),
                        staff:staff_id ( name, phone, image_url )
                    `)
                    .eq('business_id', bizData.id)
                    .order('booking_time', { ascending: true });
                
                if (bookingError) throw bookingError;
                setBookings(bookingData || []);

                // 3. Fetch Staff Registry for assignment
                const { data: staffData } = await supabase
                    .from('employees')
                    .select('*')
                    .eq('business_id', bizData.id);
                setEmployees(staffData || []);

            } else {
                setFetchError("Business profile not found. Please complete your profile setup.");
            }
        } catch (error: any) {
            console.error("[DASHBOARD] Fetch error:", error);
            setFetchError("Unable to load operational data. Check connection.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Real-time updates
    useEffect(() => {
        if (!business?.id) return;

        const channel = supabase
            .channel(`dashboard-${business.id}`)
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'bookings', 
                    filter: `business_id=eq.${business.id}` 
                }, 
                () => fetchData()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [business?.id, fetchData]);

    const handleUpdateStatus = async (bookingId: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('bookings')
                .update({ status: newStatus })
                .eq('id', bookingId);

            if (error) throw error;

            toast({ title: "Status Updated", description: `Booking is now ${newStatus}.` });
            fetchData();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
        }
    };

    const handleAssignStaff = async () => {
        if (!selectedBookingId || !selectedStaffId) return;
        setAssigning(true);
        try {
            const { error } = await supabase
                .from('bookings')
                .update({ 
                    staff_id: selectedStaffId,
                    status: 'active' // Auto-activate on assignment
                })
                .eq('id', selectedBookingId);

            if (error) throw error;

            toast({ title: "Staff Assigned", description: "Detailer has been assigned to this booking." });
            setSelectedBookingId(null);
            setSelectedStaffId("");
            fetchData();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Assignment Failed', description: e.message });
        } finally {
            setAssigning(false);
        }
    };

    const BookingTable = ({ list, showActions = false }: { list: any[], showActions?: boolean }) => (
        <Table>
            <TableHeader>
                <TableRow className="bg-muted/50">
                    <TableHead className="font-bold">Customer</TableHead>
                    <TableHead className="font-bold">Service Info</TableHead>
                    <TableHead className="font-bold">Staff</TableHead>
                    <TableHead className="font-bold">Timing</TableHead>
                    <TableHead className="text-right font-bold pr-6">Action</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {list.length > 0 ? list.map((booking) => (
                    <TableRow key={booking.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell>
                            <div className="flex flex-col">
                                <span className="font-bold text-sm">{booking.customer?.name || 'Customer'}</span>
                                <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[100px]">{booking.customer_id?.slice(-8)}</span>
                            </div>
                        </TableCell>
                        <TableCell>
                            <div className="flex flex-col">
                                <span className="text-xs font-medium">{booking.service?.name || 'Wash Service'}</span>
                                <span className="text-[10px] text-primary font-bold">
                                    P{Number(booking.price || 0).toFixed(2)}
                                </span>
                            </div>
                        </TableCell>
                        <TableCell>
                            {booking.staff ? (
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                        <AvatarImage src={booking.staff.image_url} />
                                        <AvatarFallback>{booking.staff.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs font-medium">{booking.staff.name}</span>
                                </div>
                            ) : (
                                <Badge variant="outline" className="text-[9px] font-normal opacity-60">Unassigned</Badge>
                            )}
                        </TableCell>
                        <TableCell className="text-[11px]">
                            <div className="font-bold">{new Date(booking.booking_time).toLocaleDateString()}</div>
                            <div className="text-muted-foreground">{new Date(booking.booking_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                            <div className="flex justify-end gap-2">
                                {booking.status === 'pending' && (
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button 
                                                size="sm" 
                                                className="h-8 text-[10px] font-bold uppercase bg-green-600 hover:bg-green-700" 
                                                onClick={() => setSelectedBookingId(booking.id)}
                                            >
                                                <UserPlus className="h-3 w-3 mr-1" /> Assign & Accept
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Assign Staff Member</DialogTitle>
                                                <DialogDescription>
                                                    Select a professional detailer to handle this wash for {booking.customer?.name}.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="py-4 space-y-4">
                                                <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Choose a detailer..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {employees.map(emp => (
                                                            <SelectItem key={emp.id} value={emp.id}>
                                                                {emp.name} ({emp.phone})
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                {employees.length === 0 && (
                                                    <p className="text-xs text-destructive font-bold italic">
                                                        No employees registered. Go to Team Management first.
                                                    </p>
                                                )}
                                            </div>
                                            <DialogFooter>
                                                <Button 
                                                    className="w-full" 
                                                    disabled={assigning || !selectedStaffId}
                                                    onClick={handleAssignStaff}
                                                >
                                                    {assigning ? <Loader2 className="animate-spin h-4 w-4" /> : "Confirm Assignment"}
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                )}
                                {booking.status === 'active' && (
                                    <Button 
                                        size="sm" 
                                        className="h-8 text-[10px] font-bold uppercase" 
                                        onClick={() => handleUpdateStatus(booking.id, 'completed')}
                                    >
                                        <CheckCircle2 className="h-3 w-3 mr-1" /> Mark Complete
                                    </Button>
                                )}
                            </div>
                        </TableCell>
                    </TableRow>
                )) : (
                    <TableRow>
                        <TableCell colSpan={5} className="h-48 text-center text-muted-foreground italic">
                            <div className="flex flex-col items-center gap-2 opacity-40">
                                <Truck className="h-10 w-10" />
                                <p>No bookings available yet.</p>
                            </div>
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );

    if (loading && !business) return <div className="flex justify-center py-32"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;
    
    const isVerified = business?.verification_status === 'verified';
    const isActive = business?.subscription_status === 'active';
    const subEndDate = business?.sub_end_date ? new Date(business.sub_end_date) : null;
    const isTrialActive = subEndDate && subEndDate > new Date();
    
    const isAccessActive = isVerified && (isActive || isTrialActive);

    if (!isAccessActive && business) return (
        <div className="flex flex-col items-center justify-center py-20 bg-muted/10 border-2 border-dashed rounded-3xl m-8 text-center">
            <Lock className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
            <h2 className="text-2xl font-bold">Operations Locked</h2>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                {!isVerified
                    ? "Verification pending. Your account is under review." 
                    : "Your professional features are currently paused. Please renew your plan."}
            </p>
            <div className="mt-8 flex gap-4">
                <Button variant="outline" asChild>
                    <Link href="/business/profile">Review Profile</Link>
                </Button>
                <Button asChild>
                    <Link href="/business/subscription">View Plans</Link>
                </Button>
            </div>
        </div>
    );

    const pendingList = bookings.filter(b => b.status === 'pending');
    const activeList = bookings.filter(b => b.status === 'active');
    const completedList = bookings.filter(b => b.status === 'completed');

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-extrabold tracking-tight text-primary">{business?.name}</h1>
                    <p className="text-muted-foreground font-medium">Operations Center</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={fetchData} className="rounded-full h-10">
                        <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} /> Refresh
                    </Button>
                    <Badge className="bg-primary hover:bg-primary font-bold px-4 py-1.5 rounded-full uppercase tracking-tighter">
                        {business?.subscription_status?.replace('_', ' ')}
                    </Badge>
                </div>
            </div>

            {fetchError && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Notice</AlertTitle>
                    <AlertDescription>{fetchError}</AlertDescription>
                </Alert>
            )}

            <Tabs defaultValue="pending" className="w-full">
                <TabsList className="mb-8 grid w-full grid-cols-3 max-w-2xl bg-muted/50 p-1.5 h-12 rounded-xl">
                    <TabsTrigger value="pending" className="rounded-lg text-[10px] font-black uppercase">
                        Incoming ({pendingList.length})
                    </TabsTrigger>
                    <TabsTrigger value="active" className="rounded-lg text-[10px] font-black uppercase">
                        Active Jobs ({activeList.length})
                    </TabsTrigger>
                    <TabsTrigger value="completed" className="rounded-lg text-[10px] font-black uppercase">
                        Service History ({completedList.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="pending">
                    <Card className="shadow-2xl border-muted/50 overflow-hidden">
                        <CardHeader className="bg-muted/10 border-b py-4">
                            <CardTitle className="text-lg">New Requests</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <BookingTable list={pendingList} showActions />
                        </CardContent>
                    </Card>
                </TabsContent>
                
                <TabsContent value="active">
                    <Card className="shadow-2xl border-muted/50 overflow-hidden">
                        <CardHeader className="bg-muted/10 border-b py-4">
                            <CardTitle className="text-lg">In-Progress</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <BookingTable list={activeList} />
                        </CardContent>
                    </Card>
                </TabsContent>
                
                <TabsContent value="completed">
                    <Card className="shadow-2xl border-muted/50 overflow-hidden">
                        <CardHeader className="bg-muted/10 border-b py-4">
                            <CardTitle className="text-lg">Finished Services</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <BookingTable list={completedList} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
