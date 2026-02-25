
'use client';
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { CheckCircle, Calendar, Clock, Store, Loader2 } from "lucide-react";
import Link from "next/link";
import { Badge } from '@/components/ui/badge';

export default function BookingConfirmationPage({ params }: { params: Promise<{ bookingId: string }> }) {
    const { bookingId } = React.use(params);
    const [booking, setBooking] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchBooking() {
            setLoading(true);
            const { data, error } = await supabase
                .from('bookings')
                .select(`
                    *,
                    business:business_id ( name, city ),
                    service:service_id ( service_name )
                `)
                .eq('id', bookingId)
                .maybeSingle();
            
            if (data) setBooking(data);
            setLoading(false);
        }
        fetchBooking();
    }, [bookingId]);

    if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

    return (
        <div className="flex flex-col items-center justify-center pt-8 pb-16 px-4">
            <div className="w-full max-w-xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card className="text-center overflow-hidden border-2 border-green-100 shadow-2xl">
                    <div className="h-2 bg-green-500 w-full" />
                    <CardHeader className="pt-10 pb-6">
                        <div className="mx-auto bg-green-100 rounded-full h-24 w-24 flex items-center justify-center shadow-inner">
                            <CheckCircle className="h-12 w-12 text-green-600" />
                        </div>
                        <CardTitle className="mt-6 text-3xl font-extrabold tracking-tight">Booking Requested!</CardTitle>
                        <CardDescription className="text-lg">
                            We&apos;ve sent your request to the business for approval.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 px-10">
                        <div className="bg-muted/30 p-6 rounded-2xl space-y-4 border border-dashed">
                            <div className="flex justify-between items-center border-b pb-3">
                                <span className="text-sm font-medium text-muted-foreground">Request ID</span>
                                <span className="font-mono text-sm font-bold uppercase">{bookingId.slice(-8)}</span>
                            </div>
                            <div className="flex items-center gap-4 text-left">
                                <div className="bg-white p-3 rounded-xl shadow-sm">
                                    <Store className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold">{booking?.business?.name}</p>
                                    <p className="text-xs text-muted-foreground">{booking?.business?.city || 'Gaborone'}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-left">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-primary" />
                                    <span className="text-sm font-medium">{booking ? new Date(booking.booking_time).toLocaleDateString() : '...'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-primary" />
                                    <span className="text-sm font-medium">{booking ? new Date(booking.booking_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Badge variant="outline" className="text-primary font-bold px-4 py-1">
                                {booking?.service?.service_name} • P{booking?.price.toFixed(2)}
                            </Badge>
                            <p className="text-[10px] text-muted-foreground italic">
                                Once accepted, an invoice will be automatically generated and visible in your dashboard.
                            </p>
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col sm:flex-row gap-4 p-8 bg-muted/5">
                        <Button className="w-full h-12 shadow-lg" asChild>
                            <Link href="/customer/bookings">View My Bookings</Link>
                        </Button>
                        <Button variant="outline" className="w-full h-12" asChild>
                            <Link href="/customer/home">Back to Marketplace</Link>
                        </Button>
                    </CardFooter>
                </Card>

                <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                        Need to make a change? Contact the business directly using their profile details.
                    </p>
                </div>
            </div>
        </div>
    );
}
