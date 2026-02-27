'use client';

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Star, Repeat, Loader2, Car as CarIcon, XCircle, FileText, ChevronRight, UserCheck, Phone, CheckCircle2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

function BookingCard({ booking, onRefresh }: { booking: any, onRefresh: () => void }) {
  const isUpcoming = !['completed', 'cancelled', 'rejected'].includes(booking.status);
  const canCancel = ['requested', 'pending', 'confirmed'].includes(booking.status);
  const isConfirmed = booking.status === 'confirmed';
  
  const [cancelling, setCancelling] = useState(false);
  const [finishing, setFinishing] = useState(false);
  
  // Feedback form state
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isFinishingOpen, setIsFinishingOpen] = useState(false);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', booking.booking_id);

      if (error) throw error;

      toast({ 
        title: 'Booking Cancelled', 
        description: 'Your booking has been successfully cancelled.' 
      });
      
      onRefresh();
    } catch (error: any) {
      toast({ 
        variant: 'destructive', 
        title: 'Cancellation Failed', 
        description: error.message || 'Could not cancel the booking.' 
      });
    } finally {
      setCancelling(false);
    }
  };

  const handleFinishAndRate = async () => {
    setFinishing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Unauthorized");

      // 1. Update Booking status
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', booking.booking_id);
      
      if (bookingError) throw bookingError;

      // 2. Submit Rating if provided
      if (rating > 0) {
        const { error: ratingError } = await supabase
          .from('ratings')
          .insert({
            booking_id: booking.booking_id,
            customer_id: session.user.id,
            business_id: booking.business_id,
            rating: rating,
            feedback: feedback
          });
        
        if (ratingError) throw ratingError;
      }

      toast({ title: 'Service Completed', description: 'Thank you for your feedback!' });
      setIsFinishingOpen(false);
      onRefresh();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
    } finally {
      setFinishing(false);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow overflow-hidden flex flex-col h-full">
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
      <CardContent className="space-y-4 pb-4 flex-grow">
        <div className="bg-muted/30 p-3 rounded-lg space-y-2">
            <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-primary">{booking.service_name || 'Wash Service'}</span>
                <span className="font-bold">P{Number(booking.price || 0).toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {booking.service_duration || '--'} mins</span>
                <span className="flex items-center gap-1"><CarIcon className="h-3.5 w-3.5" /> {booking.car_details || 'Registered Vehicle'}</span>
            </div>
        </div>

        <div className="flex items-center gap-2 font-medium text-sm">
            <Calendar className="h-4 w-4 text-primary" /> 
            <span>{booking.booking_time ? new Date(booking.booking_time).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) : '---'}</span>
            <span className="text-muted-foreground">•</span>
            <Clock className="h-4 w-4 text-primary" />
            <span>{booking.booking_time ? new Date(booking.booking_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '---'}</span>
        </div>

        <div className="mt-4 pt-4 border-t">
            {booking.staff ? (
                <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border-2 border-primary/10">
                        <AvatarImage src={booking.staff.image_url} alt={booking.staff.name} className="object-cover" />
                        <AvatarFallback className="bg-primary/5 text-primary text-[10px] font-bold">
                            {booking.staff.name?.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold">{booking.staff.name}</span>
                            <Badge variant="outline" className="text-[8px] h-4 px-1 py-0 border-primary/20 text-primary">Detailer</Badge>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Phone className="h-2.5 w-2.5" /> {booking.staff.phone}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground italic">
                    <UserCheck className="h-3 w-3 opacity-50" />
                    {['cancelled', 'rejected'].includes(booking.status) ? "No detailer assigned" : "Staff not yet assigned."}
                </div>
            )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between gap-2 border-t pt-3 bg-muted/5">
        <div className="flex gap-2">
            {isConfirmed && (
                <Dialog open={isFinishingOpen} onOpenChange={setIsFinishingOpen}>
                    <DialogTrigger asChild>
                        <Button variant="default" size="sm" className="h-8 text-xs bg-green-600 hover:bg-green-700">
                            <CheckCircle2 className="mr-1 h-3 w-3" /> Finish & Rate
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Service Completed?</DialogTitle>
                            <DialogDescription>Confirm the wash is finished and let the business know how they did.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6 py-4">
                            <div className="text-center space-y-3">
                                <Label>How was the experience?</Label>
                                <div className="flex justify-center gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                            key={star}
                                            className={cn(
                                                "h-8 w-8 cursor-pointer transition-all hover:scale-110",
                                                rating >= star ? "text-yellow-400 fill-yellow-400" : "text-gray-200"
                                            )}
                                            onClick={() => setRating(star)}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Optional Feedback</Label>
                                <Textarea 
                                    placeholder="Tell us what was great or what could be improved..." 
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleFinishAndRate} disabled={finishing}>
                                {finishing ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                                Confirm Completion
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
            {booking.status === 'completed' && !booking.hasRating && (
                <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
                    <Link href={`/customer/rate/${booking.booking_id}`}><Star className="mr-1 h-3 w-3" /> Rate</Link>
                </Button>
            )}
        </div>
        
        <div className="flex gap-2">
            {canCancel && (
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 text-xs text-destructive hover:text-destructive">
                            <XCircle className="mr-1 h-3 w-3" /> Cancel
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Cancel Booking?</DialogTitle>
                            <DialogDescription>This action cannot be undone.</DialogDescription>
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
        </div>
      </CardFooter>
    </Card>
  );
}

export default function BookingHistoryPage() {
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchBookings = useCallback(async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data, error } = await supabase
                .from('bookings')
                .select(`
                    *,
                    business:business_id ( name, city, logo_url ),
                    service:service_id ( name, duration ),
                    car:car_id ( make, model ),
                    staff:staff_id ( name, phone, image_url ),
                    rating:ratings!booking_id ( id )
                `)
                .eq('customer_id', session.user.id)
                .order('booking_time', { ascending: false });

            if (error) throw error;

            const formatted = (data || []).map(b => ({
                booking_id: b.id,
                status: b.status,
                booking_time: b.booking_time,
                price: b.price,
                business_id: b.business_id,
                business_name: b.business?.name || 'Partner',
                city: b.business?.city || 'Gaborone',
                business_avatar: b.business?.logo_url,
                service_name: b.service?.name || 'Wash Service',
                service_duration: b.service?.duration,
                car_details: b.car ? `${b.car.make} ${b.car.model}` : 'Registered Vehicle',
                staff: b.staff,
                hasRating: b.rating && b.rating.length > 0
            }));

            setBookings(formatted);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Fetch Error', description: 'Could not load your bookings.' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

    const upcomingBookings = bookings.filter(b => !['completed', 'cancelled', 'rejected'].includes(b.status));
    const pastBookings = bookings.filter(b => ['completed', 'cancelled', 'rejected'].includes(b.status));

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">My Bookings</h1>
                    <p className="text-muted-foreground">Confirm completions and track your mobile services.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => fetchBookings()} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    Refresh
                </Button>
            </div>

            <Tabs defaultValue="upcoming" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-md">
                    <TabsTrigger value="upcoming">Upcoming ({upcomingBookings.length})</TabsTrigger>
                    <TabsTrigger value="past">History ({pastBookings.length})</TabsTrigger>
                </TabsList>
                
                <TabsContent value="upcoming" className="mt-8">
                    {loading ? (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            <Skeleton className="h-[280px] w-full rounded-xl" />
                            <Skeleton className="h-[280px] w-full rounded-xl" />
                        </div>
                    ) : upcomingBookings.length > 0 ? (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {upcomingBookings.map(b => (
                                <BookingCard key={b.booking_id} booking={b} onRefresh={fetchBookings} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-24 border-2 border-dashed rounded-3xl bg-muted/10">
                            <p className="text-xl font-bold">No upcoming bookings</p>
                            <Button asChild className="mt-4"><Link href="/customer/home">Discover Washes</Link></Button>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="past" className="mt-8">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {pastBookings.map(b => (
                            <BookingCard key={b.booking_id} booking={b} onRefresh={fetchBookings} />
                        ))}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

// Helper icon fix
function RefreshCw(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  )
}
