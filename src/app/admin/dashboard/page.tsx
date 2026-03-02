'use client';

import React, { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Banknote, Users, CreditCard, ShieldCheck, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function AdminDashboardPage() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * fetchData
   * Global platform fetch. Admins bypass business_id filters.
   * Session ID is sent via headers to fulfill RLS checks.
   */
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
        // Validate session existence first
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Authentication session missing.");

        // 1. Fetch businesses from public businesses_view
        const { data: bizData, error: bizError } = await supabase
            .from('businesses_view')
            .select('*');
        
        if (bizError) throw bizError;
        setBusinesses(bizData || []);

        // 2. Fetch pending payments count
        const { count: pendingCount, error: payError } = await supabase
            .from('payment_submissions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');
        
        if (payError) throw payError;
        setPendingPaymentsCount(pendingCount || 0);

        // 3. Fetch approved payments for total revenue
        const { data: revenueData } = await supabase
            .from('payment_submissions')
            .select('amount')
            .eq('status', 'approved');
        
        const revenue = (revenueData || []).reduce((acc, curr) => acc + Number(curr.amount), 0);
        setTotalRevenue(revenue);

    } catch (error: any) {
        console.error("Admin Dashboard Fetch Failure:", error.message);
        toast({ 
            variant: 'destructive', 
            title: 'Dashboard Error', 
            description: error.message || 'Unable to sync platform data.' 
        });
    } finally {
        setLoading(false);
        setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, [fetchData]);

  const stats = [
    { label: "Platform Revenue", value: `P${totalRevenue.toLocaleString()}`, trend: "Subscription Gross", icon: Banknote, color: "text-green-600", bg: "bg-green-50" },
    { label: "Active Partners", value: businesses.filter(b => b.access_active).length.toString(), trend: "Verified & Paid", icon: ShieldCheck, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Pending Payments", value: pendingPaymentsCount.toString(), trend: "Action Required", icon: CreditCard, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Total Accounts", value: businesses.length.toString(), trend: "Total Onboarded", icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  if (!mounted || (loading && !refreshing)) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="animate-spin text-primary h-10 w-10" />
        <p className="text-muted-foreground animate-pulse font-medium">Loading platform analytics...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div className="space-y-1">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Platform Control</h1>
            <p className="text-muted-foreground text-lg">Oversight of business verification, billing, and platform-wide activity.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchData(true)} className="rounded-full h-10 px-6 border-primary/20">
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} /> Refresh Stats
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <Card key={i} className="border-2 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">{stat.label}</CardTitle>
              <div className={cn("p-2 rounded-xl", stat.bg)}>
                <stat.icon className={cn("h-4 w-4", stat.color)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black">{stat.value}</div>
              <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase">{stat.trend}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-7">
        <Card className="lg:col-span-4 shadow-xl border-2 overflow-hidden rounded-2xl">
          <CardHeader className="bg-muted/10 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Growth Pipeline</CardTitle>
              <CardDescription>Recently onboarded wash operators and dealers.</CardDescription>
            </div>
            <Button size="sm" variant="ghost" asChild className="font-bold text-primary">
              <Link href="/admin/partners">View All Partners</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
             <Table>
                <TableHeader>
                    <TableRow className="bg-muted/30 border-b-2">
                        <TableHead className="font-bold py-4 pl-6">Partner Identity</TableHead>
                        <TableHead className="font-bold">Plan Tier</TableHead>
                        <TableHead className="font-bold">Access Status</TableHead>
                        <TableHead className="text-right font-bold pr-6">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {businesses.slice(0, 5).map(biz => (
                        <TableRow key={biz.id} className="hover:bg-muted/10 transition-colors border-b last:border-0">
                            <TableCell className="pl-6 py-4">
                                <div className="flex flex-col">
                                    <span className="font-bold text-sm text-slate-900">{biz.name}</span>
                                    <span className="text-[10px] text-muted-foreground font-medium">{biz.email}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className="text-[9px] font-black uppercase">{biz.plan || 'None'}</Badge>
                            </TableCell>
                            <TableCell>
                                <Badge 
                                    variant={biz.access_active ? 'secondary' : 'destructive'} 
                                    className={cn(
                                        "text-[9px] font-black uppercase px-2 py-0.5",
                                        biz.access_active ? "bg-green-100 text-green-800" : ""
                                    )}
                                >
                                    {biz.access_active ? 'ACTIVE' : 'LOCKED'}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right pr-6">
                                <Button size="sm" variant="ghost" className="h-8 text-xs font-bold" asChild>
                                    <Link href="/admin/partners">Manage</Link>
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                    {businesses.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={4} className="h-48 text-center text-muted-foreground italic">
                                No partner accounts found on the platform.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border-2 shadow-xl rounded-2xl overflow-hidden">
          <CardHeader className="bg-muted/10 border-b">
            <CardTitle className="text-lg">Action Center</CardTitle>
            <CardDescription>Manual verifications requiring intervention.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
             <div className="p-5 rounded-2xl border-2 bg-orange-50/50 border-orange-100 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-orange-800 uppercase tracking-widest">Pending Billing</span>
                    <Badge className="bg-orange-600 text-white font-black">{pendingPaymentsCount}</Badge>
                </div>
                <p className="text-xs text-orange-700 mb-6 font-medium">Verify Orange Money / Smega proof uploads to activate tiers.</p>
                <Button className="w-full bg-orange-600 hover:bg-orange-700 shadow-lg font-bold" asChild>
                    <Link href="/admin/payments">Review Payments</Link>
                </Button>
             </div>

             <div className="p-5 rounded-2xl border-2 bg-blue-50/50 border-blue-100 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-blue-800 uppercase tracking-widest">Verification Queue</span>
                    <Badge className="bg-blue-600 text-white font-black">Active</Badge>
                </div>
                <p className="text-xs text-blue-700 mb-6 font-medium">Inspect Omang IDs and CIPA certificates for new partners.</p>
                <Button className="w-full bg-blue-600 hover:bg-blue-700 shadow-lg font-bold" asChild>
                    <Link href="/admin/verification">Inspect Registration</Link>
                </Button>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
