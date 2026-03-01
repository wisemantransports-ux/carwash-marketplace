'use client';

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
    Loader2, 
    RefreshCw, 
    AlertCircle, 
    Truck,
    Lock,
    Star,
    Mail,
    User,
    CheckCircle2,
    Info,
    ArrowUpCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function BusinessDashboardPage() {
    const [bookings, setBookings] = useState<any[]>([]);
    const [staffList, setStaffList] = useState<any[]>([]);
    const [business, setBusiness] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    
    const [localStaffAssignments, setLocalStaffAssignments] = useState<Record<string, string>>({});

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

                // 2. Fetch Employees
                const { data: staffData } = await supabase
                    .from("employees")
                    .select("id, name")
                    .eq("business_id", bizData.id)
                    .order('name');
                
                setStaffList(staffData || []);

                // 3. Fetch All Bookings for Quota and Operations
                const { data: bookingData, error: bookingError } = await supabase
                    .from("bookings")
                    .select(`
                        id,
                        booking_time,
                        status,
                        staff_id,
                        price,
                        customer:users!bookings_customer_id_fkey ( name, email ),
                        service:services!bookings_service_id_fkey ( name, price ),
                        car:cars!bookings_car_id_fkey ( make, model ),
                        staff:employees!bookings_staff_id_fkey ( name ),
                        rating:ratings!booking_id ( rating, feedback )
                    `)
                    .eq("business_id", bizData.id)
                    .order("booking_time", { ascending: true });
                
                if (bookingError) throw bookingError;
                setBookings(bookingData || []);

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

    // Plan & Quota Logic
    const quotaInfo = useMemo(() => {
        if (!business) return null;
        
        const now = new Date();
        const isStarter = business.subscription_plan === 'Starter';
        const isTrialActive = business.sub_end_date ? new Date(business.sub_end_date) > now : false;
        
        if (!isStarter || isTrialActive) return null;

        const currentMonthBookings = bookings.filter(b => {
            if (!b.booking_time) return false;
            const bDate = new Date(b.booking_time);
            return bDate.getMonth() === now.getMonth() && bDate.getFullYear() === now.getFullYear();
        }).length;

        const limit = 15;
        const remaining = Math.max(0, limit - currentMonthBookings);
        const percentUsed = (currentMonthBookings / limit) * 100;

        return {
            remaining,
            total: limit,
            isAtLimit: remaining <= 0,
            isApproachingLimit: remaining <= 3,
            percentUsed
        };
    }, [business, bookings]);

    const updateStatus = async (bookingId: string, status: string) => {
        try {
            const { error } = await supabase
                .from("bookings")
                .update({ status })
                .eq("id", bookingId);

            if (error) throw error;

            toast({ 
                title: status === 'accepted' ? "Booking Accepted ✅" : "Booking Rejected ❌",
                description: status === 'accepted' ? "Service moved to active queue." : "Request removed."
            });
            
            await fetchData(true);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
        }
    };

    const handleAssignStaff = async (bookingId: string, staffId: string) => {
        if (!staffId) return;
        
        setLocalStaffAssignments(prev => ({ ...prev, [bookingId]: staffId }));

        try {
            const { error } = await supabase
                .from("bookings")
                .update({ staff_id: staffId })
                .eq("id", bookingId);

            if (error) throw error;
            toast({ title: "Employee assigned successfully." });
            await fetchData(true);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Assignment Failed', description: e.message });
        }
    };

    if (!mounted) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
            <Loader2 className="animate-spin h-10 w-10 text-primary" />
            <p className="text-muted-foreground animate-pulse">Initializing operations center...</p>
        </div>
    );

    const BookingTable = ({ list, isPending = false, isHistory = false }: { list: any[], isPending?: boolean, isHistory?: boolean }) => (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50 border-b-2">
                        <TableHead className="font-bold px-4 py-4 whitespace-nowrap">Customer Name</TableHead>
                        <TableHead className="font-bold px-4 whitespace-nowrap">Customer Email</TableHead>
                        <TableHead className="font-bold px-4 whitespace-nowrap">Service Info</TableHead>
                        <TableHead className="font-bold px-4 whitespace-nowrap">Car Make & Model</TableHead>
                        <TableHead className="font-bold px-4 whitespace-nowrap">Staff</TableHead>
                        <TableHead className="font-bold px-4 whitespace-nowrap">Timing</TableHead>
                        <TableHead className={cn("text-right font-bold pr-6 whitespace-nowrap", isHistory && "text-center")}>
                            Action
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {list.length > 0 ? list.map((booking) => {
                        const currentStaffId = localStaffAssignments[booking.id] || booking.staff_id || "";
                        const isStaffAssigned = !!currentStaffId;
                        const rating = booking.rating?.[0];

                        const timing = booking.booking_time 
                            ? new Date(booking.booking_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                            : "---";

                        return (
                            <TableRow key={booking.id} className="hover:bg-muted/20 transition-colors border-b">
                                <TableCell className="font-bold text-sm px-4 py-4">
                                    <div className="flex items-center gap-2"><User className="h-3 w-3 opacity-40" /> {booking.customer?.name || '---'}</div>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground px-4">
                                    {booking.customer?.email || '---'}
                                </TableCell>
                                <TableCell className="px-4">
                                    <div className="text-xs font-bold">{booking.service?.name}</div>
                                    <div className="text-[10px] font-bold text-primary">P{Number(booking.service?.price || booking.price || 0).toFixed(2)}</div>
                                </TableCell>
                                <TableCell className="text-xs font-bold px-4">
                                    {booking.car?.make} {booking.car?.model}
                                </TableCell>
                                <TableCell className="px-4 min-w-[180px]">
                                    {isHistory ? (
                                        <span className="text-xs font-medium">{booking.staff?.name || 'Unassigned'}</span>
                                    ) : (
                                        <select
                                            className="h-9 w-full rounded-lg border bg-background px-2 py-1 text-xs font-bold cursor-pointer outline-none"
                                            value={currentStaffId}
                                            onChange={(e) => handleAssignStaff(booking.id, e.target.value)}
                                        >
                                            <option value="">Select Staff</option>
                                            {staffList?.map((staff) => (
                                                <option key={staff.id} value={staff.id}>{staff.name}</option>
                                            ))}
                                        </select>
                                    )}
                                </TableCell>
                                <TableCell className="text-[11px] font-medium px-4 whitespace-nowrap">
                                    {timing}
                                </TableCell>
                                <TableCell className={cn("text-right pr-6", isHistory && "text-center")}>
                                    {isPending ? (
                                        <div className="flex justify-end gap-2">
                                            <Button 
                                                size="sm" 
                                                disabled={!isStaffAssigned}
                                                className={cn(
                                                    "h-8 text-[10px] font-bold uppercase", 
                                                    isStaffAssigned ? "bg-green-600 hover:bg-green-700" : "bg-muted text-muted-foreground"
                                                )}
                                                onClick={() => updateStatus(booking.id, "accepted")}
                                            >Accept ✅</Button>
                                            <Button 
                                                size="sm" 
                                                variant="destructive" 
                                                className="h-8 text-[10px] font-bold uppercase" 
                                                onClick={() => updateStatus(booking.id, "rejected")}
                                            >Reject ❌</Button>
                                        </div>
                                    ) : isHistory ? (
                                        rating ? (
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="flex gap-0.5">
                                                    {Array.from({length: 5}).map((_, i) => (
                                                        <Star key={i} className={cn("h-3 w-3", i < rating.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300")} />
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-muted-foreground italic">No rating</span>
                                        )
                                    ) : (
                                        <Badge variant="outline" className="uppercase text-[10px]">{booking.status}</Badge>
                                    )}
                                </TableCell>
                            </TableRow>
                        );
                    }) : (
                        <TableRow>
                            <TableCell colSpan={7} className="h-48 text-center text-muted-foreground italic">
                                <Truck className="h-10 w-10 mx-auto opacity-20 mb-2" />
                                No requests available.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );

    const pendingList = bookings.filter(b => b.status === 'pending' || b.status === 'requested');
    const activeList = bookings.filter(b => ['accepted', 'active', 'in-progress', 'confirmed'].includes(b.status));
    const completedList = bookings.filter(b => b.status === 'completed');

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-extrabold tracking-tight text-primary">{business?.name || 'Operations'}</h1>
                    <p className="text-muted-foreground font-medium">Manage your active bookings and staff assignments.</p>
                </div>
                
                <div className="flex items-center gap-3">
                    {quotaInfo && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="flex flex-col items-end">
                                        <Badge 
                                            variant="outline" 
                                            className={cn(
                                                "px-3 py-1 font-black text-[10px] uppercase cursor-help transition-all",
                                                quotaInfo.isAtLimit ? "bg-red-50 text-red-700 border-red-200 animate-pulse" : 
                                                quotaInfo.isApproachingLimit ? "bg-orange-50 text-orange-700 border-orange-200" : 
                                                "bg-blue-50 text-blue-700 border-blue-200"
                                            )}
                                        >
                                            {quotaInfo.remaining} / {quotaInfo.total} Requests Left
                                        </Badge>
                                        <div className="w-full h-1 bg-muted mt-1 rounded-full overflow-hidden">
                                            <div 
                                                className={cn("h-full transition-all duration-1000", quotaInfo.isAtLimit ? "bg-red-500" : "bg-primary")} 
                                                style={{ width: `${100 - quotaInfo.percentUsed}%` }}
                                            />
                                        </div>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs p-4 space-y-2">
                                    <p className="font-bold flex items-center gap-2">
                                        <Info className="h-4 w-4 text-blue-500" />
                                        Starter Plan Quota
                                    </p>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        Your trial has ended. Starter accounts are limited to 15 bookings per calendar month.
                                    </p>
                                    <Button size="sm" variant="outline" className="w-full text-[10px] h-7 font-black uppercase mt-2 group" asChild>
                                        <Link href="/business/subscription">
                                            <ArrowUpCircle className="h-3 w-3 mr-1 text-primary group-hover:animate-bounce" /> 
                                            Upgrade to Premium
                                        </Link>
                                    </Button>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
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

            <Tabs defaultValue="pending" className="w-full">
                <TabsList className="mb-8 grid w-full grid-cols-3 max-w-2xl bg-muted/50 p-1 rounded-xl">
                    <TabsTrigger value="pending" className="rounded-lg font-bold">Incoming ({pendingList.length})</TabsTrigger>
                    <TabsTrigger value="active" className="rounded-lg font-bold">Active ({activeList.length})</TabsTrigger>
                    <TabsTrigger value="completed" className="rounded-lg font-bold">History ({completedList.length})</TabsTrigger>
                </TabsList>
                
                <TabsContent value="pending" className="animate-in fade-in slide-in-from-bottom-2">
                    <Card className="shadow-lg overflow-hidden border-2">
                        <BookingTable list={pendingList} isPending />
                    </Card>
                </TabsContent>
                
                <TabsContent value="active" className="animate-in fade-in slide-in-from-bottom-2">
                    <Card className="shadow-lg overflow-hidden border-2">
                        <BookingTable list={activeList} />
                    </Card>
                </TabsContent>
                
                <TabsContent value="completed" className="animate-in fade-in slide-in-from-bottom-2">
                    <Card className="shadow-lg overflow-hidden border-2">
                        <BookingTable list={completedList} isHistory />
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}