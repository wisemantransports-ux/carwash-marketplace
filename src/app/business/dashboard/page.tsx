'use client';
import { supabase } from "@/lib/supabase";
import type { Booking, Business, Employee } from "@/lib/types";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Car, Loader2, CheckCircle2, XCircle, PlayCircle, Star, MessageCircle, ShieldCheck, Users, Phone, RefreshCw, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShareBusinessCard } from "@/components/app/share-business-card";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";

export default function BusinessDashboardPage() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [business, setBusiness] = useState<Business | null>(null);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [stats, setStats] = useState({ avgRating: 0, totalReviews: 0, latestReview: null as any });
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setFetchError(null);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const userId = user.id;
                
                // 1. Fetch Business Profile
                const { data: bizData } = await supabase
                    .from('businesses')
                    .select('id, owner_id, name, type, status, subscription_status, subscription_plan, sub_end_date')
                    .eq('owner_id', userId)
                    .maybeSingle();
                
                if (bizData) {
                    const biz = bizData as Business;
                    setBusiness(biz);
                    const businessId = biz.id;

                    // 2. Fetch Ratings
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

                    // 3. Fetch Bookings
                    const { data: bookingData } = await supabase
                        .from('bookings')
                        .select('*')
                        .eq('business_id', businessId)
                        .order('booking_time', { ascending: true });
                    
                    setBookings(bookingData || []);

                    // 4. Fetch Employees with Error Detection
                    try {
                        const { data: empData, error: empError } = await supabase
                            .from('employees')
                            .select('*')
                            .eq('business_id', userId)
                            .order('name');
                        
                        if (empError) throw empError;
                        setEmployees(empData || []);
                    } catch (err: any) {
                        const timestamp = new Date().toISOString();
                        console.error(`[${timestamp}] Dashboard Employee Fetch Error:`, err);
                        setFetchError("Unable to fetch employees. Please check database connection.");
                    }
                }
            }
        } catch (error) {
            console.error("Dashboard: General fetch error:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

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
    if (!business) return <div className="text-center py-20">Business profile not found. Please complete your profile.</div>;

    const requested = bookings.filter(b => b.status === 'requested');
    const active = bookings.filter(b => b.status === 'accepted' || b.status === 'in-progress');

    const now = new Date();
    const expiry = business.sub_end_date ? new Date(business.sub_end_date) : null;
    const trialDays = expiry ? Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;
    const isPlanActive = business.subscription_status?.toLowerCase() === 'active' || (trialDays > 0 && (business.status?.toLowerCase() === 'verified' || business.status?.toLowerCase() === 'pending'));

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                        <h1 className="text-4xl font-bold tracking-tight text-primary">{business.name}</h1>
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                            {(business.type || 'station').toUpperCase()}
                        </Badge>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchData}>
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>
                    <p className="text-muted-foreground text-lg">Operations center for your car wash.</p>
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

            <div className="grid gap-8 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-8">
                    <Tabs defaultValue="requests" className="w-full">
                        <TabsList className="mb-8">
                            <TabsTrigger value="requests">New Requests ({requested.length})</TabsTrigger>
                            <TabsTrigger value="active">In Progress ({active.length})</TabsTrigger>
                        </TabsList>

                        <TabsContent value="requests" className="space-y-6">
                            {requested.length > 0 ? (
                                <div className="grid gap-6 md:grid-cols-2">
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
                                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-xl bg-muted/20 text-center">
                                    <p className="text-muted-foreground font-medium italic">No new booking requests.</p>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="active" className="space-y-6">
                            {active.length > 0 ? (
                                <div className="grid gap-6 md:grid-cols-2">
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
                                    <p className="text-muted-foreground">No active wash operations.</p>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>

                <div className="space-y-6">
                    <Card className="shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <Users className="h-5 w-5 text-primary" /> Team Overview
                            </CardTitle>
                            <Button variant="ghost" size="sm" className="h-8 text-xs text-primary" asChild>
                                <Link href="/business/employees">Manage All</Link>
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {fetchError ? (
                                <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20 text-center space-y-2">
                                    <AlertTriangle className="h-6 w-6 text-destructive mx-auto" />
                                    <p className="text-xs font-bold text-destructive">{fetchError}</p>
                                    <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={fetchData}>
                                        Retry Connection
                                    </Button>
                                </div>
                            ) : employees.length > 0 ? (
                                employees.slice(0, 5).map(emp => (
                                    <div key={emp.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
                                        <Avatar className="h-10 w-10 border shadow-sm">
                                            <AvatarImage src={emp.image_url} alt={emp.name} className="object-cover" />
                                            <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                                {emp.name?.charAt(0) || '?'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 overflow-hidden">
                                            <p className="text-sm font-bold truncate">{emp.name}</p>
                                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                <Phone className="h-2.5 w-2.5" /> {emp.phone}
                                            </p>
                                        </div>
                                        <Badge variant="outline" className="text-[8px] h-5 bg-green-50 text-green-700 border-green-200">VERIFIED</Badge>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10 bg-muted/10 rounded-xl border border-dashed">
                                    <Users className="h-8 w-8 mx-auto text-muted-foreground opacity-20 mb-2" />
                                    <p className="text-xs text-muted-foreground italic">No staff found.</p>
                                    <Button variant="link" size="sm" asChild className="text-[10px] h-6">
                                        <Link href="/business/employees">Register Team</Link>
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
