'use client';
import { mockGetBookingsForCustomer } from "@/lib/mock-api";
import type { Booking } from "@/lib/types";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Star, Repeat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

function BookingCard({ booking }: { booking: Booking }) {
    const isPast = new Date(booking.bookingTime) < new Date();
    const isMobile = !!booking.assignedEmployeeId;
    
    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle>Booking #{booking.id.slice(-4)}</CardTitle>
                    <Badge variant={booking.status === 'completed' ? 'secondary' : 'default'}>{booking.status}</Badge>
                </div>
                <CardDescription className="flex items-center gap-2 pt-1">
                    <Calendar className="h-4 w-4" /> {new Date(booking.bookingTime).toLocaleDateString()}
                    <Clock className="h-4 w-4" /> {new Date(booking.bookingTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p>Business ID: {booking.businessId}</p>
                <p>Service ID: {booking.serviceId}</p>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                {booking.status === 'completed' && (
                    <Button variant="outline" asChild>
                        <Link href={`/customer/rate/${booking.id}`}><Star className="mr-2 h-4 w-4" /> Rate Service</Link>
                    </Button>
                )}
                 {booking.status === 'completed' && (
                    <Button>
                        <Repeat className="mr-2 h-4 w-4" /> Book Again
                    </Button>
                 )}
                {isMobile && !isPast && (
                    <Button asChild>
                        <Link href={`/customer/track/${booking.id}`}><MapPin className="mr-2 h-4 w-4" /> Track Service</Link>
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}

export default function BookingHistoryPage() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBookings = async () => {
            setLoading(true);
            const { data } = await mockGetBookingsForCustomer("user-1");
            setBookings(data);
            setLoading(false);
        };
        fetchBookings();
    }, []);

    const upcomingBookings = bookings.filter(b => new Date(b.bookingTime) >= new Date() && b.status !== 'cancelled');
    const pastBookings = bookings.filter(b => new Date(b.bookingTime) < new Date() || b.status === 'cancelled');

    const renderBookingList = (list: Booking[]) => {
        if (loading) {
            return Array.from({length: 2}).map((_,i) => <Skeleton key={i} className="h-56 w-full" />);
        }
        if (list.length === 0) {
            return <p className="text-muted-foreground text-center py-8">No bookings found.</p>;
        }
        return list.map(booking => <BookingCard key={booking.id} booking={booking} />);
    }

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">My Bookings</h1>
            <Tabs defaultValue="upcoming">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                    <TabsTrigger value="past">Past</TabsTrigger>
                </TabsList>
                <TabsContent value="upcoming">
                    <div className="space-y-4 mt-4">
                        {renderBookingList(upcomingBookings)}
                    </div>
                </TabsContent>
                <TabsContent value="past">
                    <div className="space-y-4 mt-4">
                        {renderBookingList(pastBookings)}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
