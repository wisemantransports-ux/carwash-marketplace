'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Booking, Employee } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, CheckCircle, MessageSquare, MapPin, Clock, User, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const timelineSteps = [
    { id: 'en-route', label: 'On The Way', icon: MapPin },
    { id: 'arrived', label: 'Arrived', icon: CheckCircle },
    { id: 'service-started', label: 'In Progress', icon: Clock },
    { id: 'service-finished', label: 'Complete', icon: CheckCircle },
];

export default function MobileServiceTrackingPage({ params }: { params: Promise<{ bookingId: string }> }) {
    const { bookingId } = React.use(params);
    const [booking, setBooking] = useState<any>(null);
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTrackingDetails = async () => {
            setLoading(true);
            try {
                // 1. Fetch Booking
                const { data: bookingData, error: bookingError } = await supabase
                    .from('bookings')
                    .select('*, service:service_id(name), car:car_id(make, model, plate_number)')
                    .eq('id', bookingId)
                    .maybeSingle();
                
                if (bookingError) throw bookingError;
                if (bookingData) {
                    setBooking(bookingData);
                    
                    // 2. Fetch Assigned Employee
                    if (bookingData.assignedEmployeeId) {
                        const { data: empData, error: empError } = await supabase
                            .from('employees')
                            .select('*')
                            .eq('id', bookingData.assignedEmployeeId)
                            .maybeSingle();
                        
                        if (empError) throw empError;
                        setEmployee(empData);
                    }
                }
            } catch (error) {
                console.error("Tracking fetch error:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchTrackingDetails();
    }, [bookingId]);

    const currentStepIndex = booking?.mobileBookingStatus ? timelineSteps.findIndex(step => step.id === booking.mobileBookingStatus) : -1;

    if (loading) {
        return (
            <div className="max-w-3xl mx-auto space-y-6 pt-10">
                <Skeleton className="h-10 w-64" />
                <Card><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
                <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
            </div>
        );
    }
    
    if (!booking) {
        return (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
                <AlertCircle className="h-12 w-12 text-muted-foreground opacity-20" />
                <h2 className="text-2xl font-bold">Booking Not Found</h2>
                <p className="text-muted-foreground">We couldn't find tracking information for this service.</p>
            </div>
        );
    }
    
    return (
        <div className="max-w-3xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Service Tracker</h1>
                <Badge variant="outline" className="font-mono bg-primary/5 text-primary border-primary/20">
                    #{booking.id.slice(-8).toUpperCase()}
                </Badge>
            </div>

            {employee ? (
                <Card className="overflow-hidden border-primary/20 shadow-lg">
                    <div className="bg-primary px-6 py-6 text-primary-foreground">
                        <div className="flex items-center gap-4">
                            <Avatar className="h-20 w-20 border-4 border-primary-foreground/20 shadow-xl">
                                <AvatarImage src={employee.image_url} alt={employee.name} className="object-cover" />
                                <AvatarFallback className="bg-white text-primary text-xl font-bold">
                                    {employee.name.charAt(0)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="space-y-1">
                                <p className="text-2xl font-bold">{employee.name}</p>
                                <div className="flex items-center gap-2 text-sm opacity-90 font-medium">
                                    <ShieldCheck className="h-4 w-4" />
                                    Verified Professional Detailer
                                </div>
                            </div>
                            <div className="ml-auto flex gap-2">
                                <Button size="icon" variant="secondary" className="rounded-full h-12 w-12 shadow-lg" asChild>
                                    <a href={`tel:${employee.phone}`}><Phone className="h-5 w-5" /></a>
                                </Button>
                                <Button size="icon" variant="secondary" className="rounded-full h-12 w-12 shadow-lg">
                                    <MessageSquare className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                    </div>
                    <CardContent className="p-8">
                        <div className="space-y-10 relative">
                            {timelineSteps.map((step, index) => {
                                const isCompleted = index < currentStepIndex;
                                const isCurrent = index === currentStepIndex;
                                const isFuture = index > currentStepIndex;
                                const StepIcon = step.icon;

                                return (
                                    <div key={step.id} className="flex gap-6 group">
                                        <div className="relative flex flex-col items-center">
                                            <div className={cn(
                                                "h-12 w-12 rounded-full flex items-center justify-center z-10 border-4 transition-all duration-500 shadow-sm",
                                                isCompleted ? "bg-primary border-primary text-primary-foreground" : 
                                                isCurrent ? "bg-background border-primary text-primary animate-pulse" : 
                                                "bg-background border-muted text-muted-foreground"
                                            )}>
                                                <StepIcon className="h-6 w-6" />
                                            </div>
                                            {index < timelineSteps.length - 1 && (
                                                <div className={cn(
                                                    "w-1 absolute top-12 bottom-0 -mb-10 transition-colors duration-500",
                                                    isCompleted ? "bg-primary" : "bg-muted"
                                                )} />
                                            )}
                                        </div>
                                        <div className="flex-1 pt-2">
                                            <p className={cn(
                                                "text-lg font-extrabold transition-colors",
                                                isFuture ? "text-muted-foreground" : "text-foreground"
                                            )}>
                                                {step.label}
                                            </p>
                                            {isCurrent && (
                                                <p className="text-sm text-primary font-bold animate-in fade-in slide-in-from-left-2 mt-1">
                                                    Current Status: Active Update
                                                </p>
                                            )}
                                            {isCompleted && (
                                                <p className="text-xs text-muted-foreground font-medium flex items-center gap-1 mt-1">
                                                    <CheckCircle className="h-3 w-3 text-green-500" /> Completed
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card className="bg-muted/30 border-dashed py-12">
                    <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
                        <div className="p-4 bg-background rounded-full shadow-sm">
                            <User className="h-10 w-10 text-muted-foreground opacity-40" />
                        </div>
                        <div className="space-y-1">
                            <p className="font-bold text-lg">Staff Assignment Pending</p>
                            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                                The business will assign a professional detailer to your booking shortly.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card className="shadow-md border-muted/50">
                <CardHeader className="bg-muted/10 border-b">
                    <CardTitle className="text-lg">Service Summary</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6 sm:grid-cols-2 p-6">
                    <div className="space-y-1.5">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Service Package</p>
                        <p className="text-sm font-bold text-primary">{booking.service?.name || 'Professional Wash'}</p>
                    </div>
                    <div className="space-y-1.5">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Vehicle Details</p>
                        <p className="text-sm font-bold">
                            {booking.car?.plate_number} ({booking.car?.make} {booking.car?.model})
                        </p>
                    </div>
                    <div className="space-y-1.5">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Location</p>
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                            Customer Premises
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Scheduled Time</p>
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            {new Date(booking.booking_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
