
'use client';
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Booking } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Star, Repeat, Loader2, Car as CarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";

function BookingCard({ booking }: { booking: any }) {
    const isPast = new Date(booking.booking_time) < new Date();
    const isMobile = booking.business?.type === 'mobile';
    
    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">#{booking.id.slice(-8).toUpperCase()}</CardTitle>
                    <Badge 
                      variant={booking.status === 'completed' ? 'secondary' : booking.status === 'cancelled' ? 'destructive' : 'default'}
                      className="uppercase text-[10px]"
                    >
                      {booking.status}
                    </Badge>
                </div>
                <CardDescription className="flex items-center gap-2 pt-1 font-medium text-foreground">
                    <Calendar className="h-4 w-4 text-primary" /> {new Date(booking.booking_time).toLocaleDateString()}
                    <Clock className="h-4 w-4 text-primary" /> {new Date(booking.booking_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                    <div className="bg-muted p-2 rounded-lg">
                        <MapPin className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                        <p className="text-sm font-bold">{booking.business?.name}</p>
                        <p className="text-xs text-muted-foreground">{booking.business?.city || 'Gaborone'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="bg-muted p-2 rounded-lg">
                        <CarIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold">{booking.service?.service_name}</p>
                        <p className="text-xs text-muted-foreground">P{booking.price.toFixed(2)} • {booking.service?.duration} mins</p>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t pt-4 bg-muted/5 rounded-b-lg">
                {booking.status === 'completed' && (
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/customer/rate/${booking.id}`}><Star className="mr-2 h-4 w-4" /> Rate</Link>
                    </Button>
                )}
                {booking.status === 'completed' && (
                    <Button size="sm" asChild>
                        <Link href={`/customer/book/${booking.business_id}`}>
                            <Repeat className="mr-2 h-4 w-4" /> Book Again
                        </Link>
                    </Button>
                )}
                {isMobile && booking.status === 'in-progress' && (
                    <Button size="sm" asChild>
                        <Link href={`/customer/track/${booking.id}`}><MapPin className="mr-2 h-4 w-4" /> Track</Link>
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}

export default function BookingHistoryPage() {
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchBookings() {
            setLoading(true);
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;

                const { data, error } = await supabase
                    .from('bookings')
                    .select(`
                        *,
                        business:business_id ( name, city, type ),
                        service:service_id ( service_name, duration )
                    `)
                    .eq('customer_id', session.user.id)
                    .order('booking_time', { ascending: false });

                if (error) throw error;
                setBookings(data || []);
            } catch (e: any) {
                toast({ variant: 'destructive', title: 'Fetch Error', description: 'Could not load bookings.' });
            } finally {
                setLoading(false);
            }
        }
        fetchBookings();
    }, []);

    const upcomingBookings = bookings.filter(b => new Date(b.booking_time) >= new Date() && b.status !== 'cancelled' && b.status !== 'completed');
    const pastBookings = bookings.filter(b => new Date(b.booking_time) < new Date() || b.status === 'cancelled' || b.status === 'completed');

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold">My Bookings</h1>
                <p className="text-muted-foreground">Manage your scheduled washes and review past services.</p>
            </div>

            <Tabs defaultValue="upcoming" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-md">
                    <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                    <TabsTrigger value="past">History</TabsTrigger>
                </TabsList>
                
                <TabsContent value="upcoming" className="mt-6">
                    {loading ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <Skeleton className="h-64 w-full" />
                            <Skeleton className="h-64 w-full" />
                        </div>
                    ) : upcomingBookings.length > 0 ? (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {upcomingBookings.map(b => <BookingCard key={b.id} booking={b} />)}
                        </div>
                    ) : (
                        <div className="text-center py-20 border-2 border-dashed rounded-xl bg-muted/20">
                            <p className="text-muted-foreground font-medium italic">You have no upcoming bookings scheduled.</p>
                            <Button variant="link" asChild>
                                <Link href="/customer/home">Find a wash now</Link>
                            </Button>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="past" className="mt-6">
                    {loading ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <Skeleton className="h-64 w-full" />
                        </div>
                    ) : pastBookings.length > 0 ? (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {pastBookings.map(b => <BookingCard key={b.id} booking={b} />)}
                        </div>
                    ) : (
                        <div className="text-center py-20 border-2 border-dashed rounded-xl bg-muted/20">
                            <p className="text-muted-foreground font-medium italic">No past booking records found.</p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
