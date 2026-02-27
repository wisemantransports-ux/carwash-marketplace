
'use client';

import React, { useEffect, useState, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
    Calendar, 
    Clock, 
    Car, 
    Loader2, 
    CheckCircle2, 
    XCircle, 
    Star, 
    MessageCircle, 
    ShieldCheck, 
    RefreshCw, 
    AlertCircle, 
    User, 
    UserCheck,
    Check
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShareBusinessCard } from "@/components/app/share-business-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Placeholder for future multi-channel notifications
const notifyCustomer = (bookingId: string, message: string) => {
    console.log(`[NOTIFICATION] Booking ${bookingId}: ${message}`);
    // Future: Integrate with WhatsApp / Email / Push
};

export default function BusinessDashboardPage() {
    const [bookings, setBookings] = useState<any[]>([]);
    const [business, setBusiness] = useState<any>(null);
    const [employees, setEmployees] = useState<any[]>([]);
    const [stats, setStats] = useState({ avgRating: 0, totalReviews: 0, latestReview: null as any });
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    
    // Tracking assignments locally for pending bookings
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

            // 1. Fetch Business Profile
            const { data: bizData, error: bizError } = await supabase
                .from('businesses')
                .select('*')
                .eq('owner_id', user.id)
                .maybeSingle();
            
            if (bizError) throw bizError;
            if (bizData) {
                setBusiness(bizData);

                // 2. Fetch Staff (Resilient check for both Business UUID and Owner UID)
                const { data: staffData } = await supabase
                    .from('employees')
                    .select('id, name')
                    .or(`business_id.eq.${bizData.id},business_id.eq.${user.id}`);
                
                setEmployees(staffData || []);

                // 3. Fetch Bookings with Relations
                const { data: bookingData, error: bookingError } = await supabase
                    .from('bookings')
                    .select(`
                        id,
                        customer_id,
                        service_id,
                        car_id,
                        staff_id,
                        booking_time,
                        status,
                        mobile_status,
                        price,
                        customer:customer_id ( name, email ),
                        service:service_id ( name, duration ),
                        car:car_id ( make, model ),
                        staff:staff_id ( name )
                    `)
                    .eq('business_id', bizData.id)
                    .order('booking_time', { ascending: true });
                
                if (bookingError) throw bookingError;
                setBookings(bookingData || []);

                // 4. Fetch Ratings Summary
                const { data: ratingsData } = await supabase
                    .from('ratings')
                    .select('*, customer:customer_id(name)')
                    .eq('business_id', bizData.id)
                    .order('created_at', { ascending: false });

                if (ratingsData && ratingsData.length > 0) {
                    const avg = ratingsData.reduce((acc, curr) => acc + curr.rating, 0) / ratingsData.length;
                    setStats({
                        avgRating: avg,
                        totalReviews: ratingsData.length,
                        latestReview: ratingsData[0]
                    });
                }
            }
        } catch (error: any) {
            console.error("Dashboard fetch error:", error);
            setFetchError("Unable to fetch bookings. Check database connection.");
            toast({ variant: 'destructive', title: 'Data Error', description: 'Unable to fetch bookings. Check database connection.' });
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
            toast({ variant: 'destructive', title: "Staff Required", description: "Please assign a staff member before accepting." });
            return;
        }

        try {
            const { data, error } = await supabase
                .from('bookings')
                .update({ 
                    status: 'confirmed',
                    staff_id: staffId 
                })
                .eq('id', bookingId)
                .select();

            if (error) throw error;

            toast({ title: "Booking Accepted", description: "The request has been moved to confirmed." });
            notifyCustomer(bookingId, "Your booking has been confirmed");
            
            // Local update for immediate UI feedback
            setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'confirmed', staff_id: staffId, staff: employees.find(e => e.id === staffId) } : b));
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
        }
    };

    const handleCancelBooking = async (bookingId: string) => {
        try {
            const { error } = await supabase
                .from('bookings')
                .update({ status: 'cancelled' })
                .eq('id', bookingId)
                .select();

            if (error) throw error;

            toast({ title: "Booking Cancelled", description: "The request status has been updated to cancelled." });
            
            // Local update
            setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled' } : b));
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Cancellation Failed', description: e.message });
        }
    };

    const handleCompleteBooking = async (bookingId: string) => {
        try {
            const { error } = await supabase
                .from('bookings')
                .update({ status: 'completed' })
                .eq('id', bookingId)
                .select();

            if (error) throw error;

            toast({ title: "Booking Completed", description: "Great job! The service is marked as complete." });
            
            // Local update
            setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'completed' } : b));
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
        }
    };

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;
    
    if (!business) return <div className="text-center py-20">Business profile not found. Please complete your profile.</div>;

    // Filters
    const pendingList = bookings.filter(b => b.status === 'pending');
    const confirmedList = bookings.filter(b => b.status === 'confirmed');
    const completedList = bookings.filter(b => b.status === 'completed');
    const cancelledList = bookings.filter(b => b.status === 'cancelled' || b.status === 'rejected');

    const BookingTable = ({ list, showActions = false, isConfirmed = false }: { list: any[], showActions?: boolean, isConfirmed?: boolean }) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Car Details</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Staff Assignment</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {list.length > 0 ? list.map((booking) => (
                    <TableRow key={booking.id}>
                        <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <div className="font-bold">{booking.customer?.name || 'Unknown'}</div>
                                    <div className="text-[10px] text-muted-foreground">{booking.customer?.email}</div>
                                </div>
                            </div>
                        </TableCell>
                        <TableCell>
                            <div className="font-medium text-primary">{booking.service?.name || 'Wash'}</div>
                            <div className="text-[10px] text-muted-foreground">{booking.service?.duration} mins • P{Number(booking.price || 0).toFixed(2)}</div>
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-2">
                                <Car className="h-4 w-4 text-muted-foreground" />
                                {booking.car ? `${booking.car.make} ${booking.car.model}` : 'Vehicle'}
                            </div>
                        </TableCell>
                        <TableCell>
                            <div className="text-xs">
                                <div className="font-bold">{new Date(booking.booking_time).toLocaleDateString()}</div>
                                <div className="text-muted-foreground">{new Date(booking.booking_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                        </TableCell>
                        <TableCell>
                            {booking.status === 'pending' ? (
                                <Select 
                                    value={assignments[booking.id] || ""} 
                                    onValueChange={(val) => setAssignments(prev => ({ ...prev, [booking.id]: val }))}
                                >
                                    <SelectTrigger className="w-[160px] h-8 text-xs">
                                        <SelectValue placeholder="Assign Staff..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {employees.map(emp => (
                                            <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Badge variant="outline" className="flex items-center gap-1 w-fit bg-primary/5">
                                    <UserCheck className="h-3 w-3" />
                                    {booking.staff?.name || 'Assigned'}
                                </Badge>
                            )}
                        </TableCell>
                        <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                                {showActions && booking.status === 'pending' && (
                                    <>
                                        <Button 
                                            size="sm" 
                                            className="h-8 bg-green-600 hover:bg-green-700"
                                            onClick={() => handleAcceptBooking(booking.id)}
                                            disabled={!assignments[booking.id]}
                                        >
                                            <Check className="h-4 w-4 mr-1" /> Accept
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            className="h-8 text-destructive hover:bg-destructive/10"
                                            onClick={() => handleCancelBooking(booking.id)}
                                        >
                                            <XCircle className="h-4 w-4 mr-1" /> Reject
                                        </Button>
                                    </>
                                )}
                                {isConfirmed && booking.status === 'confirmed' && (
                                    <Button 
                                        size="sm" 
                                        className="h-8"
                                        onClick={() => handleCompleteBooking(booking.id)}
                                    >
                                        <CheckCircle2 className="h-4 w-4 mr-1" /> Mark Done
                                    </Button>
                                )}
                                {(booking.status === 'completed' || booking.status === 'cancelled') && (
                                    <Badge variant={booking.status === 'completed' ? 'secondary' : 'destructive'} className="text-[10px]">
                                        {booking.status.toUpperCase()}
                                    </Badge>
                                )}
                            </div>
                        </TableCell>
                    </TableRow>
                )) : (
                    <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic">
                            No bookings found in this category.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                        <h1 className="text-4xl font-bold tracking-tight text-primary">{business.name}</h1>
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 uppercase">
                            {business.type}
                        </Badge>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
                    </div>
                    <p className="text-muted-foreground text-lg">Operations center for your car wash.</p>
                </div>
                <div className="w-full md:w-80 shrink-0"><ShareBusinessCard businessId={business.id} /></div>
            </div>

            {fetchError && (
                <Alert variant="destructive" className="border-destructive/20 bg-destructive/5">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Connection Alert</AlertTitle>
                    <AlertDescription>{fetchError}</AlertDescription>
                </Alert>
            )}

            <div className="grid gap-6 md:grid-cols-4">
                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase flex items-center gap-2">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" /> Reputation
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{stats.avgRating.toFixed(1)}</div>
                        <p className="text-xs text-muted-foreground mt-1">{stats.totalReviews} reviews</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-green-600" /> Plan Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold">{business.subscription_plan || 'Starter'}</div>
                        <p className="text-xs text-blue-600 mt-1 font-medium">{(business.subscription_status || 'active').toUpperCase()}</p>
                    </CardContent>
                </Card>

                {stats.latestReview && (
                    <Card className="md:col-span-2">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase flex items-center gap-2">
                                <MessageCircle className="h-4 w-4 text-primary" /> Latest Feedback
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="font-bold text-sm">{stats.latestReview.customer?.name}</span>
                                <div className="flex">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <Star key={i} className={cn("h-3 w-3", i < stats.latestReview.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200")} />
                                    ))}
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground italic line-clamp-1">"{stats.latestReview.feedback || 'No comment'}"</p>
                        </CardContent>
                    </Card>
                )}
            </div>

            <Tabs defaultValue="pending" className="w-full">
                <TabsList className="mb-8 grid w-full grid-cols-4 max-w-2xl bg-muted/50 p-1">
                    <TabsTrigger value="pending" className="data-[state=active]:bg-background">
                        Pending ({pendingList.length})
                    </TabsTrigger>
                    <TabsTrigger value="confirmed" className="data-[state=active]:bg-background">
                        Confirmed ({confirmedList.length})
                    </TabsTrigger>
                    <TabsTrigger value="completed" className="data-[state=active]:bg-background">
                        Completed ({completedList.length})
                    </TabsTrigger>
                    <TabsTrigger value="history" className="data-[state=active]:bg-background">
                        History ({cancelledList.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="pending">
                    <Card className="shadow-lg border-muted/50 overflow-hidden">
                        <CardHeader className="bg-muted/10 border-b">
                            <CardTitle>Incoming Requests</CardTitle>
                            <CardDescription>Review new bookings and assign staff to confirm them.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <BookingTable list={pendingList} showActions />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="confirmed">
                    <Card className="shadow-lg border-muted/50 overflow-hidden">
                        <CardHeader className="bg-muted/10 border-b">
                            <CardTitle>Active Schedule</CardTitle>
                            <CardDescription>Confirmed washes currently in queue or being serviced.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <BookingTable list={confirmedList} isConfirmed />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="completed">
                    <Card className="shadow-lg border-muted/50 overflow-hidden">
                        <CardHeader className="bg-muted/10 border-b">
                            <CardTitle>Service History</CardTitle>
                            <CardDescription>Recently finished bookings.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <BookingTable list={completedList} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="history">
                    <Card className="shadow-lg border-muted/50 overflow-hidden opacity-80">
                        <CardHeader className="bg-muted/10 border-b">
                            <CardTitle>Cancelled/Rejected</CardTitle>
                            <CardDescription>A record of requests that did not proceed.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <BookingTable list={cancelledList} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
