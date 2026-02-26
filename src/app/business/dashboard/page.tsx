'use client';
import { supabase } from "@/lib/supabase";
import type { Booking, Business } from "@/lib/types";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Car, Loader2, CheckCircle2, XCircle, PlayCircle, Star, MessageCircle, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShareBusinessCard } from "@/components/app/share-business-card";
import { cn } from "@/lib/utils";

export default function BusinessDashboardPage() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [business, setBusiness] = useState<Business | null>(null);
    const [stats, setStats] = useState({ avgRating: 0, totalReviews: 0, latestReview: null as any });
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const userId = session.user.id;
                
                const { data: bizData } = await supabase
                    .from('businesses')
                    .select('*')
                    .eq('owner_id', userId)
                    .single();
                
                if (bizData) {
                    const biz = bizData as Business;
                    setBusiness(biz);
                    const businessId = biz.id;

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

                    const { data: bookingData } = await supabase
                        .from('bookings')
                        .select('*')
                        .eq('business_id', businessId)
                        .order('booking_time', { ascending: true });
                    
                    setBookings(bookingData || []);
                }
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

    const handleAction = async (id: string, status: 'accepted' | 'rejected' | 'completed') => {
        try {
            const { error } = await supabase
                .from('bookings')
                .update({ status })
                .eq('id', id);
            
            if (error) throw error;

            toast({
                title: `Booking ${status.charAt(0).toUpperCase() + status.slice(1)}`,
                description: status === 'accepted' ? "Invoice has been automatically generated." : "Status updated successfully.",
            });
            fetchData();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
        }
    };

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;
    if (!business) return <div className="text-center py-20">Business profile not found.</div>;

    const requested = bookings.filter(b => b.status === 'requested');
    const active = bookings.filter(b => b.status === 'accepted' || b.status === 'in-progress');

    const now = new Date();
    const expiry = business.sub_end_date ? new Date(business.sub_end_date) : null;
    const trialDays = expiry ? Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;
    const isPlanActive = business.subscription_status === 'active' || (trialDays > 0 && business.status === 'verified');

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                        <h1 className="text-4xl font-bold tracking-tight text-primary">{business.name}</h1>
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                            {(business.type || 'station').toUpperCase()}
                        </Badge>
                    </div>
                    <p className="text-muted-foreground text-lg">Manage incoming requests and track operations.</p>
                </div>
                <div className="w-full md:w-80 shrink-0">
                    <ShareBusinessCard businessId={business.id} />
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-4">
                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase flex items-center gap-2">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" /> Reputation
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{stats.avgRating.toFixed(1)}</div>
                        <p className="text-xs text-muted-foreground mt-1">{stats.totalReviews} verified reviews</p>
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
                        <p className={cn("text-xs mt-1 font-medium", isPlanActive ? "text-blue-600" : "text-destructive")}>
                            {trialDays > 0 ? `${trialDays} Days Trial Left` : business.subscription_status === 'active' ? "Active Subscription" : "Expired"}
                        </p>
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
                            <p className="text-sm text-muted-foreground italic line-clamp-1">
                                &quot;{stats.latestReview.feedback || 'No comment provided'}&quot;
                            </p>
                        </CardContent>
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
                                            <Calendar className="h-3 w-3" /> {new Date(booking.booking_time).toLocaleDateString()}
                                            <Clock className="h-3 w-3" /> {new Date(booking.booking_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Car className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium">Pula {booking.price} Wash</span>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="flex gap-2">
                                        <Button className="flex-1" onClick={() => handleAction(booking.id, 'accepted')}>
                                            <CheckCircle2 className="mr-2 h-4 w-4" /> Accept
                                        </Button>
                                        <Button variant="outline" className="flex-1 text-destructive" onClick={() => handleAction(booking.id, 'rejected')}>
                                            <XCircle className="mr-2 h-4 w-4" /> Reject
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-xl bg-muted/20 space-y-6 text-center">
                            <p className="text-muted-foreground font-medium italic">No new booking requests at this time.</p>
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
                                    </CardContent>
                                    <CardFooter>
                                        <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => handleAction(booking.id, 'completed')}>
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
