
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
    Check,
    Mail,
    Info,
    Banknote
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
};

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

                const { data: staffData } = await supabase
                    .from('employees')
                    .select('id, name')
                    .or(`business_id.eq.${bizData.id},business_id.eq.${user.id}`);
                
                setEmployees(staffData || []);

                // Updated Join Query for Full Context
                const { data: bookingData, error: bookingError } = await supabase
                    .from('bookings')
                    .select(`
                        id,
                        booking_time,
                        status,
                        mobile_status,
                        price,
                        customer:customer_id ( name, email ),
                        service:service_id ( name, description, price, duration ),
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
            const { error } = await supabase
                .from('bookings')
                .update({ 
                    status: 'confirmed',
                    staff_id: staffId 
                })
                .eq('id', bookingId);

            if (error) throw error;

            toast({ title: "Booking Accepted", description: "The request has been moved to confirmed." });
            notifyCustomer(bookingId, "Your booking has been confirmed");
            fetchData();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
        }
    };

    const handleRejectBooking = async (bookingId: string) => {
        try {
            const { error } = await supabase
                .from('bookings')
                .update({ status: 'rejected' })
                .eq('id', bookingId);

            if (error) throw error;

            toast({ title: "Booking Rejected", description: "The request has been marked as rejected." });
            fetchData();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
        }
    };

    const handleCompleteBooking = async (bookingId: string) => {
        try {
            const { error } = await supabase
                .from('bookings')
                .update({ status: 'completed' })
                .eq('id', bookingId);

            if (error) throw error;

            toast({ title: "Booking Completed", description: "The service is marked as complete." });
            fetchData();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
        }
    };

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;
    
    if (!business) return <div className="text-center py-20">Business profile not found. Please complete your profile.</div>;

    const pendingList = bookings.filter(b => b.status === 'pending');
    const confirmedList = bookings.filter(b => b.status === 'confirmed');
    const completedList = bookings.filter(b => b.status === 'completed');
    const historyList = bookings.filter(b => ['cancelled', 'rejected'].includes(b.status));

    const BookingTable = ({ list, showActions = false, isConfirmed = false }: { list: any[], showActions?: boolean, isConfirmed?: boolean }) => (
        <Table>
            <TableHeader>
                <TableRow className="bg-muted/50">
                    <TableHead className="w-[200px]">Customer</TableHead>
                    <TableHead>Service Context</TableHead>
                    <TableHead>Vehicle</TableHead>
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
                                    {booking.customer?.name || 'Unknown Customer'}
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                    <Mail className="h-3 w-3" />
                                    {booking.customer?.email}
                                </div>
                            </div>
                        </TableCell>
                        <TableCell className="align-top py-4">
                            <div className="flex flex-col gap-1 max-w-[250px]">
                                <div className="font-bold text-sm text-primary uppercase tracking-tight">
                                    {booking.service?.name}
                                </div>
                                <div className="flex items-center gap-3 text-[10px] font-bold">
                                    <span className="flex items-center gap-1 bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                        <Banknote className="h-3 w-3" />
                                        P{Number(booking.service?.price || booking.price).toFixed(2)}
                                    </span>
                                    <span className="flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        {booking.service?.duration} mins
                                    </span>
                                </div>
                                <p className="text-[10px] text-muted-foreground line-clamp-2 mt-1 italic">
                                    {booking.service?.description}
                                </p>
                            </div>
                        </TableCell>
                        <TableCell className="align-top py-4">
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <Car className="h-4 w-4 text-muted-foreground" />
                                {booking.car ? `${booking.car.make} ${booking.car.model}` : 'N/A'}
                            </div>
                        </TableCell>
                        <TableCell className="align-top py-4">
                            <div className="flex flex-col gap-0.5 text-xs">
                                <div className="font-bold">{new Date(booking.booking_time).toLocaleDateString()}</div>
                                <div className="text-muted-foreground">{new Date(booking.booking_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                        </TableCell>
                        <TableCell className="align-top py-4">
                            {booking.status === 'pending' ? (
                                <Select 
                                    value={assignments[booking.id] || ""} 
                                    onValueChange={(val) => setAssignments(prev => ({ ...prev, [booking.id]: val }))}
                                >
                                    <SelectTrigger className="w-[140px] h-8 text-[10px] font-bold">
                                        <SelectValue placeholder="Assign Staff..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {employees.map(emp => (
                                            <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Badge variant="secondary" className="flex items-center gap-1 w-fit bg-primary/5 text-[10px] font-bold py-1 border-primary/10">
                                    <UserCheck className="h-3 w-3" />
                                    {booking.staff?.name || 'Assigned'}
                                </Badge>
                            )}
                        </TableCell>
                        <TableCell className="text-right align-top py-4">
                            <div className="flex justify-end gap-2">
                                {showActions && booking.status === 'pending' && (
                                    <>
                                        <Button 
                                            size="sm" 
                                            className="h-8 bg-green-600 hover:bg-green-700 text-[10px] font-bold px-3"
                                            onClick={() => handleAcceptBooking(booking.id)}
                                            disabled={!assignments[booking.id]}
                                        >
                                            <Check className="h-3 w-3 mr-1" /> Accept
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            className="h-8 text-destructive hover:bg-destructive/10 text-[10px] font-bold"
                                            onClick={() => handleRejectBooking(booking.id)}
                                        >
                                            <XCircle className="h-3 w-3 mr-1" /> Reject
                                        </Button>
                                    </>
                                )}
                                {isConfirmed && booking.status === 'confirmed' && (
                                    <Button 
                                        size="sm" 
                                        className="h-8 text-[10px] font-bold"
                                        onClick={() => handleCompleteBooking(booking.id)}
                                    >
                                        <CheckCircle2 className="h-3 w-3 mr-1" /> Complete
                                    </Button>
                                )}
                                {['completed', 'cancelled', 'rejected'].includes(booking.status) && (
                                    <Badge 
                                        variant={booking.status === 'completed' ? 'secondary' : 'destructive'} 
                                        className="text-[9px] font-extrabold uppercase px-2 py-0.5"
                                    >
                                        {booking.status}
                                    </Badge>
                                )}
                            </div>
                        </TableCell>
                    </TableRow>
                )) : (
                    <TableRow>
                        <TableCell colSpan={6} className="h-48 text-center text-muted-foreground italic">
                            <div className="flex flex-col items-center justify-center gap-2">
                                <Info className="h-8 w-8 opacity-20" />
                                <p>No bookings found in this category.</p>
                            </div>
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
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 uppercase font-bold text-[10px]">
                            {business.type}
                        </Badge>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
                    </div>
                    <p className="text-muted-foreground text-lg">Central Operations Control</p>
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
                        <CardTitle className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2 tracking-widest">
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" /> Reputation
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-primary">{stats.avgRating.toFixed(1)}</div>
                        <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase">{stats.totalReviews} total reviews</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2 tracking-widest">
                            <ShieldCheck className="h-3 w-3 text-green-600" /> Account Level
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-black uppercase tracking-tight">{business.subscription_plan || 'Starter'}</div>
                        <p className={cn("text-[10px] mt-1 font-black px-2 py-0.5 rounded w-fit", 
                            business.subscription_status === 'active' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700")}>
                            {(business.subscription_status || 'active').toUpperCase()}
                        </p>
                    </CardContent>
                </Card>

                {stats.latestReview && (
                    <Card className="md:col-span-2">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2 tracking-widest">
                                <MessageCircle className="h-3 w-3 text-primary" /> Latest Customer Feedback
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-black text-sm">{stats.latestReview.customer?.name}</span>
                                <div className="flex">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <Star key={i} className={cn("h-3 w-3", i < stats.latestReview.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200")} />
                                    ))}
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground italic line-clamp-1">"{stats.latestReview.feedback || 'No comment'}"</p>
                        </CardContent>
                    </Card>
                )}
            </div>

            <Tabs defaultValue="pending" className="w-full">
                <TabsList className="mb-8 grid w-full grid-cols-4 max-w-2xl bg-muted/50 p-1 border border-muted-foreground/10">
                    <TabsTrigger value="pending" className="data-[state=active]:bg-background text-[10px] font-black uppercase">
                        Incoming ({pendingList.length})
                    </TabsTrigger>
                    <TabsTrigger value="confirmed" className="data-[state=active]:bg-background text-[10px] font-black uppercase">
                        Confirmed ({confirmedList.length})
                    </TabsTrigger>
                    <TabsTrigger value="completed" className="data-[state=active]:bg-background text-[10px] font-black uppercase">
                        Service Done ({completedList.length})
                    </TabsTrigger>
                    <TabsTrigger value="history" className="data-[state=active]:bg-background text-[10px] font-black uppercase">
                        History ({historyList.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="pending">
                    <Card className="shadow-2xl border-muted/50 overflow-hidden">
                        <CardHeader className="bg-muted/10 border-b py-4">
                            <CardTitle className="text-lg">Incoming Requests</CardTitle>
                            <CardDescription className="text-xs">Review details and assign staff to confirm these bookings.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <BookingTable list={pendingList} showActions />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="confirmed">
                    <Card className="shadow-2xl border-muted/50 overflow-hidden">
                        <CardHeader className="bg-muted/10 border-b py-4">
                            <CardTitle className="text-lg">Active Queue</CardTitle>
                            <CardDescription className="text-xs">Washes currently in progress or scheduled.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <BookingTable list={confirmedList} isConfirmed />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="completed">
                    <Card className="shadow-2xl border-muted/50 overflow-hidden">
                        <CardHeader className="bg-muted/10 border-b py-4">
                            <CardTitle className="text-lg">Finished Jobs</CardTitle>
                            <CardDescription className="text-xs">Archive of successfully completed services.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <BookingTable list={completedList} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="history">
                    <Card className="shadow-2xl border-muted/50 overflow-hidden opacity-80">
                        <CardHeader className="bg-muted/10 border-b py-4">
                            <CardTitle className="text-lg">Cancelled / Rejected</CardTitle>
                            <CardDescription className="text-xs">Record of bookings that did not proceed.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <BookingTable list={historyList} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
