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
    Star
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
    const [mounted, setMounted] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    
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

            // 1. Restriction Pre-Check via users_with_access view
            const { data: profile, error: profileError } = await supabase
                .from('users_with_access')
                .select('paid, trial_expiry')
                .eq('id', authUser.id)
                .maybeSingle();

            if (profileError) {
                console.error("[DASHBOARD] Profile Check Error:", JSON.stringify(profileError, null, 2));
                throw profileError;
            }

            const isPaid = profile?.paid === true;
            const isTrialValid = profile?.trial_expiry ? new Date(profile.trial_expiry) > new Date() : false;
            
            if (!isPaid && !isTrialValid) {
                setIsRestricted(true);
                setLoading(false);
                setRefreshing(false);
                return;
            }

            setIsRestricted(false);

            // 2. Fetch Business Record
            const { data: bizData, error: bizError } = await supabase
                .from('businesses')
                .select('*')
                .eq('owner_id', authUser.id)
                .maybeSingle();
            
            if (bizError) {
                console.error("[DASHBOARD] Business Record Error:", JSON.stringify(bizError, null, 2));
                throw bizError;
            }
            
            if (bizData) {
                setBusiness(bizData);

                // 3. Fetch Staff
                const { data: staffData } = await supabase
                    .from("employees")
                    .select("id, name")
                    .eq("business_id", bizData.id)
                    .order('name');
                
                setStaffList(staffData || []);

                // 4. Fetch Bookings with Explicit Relationship Naming
                const { data: bookingData, error: bookingError } = await supabase
                    .from("bookings")
                    .select(`
                        id,
                        booking_time,
                        status,
                        staff_id,
                        price,
                        customer:users!bookings_customer_id_fkey ( name, email ),
                        service:services!bookings_service_id_fkey ( name, price ),
                        car:cars!bookings_car_id_fkey ( make, model ),
                        staff:employees!bookings_staff_id_fkey ( name ),
                        rating:ratings!booking_id ( rating, feedback )
                    `)
                    .eq("business_id", bizData.id)
                    .order("booking_time", { ascending: true });
                
                if (bookingError) {
                    console.error("[DASHBOARD] Booking Fetch Error:", JSON.stringify(bookingError, null, 2));
                    throw bookingError;
                }
                
                setBookings(bookingData || []);

            } else {
                setFetchError("Business profile not found. Please complete your profile setup.");
            }
        } catch (error: any) {
            setFetchError(error.message || "A database error occurred while loading operational data.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        setMounted(true);
        fetchData();

        const channel = supabase
            .channel('dashboard-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
                fetchData(true);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [fetchData]);

    const updateStatus = async (bookingId: string, status: string) => {
        try {
            const { error } = await supabase
                .from("bookings")
                .update({ status })
                .eq("id", bookingId);

            if (error) throw error;

            toast({ 
                title: status === 'accepted' ? "Booking Accepted ✅" : "Booking Rejected ❌",
                description: status === 'accepted' ? "Invoice generated automatically." : "Request removed."
            });
            
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
        
        setLocalStaffAssignments(prev => ({ ...prev, [bookingId]: staffId }));

        try {
            const { error } = await supabase
                .from("bookings")
                .update({ staff_id: staffId })
                .eq("id", bookingId);

            if (error) throw error;
            await fetchData(true);
        } catch (e: any) {
            setLocalStaffAssignments(prev => {
                const next = { ...prev };
                delete next[bookingId];
                return next;
            });
            toast({ variant: 'destructive', title: 'Assignment Failed', description: e.message });
        }
    };

    if (!mounted) return <div className="flex justify-center py-32"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;

    if (isRestricted) return (
        <div className="flex flex-col items-center justify-center py-20 bg-muted/10 border-2 border-dashed rounded-3xl m-8 text-center">
            <Lock className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
            <h2 className="text-2xl font-bold">Operations Restricted</h2>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">Renew your plan or extend your trial to access real-time bookings.</p>
            <Button asChild className="mt-8 shadow-lg"><Link href="/business/subscription">Renew Access Now</Link></Button>
        </div>
    );

    const BookingTable = ({ list, isPending = false, isHistory = false }: { list: any[], isPending?: boolean, isHistory?: boolean }) => (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50 border-b-2">
                        <TableHead className="font-bold whitespace-nowrap px-4 py-4">Customer Name</TableHead>
                        <TableHead className="font-bold whitespace-nowrap px-4">Customer Email</TableHead>
                        <TableHead className="font-bold whitespace-nowrap px-4">Service Info</TableHead>
                        <TableHead className="font-bold whitespace-nowrap px-4">Car Make & Model</TableHead>
                        <TableHead className="font-bold whitespace-nowrap px-4">Staff</TableHead>
                        <TableHead className="font-bold whitespace-nowrap px-4">Timing</TableHead>
                        <TableHead className={cn("text-right font-bold pr-6 whitespace-nowrap", isHistory && "text-center")}>
                            {isHistory ? "Feedback" : "Action"}
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {list.length > 0 ? list.map((booking) => {
                        const currentStaffId = localStaffAssignments[booking.id] || booking.staff_id || "";
                        const isStaffAssigned = !!currentStaffId;
                        const rating = booking.rating?.[0];

                        const timing = booking.booking_time 
                            ? new Date(booking.booking_time).toLocaleString('en-US', { month: 'short', day: 'numeric' }) + 
                              " - " + 
                              new Date(booking.booking_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : "---";

                        return (
                            <TableRow key={booking.id} className="hover:bg-muted/20 transition-colors border-b">
                                <TableCell className="font-bold text-sm px-4 py-4">{booking.customer?.name || '---'}</TableCell>
                                <TableCell className="text-xs text-muted-foreground px-4">{booking.customer?.email || '---'}</TableCell>
                                <TableCell className="px-4">
                                    <div className="text-xs font-medium">{booking.service?.name}</div>
                                    <div className="text-[10px] font-bold text-primary">BWP {Number(booking.service?.price || 0).toFixed(2)}</div>
                                </TableCell>
                                <TableCell className="text-xs font-bold px-4">
                                    {booking.car?.make} {booking.car?.model}
                                </TableCell>
                                <TableCell className="px-4 min-w-[160px]">
                                    {isHistory ? (
                                        <span className="text-xs font-medium">{booking.staff?.name || 'Unassigned'}</span>
                                    ) : (
                                        <select
                                            className="h-9 w-full rounded-md border bg-background px-2 py-1 text-xs font-bold cursor-pointer focus:ring-2 focus:ring-primary outline-none transition-all"
                                            value={currentStaffId}
                                            onChange={(e) => handleAssignStaff(booking.id, e.target.value)}
                                        >
                                            <option value="">Select Staff</option>
                                            {staffList?.map((staff) => (
                                                <option key={staff.id} value={staff.id}>{staff.name}</option>
                                            ))}
                                        </select>
                                    )}
                                </TableCell>
                                <TableCell className="text-[11px] font-medium px-4 whitespace-nowrap">
                                    {timing}
                                </TableCell>
                                <TableCell className={cn("text-right pr-6", isHistory && "text-center")}>
                                    {isPending ? (
                                        <div className="flex justify-end gap-2">
                                            <Button 
                                                size="sm" 
                                                disabled={!isStaffAssigned}
                                                className={cn(
                                                    "h-8 text-[10px] font-bold uppercase transition-all shadow-sm", 
                                                    isStaffAssigned ? "bg-green-600 hover:bg-green-700 text-white" : "bg-muted text-muted-foreground"
                                                )}
                                                onClick={() => updateStatus(booking.id, "accepted")}
                                            >Accept ✅</Button>
                                            <Button 
                                                size="sm" 
                                                variant="destructive" 
                                                className="h-8 text-[10px] font-bold uppercase shadow-sm" 
                                                onClick={() => updateStatus(booking.id, "rejected")}
                                            >Reject ❌</Button>
                                        </div>
                                    ) : isHistory ? (
                                        rating ? (
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="flex gap-0.5">
                                                    {Array.from({length: 5}).map((_, i) => (
                                                        <Star key={i} className={cn("h-3 w-3", i < rating.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300")} />
                                                    ))}
                                                </div>
                                                {rating.feedback && <span className="text-[10px] text-muted-foreground italic line-clamp-1 max-w-[100px]">"{rating.feedback}"</span>}
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-muted-foreground italic">No rating</span>
                                        )
                                    ) : (
                                        <Badge variant="outline" className="uppercase text-[10px] py-1 border-primary/20 text-primary">{booking.status}</Badge>
                                    )}
                                </TableCell>
                            </TableRow>
                        );
                    }) : (
                        <TableRow>
                            <TableCell colSpan={7} className="h-48 text-center text-muted-foreground italic">
                                <Truck className="h-10 w-10 mx-auto opacity-20 mb-2" />
                                No requests available.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );

    const pendingList = bookings.filter(b => b.status === 'pending');
    const activeList = bookings.filter(b => ['accepted', 'active', 'in-progress'].includes(b.status));
    const completedList = bookings.filter(b => b.status === 'completed');

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-extrabold tracking-tight text-primary">{business?.name || 'Operations'}</h1>
                    <p className="text-muted-foreground font-medium">Real-time Booking Center</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={() => fetchData(true)} className="rounded-full h-10 px-6 border-primary/20 hover:bg-primary/5">
                        <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} /> Refresh Queue
                    </Button>
                    <Badge className="bg-primary text-white font-bold px-4 py-1.5 rounded-full uppercase shadow-sm">
                        {business?.subscription_status || 'ACTIVE'}
                    </Badge>
                </div>
            </div>

            {fetchError && (
                <Alert variant="destructive" className="border-2 shadow-lg">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="font-bold">Operational Error</AlertTitle>
                    <AlertDescription>{fetchError}</AlertDescription>
                </Alert>
            )}

            <Tabs defaultValue="pending" className="w-full">
                <TabsList className="mb-8 grid w-full grid-cols-3 max-w-2xl bg-muted/50 p-1.5 h-12 rounded-xl border">
                    <TabsTrigger value="pending" className="rounded-lg text-[10px] font-black uppercase">
                        Incoming ({pendingList.length})
                    </TabsTrigger>
                    <TabsTrigger value="active" className="rounded-lg text-[10px] font-black uppercase">
                        Active ({activeList.length})
                    </TabsTrigger>
                    <TabsTrigger value="completed" className="rounded-lg text-[10px] font-black uppercase">
                        History ({completedList.length})
                    </TabsTrigger>
                </TabsList>
                
                <TabsContent value="pending" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <Card className="shadow-2xl overflow-hidden border-2 border-primary/5">
                        <BookingTable list={pendingList} isPending />
                    </Card>
                </TabsContent>
                
                <TabsContent value="active" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <Card className="shadow-2xl overflow-hidden border-2 border-primary/5">
                        <BookingTable list={activeList} />
                    </Card>
                </TabsContent>
                
                <TabsContent value="completed" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <Card className="shadow-2xl overflow-hidden border-2 border-primary/5">
                        <BookingTable list={completedList} isHistory />
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
