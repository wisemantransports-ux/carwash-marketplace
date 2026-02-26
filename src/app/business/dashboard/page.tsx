'use client';

import React, { useEffect, useState, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { Booking, Business, Employee } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Car, Loader2, CheckCircle2, XCircle, PlayCircle, Star, MessageCircle, ShieldCheck, Users, Phone, RefreshCw, AlertTriangle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShareBusinessCard } from "@/components/app/share-business-card";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";

export default function BusinessDashboardPage() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [business, setBusiness] = useState<Business | null>(null);
    const [employees, setEmployees] = useState<Employee[]>([]);
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
            if (user) {
                // 1. Fetch Business Profile
                const { data: bizData } = await supabase
                    .from('businesses')
                    .select('id, owner_id, name, type, status, subscription_status, subscription_plan, sub_end_date')
                    .eq('owner_id', user.id)
                    .maybeSingle();
                
                if (bizData) {
                    const biz = bizData as Business;
                    setBusiness(biz);

                    // 2. Fetch Team (Resilient Query)
                    // We check for both Auth UID and Business Profile ID to prevent vanishing rows
                    const { data: empData, error: empError } = await supabase
                        .from('employees')
                        .select('*')
                        .or(`business_id.eq.${user.id},business_id.eq.${biz.id}`)
                        .order('name');
                    
                    if (empError) throw empError;
                    setEmployees(empData || []);

                    // 3. Fetch Ratings
                    const { data: ratingsData } = await supabase
                        .from('ratings')
                        .select('*, customer:customer_id(name)')
                        .eq('business_id', biz.id)
                        .order('created_at', { ascending: false });

                    if (ratingsData && ratingsData.length > 0) {
                        const avg = ratingsData.reduce((acc, curr) => acc + curr.rating, 0) / ratingsData.length;
                        setStats({
                            avgRating: avg,
                            totalReviews: ratingsData.length,
                            latestReview: ratingsData[0]
                        });
                    }

                    // 4. Fetch Bookings
                    const { data: bookingData } = await supabase
                        .from('bookings')
                        .select('*')
                        .eq('business_id', biz.id)
                        .order('booking_time', { ascending: true });
                    
                    setBookings(bookingData || []);
                }
            }
        } catch (error: any) {
            console.error("Dashboard Sync Error:", error);
            setFetchError("Some data could not be synchronized.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAction = async (id: string, status: 'accepted' | 'rejected' | 'completed') => {
        try {
            const { error } = await supabase.from('bookings').update({ status }).eq('id', id);
            if (error) throw error;
            toast({ title: `Booking Updated` });
            fetchData();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
        }
    };

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;
    
    if (!business) return <div className="text-center py-20">Business profile not found. Please complete your profile.</div>;

    const requested = bookings.filter(b => b.status === 'requested');
    const active = bookings.filter(b => b.status === 'accepted' || b.status === 'in-progress');

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                        <h1 className="text-4xl font-bold tracking-tight text-primary">{business.name}</h1>
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                            {(business.type || 'station').toUpperCase()}
                        </Badge>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
                    </div>
                    <p className="text-muted-foreground text-lg">Operations center for your car wash.</p>
                </div>
                <div className="w-full md:w-80 shrink-0"><ShareBusinessCard businessId={business.id} /></div>
            </div>

            {fetchError && (
                <Alert variant="destructive" className="border-destructive/20 bg-destructive/5">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Sync Issue</AlertTitle>
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
                        <p className="text-xs text-blue-600 mt-1 font-medium">{business.subscription_status.toUpperCase()}</p>
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
                                            <CardFooter className="flex gap-2">
                                                <Button className="flex-1" onClick={() => handleAction(booking.id, 'accepted')}>Accept</Button>
                                                <Button variant="outline" className="flex-1 text-destructive" onClick={() => handleAction(booking.id, 'rejected')}>Reject</Button>
                                            </CardFooter>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-20 border-2 border-dashed rounded-xl bg-muted/20 italic text-muted-foreground">
                                    No new requests.
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
                                            <CardFooter>
                                                <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => handleAction(booking.id, 'completed')}>Mark Completed</Button>
                                            </CardFooter>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-20 border-2 border-dashed rounded-xl bg-muted/20 italic text-muted-foreground">
                                    No active washes.
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>

                <div className="space-y-6">
                    <Card className="shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <Users className="h-5 w-5 text-primary" /> Your Team
                            </CardTitle>
                            <Button variant="ghost" size="sm" className="h-8 text-xs text-primary" asChild>
                                <Link href="/business/employees">Manage All</Link>
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {employees.length > 0 ? (
                                employees.slice(0, 5).map(emp => (
                                    <div key={emp.id} className="flex items-center gap-3 p-2 rounded-lg border border-transparent hover:bg-muted/50 transition-colors">
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
                                <div className="text-center py-10 bg-muted/10 rounded-xl border border-dashed text-xs text-muted-foreground italic">
                                    No staff registered.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}