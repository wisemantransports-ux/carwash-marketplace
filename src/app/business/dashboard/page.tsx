
'use client';
import { mockAssignEmployeeToBooking, mockGetBookingsForBusiness, mockGetCurrentUser, mockGetEmployeesForBusiness, mockGetBusinessById } from "@/lib/mock-api";
import type { Booking, Business, Employee } from "@/lib/types";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { User, Calendar, Clock, Car, Users, Loader2, TrendingUp, CheckCircle, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

function AssignEmployeeDropdown({ booking, employees, onAssign }: { booking: Booking, employees: Employee[], onAssign: (bookingId: string, employeeId: string) => void }) {
    const [loading, setLoading] = useState(false);
    const assignedEmployee = employees.find(e => e.id === booking.assignedEmployeeId);

    const handleAssign = async (employeeId: string) => {
        setLoading(true);
        await onAssign(booking.id, employeeId);
        toast({
            title: "Employee Assigned",
            description: `${employees.find(e => e.id === employeeId)?.name} has been assigned to booking #${booking.id.slice(-4)}.`,
        });
        setLoading(false);
    }
    
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : assignedEmployee ? 'Change Staff' : 'Assign Staff'}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                {employees.map(employee => (
                    <DropdownMenuItem key={employee.id} onClick={() => handleAssign(employee.id)}>
                        {employee.name}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

export default function BusinessDashboardPage() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [business, setBusiness] = useState<Business | null>(null);
    const [loading, setLoading] = useState(true);

    const stats = [
        { label: "Today's Revenue", value: "P1,250", icon: TrendingUp, color: "text-green-500" },
        { label: "Pending Tasks", value: bookings.length.toString(), icon: Clock, color: "text-blue-500" },
        { label: "Active Team", value: employees.length.toString(), icon: Users, color: "text-purple-500" },
        { label: "Completion Rate", value: "94%", icon: CheckCircle, color: "text-orange-500" },
    ];

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const user = await mockGetCurrentUser('business-owner');
            if (user) {
                const businessId = "biz-2"; // Pula Mobile Wash
                const { data: bizData } = await mockGetBusinessById(businessId);
                const { data: bookingData } = await mockGetBookingsForBusiness(businessId);
                const { data: employeeData } = await mockGetEmployeesForBusiness(businessId);
                
                setBusiness(bizData);
                setBookings(bookingData.filter(b => b.status !== 'completed' && b.status !== 'cancelled'));
                setEmployees(employeeData);
            }
            setLoading(false);
        };
        fetchData();
    }, []);

    const handleAssignEmployee = async (bookingId: string, employeeId: string) => {
        await mockAssignEmployeeToBooking(bookingId, employeeId);
        const { data: bookingData } = await mockGetBookingsForBusiness("biz-2");
        setBookings(bookingData.filter(b => b.status !== 'completed' && b.status !== 'cancelled'));
    };

    const isInactive = business?.subscriptionStatus !== 'active';

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <h1 className="text-4xl font-bold tracking-tight">Business Dashboard</h1>
                    {business && (
                        <Badge variant={isInactive ? 'destructive' : 'secondary'} className="ml-2">
                            {business.subscriptionStatus.toUpperCase().replace('_', ' ')}
                        </Badge>
                    )}
                </div>
                <p className="text-muted-foreground">Monitor your service operations and team assignments.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat, i) => (
                    <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                            <stat.icon className={`h-4 w-4 ${stat.color}`} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-semibold">Active Operations</h2>
                    <Badge variant="secondary">{bookings.length} active</Badge>
                </div>

                {loading ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
                    </div>
                ) : isInactive ? (
                    <div className="text-center py-20 border-2 border-dashed rounded-xl bg-muted/20 flex flex-col items-center gap-4">
                        <ShieldAlert className="h-12 w-12 text-muted-foreground" />
                        <div>
                            <h3 className="text-lg font-medium text-muted-foreground">Subscription Required</h3>
                            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                                You must have an active subscription to receive and manage customer bookings.
                            </p>
                        </div>
                        <Button asChild>
                            <Link href="/business/subscription">View Pricing Plans</Link>
                        </Button>
                    </div>
                ) : bookings.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {bookings.map(booking => {
                            const assignedEmployee = employees.find(e => e.id === booking.assignedEmployeeId);
                            return (
                                <Card key={booking.id} className="relative overflow-hidden">
                                    <div className={`absolute top-0 left-0 w-1 h-full ${booking.status === 'confirmed' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <CardTitle>#{booking.id.slice(-4)}</CardTitle>
                                            <Badge variant={booking.status === 'confirmed' ? 'default' : 'outline'}>
                                                {booking.status.toUpperCase()}
                                            </Badge>
                                        </div>
                                        <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
                                            <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {new Date(booking.bookingTime).toLocaleDateString()}</span>
                                            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {new Date(booking.bookingTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-sm">
                                                <Car className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-medium">Service ID: {booking.serviceId}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <User className="h-4 w-4" />
                                                <span>Customer: {booking.customerId}</span>
                                            </div>
                                        </div>
                                        
                                        {booking.mobileBookingStatus && (
                                            <div className="bg-muted p-2 rounded-md text-xs font-medium flex items-center justify-between">
                                                <span>Mobile Progress:</span>
                                                <span className="text-primary uppercase">{booking.mobileBookingStatus.replace('-', ' ')}</span>
                                            </div>
                                        )}
                                    </CardContent>
                                    <CardFooter className="flex justify-between items-center bg-muted/30 pt-4">
                                       <div className="flex items-center gap-2">
                                            {booking.assignedEmployeeId ? (
                                                <>
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={assignedEmployee?.imageUrl} />
                                                        <AvatarFallback>{assignedEmployee?.name.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold">{assignedEmployee?.name}</span>
                                                        <span className="text-[10px] text-muted-foreground">Assigned</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <span className="text-xs text-muted-foreground italic">Unassigned</span>
                                            )}
                                       </div>
                                        <AssignEmployeeDropdown booking={booking} employees={employees} onAssign={handleAssignEmployee} />
                                    </CardFooter>
                                </Card>
                            )})}
                    </div>
                ) : (
                    <div className="text-center py-20 border-2 border-dashed rounded-xl bg-muted/20">
                        <h3 className="text-lg font-medium text-muted-foreground">No active bookings found</h3>
                        <p className="text-sm text-muted-foreground mt-1">Check back later when customers book your services.</p>
                    </div>
                )}
            </section>
        </div>
    );
}
