'use client';

import React, { useEffect, useState, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Car, Loader2, CheckCircle2, XCircle, Star, MessageCircle, ShieldCheck, RefreshCw, AlertTriangle, AlertCircle, User, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShareBusinessCard } from "@/components/app/share-business-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export default function BusinessDashboardPage() {
    const [bookings, setBookings] = useState<any[]>([]);
    const [business, setBusiness] = useState<any>(null);
    const [stats, setStats] = useState({ avgRating: 0, totalReviews: 0, latestReview: null as any });
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

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

            // 1. Fetch Business Profile to get business_id
            const { data: bizData, error: bizError } = await supabase
                .from('businesses')
                .select('*')
                .eq('owner_id', user.id)
                .maybeSingle();
            
            if (bizError) throw bizError;
            if (bizData) {
                setBusiness(bizData);

                // 2. Fetch Bookings with requested schema and joins
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
                        customer:customer_id ( name ),
                        service:service_id ( name ),
                        car:car_id ( make, model ),
                        staff:staff_id ( name )
                    `)
                    .eq('business_id', bizData.id)
                    .order('booking_time', { ascending: true });
                
                if (bookingError) throw bookingError;
                setBookings(bookingData || []);

                // 3. Fetch Ratings for summary
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
            console.error("Fetch error:", error);
            setFetchError("Unable to fetch bookings. Check database connection.");
            toast({ variant: 'destructive', title: 'Data Error', description: 'Unable to fetch bookings. Check database connection.' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCancelBooking = async (id: string) => {
        try {
            // Optimistic update: filter out the booking immediately
            const previousBookings = [...bookings];
            setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b));

            const { data, error } = await supabase
                .from('bookings')
                .update({ status: 'cancelled' })
                .eq('id', id)
                .select();

            if (error) {
                setBookings(previousBookings); // Rollback on error
                throw error;
            }

            toast({ title: "Booking Cancelled", description: "The request status has been updated to cancelled." });
            
            // Refresh the full list to ensure UI is in sync with DB
            await fetchData();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Cancellation Failed', description: e.message });
        }
    };

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;
    
    if (!business) return <div className="text-center py-20">Business profile not found. Please complete your profile.</div>;

    const pendingBookings = bookings.filter(b => b.status === 'pending');
    const cancelledHistory = bookings.filter(b => b.status === 'cancelled');

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
                <TabsList className="mb-8">
                    <TabsTrigger value="pending">Pending Requests ({pendingBookings.length})</TabsTrigger>
                    <TabsTrigger value="history">Activity History ({cancelledHistory.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="pending">
                    <Card>
                        <CardHeader>
                            <CardTitle>Upcoming Washes</CardTitle>
                            <CardDescription>Review and manage scheduled customer requests.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Service</TableHead>
                                        <TableHead>Car Details</TableHead>
                                        <TableHead>Booking Time</TableHead>
                                        <TableHead>Staff</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pendingBookings.length > 0 ? pendingBookings.map((booking) => (
                                        <TableRow key={booking.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <User className="h-4 w-4 text-muted-foreground" />
                                                    {booking.customer?.name || 'Unknown'}
                                                </div>
                                            </TableCell>
                                            <TableCell>{booking.service?.name || 'Wash'}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Car className="h-4 w-4 text-muted-foreground" />
                                                    {booking.car ? `${booking.car.make} ${booking.car.model}` : 'Generic Vehicle'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-xs">
                                                    <div className="font-bold">{new Date(booking.booking_time).toLocaleDateString()}</div>
                                                    <div className="text-muted-foreground">{new Date(booking.booking_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {booking.staff?.name ? (
                                                    <Badge variant="secondary">{booking.staff.name}</Badge>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground italic">Unassigned</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button 
                                                    size="sm" 
                                                    variant="ghost" 
                                                    className="text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleCancelBooking(booking.id)}
                                                >
                                                    <XCircle className="h-4 w-4 mr-2" />
                                                    Cancel
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground italic">
                                                No pending booking requests.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="history">
                    <Card>
                        <CardHeader>
                            <CardTitle>Cancelled Bookings</CardTitle>
                            <CardDescription>Record of all requests that were cancelled or rejected.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Service</TableHead>
                                        <TableHead>Car</TableHead>
                                        <TableHead>Scheduled For</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {cancelledHistory.length > 0 ? cancelledHistory.map((booking) => (
                                        <TableRow key={booking.id} className="opacity-60 bg-muted/10">
                                            <TableCell className="font-medium">{booking.customer?.name || 'Unknown'}</TableCell>
                                            <TableCell>{booking.service?.name || 'Wash'}</TableCell>
                                            <TableCell>{booking.car ? `${booking.car.make} ${booking.car.model}` : 'Generic'}</TableCell>
                                            <TableCell className="text-xs">
                                                {new Date(booking.booking_time).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="destructive" className="text-[10px]">CANCELLED</Badge>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic">
                                                No cancellation history found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
