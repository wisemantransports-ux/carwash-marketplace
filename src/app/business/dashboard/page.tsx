'use client';
import { mockAssignEmployeeToBooking, mockGetBookingsForBusiness, mockGetCurrentUser, mockGetEmployeesForBusiness } from "@/lib/mock-api";
import type { Booking, Business, Employee } from "@/lib/types";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { User, Calendar, Clock, Car, Users, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

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
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : assignedEmployee ? 'Change' : 'Assign'}
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

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const user = await mockGetCurrentUser('business-owner');
            if (user) {
                // In a real app, businessId would be linked to the user.
                const businessId = "biz-2"; // Hardcoded for mobile service demo
                const { data: bookingData } = await mockGetBookingsForBusiness(businessId);
                const { data: employeeData } = await mockGetEmployeesForBusiness(businessId);
                setBookings(bookingData.filter(b => b.status !== 'completed' && b.status !== 'cancelled'));
                setEmployees(employeeData);
            }
            setLoading(false);
        };
        fetchData();
    }, []);

    const handleAssignEmployee = async (bookingId: string, employeeId: string) => {
        await mockAssignEmployeeToBooking(bookingId, employeeId);
        const { data: bookingData } = await mockGetBookingsForBusiness("biz-2"); // Re-fetch
        setBookings(bookingData.filter(b => b.status !== 'completed' && b.status !== 'cancelled'));
    };

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Active Bookings</h1>
            {loading ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
                </div>
            ) : bookings.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {bookings.map(booking => {
                        const assignedEmployee = employees.find(e => e.id === booking.assignedEmployeeId);
                        return (
                        <Card key={booking.id}>
                            <CardHeader>
                                <CardTitle>Booking #{booking.id.slice(-4)}</CardTitle>
                                <CardDescription className="flex items-center gap-2 pt-1">
                                    <Calendar className="h-4 w-4" /> {new Date(booking.bookingTime).toLocaleDateString()}
                                    <Clock className="h-4 w-4" /> {new Date(booking.bookingTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Car className="h-4 w-4 text-muted-foreground" /> <span>Service ID: {booking.serviceId}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground" /> <span>Customer ID: {booking.customerId}</span>
                                </div>
                                <div>
                                    <Badge>{booking.status}</Badge>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-between items-center">
                               {booking.assignedEmployeeId ? (
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={assignedEmployee?.imageUrl} />
                                            <AvatarFallback>{assignedEmployee?.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="text-sm font-medium">{assignedEmployee?.name}</p>
                                            <p className="text-xs text-muted-foreground">{booking.mobileBookingStatus}</p>
                                        </div>
                                    </div>
                               ) : <p className="text-sm text-muted-foreground">Unassigned</p>}
                                <AssignEmployeeDropdown booking={booking} employees={employees} onAssign={handleAssignEmployee} />
                            </CardFooter>
                        </Card>
                    )})}
                </div>
            ) : (
                <div className="text-center py-16 border-2 border-dashed rounded-lg">
                    <h3 className="text-xl font-semibold">No Active Bookings</h3>
                    <p className="text-muted-foreground mt-2">New bookings will appear here.</p>
                </div>
            )}
        </div>
    );
}
