
'use client';

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Loader2, XCircle, UserCheck, Phone, ShieldCheck, RefreshCw, Droplets, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { WashBooking } from "@/lib/types";

export default function CustomerBookingsPage() {
    const [bookings, setBookings] = useState<WashBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [mounted, setMounted] = useState(false);

    const fetchBookings = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data, error } = await supabase
                .from('wash_bookings')
                .select(`
                    *,
                    business:wash_business_id ( name, city, logo_url ),
                    employee:employee_id ( name, phone, image_url )
                `)
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setBookings(data || []);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Fetch Error', description: 'Could not load your service history.' });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        setMounted(true);
        fetchBookings();

        // Real-time subscription for service updates
        const channel = supabase
            .channel('customer-ops-tracking')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'wash_bookings' }, (payload) => {
                fetchBookings(true);
                if (payload.eventType === 'UPDATE') {
                    const newStatus = payload.new.status;
                    toast({ 
                        title: "Service Update 🧼", 
                        description: `Your wash is now: ${newStatus.replace('_', ' ').toUpperCase()}` 
                    });
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [fetchBookings]);

    const handleCancel = async (id: string) => {
        if (!confirm('Are you sure you want to cancel this request?')) return;
        try {
            const { error } = await supabase.from('wash_bookings').update({ status: 'cancelled' }).eq('id', id);
            if (error) throw error;
            toast({ title: 'Booking Cancelled' });
            fetchBookings(true);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Cancel Failed', description: e.message });
        }
    };

    if (!mounted || (loading && !refreshing)) return <div className="flex justify-center py-24"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

    const activeBookings = bookings.filter(b => !['completed', 'cancelled', 'rejected'].includes(b.status));
    const pastBookings = bookings.filter(b => ['completed', 'cancelled', 'rejected'].includes(b.status));

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-12 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-extrabold tracking-tight text-primary">Service Center</h1>
                    <p className="text-muted-foreground text-lg">Track your active washes and service history in real-time.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => fetchBookings(true)} className="rounded-full h-10 px-6 border-primary/20 bg-white">
                    <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} /> Sync Status
                </Button>
            </div>

            <Tabs defaultValue="active" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-md bg-muted/50 p-1 rounded-xl">
                    <TabsTrigger value="active" className="rounded-lg font-bold">Active Requests ({activeBookings.length})</TabsTrigger>
                    <TabsTrigger value="history" className="rounded-lg font-bold">History ({pastBookings.length})</TabsTrigger>
                </TabsList>
                
                <TabsContent value="active" className="mt-8 space-y-6">
                    {activeBookings.length > 0 ? (
                        <div className="grid gap-6 md:grid-cols-2">
                            {activeBookings.map((booking: any) => (
                                <Card key={booking.id} className="overflow-hidden border-2 shadow-lg group hover:border-primary/50 transition-all">
                                    <CardHeader className="bg-muted/10 pb-4 border-b">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-12 w-12 border shadow-sm">
                                                    <AvatarImage src={booking.business?.logo_url} />
                                                    <AvatarFallback className="bg-primary/5 text-primary font-black uppercase">{booking.business?.name?.[0]}</AvatarFallback>
                                                </Avatar>
                                                <div className="space-y-0.5">
                                                    <CardTitle className="text-lg">{booking.business?.name}</CardTitle>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-black uppercase">
                                                        <MapPin className="h-3 w-3" /> {booking.business?.city}
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge className={cn(
                                                "uppercase text-[10px] font-black px-3 py-1",
                                                booking.status === 'confirmed' ? "bg-blue-600 text-white" : 
                                                booking.status === 'assigned' ? "bg-orange-600 text-white" : "bg-slate-800 text-white"
                                            )}>
                                                {booking.status.replace('_', ' ')}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-6 space-y-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-primary/5 p-3 rounded-2xl border border-primary/10">
                                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Service Date</p>
                                                <div className="flex items-center gap-2 font-bold text-sm">
                                                    <Calendar className="h-4 w-4 text-primary" /> {new Date(booking.booking_date).toLocaleDateString()}
                                                </div>
                                            </div>
                                            <div className="bg-primary/5 p-3 rounded-2xl border border-primary/10">
                                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Scheduled Time</p>
                                                <div className="flex items-center gap-2 font-bold text-sm">
                                                    <Clock className="h-4 w-4 text-primary" /> {booking.booking_time}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t space-y-4">
                                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter">Assigned Professional</p>
                                            {booking.employee ? (
                                                <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border-2 border-dashed">
                                                    <Avatar className="h-14 w-14 border-4 border-white shadow-xl">
                                                        <AvatarImage src={booking.employee.image_url} className="object-cover" />
                                                        <AvatarFallback className="bg-primary text-white font-bold">{booking.employee.name[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1">
                                                        <p className="font-black text-slate-900 flex items-center gap-1.5 uppercase tracking-tight">
                                                            {booking.employee.name}
                                                            <ShieldCheck className="h-4 w-4 text-primary" />
                                                        </p>
                                                        {booking.status === 'confirmed' && (
                                                            <p className="text-xs font-bold text-primary flex items-center gap-1 mt-1">
                                                                <Phone className="h-3 w-3" /> {booking.employee.phone}
                                                            </p>
                                                        )}
                                                    </div>
                                                    {booking.status === 'confirmed' && (
                                                        <Button size="icon" variant="outline" className="rounded-full shadow-md border-primary/20" asChild>
                                                            <a href={`tel:${booking.employee.phone}`}><Phone className="h-4 w-4 text-primary" /></a>
                                                        </Button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="bg-muted/30 p-6 rounded-2xl border-2 border-dashed text-center space-y-2 opacity-60">
                                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                                                    <p className="text-[10px] font-black uppercase tracking-widest">Detailer Assignment Pending</p>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                    <CardFooter className="bg-muted/5 border-t pt-4 px-6 flex justify-between items-center h-16">
                                        <span className="text-[10px] font-black text-muted-foreground uppercase">Ref: {booking.id.slice(-8).toUpperCase()}</span>
                                        {['pending_assignment', 'assigned'].includes(booking.status) && (
                                            <Button variant="ghost" size="sm" className="h-8 text-xs font-black uppercase text-destructive hover:bg-destructive/5" onClick={() => handleCancel(booking.id)}>
                                                <XCircle className="h-3 w-3 mr-1.5" /> Cancel Request
                                            </Button>
                                        )}
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-32 border-4 border-dashed rounded-[2.5rem] bg-muted/5 flex flex-col items-center gap-6">
                            <div className="p-8 bg-white rounded-3xl shadow-xl">
                                <Droplets className="h-16 w-16 text-primary/20" />
                            </div>
                            <div className="space-y-2">
                                <p className="text-2xl font-black uppercase italic tracking-tight text-slate-400">No Active Washes</p>
                                <p className="text-muted-foreground max-w-sm mx-auto font-medium">Ready for a fresh shine? Find a verified partner nearby.</p>
                            </div>
                            <Button asChild className="h-14 px-10 text-lg font-black shadow-2xl rounded-2xl uppercase tracking-tighter" size="lg">
                                <Link href="/find-wash">Book a Wash Now</Link>
                            </Button>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="history">
                    <div className="grid gap-4">
                        {pastBookings.map((booking: any) => (
                            <Card key={booking.id} className="border-2 shadow-sm hover:border-primary/20 transition-all">
                                <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center border shadow-inner">
                                            <Droplets className="h-6 w-6 text-slate-400" />
                                        </div>
                                        <div>
                                            <p className="font-black text-lg tracking-tight uppercase italic">{booking.business?.name}</p>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                                <Calendar className="h-3 w-3" /> {new Date(booking.booking_date).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Badge variant="outline" className={cn(
                                            "uppercase text-[9px] font-black px-3",
                                            booking.status === 'completed' ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
                                        )}>
                                            {booking.status}
                                        </Badge>
                                        {booking.status === 'completed' && (
                                            <Button variant="outline" size="sm" className="h-9 px-4 font-bold border-primary/20" asChild>
                                                <Link href={`/customer/rate/${booking.id}`}><Star className="mr-2 h-3 w-3" /> Rate</Link>
                                            </Button>
                                        )}
                                        <Button variant="outline" size="sm" className="h-9 px-4 font-bold border-primary/20" asChild>
                                            <Link href={`/find-wash/${booking.wash_business_id}`}>Rebook</Link>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        {pastBookings.length === 0 && (
                            <div className="text-center py-20 italic text-muted-foreground font-medium">No service history found.</div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
