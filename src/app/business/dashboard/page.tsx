
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
    User,
    Phone,
    Calendar,
    CheckCircle2,
    Banknote,
    MoreHorizontal,
    ShieldCheck,
    MapPin,
    Package,
    TrendingUp,
    LayoutDashboard,
    ArrowUpRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuLabel, 
    DropdownMenuSeparator, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import Link from "next/link";

type BookingWithDetails = {
    id: string;
    booking_time: string;
    status: string;
    price: number;
    location_id?: string;
    customer: { name: string; email: string; phone?: string };
    service: { name: string };
    car: { make: string; model: string };
    staff: { id: string; name: string; phone: string; image_url: string } | null;
};

export default function BusinessDashboardPage() {
    const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
    const [staffList, setStaffList] = useState<any[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [business, setBusiness] = useState<any>(null);
    const [selectedLocation, setSelectedLocation] = useState<string>("all");
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

                // 2. Fetch Locations
                const { data: locData } = await supabase
                    .from('business_locations')
                    .select('*')
                    .eq('business_id', bizData.id);
                setLocations(locData || []);

                // 3. Fetch Employees
                const { data: staffData } = await supabase
                    .from("employees")
                    .select("id, name, phone, image_url")
                    .eq("business_id", bizData.id)
                    .order('name');
                setStaffList(staffData || []);

                // 4. Fetch Bookings
                const { data: bookingData, error: bookingError } = await supabase
                    .from("bookings")
                    .select(`
                        id,
                        booking_time,
                        status,
                        price,
                        location_id,
                        customer:users!bookings_customer_id_fkey ( name, email, phone ),
                        service:services!bookings_service_id_fkey ( name ),
                        car:cars!bookings_car_id_fkey ( make, model ),
                        staff:employees!bookings_staff_id_fkey ( id, name, phone, image_url )
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

    // Analytics Calculations
    const analytics = useMemo(() => {
        const filtered = selectedLocation === "all" 
            ? bookings 
            : bookings.filter(b => b.location_id === selectedLocation);
        
        const completed = filtered.filter(b => b.status === 'completed');
        const revenue = completed.reduce((acc, b) => acc + Number(b.price || 0), 0);
        const growth = completed.length > 0 ? (completed.length / filtered.length) * 100 : 0;

        return {
            totalRevenue: revenue,
            bookingCount: filtered.length,
            successRate: growth.toFixed(1),
            activeRequests: filtered.filter(b => b.status === 'requested').length
        };
    }, [bookings, selectedLocation]);

    const updateBookingStatus = async (bookingId: string, status: string) => {
        try {
            const { error } = await supabase.from("bookings").update({ status }).eq("id", bookingId);
            if (error) throw error;
            toast({ title: "Status Updated", description: `Booking is now ${status.toUpperCase()}.` });
            await fetchData(true);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
        }
    };

    if (!mounted) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

    const BookingTable = ({ list }: { list: BookingWithDetails[] }) => {
        const filteredList = selectedLocation === "all" 
            ? list 
            : list.filter(b => b.location_id === selectedLocation);

        return (
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50 border-b-2">
                            <TableHead className="font-bold">Customer</TableHead>
                            <TableHead className="font-bold">Service Info</TableHead>
                            <TableHead className="font-bold">Branch</TableHead>
                            <TableHead className="font-bold">Staff</TableHead>
                            <TableHead className="font-bold">Time</TableHead>
                            <TableHead className="text-right font-bold pr-6">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredList.length > 0 ? filteredList.map((booking) => (
                            <TableRow key={booking.id} className={cn("hover:bg-muted/20 transition-colors border-b", booking.status === 'completed' && "opacity-60")}>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-sm flex items-center gap-1.5"><User className="h-3 w-3 opacity-40" /> {booking.customer?.name}</span>
                                        <span className="text-[10px] text-muted-foreground font-medium">{booking.car?.make} {booking.car?.model}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="secondary" className="font-bold text-[10px] uppercase">{booking.service?.name}</Badge>
                                </TableCell>
                                <TableCell>
                                    <span className="text-[10px] font-black text-primary uppercase">
                                        {locations.find(l => l.id === booking.location_id)?.name || 'Main'}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-6 w-6">
                                            <AvatarImage src={booking.staff?.image_url} />
                                            <AvatarFallback><User className="h-3 w-3" /></AvatarFallback>
                                        </Avatar>
                                        <span className="text-xs font-medium">{booking.staff?.name || 'Unassigned'}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-[11px] font-medium">
                                    {new Date(booking.booking_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border"><MoreHorizontal className="h-4 w-4" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => updateBookingStatus(booking.id, 'accepted')} className="text-green-600 font-bold">Accept Request</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => updateBookingStatus(booking.id, 'completed')} className="font-bold">Mark Completed</DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => updateBookingStatus(booking.id, 'rejected')} className="text-destructive font-bold">Cancel</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={6} className="h-48 text-center text-muted-foreground italic">No matches for this location.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-extrabold tracking-tight text-primary flex items-center gap-3">
                        <LayoutDashboard className="h-10 w-10" />
                        {business?.name}
                    </h1>
                    <p className="text-muted-foreground font-medium">Network operations and branch performance overview.</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                        <SelectTrigger className="w-[200px] h-10 rounded-full border-primary/20 shadow-sm bg-white">
                            <MapPin className="h-4 w-4 mr-2 text-primary" />
                            <SelectValue placeholder="Select Location" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Branches</SelectItem>
                            {locations.map(loc => (
                                <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={() => fetchData(true)} className="rounded-full h-10 px-4">
                        <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
                    </Button>
                </div>
            </div>

            {/* Enterprise Analytics Widgets */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-2 shadow-sm relative overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Network Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-primary">P{analytics.totalRevenue.toLocaleString()}</div>
                        <p className="text-[10px] font-bold text-muted-foreground mt-1 flex items-center gap-1">
                            <TrendingUp className="h-3 w-3 text-green-500" /> BWP Gross Earnings
                        </p>
                    </CardContent>
                    <div className="absolute -right-4 -bottom-4 opacity-[0.03] rotate-12">
                        <Banknote className="h-24 w-24" />
                    </div>
                </Card>

                <Card className="border-2 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Total Bookings</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black">{analytics.bookingCount}</div>
                        <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase">Platform Volume</p>
                    </CardContent>
                </Card>

                <Card className="border-2 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Success Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-green-600">{analytics.successRate}%</div>
                        <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase">Completed vs Requests</p>
                    </CardContent>
                </Card>

                <Card className="border-2 shadow-sm bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-primary">Live Requests</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-primary">{analytics.activeRequests}</div>
                        <p className="text-[10px] font-bold text-primary/60 mt-1 uppercase">Pending Confirmation</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="incoming" className="w-full">
                <TabsList className="mb-8 grid w-full grid-cols-3 max-w-2xl bg-muted/50 p-1 rounded-xl">
                    <TabsTrigger value="incoming" className="rounded-lg font-bold">Incoming Requests</TabsTrigger>
                    <TabsTrigger value="active" className="rounded-lg font-bold">Active Ops</TabsTrigger>
                    <TabsTrigger value="completed" className="rounded-lg font-bold">Audit History</TabsTrigger>
                </TabsList>
                
                <TabsContent value="incoming">
                    <Card className="shadow-xl overflow-hidden border-2 rounded-2xl">
                        <BookingTable list={bookings.filter(b => b.status === 'requested')} />
                    </Card>
                </TabsContent>
                
                <TabsContent value="active">
                    <Card className="shadow-xl overflow-hidden border-2 rounded-2xl">
                        <BookingTable list={bookings.filter(b => ['accepted', 'confirmed', 'in-progress'].includes(b.status))} />
                    </Card>
                </TabsContent>
                
                <TabsContent value="completed">
                    <Card className="shadow-xl overflow-hidden border-2 rounded-2xl">
                        <BookingTable list={bookings.filter(b => b.status === 'completed')} />
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
