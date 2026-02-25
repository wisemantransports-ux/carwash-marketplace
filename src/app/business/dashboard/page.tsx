
'use client';
import { mockGetBookingsForBusiness, mockAcceptBooking, mockRejectBooking, mockCompleteBooking, mockGetBusinessById } from "@/lib/mock-api";
import type { Booking, Business } from "@/lib/types";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Car, User, Loader2, CheckCircle2, XCircle, PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function BusinessDashboardPage() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [business, setBusiness] = useState<Business | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        const businessId = "biz-2"; 
        const { data: bizData } = await mockGetBusinessById(businessId);
        const { data: bookingData } = await mockGetBookingsForBusiness(businessId);
        setBusiness(bizData);
        setBookings(bookingData);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAction = async (id: string, action: 'accept' | 'reject' | 'complete') => {
        if (action === 'accept') await mockAcceptBooking(id);
        if (action === 'reject') await mockRejectBooking(id);
        if (action === 'complete') await mockCompleteBooking(id);
        
        toast({
            title: `Booking ${action === 'accept' ? 'Accepted' : action === 'reject' ? 'Rejected' : 'Completed'}`,
            description: action === 'accept' ? "Invoice has been automatically generated." : "Status updated successfully.",
        });
        fetchData();
    };

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

    const requested = bookings.filter(b => b.status === 'requested');
    const active = bookings.filter(b => b.status === 'accepted' || b.status === 'in-progress');

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-bold tracking-tight">Operations</h1>
                <p className="text-muted-foreground">Manage incoming requests and active wash operations.</p>
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
                                            <Calendar className="h-3 w-3" /> {new Date(booking.bookingTime).toLocaleDateString()}
                                            <Clock className="h-3 w-3" /> {new Date(booking.bookingTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Car className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium">Pula {booking.price} Wash</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <User className="h-4 w-4" />
                                            <span>Customer ID: {booking.customerId}</span>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="flex gap-2">
                                        <Button className="flex-1" onClick={() => handleAction(booking.id, 'accept')}>
                                            <CheckCircle2 className="mr-2 h-4 w-4" /> Accept
                                        </Button>
                                        <Button variant="outline" className="flex-1 text-destructive" onClick={() => handleAction(booking.id, 'reject')}>
                                            <XCircle className="mr-2 h-4 w-4" /> Reject
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 border-2 border-dashed rounded-xl bg-muted/20">
                            <p className="text-muted-foreground">No new booking requests at this time.</p>
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
                                        <div className="flex items-center gap-2 text-sm">
                                            <Car className="h-4 w-4 text-muted-foreground" />
                                            <span>Service ID: {booking.serviceId}</span>
                                        </div>
                                    </CardContent>
                                    <CardFooter>
                                        <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => handleAction(booking.id, 'complete')}>
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
