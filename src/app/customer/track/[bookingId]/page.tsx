
'use client';
import { mockGetBookingById, mockGetEmployeesForBusiness } from '@/lib/mock-api';
import type { Booking, Employee } from '@/lib/types';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, CheckCircle, MessageSquare, MapPin, Clock } from 'lucide-react';
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

export default function MobileServiceTrackingPage({ params }: { params: { bookingId: string } }) {
    const [booking, setBooking] = useState<Booking | null>(null);
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBookingDetails = async () => {
            setLoading(true);
            const { data: bookingData } = await mockGetBookingById(params.bookingId);
            setBooking(bookingData);
            if (bookingData?.assignedEmployeeId && bookingData.businessId) {
                const { data: employees } = await mockGetEmployeesForBusiness(bookingData.businessId);
                const assignedEmployee = employees.find(e => e.id === bookingData.assignedEmployeeId);
                setEmployee(assignedEmployee || null);
            }
            setLoading(false);
        };
        fetchBookingDetails();
    }, [params.bookingId]);

    const currentStepIndex = booking?.mobileBookingStatus ? timelineSteps.findIndex(step => step.id === booking.mobileBookingStatus) : -1;

    if (loading) {
        return (
            <div className="max-w-3xl mx-auto space-y-6">
                <Skeleton className="h-10 w-64" />
                <Card><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
                <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
            </div>
        );
    }
    
    if (!booking || !employee) {
        return (
            <div className="text-center py-20">
                <h2 className="text-2xl font-bold">Booking Not Found</h2>
                <p className="text-muted-foreground">We couldn't find tracking information for this service.</p>
            </div>
        );
    }
    
    return (
        <div className="max-w-3xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Service Tracker</h1>
                <Badge variant="outline" className="font-mono">#{booking.id.slice(-4)}</Badge>
            </div>

            <Card className="overflow-hidden border-primary/20 shadow-lg">
                <div className="bg-primary px-6 py-4 text-primary-foreground">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16 border-2 border-primary-foreground/20">
                            <AvatarImage src={employee.imageUrl} alt={employee.name} />
                            <AvatarFallback className="text-primary">{employee.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="text-lg font-bold">{employee.name}</p>
                            <p className="text-sm opacity-90">Professional Detailer</p>
                        </div>
                        <div className="ml-auto flex gap-2">
                            <Button size="icon" variant="secondary" className="rounded-full">
                                <Phone className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="secondary" className="rounded-full">
                                <MessageSquare className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
                <CardContent className="p-6">
                    <div className="space-y-8 relative">
                        {timelineSteps.map((step, index) => {
                            const isCompleted = index < currentStepIndex;
                            const isCurrent = index === currentStepIndex;
                            const isFuture = index > currentStepIndex;
                            const StepIcon = step.icon;

                            return (
                                <div key={step.id} className="flex gap-4 group">
                                    <div className="relative flex flex-col items-center">
                                        <div className={cn(
                                            "h-10 w-10 rounded-full flex items-center justify-center z-10 border-4 transition-all duration-500",
                                            isCompleted ? "bg-primary border-primary text-primary-foreground" : 
                                            isCurrent ? "bg-background border-primary text-primary animate-pulse" : 
                                            "bg-background border-muted text-muted-foreground"
                                        )}>
                                            <StepIcon className="h-5 w-5" />
                                        </div>
                                        {index < timelineSteps.length - 1 && (
                                            <div className={cn(
                                                "w-1 absolute top-10 bottom-0 -mb-8 transition-colors duration-500",
                                                isCompleted ? "bg-primary" : "bg-muted"
                                            )} />
                                        )}
                                    </div>
                                    <div className="flex-1 pt-2">
                                        <p className={cn(
                                            "font-bold transition-colors",
                                            isFuture ? "text-muted-foreground" : "text-foreground"
                                        )}>
                                            {step.label}
                                        </p>
                                        {isCurrent && (
                                            <p className="text-sm text-primary font-medium animate-in fade-in slide-in-from-left-2">
                                                Active Status Update
                                            </p>
                                        )}
                                        {isCompleted && (
                                            <p className="text-xs text-muted-foreground">Completed</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Service Details</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase font-semibold">Service Type</p>
                        <p className="text-sm font-medium">Eco Mobile Wash</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase font-semibold">Vehicle</p>
                        <p className="text-sm font-medium">B 789 XYZ (Ford Ranger)</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase font-semibold">Location</p>
                        <p className="text-sm font-medium">Customer Premises</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase font-semibold">Scheduled Time</p>
                        <p className="text-sm font-medium">{new Date(booking.bookingTime).toLocaleString()}</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
