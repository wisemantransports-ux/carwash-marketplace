'use client';

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Star, Repeat, Loader2, Car as CarIcon, XCircle, UserCheck, Phone, CheckCircle2, ShieldCheck } from "lucide-react";
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
  const canCancel = ['requested', 'pending', 'confirmed', 'accepted'].includes(booking.status);
  const isConfirmed = booking.status === 'confirmed' || booking.status === 'accepted';
  
  const [cancelling, setCancelling] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isFinishingOpen, setIsFinishingOpen] = useState(false);

  const dateStr = booking.booking_time ? new Date(booking.booking_time).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) : '---';
  const timeStr = booking.booking_time ? new Date(booking.booking_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '---';

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', booking.booking_id);

      if (error) throw error;
      toast({ title: 'Booking Cancelled' });
      onRefresh();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Cancellation Failed', description: error.message });
    } finally {
      setCancelling(false);
    }
  };

  const handleFinishAndRate = async () => {
    if (rating === 0) {
        toast({ variant: 'destructive', title: 'Rating Required', description: 'Please select a star rating.' });
        return;
    }

    setFinishing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Unauthorized");

      // Transactional logic: Update booking status and upsert rating
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', booking.booking_id);
      
      if (bookingError) throw bookingError;

      const { error: ratingError } = await supabase.from('ratings').upsert({
        booking_id: booking.booking_id,
        customer_id: session.user.id,
        business_id: booking.business_id,
        rating: rating,
        feedback: feedback
      }, { onConflict: 'booking_id' });

      if (ratingError) throw ratingError;

      toast({ title: 'Service Completed', description: 'Your feedback has been submitted.' });
      setIsFinishingOpen(false);
      onRefresh();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Process Failed', description: error.message });
    } finally {
      setFinishing(false);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow overflow-hidden flex flex-col h-full border-2">
      <CardHeader className="pb-3 bg-muted/10">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border shadow-sm">
              <AvatarImage src={booking.business_avatar} alt={booking.business_name} />
              <AvatarFallback>{booking.business_name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">{booking.business_name || 'Partner'}</CardTitle>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase font-bold">
                <MapPin className="h-3 w-3" /> {booking.city}
              </div>
            </div>
          </div>
          <Badge 
            variant={
              booking.status === 'completed' ? 'secondary' : 
              ['cancelled', 'rejected'].includes(booking.status) ? 'destructive' : 'default'
            }
            className="uppercase text-[10px] font-black px-3"
          >
            {booking.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pb-4 flex-grow pt-4">
        <div className="bg-muted/30 p-3 rounded-lg space-y-2 border">
            <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-primary">{booking.service_name}</span>
                <span className="text-primary/80">P{Number(booking.price || 0).toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground font-bold">
                <span className="flex items-center gap-1"><CarIcon className="h-3.5 w-3.5" /> {booking.car_details}</span>
            </div>
        </div>

        <div className="flex items-center gap-2 font-black text-[10px] uppercase tracking-widest text-muted-foreground bg-muted/10 p-2 rounded border border-dashed">
            <Calendar className="h-3.5 w-3.5 text-primary" /> {dateStr}
            <span className="mx-1 opacity-20">|</span>
            <Clock className="h-3.5 w-3.5 text-primary" /> {timeStr}
        </div>

        {/* Assigned Staff Section (Enhanced Display) */}
        <div className="mt-4 pt-4 border-t space-y-3">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter">Service Detailer</p>
            {booking.staff ? (
                <div className="flex items-center gap-3 bg-primary/5 p-3 rounded-xl border border-primary/10">
                    <Avatar className="h-12 w-12 border-2 border-white shadow-md">
                        <AvatarImage src={booking.staff.image_url} alt={booking.staff.name} className="object-cover" />
                        <AvatarFallback className="bg-primary/10 text-primary font-black">
                            {booking.staff.name?.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold flex items-center gap-1.5">
                            {booking.staff.name}
                            <ShieldCheck className="h-3 w-3 text-primary" />
                        </span>
                        <div className="flex items-center gap-1 text-[11px] text-primary font-bold mt-0.5">
                            <Phone className="h-3 w-3" /> {booking.staff.phone || 'Phone not available'}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-3 bg-muted/20 p-3 rounded-xl border border-dashed opacity-60">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                        <UserCheck className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-muted-foreground">Detailer Assignment Pending</span>
                        <span className="text-[10px] text-muted-foreground">Will be assigned shortly</span>
                    </div>
                </div>
            )}
        </div>

        {booking.status === 'completed' && booking.hasRating && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-100 rounded-lg">
                <div className="flex gap-0.5">
                    {Array.from({length: 5}).map((_, i) => (
                        <Star key={i} className={cn("h-3 w-3", i < booking.ratingValue ? "text-yellow-400 fill-yellow-400" : "text-gray-200")} />
                    ))}
                </div>
                {booking.ratingFeedback && <p className="text-[10px] text-muted-foreground italic mt-1 line-clamp-1">"{booking.ratingFeedback}"</p>}
            </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between gap-2 border-t pt-3 bg-muted/5">
        {isConfirmed && booking.status !== 'completed' && (
            <Dialog open={isFinishingOpen} onOpenChange={setIsFinishingOpen}>
                <DialogTrigger asChild>
                    <Button variant="default" size="sm" className="h-8 text-xs bg-green-600 hover:bg-green-700 font-bold shadow-md">
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
                            <Label className="font-bold">Rate Your Experience</Label>
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
                            <Label className="font-bold">Feedback (Optional)</Label>
                            <Textarea 
                                placeholder="What stood out during your service?" 
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button className="w-full bg-green-600 h-12 text-lg shadow-lg font-bold" onClick={handleFinishAndRate} disabled={finishing || rating === 0}>
                            {finishing && <Loader2 className="animate-spin mr-2 h-5 w-5" />}
                            Confirm Completion
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )}
        
        <div className="flex gap-2 ml-auto">
            {canCancel && booking.status !== 'completed' && (
                <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive hover:bg-destructive/5 font-bold" onClick={handleCancel} disabled={cancelling}>
                    {cancelling ? <Loader2 className="animate-spin h-3 w-3" /> : <XCircle className="h-3 w-3 mr-1" />}
                    Cancel
                </Button>
            )}
            {!isUpcoming && (
                <Button size="sm" variant="outline" className="h-8 text-xs font-bold shadow-sm" asChild>
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
    const [mounted, setMounted] = useState(false);

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
                    rating:ratings!booking_id ( rating, feedback )
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
                car_details: b.car ? `${b.car.make} ${b.car.model}` : 'Vehicle',
                staff: b.staff,
                hasRating: b.rating && b.rating.length > 0,
                ratingValue: b.rating?.[0]?.rating || 0,
                ratingFeedback: b.rating?.[0]?.feedback || ''
            }));

            setBookings(formatted);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Fetch Error', description: 'Could not load bookings.' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setMounted(true);
        fetchBookings();
    }, [fetchBookings]);

    if (!mounted) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

    const upcomingBookings = bookings.filter(b => !['completed', 'cancelled', 'rejected'].includes(b.status));
    const pastBookings = bookings.filter(b => ['completed', 'cancelled', 'rejected'].includes(b.status));

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-12 animate-in fade-in duration-500">
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-extrabold tracking-tight text-primary">My Bookings</h1>
                <p className="text-muted-foreground text-lg">Manage your active washes and track your service history.</p>
            </div>

            <Tabs defaultValue="upcoming" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-md bg-muted/50 p-1 rounded-xl">
                    <TabsTrigger value="upcoming" className="rounded-lg font-bold">Upcoming ({upcomingBookings.length})</TabsTrigger>
                    <TabsTrigger value="past" className="rounded-lg font-bold">History ({pastBookings.length})</TabsTrigger>
                </TabsList>
                
                <TabsContent value="upcoming" className="mt-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {upcomingBookings.length > 0 ? (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {upcomingBookings.map(b => (
                                <BookingCard key={b.booking_id} booking={b} onRefresh={fetchBookings} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-24 border-2 border-dashed rounded-3xl bg-muted/10 flex flex-col items-center gap-4">
                            <div className="p-6 bg-background rounded-full shadow-sm">
                                <CarIcon className="h-12 w-12 text-primary/20" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-xl font-bold text-muted-foreground">No upcoming bookings found.</p>
                                <p className="text-sm text-muted-foreground opacity-60">Ready for a fresh shine? Find a verified wash nearby.</p>
                            </div>
                            <Button asChild className="mt-4 shadow-lg rounded-full px-8"><Link href="/customer/home">Book a Wash Now</Link></Button>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="past" className="mt-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
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

function RefreshCw({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  )
}
