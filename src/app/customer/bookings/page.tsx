
'use client';

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Star, Repeat, Loader2, Car as CarIcon, XCircle, FileText, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function BookingCard({ booking, onCancel }: { booking: any, onCancel: (id: string) => void }) {
  const isUpcoming = !['completed', 'cancelled', 'rejected'].includes(booking.status);
  const canCancel = booking.status === 'requested' || booking.status === 'pending';
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    setCancelling(true);
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', booking.booking_id);

    if (error) {
      toast({ variant: 'destructive', title: 'Cancellation Failed', description: error.message });
    } else {
      toast({ title: 'Booking Cancelled', description: 'Your request has been cancelled successfully.' });
      onCancel(booking.booking_id);
    }
    setCancelling(false);
  };

  return (
    <Card className="hover:shadow-md transition-shadow overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border shadow-sm">
              <AvatarImage src={booking.business_avatar} alt={booking.business_name} />
              <AvatarFallback>{booking.business_name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">{booking.business_name || 'Partner'}</CardTitle>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                <MapPin className="h-3 w-3" /> {booking.city || 'Gaborone'}
              </div>
            </div>
          </div>
          <Badge 
            variant={
              booking.status === 'completed' ? 'secondary' : 
              booking.status === 'cancelled' || booking.status === 'rejected' ? 'destructive' : 'default'
            }
            className="uppercase text-[10px]"
          >
            {booking.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pb-4">
        <div className="bg-muted/30 p-3 rounded-lg space-y-2">
            <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-primary">{booking.service_name || 'Wash Service'}</span>
                <span className="font-bold">P{Number(booking.service_price || 0).toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {booking.service_duration || '--'} mins</span>
                <span className="flex items-center gap-1"><CarIcon className="h-3.5 w-3.5" /> {booking.car_details || booking.car_id || 'Registered Vehicle'}</span>
            </div>
        </div>

        <div className="flex items-center gap-2 font-medium text-sm">
            <Calendar className="h-4 w-4 text-primary" /> 
            <span>{booking.booking_time ? new Date(booking.booking_time).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) : '---'}</span>
            <span className="text-muted-foreground">•</span>
            <Clock className="h-4 w-4 text-primary" />
            <span>{booking.booking_time ? new Date(booking.booking_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '---'}</span>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between gap-2 border-t pt-3 bg-muted/5">
        <div className="flex gap-2">
            {booking.status === 'completed' && (
                <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
                    <Link href={`/customer/rate/${booking.booking_id}`}><Star className="mr-1 h-3 w-3" /> Rate</Link>
                </Button>
            )}
            {isUpcoming && booking.mobile_status && (
                <Button variant="ghost" size="sm" className="h-8 text-xs text-primary" asChild>
                    <Link href={`/customer/track/${booking.booking_id}`}><MapPin className="mr-1 h-3 w-3" /> Track</Link>
                </Button>
            )}
        </div>
        
        <div className="flex gap-2">
            {canCancel && (
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10">
                            <XCircle className="mr-1 h-3 w-3" /> Cancel
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Cancel Booking?</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to cancel your {booking.service_name} at {booking.business_name}? This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
                                {cancelling ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                                Confirm Cancellation
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
            {!isUpcoming && (
                <Button size="sm" className="h-8 text-xs" asChild>
                    <Link href={`/customer/book/${booking.business_id}`}>
                        <Repeat className="mr-1 h-3 w-3" /> Rebook
                    </Link>
                </Button>
            )}
            <Button variant="secondary" size="sm" className="h-8 text-xs" asChild>
                <Link href={`/customer/invoices`}>
                    <FileText className="mr-1 h-3 w-3" /> Invoice
                </Link>
            </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

export default function BookingHistoryPage() {
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchBookings = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // Fetching from the customer_bookings view
            // We assume the view already handles the "access_active" requirement or the column name is different
            const { data, error } = await supabase
                .from('customer_bookings')
                .select('*')
                .eq('customer_id', session.user.id)
                .order('booking_time', { ascending: false });

            if (error) throw error;
            setBookings(data || []);
        } catch (e: any) {
            console.error('Detailed fetch error:', {
                message: e.message,
                details: e.details,
                hint: e.hint,
                code: e.code
            });
            toast({ 
                variant: 'destructive', 
                title: 'Fetch Error', 
                description: 'Could not load your bookings. The backend view might still be initializing.' 
            });
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchBookings();
    }, []);

    const handleRefresh = () => {
        fetchBookings();
    }

    const upcomingBookings = bookings.filter(b => 
        !['completed', 'cancelled', 'rejected'].includes(b.status)
    );
    const pastBookings = bookings.filter(b => 
        ['completed', 'cancelled', 'rejected'].includes(b.status)
    );

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">My Bookings</h1>
                    <p className="text-muted-foreground">Manage your car wash appointments and track mobile services.</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Repeat className="h-4 w-4 mr-2" />}
                    Refresh
                </Button>
            </div>

            <Tabs defaultValue="upcoming" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-md bg-muted/50 p-1">
                    <TabsTrigger value="upcoming" className="data-[state=active]:bg-background">
                        Upcoming ({upcomingBookings.length})
                    </TabsTrigger>
                    <TabsTrigger value="past" className="data-[state=active]:bg-background">
                        History ({pastBookings.length})
                    </TabsTrigger>
                </TabsList>
                
                <TabsContent value="upcoming" className="mt-8">
                    {loading ? (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            <Skeleton className="h-[280px] w-full rounded-xl" />
                            <Skeleton className="h-[280px] w-full rounded-xl" />
                            <Skeleton className="h-[280px] w-full rounded-xl" />
                        </div>
                    ) : upcomingBookings.length > 0 ? (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {upcomingBookings.map(b => (
                                <BookingCard key={b.booking_id} booking={b} onCancel={handleRefresh} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-24 border-2 border-dashed rounded-3xl bg-muted/10 space-y-6">
                            <div className="bg-background w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-sm">
                                <Calendar className="h-10 w-10 text-muted-foreground/30" />
                            </div>
                            <div className="space-y-2">
                                <p className="text-xl font-bold">No upcoming bookings</p>
                                <p className="text-muted-foreground max-w-xs mx-auto text-sm">
                                    You don&apos;t have any washes scheduled at the moment.
                                </p>
                            </div>
                            <Button asChild size="lg" className="rounded-full px-8 shadow-lg">
                                <Link href="/customer/home">Discover Washes <ChevronRight className="ml-2 h-4 w-4" /></Link>
                            </Button>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="past" className="mt-8">
                    {loading ? (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            <Skeleton className="h-[280px] w-full rounded-xl" />
                        </div>
                    ) : pastBookings.length > 0 ? (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {pastBookings.map(b => (
                                <BookingCard key={b.booking_id} booking={b} onCancel={handleRefresh} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-24 border-2 border-dashed rounded-3xl bg-muted/10 space-y-4">
                            <Clock className="h-12 w-12 mx-auto text-muted-foreground/20" />
                            <p className="text-muted-foreground font-medium italic">Your booking history is currently empty.</p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
