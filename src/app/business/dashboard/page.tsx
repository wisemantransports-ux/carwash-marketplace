
'use client';

import React, { useEffect, useState, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
    Loader2, 
    RefreshCw, 
    AlertCircle, 
    Truck,
    Lock,
    CheckCircle2,
    XCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function BusinessDashboardPage() {
    const [bookings, setBookings] = useState<any[]>([]);
    const [staffList, setStaffList] = useState<any[]>([]);
    const [business, setBusiness] = useState<any>(null);
    const [isRestricted, setIsRestricted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    
    // Use local state to make selection "stick" immediately
    const [localStaffAssignments, setLocalStaffAssignments] = useState<Record<string, string>>({});

    const fetchData = useCallback(async (isSilent = false) => {
        if (!isSupabaseConfigured) {
            setFetchError("Supabase Configuration Missing");
            setLoading(false);
            return;
        }

        if (!isSilent) setLoading(true);
        else setRefreshing(true);
        
        setFetchError(null);

        try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) {
                setLoading(false);
                setRefreshing(false);
                return;
            }

            // 1. Pre-fetch status check to avoid RLS recursion
            const { data: profile, error: profileError } = await supabase
                .from('users_with_access')
                .select('paid, trial_expiry')
                .eq('id', authUser.id)
                .maybeSingle();

            if (profileError) throw profileError;

            const isPaid = profile?.paid === true;
            const isTrialValid = profile?.trial_expiry ? new Date(profile.trial_expiry) > new Date() : false;
            
            if (!isPaid && !isTrialValid) {
                setIsRestricted(true);
                setLoading(false);
                setRefreshing(false);
                return;
            }

            setIsRestricted(false);

            // 2. Fetch Business Identity
            const { data: bizData, error: bizError } = await supabase
                .from('businesses')
                .select('*')
                .eq('owner_id', authUser.id)
                .maybeSingle();
            
            if (bizError) throw bizError;
            
            if (bizData) {
                setBusiness(bizData);

                // 3. Fetch Staff List
                const { data: staffData, error: staffError } = await supabase
                    .from("employees")
                    .select("id, name")
                    .eq("business_id", bizData.id)
                    .order('name');
                
                if (staffError) console.error("Staff fetch error:", staffError);
                setStaffList(staffData || []);

                // 4. Fetch Bookings with Explicit Joins
                const { data: bookingData, error: bookingError } = await supabase
                    .from("bookings")
                    .select(`
                        id,
                        booking_time,
                        status,
                        staff_id,
                        customer:users!bookings_customer_id_fkey (
                            name,
                            email
                        ),
                        services!bookings_service_id_fkey (
                            name,
                            price
                        ),
                        cars!bookings_car_id_fkey (
                            make,
                            model
                        )
                    `)
                    .eq("business_id", bizData.id)
                    .order("booking_time", { ascending: true });
                
                if (bookingError) throw bookingError;
                setBookings(bookingData || []);

            } else {
                setFetchError("Business profile not found.");
            }
        } catch (error: any) {
            console.error("[DASHBOARD] Fetch error:", error);
            setFetchError(error.message || "A database error occurred.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();

        const channel = supabase
            .channel('dashboard-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
                fetchData(true);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchData]);

    const updateStatus = async (bookingId: string, status: string) => {
        try {
            const { error } = await supabase
                .from("bookings")
                .update({ status })
                .eq("id", bookingId);

            if (error) throw error;

            toast({ 
                title: status === 'accepted' ? "Booking Accepted ✅" : "Booking Rejected", 
                description: `Request has been marked as ${status}.` 
            });
            
            // Clear local state for this row
            setLocalStaffAssignments(prev => {
                const next = { ...prev };
                delete next[bookingId];
                return next;
            });

            await fetchData(true);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
        }
    };

    const handleAssignStaff = async (bookingId: string, staffId: string) => {
        if (!staffId) return;
        
        // Optimistic UI update
        setLocalStaffAssignments(prev => ({ ...prev, [bookingId]: staffId }));

        try {
            const { error } = await supabase
                .from("bookings")
                .update({ staff_id: staffId })
                .eq("id", bookingId);

            if (error) throw error;
            
            toast({ title: "Employee assigned successfully." });
            await fetchData(true);
        } catch (e: any) {
            // Revert local state on failure
            setLocalStaffAssignments(prev => {
                const next = { ...prev };
                delete next[bookingId];
                return next;
            });
            toast({ variant: 'destructive', title: 'Assignment Failed', description: e.message });
        }
    };

    const BookingTable = ({ list, isPending = false }: { list: any[], isPending?: boolean }) => (
        <Table>
            <TableHeader>
                <TableRow className="bg-muted/50">
                    <TableHead className="font-bold">Customer Name</TableHead>
                    <TableHead className="font-bold">Customer Email</TableHead>
                    <TableHead className="font-bold">Service Info</TableHead>
                    <TableHead className="font-bold">Car Make & Model</TableHead>
                    <TableHead className="font-bold">Staff</TableHead>
                    <TableHead className="font-bold">Timing</TableHead>
                    <TableHead className="text-right font-bold pr-6">Action</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {list.length > 0 ? list.map((booking) => {
                    const currentStaffId = localStaffAssignments[booking.id] || booking.staff_id || "";
                    const isStaffAssigned = !!currentStaffId;

                    return (
                        <TableRow key={booking.id} className="hover:bg-muted/20 transition-colors">
                            <TableCell className="font-bold text-sm">
                                {booking.customer?.name || "Customer"}
                            </TableCell>

                            <TableCell className="text-xs text-muted-foreground">
                                {booking.customer?.email || "No email"}
                            </TableCell>

                            <TableCell>
                                <div className="text-sm font-medium">
                                    {booking.services?.name}
                                </div>
                                <div className="text-[10px] font-bold text-primary">
                                    BWP {Number(booking.services?.price || 0).toFixed(2)}
                                </div>
                            </TableCell>

                            <TableCell className="text-sm font-bold">
                                {booking.cars?.make} {booking.cars?.model}
                            </TableCell>

                            <TableCell>
                                <select
                                    className="h-8 w-full max-w-[150px] rounded-md border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring font-bold cursor-pointer"
                                    value={currentStaffId}
                                    onChange={(e) => handleAssignStaff(booking.id, e.target.value)}
                                >
                                    <option value="">Select Staff</option>
                                    {staffList?.map((staff) => (
                                        <option key={staff.id} value={staff.id}>
                                            {staff.name}
                                        </option>
                                    ))}
                                </select>
                            </TableCell>

                            <TableCell className="text-xs">
                                <div className="font-bold">
                                    {new Date(booking.booking_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </div>
                                <div className="text-muted-foreground uppercase">
                                    {new Date(booking.booking_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </TableCell>

                            <TableCell className="text-right pr-6">
                                {isPending ? (
                                    <div className="flex justify-end gap-2">
                                        <Button 
                                            size="sm" 
                                            disabled={!isStaffAssigned}
                                            className={cn(
                                                "h-8 text-[10px] font-bold uppercase gap-1.5 min-w-[80px]",
                                                isStaffAssigned 
                                                    ? "bg-green-600 hover:bg-green-700 text-white shadow-md" 
                                                    : "bg-muted text-muted-foreground cursor-not-allowed"
                                            )}
                                            onClick={() => updateStatus(booking.id, "accepted")}
                                        >
                                            Accept ✅
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            variant="destructive"
                                            className="h-8 text-[10px] font-bold uppercase gap-1.5" 
                                            onClick={() => updateStatus(booking.id, "rejected")}
                                        >
                                            Reject ❌
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex justify-end gap-2">
                                        <Badge variant="outline" className="uppercase text-[10px] py-1">{booking.status}</Badge>
                                        {booking.status === 'accepted' && (
                                            <Button 
                                                size="sm" 
                                                className="h-8 text-[10px] font-bold uppercase" 
                                                onClick={() => updateStatus(booking.id, "completed")}
                                            >
                                                Mark Complete
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </TableCell>
                        </TableRow>
                    );
                }) : (
                    <TableRow>
                        <TableCell colSpan={7} className="h-48 text-center text-muted-foreground italic">
                            <div className="flex flex-col items-center gap-2 opacity-40">
                                <Truck className="h-10 w-10" />
                                <p>{isPending ? "No pending requests available" : "No bookings available yet."}</p>
                            </div>
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );

    if (loading) return <div className="flex justify-center py-32"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;
    
    if (isRestricted) return (
        <div className="flex flex-col items-center justify-center py-20 bg-muted/10 border-2 border-dashed rounded-3xl m-8 text-center">
            <Lock className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
            <h2 className="text-2xl font-bold">Operations Restricted</h2>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                Your professional features are currently paused. Please upgrade or renew your plan to view and manage bookings.
            </p>
            <div className="mt-8 flex gap-4">
                <Button asChild>
                    <Link href="/business/subscription">Renew Access Now</Link>
                </Button>
            </div>
        </div>
    );

    const pendingList = bookings.filter(b => b.status === 'pending');
    const activeList = bookings.filter(b => ['accepted', 'active', 'in-progress'].includes(b.status));
    const completedList = bookings.filter(b => b.status === 'completed');

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-extrabold tracking-tight text-primary">{business?.name || 'My Business'}</h1>
                    <p className="text-muted-foreground font-medium">Operations Center</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={() => fetchData(true)} className="rounded-full h-10">
                        <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} /> Refresh Queue
                    </Button>
                    <Badge className="bg-primary font-bold px-4 py-1.5 rounded-full uppercase tracking-tighter">
                        {business?.subscription_status?.replace('_', ' ') || 'ACTIVE'}
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
                        History ({completedList.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="pending">
                    <Card className="shadow-2xl border-muted/50 overflow-hidden">
                        <CardHeader className="bg-muted/10 border-b py-4">
                            <CardTitle className="text-lg">New Booking Requests</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <BookingTable list={pendingList} isPending />
                        </CardContent>
                    </Card>
                </TabsContent>
                
                <TabsContent value="active">
                    <Card className="shadow-2xl border-muted/50 overflow-hidden">
                        <CardHeader className="bg-muted/10 border-b py-4">
                            <CardTitle className="text-lg">In-Progress Services</CardTitle>
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
