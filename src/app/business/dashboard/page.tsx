
'use client';

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
    Loader2, 
    RefreshCw, 
    AlertCircle, 
    Truck,
    Star,
    User,
    Mail,
    Phone,
    Calendar,
    CheckCircle2,
    Banknote,
    UserCheck,
    Info,
    ArrowUpCircle,
    MoreHorizontal
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuLabel, 
    DropdownMenuSeparator, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import Link from "next/link";

type BookingWithDetails = {
    id: string;
    booking_time: string;
    status: string;
    price: number;
    customer: { name: string; email: string; whatsapp_number?: string };
    service: { name: string };
    car: { make: string; model: string };
    staff: { id: string; name: string } | null;
};

export default function BusinessDashboardPage() {
    const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
    const [staffList, setStaffList] = useState<any[]>([]);
    const [business, setBusiness] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const fetchData = useCallback(async (isSilent = false) => {
        if (!isSupabaseConfigured) {
            setFetchError("Database configuration missing.");
            setLoading(false);
            return;
        }

        if (!isSilent) setLoading(true);
        else setRefreshing(true);
        
        setFetchError(null);

        try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) {
                setLoading(false);
                setRefreshing(false);
                return;
            }

            // 1. Fetch Business Info
            const { data: bizData, error: bizError } = await supabase
                .from('businesses')
                .select('*')
                .eq('owner_id', authUser.id)
                .maybeSingle();
            
            if (bizError) throw bizError;
            
            if (bizData) {
                setBusiness(bizData);

                // 2. Fetch Employees for assignment
                const { data: staffData } = await supabase
                    .from("employees")
                    .select("id, name")
                    .eq("business_id", bizData.id)
                    .order('name');
                
                setStaffList(staffData || []);

                // 3. Fetch Bookings with exact 8-column required fields
                const { data: bookingData, error: bookingError } = await supabase
                    .from("bookings")
                    .select(`
                        id,
                        booking_time,
                        status,
                        price,
                        customer:users!bookings_customer_id_fkey ( name, email, whatsapp_number ),
                        service:services!bookings_service_id_fkey ( name ),
                        car:cars!bookings_car_id_fkey ( make, model ),
                        staff:employees!bookings_staff_id_fkey ( id, name )
                    `)
                    .eq("business_id", bizData.id)
                    .order("booking_time", { ascending: false });
                
                if (bookingError) throw bookingError;
                setBookings((bookingData as any) || []);

            } else {
                setFetchError("Business profile not found.");
            }
        } catch (error: any) {
            console.error("[DASHBOARD] Fetch failure:", error);
            setFetchError(error.message || "A database error occurred.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        setMounted(true);
        fetchData();
    }, [fetchData]);

    const updateBookingStatus = async (bookingId: string, status: string) => {
        try {
            const { error } = await supabase
                .from("bookings")
                .update({ status })
                .eq("id", bookingId);

            if (error) throw error;

            toast({ 
                title: "Status Updated",
                description: `Booking is now ${status.toUpperCase()}.`
            });
            
            await fetchData(true);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
        }
    };

    const handleAssignStaff = async (bookingId: string, staffId: string) => {
        try {
            const { error } = await supabase
                .from("bookings")
                .update({ staff_id: staffId })
                .eq("id", bookingId);

            if (error) throw error;
            toast({ title: "Staff Assigned", description: "Detailer updated successfully." });
            await fetchData(true);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Assignment Failed', description: e.message });
        }
    };

    // Plan Quota Logic
    const quotaInfo = useMemo(() => {
        if (!business) return null;
        const now = new Date();
        const isStarter = business.subscription_plan === 'Starter';
        const trialExpiry = business.sub_end_date ? new Date(business.sub_end_date) : null;
        const isTrialActive = trialExpiry ? trialExpiry > now : false;
        if (!isStarter || isTrialActive) return null;

        const currentMonthBookings = bookings.filter(b => {
            const bDate = new Date(b.booking_time);
            return bDate.getMonth() === now.getMonth() && bDate.getFullYear() === now.getFullYear();
        }).length;

        const limit = 15;
        const remaining = Math.max(0, limit - currentMonthBookings);
        return { remaining, total: limit, isAtLimit: remaining <= 0 };
    }, [business, bookings]);

    if (!mounted) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
            <Loader2 className="animate-spin h-10 w-10 text-primary" />
            <p className="text-muted-foreground animate-pulse">Establishing secure connection...</p>
        </div>
    );

    const BookingTable = ({ list }: { list: BookingWithDetails[] }) => (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50 border-b-2">
                        <TableHead className="font-bold whitespace-nowrap">Customer Name</TableHead>
                        <TableHead className="font-bold whitespace-nowrap">Email</TableHead>
                        <TableHead className="font-bold whitespace-nowrap">Phone</TableHead>
                        <TableHead className="font-bold whitespace-nowrap">Service</TableHead>
                        <TableHead className="font-bold whitespace-nowrap">Car Make & Model</TableHead>
                        <TableHead className="font-bold whitespace-nowrap">Assigned Staff</TableHead>
                        <TableHead className="font-bold whitespace-nowrap">Booking Time</TableHead>
                        <TableHead className="text-right font-bold pr-6">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {list.length > 0 ? list.map((booking) => (
                        <TableRow key={booking.id} className={cn(
                            "hover:bg-muted/20 transition-colors border-b",
                            booking.status === 'completed' && "opacity-60"
                        )}>
                            <TableCell className="font-bold text-sm">
                                <div className="flex items-center gap-2">
                                    <User className="h-3 w-3 text-muted-foreground" />
                                    {booking.customer?.name || 'N/A'}
                                </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <Mail className="h-3 w-3" />
                                    {booking.customer?.email || 'N/A'}
                                </div>
                            </TableCell>
                            <TableCell className="text-xs font-medium">
                                <div className="flex items-center gap-2">
                                    <Phone className="h-3 w-3 text-primary" />
                                    {booking.customer?.whatsapp_number || 'N/A'}
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant="secondary" className="font-bold text-[10px] uppercase tracking-tight">
                                    {booking.service?.name || 'Standard Wash'}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-xs font-bold">
                                {booking.car?.make} {booking.car?.model || 'N/A'}
                            </TableCell>
                            <TableCell className="min-w-[160px]">
                                <select
                                    className="h-8 w-full rounded-md border bg-background px-2 text-[11px] font-bold cursor-pointer outline-none focus:ring-1 focus:ring-primary"
                                    value={booking.staff?.id || ""}
                                    onChange={(e) => handleAssignStaff(booking.id, e.target.value)}
                                    disabled={booking.status === 'completed' || booking.status === 'rejected'}
                                >
                                    <option value="">Unassigned</option>
                                    {staffList.map((s) => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </TableCell>
                            <TableCell className="text-[11px] font-medium whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-3 w-3 text-muted-foreground" />
                                    {new Date(booking.booking_time).toLocaleString([], { 
                                        month: 'short', 
                                        day: 'numeric', 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                    })}
                                </div>
                            </TableCell>
                            <TableCell className="text-right pr-6">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                        <DropdownMenuLabel>Manage Booking</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {booking.status === 'requested' && (
                                            <DropdownMenuItem 
                                                onClick={() => updateBookingStatus(booking.id, 'accepted')}
                                                className="text-green-600 font-bold"
                                            >
                                                <CheckCircle2 className="mr-2 h-4 w-4" /> Accept Request
                                            </DropdownMenuItem>
                                        )}
                                        {booking.status !== 'completed' && booking.status !== 'rejected' && (
                                            <>
                                                <DropdownMenuItem onClick={() => updateBookingStatus(booking.id, 'completed')} className="font-bold">
                                                    <Truck className="mr-2 h-4 w-4" /> Mark Completed
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => updateBookingStatus(booking.id, 'completed')} className="text-primary font-bold">
                                                    <Banknote className="mr-2 h-4 w-4" /> Mark Paid
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem 
                                            onClick={() => updateBookingStatus(booking.id, 'rejected')}
                                            className="text-destructive focus:text-destructive focus:bg-destructive/10 font-bold"
                                        >
                                            <AlertCircle className="mr-2 h-4 w-4" /> Reject/Cancel
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={8} className="h-48 text-center text-muted-foreground italic">
                                <div className="flex flex-col items-center gap-2 opacity-40">
                                    <Truck className="h-10 w-10" />
                                    <p>No requests available.</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );

    const filteredBookings = (status: string[]) => bookings.filter(b => status.includes(b.status));

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-extrabold tracking-tight text-primary">{business?.name || 'Operations'}</h1>
                    <p className="text-muted-foreground font-medium">Manage wash requests and staff assignments in real-time.</p>
                </div>
                
                <div className="flex items-center gap-3">
                    {quotaInfo && (
                        <Badge variant="outline" className={cn(
                            "px-3 py-1 font-black text-[10px] uppercase",
                            quotaInfo.isAtLimit ? "bg-red-50 text-red-700 border-red-200 animate-pulse" : "bg-blue-50 text-blue-700 border-blue-200"
                        )}>
                            {quotaInfo.remaining} / {quotaInfo.total} Requests Left
                        </Badge>
                    )}
                    <Button variant="outline" size="sm" onClick={() => fetchData(true)} className="rounded-full h-9 px-4 border-primary/20">
                        <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} /> Refresh Queue
                    </Button>
                </div>
            </div>

            {fetchError && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Operational Error</AlertTitle>
                    <AlertDescription>{fetchError}</AlertDescription>
                </Alert>
            )}

            <Tabs defaultValue="incoming" className="w-full">
                <TabsList className="mb-8 grid w-full grid-cols-3 max-w-2xl bg-muted/50 p-1 rounded-xl">
                    <TabsTrigger value="incoming" className="rounded-lg font-bold">Incoming ({filteredBookings(['requested']).length})</TabsTrigger>
                    <TabsTrigger value="active" className="rounded-lg font-bold">Active ({filteredBookings(['accepted', 'in-progress']).length})</TabsTrigger>
                    <TabsTrigger value="completed" className="rounded-lg font-bold">History ({filteredBookings(['completed']).length})</TabsTrigger>
                </TabsList>
                
                <TabsContent value="incoming">
                    <Card className="shadow-lg overflow-hidden border-2">
                        <BookingTable list={filteredBookings(['requested'])} />
                    </Card>
                </TabsContent>
                
                <TabsContent value="active">
                    <Card className="shadow-lg overflow-hidden border-2">
                        <BookingTable list={filteredBookings(['accepted', 'in-progress'])} />
                    </Card>
                </TabsContent>
                
                <TabsContent value="completed">
                    <Card className="shadow-lg overflow-hidden border-2">
                        <BookingTable list={filteredBookings(['completed'])} />
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
