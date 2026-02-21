'use client';
import { mockGetBookingById, mockGetEmployeesForBusiness } from '@/lib/mock-api';
import type { Booking, Employee } from '@/lib/types';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const timelineSteps = [
    { id: 'en-route', label: 'On The Way' },
    { id: 'arrived', label: 'Arrived' },
    { id: 'service-started', label: 'Service Started' },
    { id: 'service-finished', label: 'Service Finished' },
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
            <div>
                <Skeleton className="h-9 w-64 mb-6" />
                <Card><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
                <Card className="mt-6"><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
            </div>
        );
    }
    
    if (!booking || !employee) {
        return <p>Booking or employee details not found.</p>;
    }
    
    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Track Your Mobile Service</h1>
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Your Technician</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                        <AvatarImage src={employee.imageUrl} alt={employee.name} />
                        <AvatarFallback>{employee.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="text-xl font-semibold">{employee.name}</p>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            <span>{employee.phone}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Service Status</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-between">
                        {timelineSteps.map((step, index) => (
                            <div key={step.id} className="flex flex-col items-center relative flex-1">
                                <div className={cn(
                                    "h-8 w-8 rounded-full flex items-center justify-center z-10",
                                    index <= currentStepIndex ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground border-2"
                                )}>
                                    {index <= currentStepIndex ? <CheckCircle className="h-5 w-5" /> : <span className="text-sm font-bold">{index + 1}</span>}
                                </div>
                                <p className={cn("mt-2 text-sm text-center", index <= currentStepIndex ? 'font-semibold text-primary' : 'text-muted-foreground')}>{step.label}</p>
                                {index < timelineSteps.length - 1 && (
                                     <div className={cn("absolute top-4 left-1/2 w-full h-0.5", index < currentStepIndex ? 'bg-primary' : 'bg-muted-foreground/30')} />
                                )}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
