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
    ShieldCheck, 
    RefreshCw, 
    AlertCircle, 
    User, 
    UserCheck,
    Check,
    Mail,
    Info,
    Truck,
    Ban,
    Lock
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShareBusinessCard } from "@/components/app/share-business-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function BusinessDashboardPage() {
    const [bookings, setBookings] = useState<any[]>([]);
    const [business, setBusiness] = useState<any>(null);
    const [employees, setEmployees] = useState<any[]>([]);
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
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) {
                setLoading(false);
                return;
            }

            // 1. Resolve Business Info (Freshest record)
            const { data: bizData, error: bizError } = await supabase
                .from('businesses')
                .select('*')
                .eq('owner_id', authUser.id)
                .maybeSingle();
            
            if (bizError) throw bizError;
            
            if (bizData) {
                setBusiness(bizData);

                const isVerified = bizData.verification_status === 'verified';
                const now = new Date();
                const expiry = bizData.sub_end_date ? new Date(bizData.sub_end_date) : null;
                const isTrialActive = expiry && expiry >= now;
                const isActive = bizData.subscription_status === 'active';
                
                const isAccessActive = isVerified && (isActive || isTrialActive);

                if (isAccessActive) {
                    const { data: staffData } = await supabase
                        .from('employees')
                        .select('id, name')
                        .eq('business_id', bizData.id)
                        .order('name');
                    
                    setEmployees(staffData || []);

                    const { data: bookingData, error: bookingError } = await supabase
                        .from('booking_with_customer')
                        .select(`
                            *,
                            car:car_id ( make, model ),
                            staff:staff_id ( id, name, phone ),
                            service:service_id ( name, price, duration ),
                            rating:ratings!booking_id ( rating, feedback )
                        `)
                        .eq('business_id', bizData.id)
                        .order('booking_time', { ascending: true });
                    
                    if (bookingError) throw bookingError;
                    
                    setBookings(bookingData || []);
                }
            } else {
                setFetchError("Business profile not found. Please complete your profile setup.");
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
                    status: 'accepted', 
                    staff_id: staffId 
                })
                .eq('id', bookingId);

            if (error) throw error;

            toast({ title: "Booking Accepted", description: "Request moved to the active queue." });
            
            setBookings(prev => prev.map(b => 
                b.id === bookingId 
                    ? { ...b, status: 'accepted', staff_id: staffId, staff: { name: employees.find(e => e.id === staffId)?.name } } 
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
                .update({ status: 'rejected' })
                .eq('id', bookingId);

            if (error) throw error;
            toast({ title: "Booking Rejected" });
            
            setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'rejected' } : b));
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

    const BookingTable = ({ list, showActions = false, isActiveTab = false, showFeedback = false }: { list: any[], showActions?: boolean, isActiveTab?: boolean, showFeedback?: boolean }) => (
        <Table>
            <TableHeader>
                <TableRow className="bg-muted/50">
                    <TableHead className="font-bold">Customer</TableHead>
                    <TableHead className="font-bold">Vehicle</TableHead>
                    <TableHead className="font-bold">Service Info</TableHead>
                    <TableHead className="font-bold">Timing</TableHead>
                    <TableHead className="font-bold">Staff</TableHead>
                    {showFeedback && <TableHead className="font-bold">Feedback</TableHead>}
                    <TableHead className="text-right font-bold pr-6">Action</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {list.length > 0 ? list.map((booking) => (
                    <TableRow key={booking.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell>
                            <div className="flex flex-col">
                                <span className="font-bold text-sm">{booking.customer_name || 'Unknown'}</span>
                                <span className="text-[10px] text-muted-foreground">{booking.customer_email || 'No email'}</span>
                            </div>
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-2 text-xs font-bold uppercase text-primary">
                                <Car className="h-3 w-3" />
                                {booking.car ? `${booking.car.make} ${booking.car.model}` : 'Unknown Car'}
                            </div>
                        </TableCell>
                        <TableCell>
                            <div className="flex flex-col">
                                <span className="text-xs font-medium">{booking.service?.name}</span>
                                <span className="text-[10px] text-primary font-bold">
                                    P{booking.service?.price || booking.price} • {booking.service?.duration}m
                                </span>
                            </div>
                        </TableCell>
                        <TableCell className="text-[11px]">
                            <div className="font-bold">{new Date(booking.booking_time).toLocaleDateString()}</div>
                            <div className="text-muted-foreground">{new Date(booking.booking_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </TableCell>
                        <TableCell>
                            {booking.status === 'requested' ? (
                                <Select 
                                    value={assignments[booking.id] || ""} 
                                    onValueChange={(val) => setAssignments(prev => ({ ...prev, [booking.id]: val }))}
                                >
                                    <SelectTrigger className="w-[140px] h-9 text-[10px] font-bold">
                                        <SelectValue placeholder="Assign Staff..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {employees.map(emp => (
                                            <SelectItem key={emp.id} value={emp.id} className="text-xs">{emp.name}</SelectItem>
                                        ))}
                                        {employees.length === 0 && <div className="p-2 text-[10px] italic">No staff available</div>}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Badge variant="secondary" className="flex items-center gap-1 bg-green-50 text-green-700 border-green-200 text-[10px] font-bold">
                                    <UserCheck className="h-3 w-3" />
                                    {booking.staff?.name || 'Assigned'}
                                </Badge>
                            )}
                        </TableCell>
                        {showFeedback && (
                            <TableCell>
                                {booking.rating && booking.rating.length > 0 ? (
                                    <div className="flex flex-col gap-1">
                                        <div className="flex text-yellow-400">
                                            {Array.from({ length: 5 }).map((_, i) => (
                                                <Star key={i} className={cn("h-3 w-3", i < booking.rating[0].rating ? "fill-current" : "opacity-20")} />
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-muted-foreground line-clamp-1 italic">"{booking.rating[0].feedback}"</p>
                                    </div>
                                ) : (
                                    <span className="text-[10px] text-muted-foreground italic">No feedback</span>
                                )}
                            </TableCell>
                        )}
                        <TableCell className="text-right pr-6">
                            <div className="flex justify-end gap-2">
                                {showActions && booking.status === 'requested' && (
                                    <>
                                        <Button 
                                            size="sm" 
                                            className="h-8 text-[10px] font-bold uppercase bg-green-600 hover:bg-green-700" 
                                            onClick={() => handleAcceptBooking(booking.id)} 
                                            disabled={!assignments[booking.id]}
                                        >
                                            <Check className="h-3 w-3 mr-1" /> Accept
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            className="h-8 text-destructive text-[10px] font-bold uppercase" 
                                            onClick={() => handleRejectBooking(booking.id)}
                                        >
                                            <Ban className="h-3 w-3 mr-1" /> Reject
                                        </Button>
                                    </>
                                )}
                                {isActiveTab && booking.status === 'accepted' && (
                                    <Button size="sm" className="h-8 text-[10px] font-bold uppercase" onClick={() => handleCompleteBooking(booking.id)}>
                                        <CheckCircle2 className="h-3 w-3 mr-1" /> Finish
                                    </Button>
                                )}
                            </div>
                        </TableCell>
                    </TableRow>
                )) : (
                    <TableRow>
                        <TableCell colSpan={showFeedback ? 7 : 6} className="h-48 text-center text-muted-foreground italic">
                            <div className="flex flex-col items-center gap-2 opacity-40">
                                <Truck className="h-10 w-10" />
                                <p>No bookings found.</p>
                            </div>
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );

    if (loading) return <div className="flex justify-center py-32"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;
    
    const isVerified = business?.verification_status === 'verified';
    const now = new Date();
    const expiry = business?.sub_end_date ? new Date(business.sub_end_date) : null;
    const isTrialActive = expiry && expiry >= now;
    const isActive = business?.subscription_status === 'active';
    
    const isAccessActive = isVerified && (isActive || isTrialActive);

    if (!isAccessActive) return (
        <div className="flex flex-col items-center justify-center py-20 bg-muted/10 border-2 border-dashed rounded-3xl m-8 text-center">
            <Lock className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
            <h2 className="text-2xl font-bold">Operations Locked</h2>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                {!isVerified
                    ? "Verification pending. Your account is under review." 
                    : "Your professional features are currently paused. Please renew your plan."}
            </p>
            <div className="mt-8 flex gap-4">
                <Button variant="outline" asChild>
                    <Link href="/business/profile">Review Profile</Link>
                </Button>
                <Button asChild>
                    <Link href="/business/subscription">View Plans</Link>
                </Button>
            </div>
        </div>
    );

    const pendingList = bookings.filter(b => b.status === 'requested');
    const activeList = bookings.filter(b => b.status === 'accepted');
    const completedList = bookings.filter(b => b.status === 'completed');
    const historyList = bookings.filter(b => ['rejected', 'cancelled'].includes(b.status));

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-4xl font-extrabold tracking-tight text-primary">{business.name}</h1>
                        {business.business_type === 'registered' && (
                            <Badge className="bg-primary text-white font-bold px-3 py-1">CIPA REGISTERED</Badge>
                        )}
                    </div>
                    <p className="text-muted-foreground font-medium">Operations Center • Verified {business.business_type === 'registered' ? 'Entity' : 'Individual Partner'}</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={fetchData} className="rounded-full h-10">
                        <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} /> Refresh
                    </Button>
                    <Badge className="bg-primary hover:bg-primary font-bold px-4 py-1.5 rounded-full uppercase tracking-tighter">
                        {business.subscription_status}
                    </Badge>
                </div>
            </div>

            {fetchError && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Notice</AlertTitle>
                    <AlertDescription>{fetchError}</AlertDescription>
                </Alert>
            )}

            <Tabs defaultValue="pending" className="w-full">
                <TabsList className="mb-8 grid w-full grid-cols-4 max-w-3xl bg-muted/50 p-1.5 h-12 rounded-xl">
                    <TabsTrigger value="pending" className="rounded-lg text-[10px] font-black uppercase">
                        Incoming ({pendingList.length})
                    </TabsTrigger>
                    <TabsTrigger value="active" className="rounded-lg text-[10px] font-black uppercase">
                        Active ({activeList.length})
                    </TabsTrigger>
                    <TabsTrigger value="completed" className="rounded-lg text-[10px] font-black uppercase">
                        Done ({completedList.length})
                    </TabsTrigger>
                    <TabsTrigger value="history" className="rounded-lg text-[10px] font-black uppercase">
                        History ({historyList.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="pending">
                    <Card className="shadow-2xl border-muted/50 overflow-hidden">
                        <CardHeader className="bg-muted/10 border-b py-4">
                            <CardTitle className="text-lg">Incoming Requests</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <BookingTable list={pendingList} showActions />
                        </CardContent>
                    </Card>
                </TabsContent>
                
                <TabsContent value="active">
                    <Card className="shadow-2xl border-muted/50 overflow-hidden">
                        <CardHeader className="bg-muted/10 border-b py-4">
                            <CardTitle className="text-lg">Active Queue</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <BookingTable list={activeList} isActiveTab />
                        </CardContent>
                    </Card>
                </TabsContent>
                
                <TabsContent value="completed">
                    <Card className="shadow-2xl border-muted/50 overflow-hidden">
                        <CardHeader className="bg-muted/10 border-b py-4">
                            <CardTitle className="text-lg">Completed Services</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <BookingTable list={completedList} showFeedback />
                        </CardContent>
                    </Card>
                </TabsContent>
                
                <TabsContent value="history">
                    <Card className="shadow-2xl border-muted/50 overflow-hidden">
                        <CardHeader className="bg-muted/10 border-b py-4">
                            <CardTitle className="text-lg">Archived Requests</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <BookingTable list={historyList} />
                        </CardContent>
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
                        <p>• <strong>Verification</strong>: Both individual and registered businesses get full dashboard access once verified.</p>
                        <p>• <strong>CIPA Badge</strong>: Only registered entities display the special trust badge to customers.</p>
                        <p>• <strong>Trial</strong>: All verified partners start with a 14-day professional trial.</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
