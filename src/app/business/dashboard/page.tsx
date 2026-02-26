'use client';
import { supabase } from "@/lib/supabase";
import { mockGetBookingsForBusiness, mockAcceptBooking, mockRejectBooking, mockCompleteBooking, mockGetBusinessById } from "@/lib/mock-api";
import type { Booking, Business } from "@/lib/types";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Car, User, Loader2, CheckCircle2, XCircle, PlayCircle, Star, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShareBusinessCard } from "@/components/app/share-business-card";

export default function BusinessDashboardPage() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [business, setBusiness] = useState<Business | null>(null);
    const [stats, setStats] = useState({ avgRating: 0, totalReviews: 0, latestReview: null as any });
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const businessId = session.user.id;
                setCurrentUserId(businessId);
                
                // Fetch stats from Supabase
                const { data: ratingsData } = await supabase
                    .from('ratings')
                    .select('*, customer:customer_id(name)')
                    .eq('business_id', businessId)
                    .order('created_at', { ascending: false });

                if (ratingsData && ratingsData.length > 0) {
                    const avg = ratingsData.reduce((acc, curr) => acc + curr.rating, 0) / ratingsData.length;
                    setStats({
                        avgRating: avg,
                        totalReviews: ratingsData.length,
                        latestReview: ratingsData[0]
                    });
                }

                // Fetch bookings/business info
                const { data: bizData } = await mockGetBusinessById(businessId);
                const { data: bookingData } = await mockGetBookingsForBusiness(businessId);
                setBusiness(bizData);
                setBookings(bookingData);
            }
        } catch (error) {
            console.error("Dashboard fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAction = async (id: string, action: 'accept' | 'reject' | 'complete') => {
        if (action === 'accept') await mockAcceptBooking(id);
        if (action === 'reject') await mockRejectBooking(id);
        if (action === 'complete') await mockCompleteBooking(id);
        
        toast({
            title: `Booking ${action === 'accept' ? 'Accepted' : action === 'reject' ? 'Rejected' : 'Completed'}`,
            description: action === 'accept' ? "Invoice has been automatically generated." : "Status updated successfully.",
        });
        fetchData();
    };

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

    const requested = bookings.filter(b => b.status === 'requested');
    const active = bookings.filter(b => b.status === 'accepted' || b.status === 'in-progress');

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                <div className="flex flex-col gap-2">
                    <h1 className="text-4xl font-bold tracking-tight text-primary">Operations</h1>
                    <p className="text-muted-foreground text-lg">Manage incoming requests and track customer feedback.</p>
                </div>
                <div className="w-full md:w-80 shrink-0">
                    <ShareBusinessCard businessId={currentUserId || ''} />
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase flex items-center gap-2">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" /> Average Rating
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{stats.avgRating.toFixed(1)} / 5.0</div>
                        <p className="text-xs text-muted-foreground mt-1">From {stats.totalReviews} verified reviews</p>
                    </CardContent>
                </Card>

                {stats.latestReview ? (
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
                            <p className="text-sm text-muted-foreground italic line-clamp-1">
                                &quot;{stats.latestReview.feedback || 'No comment provided'}&quot;
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="md:col-span-2 flex items-center justify-center bg-muted/10">
                        <p className="text-sm text-muted-foreground italic">No feedback received yet. Complete more bookings to get rated!</p>
                    </Card>
                )}
            </div>

            <Tabs defaultValue="requests" className="w-full">
                <TabsList className="mb-8">
                    <TabsTrigger value="requests">New Requests ({requested.length})</TabsTrigger>
                    <TabsTrigger value="active">In Progress ({active.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="requests" className="space-y-6">
                    {requested.length > 0 ? (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {requested.map(booking => (
                                <Card key={booking.id}>
                                    <CardHeader>
                                        <CardTitle className="text-lg">#{booking.id.slice(-4)}</CardTitle>
                                        <CardDescription className="flex items-center gap-2">
                                            <Calendar className="h-3 w-3" /> {new Date(booking.bookingTime).toLocaleDateString()}
                                            <Clock className="h-3 w-3" /> {new Date(booking.bookingTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Car className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium">Pula {booking.price} Wash</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <User className="h-4 w-4" />
                                            <span>Customer ID: {booking.customerId}</span>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="flex gap-2">
                                        <Button className="flex-1" onClick={() => handleAction(booking.id, 'accept')}>
                                            <CheckCircle2 className="mr-2 h-4 w-4" /> Accept
                                        </Button>
                                        <Button variant="outline" className="flex-1 text-destructive" onClick={() => handleAction(booking.id, 'reject')}>
                                            <XCircle className="mr-2 h-4 w-4" /> Reject
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-xl bg-muted/20 space-y-6 text-center">
                            <div className="space-y-2">
                                <p className="text-muted-foreground font-medium italic">No new booking requests at this time.</p>
                                <p className="text-sm text-muted-foreground max-w-xs mx-auto">Share your professional link to help customers find and book your services.</p>
                            </div>
                            <div className="w-full max-w-sm px-4">
                                <ShareBusinessCard businessId={currentUserId || ''} />
                            </div>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="active" className="space-y-6">
                    {active.length > 0 ? (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {active.map(booking => (
                                <Card key={booking.id} className="border-primary/50">
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <CardTitle className="text-lg">#{booking.id.slice(-4)}</CardTitle>
                                            <Badge>ACCEPTED</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <p className="text-sm font-bold text-primary italic">Invoice Issued</p>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Car className="h-4 w-4 text-muted-foreground" />
                                            <span>Service ID: {booking.serviceId}</span>
                                        </div>
                                    </CardContent>
                                    <CardFooter>
                                        <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => handleAction(booking.id, 'complete')}>
                                            <PlayCircle className="mr-2 h-4 w-4" /> Mark Completed
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 border-2 border-dashed rounded-xl bg-muted/20">
                            <p className="text-muted-foreground">No active wash operations currently in progress.</p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
