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
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    
    // Tracks selected staff per booking row
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

            // 1. Resolve Business UUID
            const { data: bizData, error: bizError } = await supabase
                .from('businesses')
                .select('*')
                .eq('owner_id', user.id)
                .maybeSingle();
            
            if (bizError) throw bizError;
            
            if (bizData) {
                setBusiness(bizData);

                // 2. Fetch Staff for this Business UUID
                const { data: staffData } = await supabase
                    .from('employees')
                    .select('id, name')
                    .eq('business_id', bizData.id)
                    .order('name');
                
                setEmployees(staffData || []);

                // 3. Fetch Bookings with Full Relational Joins and Ratings
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
                        staff:staff_id ( name ),
                        rating:ratings!booking_id ( rating, feedback )
                    `)
                    .eq('business_id', bizData.id)
                    .order('booking_time', { ascending: true });
                
                if (bookingError) throw bookingError;
                setBookings(bookingData || []);

            } else {
                setFetchError("Business profile not found. Please set up your business profile first.");
            }
        } catch (error: any) {
            console.error("[DASHBOARD DEBUG] Fetch error:", error);
            setFetchError("Unable to load operational data. Check connection.");
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

            toast({ title: "Booking Accepted", description: "Request moved to the active queue." });
            
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
            toast({ title: "Booking Completed", description: "Job has been closed." });
            setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'completed' } : b));
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
        }
    };

    const BookingTable = ({ list, showActions = false, isConfirmed = false, isCompleted = false }: { list: any[], showActions?: boolean, isConfirmed?: boolean, isCompleted?: boolean }) => (
        <Table>
            <TableHeader>
                <TableRow className="bg-muted/50">
                    <TableHead className="w-[180px] font-bold">Customer</TableHead>
                    <TableHead className="w-[220px] font-bold">Vehicle Identity</TableHead>
                    <TableHead className="font-bold">Service</TableHead>
                    {isCompleted ? (
                        <TableHead className="font-bold">Customer Feedback</TableHead>
                    ) : (
                        <TableHead className="font-bold">Timing</TableHead>
                    )}
                    <TableHead className="font-bold">Assignment</TableHead>
                    <TableHead className="text-right font-bold pr-6">Action</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {list.length > 0 ? list.map((booking) => (
                    <TableRow key={booking.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="align-top py-4">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 font-extrabold text-sm">
                                    <User className="h-3.5 w-3.5 text-primary" />
                                    {booking.customer?.name || 'No customer'}
                                </div>
                                <div className="text-[10px] text-muted-foreground font-medium">{booking.customer?.email}</div>
                            </div>
                        </TableCell>
                        <TableCell className="align-top py-4">
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-2 text-sm font-black text-primary uppercase bg-primary/5 px-2 py-1 rounded w-fit border border-primary/10">
                                    <Car className="h-4 w-4" />
                                    {booking.car ? `${booking.car.make} ${booking.car.model}` : 'No vehicle'}
                                </div>
                            </div>
                        </TableCell>
                        <TableCell className="align-top py-4">
                            <div className="flex flex-col gap-1">
                                <div className="font-bold text-xs uppercase tracking-tight">{booking.service?.name}</div>
                                <div className="text-[10px] font-bold text-primary">P{booking.service?.price || booking.price} • {booking.service?.duration}m</div>
                            </div>
                        </TableCell>
                        {isCompleted ? (
                            <TableCell className="align-top py-4">
                                {booking.rating && booking.rating.length > 0 ? (
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1">
                                            {Array.from({ length: 5 }).map((_, i) => (
                                                <Star key={i} className={cn("h-3 w-3", i < booking.rating[0].rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300")} />
                                            ))}
                                        </div>
                                        {booking.rating[0].feedback && (
                                            <p className="text-[10px] text-muted-foreground italic line-clamp-2">"{booking.rating[0].feedback}"</p>
                                        )}
                                    </div>
                                ) : (
                                    <span className="text-[10px] text-muted-foreground italic">No feedback yet</span>
                                )}
                            </TableCell>
                        ) : (
                            <TableCell className="align-top py-4 text-[11px]">
                                <div className="font-extrabold">{new Date(booking.booking_time).toLocaleDateString()}</div>
                                <div className="text-muted-foreground font-medium">{new Date(booking.booking_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            </TableCell>
                        )}
                        <TableCell className="align-top py-4">
                            {booking.status === 'pending' ? (
                                <Select 
                                    value={assignments[booking.id] || ""} 
                                    onValueChange={(val) => setAssignments(prev => ({ ...prev, [booking.id]: val }))}
                                >
                                    <SelectTrigger className="w-[140px] h-9 text-[10px] font-bold shadow-sm">
                                        <SelectValue placeholder="Assign Staff..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {employees.length > 0 ? employees.map(emp => (
                                            <SelectItem key={emp.id} value={emp.id} className="text-xs font-bold">{emp.name}</SelectItem>
                                        )) : (
                                            <div className="p-2 text-[10px] italic text-destructive">No staff in registry</div>
                                        )}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Badge variant="secondary" className="flex items-center gap-1 bg-green-50 text-green-700 border-green-200 text-[10px] font-black uppercase">
                                    <UserCheck className="h-3 w-3" />
                                    {booking.staff?.name || 'Assigned'}
                                </Badge>
                            )}
                        </TableCell>
                        <TableCell className="text-right align-top py-4 pr-6">
                            <div className="flex justify-end gap-2">
                                {showActions && booking.status === 'pending' && (
                                    <>
                                        <Button 
                                            size="sm" 
                                            className="h-9 bg-green-600 hover:bg-green-700 text-[10px] font-black uppercase shadow-md" 
                                            onClick={() => handleAcceptBooking(booking.id)} 
                                            disabled={!assignments[booking.id]}
                                        >
                                            <Check className="h-3.5 w-3.5 mr-1" /> Accept
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            className="h-9 text-destructive hover:bg-destructive/10 text-[10px] font-black uppercase" 
                                            onClick={() => handleRejectBooking(booking.id)}
                                        >
                                            <Ban className="h-3.5 w-3.5 mr-1" /> Reject
                                        </Button>
                                    </>
                                )}
                                {isConfirmed && booking.status === 'confirmed' && (
                                    <Button size="sm" className="h-9 text-[10px] font-black uppercase shadow-lg" onClick={() => handleCompleteBooking(booking.id)}>
                                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Finish Job
                                    </Button>
                                )}
                            </div>
                        </TableCell>
                    </TableRow>
                )) : (
                    <TableRow><TableCell colSpan={6} className="h-64 text-center text-muted-foreground italic">
                        <div className="flex flex-col items-center justify-center gap-2 opacity-40">
                            <Truck className="h-12 w-12" />
                            <p className="font-bold">No requests found in this category.</p>
                        </div>
                    </TableCell></TableRow>
                )}
            </TableBody>
        </Table>
    );

    if (loading && !business) return <div className="flex justify-center py-32"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;
    if (!business) return <div className="text-center py-20 bg-muted/10 border-2 border-dashed rounded-3xl m-8">
        <ShieldCheck className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
        <h2 className="text-xl font-bold">Business Profile Required</h2>
        <p className="text-muted-foreground mt-2">Please complete your business setup to view operational data.</p>
    </div>;

    const pendingList = bookings.filter(b => b.status === 'pending');
    const confirmedList = bookings.filter(b => b.status === 'confirmed');
    const completedList = bookings.filter(b => b.status === 'completed');
    const historyList = bookings.filter(b => ['cancelled', 'rejected'].includes(b.status));

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-primary">{business.name}</h1>
                    <p className="text-muted-foreground font-medium">Operations Center & Live Booking Control</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={fetchData} className="rounded-full h-10 px-4">
                        <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                    </Button>
                    <Badge className="bg-primary hover:bg-primary font-black px-4 py-1.5 rounded-full">{business.subscription_plan}</Badge>
                </div>
            </div>

            {fetchError && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Critical Error</AlertTitle>
                    <AlertDescription>{fetchError}</AlertDescription>
                </Alert>
            )}

            <Tabs defaultValue="pending" className="w-full">
                <TabsList className="mb-8 grid w-full grid-cols-4 max-w-3xl bg-muted/50 p-1.5 h-12 rounded-xl">
                    <TabsTrigger value="pending" className="rounded-lg text-[10px] font-black uppercase data-[state=active]:shadow-md">
                        Incoming ({pendingList.length})
                    </TabsTrigger>
                    <TabsTrigger value="confirmed" className="rounded-lg text-[10px] font-black uppercase data-[state=active]:shadow-md">
                        Confirmed ({confirmedList.length})
                    </TabsTrigger>
                    <TabsTrigger value="completed" className="rounded-lg text-[10px] font-black uppercase data-[state=active]:shadow-md">
                        Done ({completedList.length})
                    </TabsTrigger>
                    <TabsTrigger value="cancelled" className="rounded-lg text-[10px] font-black uppercase data-[state=active]:shadow-md">
                        History ({historyList.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="animate-in fade-in slide-in-from-bottom-2">
                    <Card className="shadow-2xl border-muted/50 overflow-hidden">
                        <BookingTable list={pendingList} showActions />
                    </Card>
                </TabsContent>
                <TabsContent value="confirmed" className="animate-in fade-in slide-in-from-bottom-2">
                    <Card className="shadow-2xl border-muted/50 overflow-hidden">
                        <BookingTable list={confirmedList} isConfirmed />
                    </Card>
                </TabsContent>
                <TabsContent value="completed" className="animate-in fade-in slide-in-from-bottom-2">
                    <Card className="shadow-2xl border-muted/50 overflow-hidden">
                        <BookingTable list={completedList} isCompleted />
                    </Card>
                </TabsContent>
                <TabsContent value="cancelled" className="animate-in fade-in slide-in-from-bottom-2">
                    <Card className="shadow-2xl border-muted/50 overflow-hidden">
                        <BookingTable list={historyList} />
                    </Card>
                </TabsContent>
            </Tabs>

            <div className="grid lg:grid-cols-2 gap-8">
                <ShareBusinessCard businessId={business.id} />
                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Info className="h-5 w-5 text-primary" />
                            Operations Guide
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground leading-relaxed space-y-2 font-medium">
                        <p>1. <strong>Incoming</strong>: Review vehicle type and customer location. Assign a detailer and click Accept.</p>
                        <p>2. <strong>Confirmed</strong>: Booking is live. Your detailer is now accountable. Mark as Finish once the wash is complete.</p>
                        <p>3. <strong>Done</strong>: Completed jobs are automatically invoiced. Feedback from customers is displayed here.</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
