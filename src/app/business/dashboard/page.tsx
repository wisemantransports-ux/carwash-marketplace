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
    Star, 
    MessageCircle, 
    ShieldCheck, 
    RefreshCw, 
    AlertCircle, 
    User, 
    UserCheck,
    Check,
    Mail,
    Info,
    Truck,
    Ban
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShareBusinessCard } from "@/components/app/share-business-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export default function BusinessDashboardPage() {
    const [bookings, setBookings] = useState<any[]>([]);
    const [business, setBusiness] = useState<any>(null);
    const [employees, setEmployees] = useState<any[]>([]);
    const [stats, setStats] = useState({ avgRating: 0, totalReviews: 0, latestReview: null as any });
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    
    const [assignments, setAssignments] = useState<Record<string, string>>({});

    const fetchData = useCallback(async () => {
        if (!isSupabaseConfigured) {
            setFetchError("Supabase Configuration Missing");
            setLoading(false);
            return;
        }

        setLoading(true);
        setFetchError(null);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }

            const { data: bizData, error: bizError } = await supabase
                .from('businesses')
                .select('*')
                .eq('owner_id', user.id)
                .maybeSingle();
            
            if (bizError) throw bizError;
            
            if (bizData) {
                setBusiness(bizData);
                console.log(`[DASHBOARD DEBUG] Business Found:`, bizData.id);

                // Fetch Staff
                const { data: staffData } = await supabase
                    .from('employees')
                    .select('id, name')
                    .eq('business_id', bizData.id)
                    .order('name');
                
                console.log(`[DASHBOARD DEBUG] Staff Fetched:`, staffData);
                setEmployees(staffData || []);

                // Fetch Bookings with Relational Joins
                const { data: bookingData, error: bookingError } = await supabase
                    .from('bookings')
                    .select(`
                        id,
                        booking_time,
                        status,
                        mobile_status,
                        price,
                        customer:customer_id ( name, email ),
                        service:service_id ( name, price, duration ),
                        car:car_id ( make, model ),
                        staff:staff_id ( name )
                    `)
                    .eq('business_id', bizData.id)
                    .order('booking_time', { ascending: true });
                
                if (bookingError) throw bookingError;
                setBookings(bookingData || []);

                const { data: ratingsData } = await supabase
                    .from('ratings')
                    .select('*, customer:customer_id(name)')
                    .eq('business_id', bizData.id);

                if (ratingsData && ratingsData.length > 0) {
                    const avg = ratingsData.reduce((acc, curr) => acc + curr.rating, 0) / ratingsData.length;
                    setStats({
                        avgRating: avg,
                        totalReviews: ratingsData.length,
                        latestReview: ratingsData[0]
                    });
                }
            } else {
                setFetchError("Business profile not found.");
            }
        } catch (error: any) {
            console.error("[DASHBOARD DEBUG] Fetch error:", error);
            setFetchError("Unable to fetch data.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAcceptBooking = async (bookingId: string) => {
        const staffId = assignments[bookingId];
        if (!staffId) {
            toast({ variant: 'destructive', title: "Staff Required", description: "Please assign staff first." });
            return;
        }

        try {
            const { error } = await supabase
                .from('bookings')
                .update({ status: 'confirmed', staff_id: staffId })
                .eq('id', bookingId);

            if (error) throw error;

            toast({ title: "Booking Accepted" });
            setBookings(prev => prev.map(b => 
                b.id === bookingId 
                    ? { ...b, status: 'confirmed', staff: { name: employees.find(e => e.id === staffId)?.name } } 
                    : b
            ));
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Action Failed', description: e.message });
        }
    };

    const handleRejectBooking = async (bookingId: string) => {
        try {
            const { error } = await supabase
                .from('bookings')
                .update({ status: 'cancelled' })
                .eq('id', bookingId);

            if (error) throw error;
            toast({ title: "Booking Rejected" });
            setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled' } : b));
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Action Failed', description: e.message });
        }
    };

    const handleCompleteBooking = async (bookingId: string) => {
        try {
            const { error } = await supabase
                .from('bookings')
                .update({ status: 'completed' })
                .eq('id', bookingId);

            if (error) throw error;
            toast({ title: "Booking Completed" });
            setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'completed' } : b));
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
        }
    };

    const BookingTable = ({ list, showActions = false, isConfirmed = false }: { list: any[], showActions?: boolean, isConfirmed?: boolean }) => (
        <Table>
            <TableHeader>
                <TableRow className="bg-muted/50">
                    <TableHead className="w-[180px]">Customer</TableHead>
                    <TableHead className="w-[220px]">Vehicle</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Timing</TableHead>
                    <TableHead>Assignment</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {list.length > 0 ? list.map((booking) => (
                    <TableRow key={booking.id} className="hover:bg-muted/20">
                        <TableCell className="align-top py-4">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 font-bold text-sm">
                                    <User className="h-3.5 w-3.5 text-primary" />
                                    {booking.customer?.name || 'No customer'}
                                </div>
                                <div className="text-[10px] text-muted-foreground">{booking.customer?.email}</div>
                            </div>
                        </TableCell>
                        <TableCell className="align-top py-4">
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-2 text-sm font-black text-primary uppercase">
                                    <Car className="h-4 w-4" />
                                    {booking.car ? `${booking.car.make} ${booking.car.model}` : 'No vehicle'}
                                </div>
                            </div>
                        </TableCell>
                        <TableCell className="align-top py-4">
                            <div className="flex flex-col gap-1">
                                <div className="font-bold text-xs uppercase">{booking.service?.name}</div>
                                <div className="text-[10px] font-bold text-primary">P{booking.service?.price || booking.price}</div>
                            </div>
                        </TableCell>
                        <TableCell className="align-top py-4 text-[11px]">
                            <div className="font-bold">{new Date(booking.booking_time).toLocaleDateString()}</div>
                            <div className="text-muted-foreground">{new Date(booking.booking_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </TableCell>
                        <TableCell className="align-top py-4">
                            {booking.status === 'pending' ? (
                                <Select 
                                    value={assignments[booking.id] || ""} 
                                    onValueChange={(val) => setAssignments(prev => ({ ...prev, [booking.id]: val }))}
                                >
                                    <SelectTrigger className="w-[130px] h-8 text-[10px] font-bold">
                                        <SelectValue placeholder="Assign Staff..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {employees.map(emp => (
                                            <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                                        ))}
                                        {employees.length === 0 && <div className="p-2 text-[10px] italic">No staff registered</div>}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Badge variant="outline" className="flex items-center gap-1 bg-muted/50 text-[10px] font-bold">
                                    <UserCheck className="h-3 w-3 text-green-600" />
                                    {booking.staff?.name || 'Assigned'}
                                </Badge>
                            )}
                        </TableCell>
                        <TableCell className="text-right align-top py-4">
                            <div className="flex justify-end gap-2">
                                {showActions && booking.status === 'pending' && (
                                    <>
                                        <Button size="sm" className="h-8 bg-green-600 text-[10px] font-bold" onClick={() => handleAcceptBooking(booking.id)} disabled={!assignments[booking.id]}>
                                            <Check className="h-3 w-3 mr-1" /> Accept
                                        </Button>
                                        <Button size="sm" variant="ghost" className="h-8 text-destructive text-[10px] font-bold" onClick={() => handleRejectBooking(booking.id)}>
                                            <Ban className="h-3 w-3 mr-1" /> Reject
                                        </Button>
                                    </>
                                )}
                                {isConfirmed && booking.status === 'confirmed' && (
                                    <Button size="sm" className="h-8 text-[10px] font-bold" onClick={() => handleCompleteBooking(booking.id)}>
                                        <CheckCircle2 className="h-3 w-3 mr-1" /> Complete
                                    </Button>
                                )}
                            </div>
                        </TableCell>
                    </TableRow>
                )) : (
                    <TableRow><TableCell colSpan={6} className="h-48 text-center text-muted-foreground italic">No bookings found.</TableCell></TableRow>
                )}
            </TableBody>
        </Table>
    );

    if (loading && !business) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;
    
    if (!business) return <div className="text-center py-20">Profile Required</div>;

    const pendingList = bookings.filter(b => b.status === 'pending');
    const confirmedList = bookings.filter(b => b.status === 'confirmed');
    const completedList = bookings.filter(b => b.status === 'completed');
    const historyList = bookings.filter(b => ['cancelled', 'rejected'].includes(b.status));

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight text-primary">{business.name}</h1>
                    <p className="text-muted-foreground">Operations Control & Staff Assignment</p>
                </div>
                <Button variant="ghost" size="icon" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
            </div>

            {fetchError && <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{fetchError}</AlertDescription></Alert>}

            <Tabs defaultValue="pending" className="w-full">
                <TabsList className="mb-8 grid w-full grid-cols-4 max-w-2xl bg-muted/50">
                    <TabsTrigger value="pending" className="text-[10px] font-black uppercase">Incoming ({pendingList.length})</TabsTrigger>
                    <TabsTrigger value="confirmed" className="text-[10px] font-black uppercase">Confirmed ({confirmedList.length})</TabsTrigger>
                    <TabsTrigger value="completed" className="text-[10px] font-black uppercase">Done ({completedList.length})</TabsTrigger>
                    <TabsTrigger value="cancelled" className="text-[10px] font-black uppercase">History ({historyList.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="pending"><Card><BookingTable list={pendingList} showActions /></Card></TabsContent>
                <TabsContent value="confirmed"><Card><BookingTable list={confirmedList} isConfirmed /></Card></TabsContent>
                <TabsContent value="completed"><Card><BookingTable list={completedList} /></Card></TabsContent>
                <TabsContent value="cancelled"><Card><BookingTable list={historyList} /></Card></TabsContent>
            </Tabs>
        </div>
    );
}