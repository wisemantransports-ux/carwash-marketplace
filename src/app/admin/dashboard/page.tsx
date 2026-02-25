'use client';

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Banknote, Users, CreditCard, ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";

export default function AdminDashboardPage() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const fetchData = async () => {
        try {
            // Fetch businesses from the new businesses_view
            const { data: bizData, error: bizError } = await supabase
                .from('businesses_view')
                .select('*');
            
            if (bizError) throw bizError;
            setBusinesses(bizData || []);

            // Fetch pending payments count
            const { count: pendingCount, error: payError } = await supabase
                .from('payment_submissions')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending');
            
            setPendingPaymentsCount(pendingCount || 0);

            // Fetch approved payments for total revenue
            const { data: revenueData } = await supabase
                .from('payment_submissions')
                .select('amount')
                .eq('status', 'approved');
            
            const revenue = (revenueData || []).reduce((acc, curr) => acc + Number(curr.amount), 0);
            setTotalRevenue(revenue);

        } catch (error: any) {
            console.error("Admin dashboard fetch error:", error);
            toast({ variant: 'destructive', title: 'Data Fetch Error', description: error.message });
        } finally {
            setLoading(false);
        }
    }
    fetchData();
  }, []);

  const stats = [
    { label: "Platform Revenue", value: `P${totalRevenue.toLocaleString()}`, trend: "From Subscriptions", icon: Banknote, color: "text-green-600" },
    { label: "Active Partners", value: businesses.filter(b => b.access_active).length.toString(), trend: "Verified & Paid", icon: ShieldCheck, color: "text-blue-600" },
    { label: "Pending Payments", value: pendingPaymentsCount.toString(), trend: "Action Required", icon: CreditCard, color: "text-orange-600" },
    { label: "Total Partners", value: businesses.length.toString(), trend: "Onboarded", icon: Users, color: "text-purple-600" },
  ];

  if (loading && !mounted) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold tracking-tight text-primary">Admin Overview</h1>
        <p className="text-muted-foreground">Platform-wide oversight of business activity and revenue using live business views.</p>
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
              <p className="text-xs text-muted-foreground mt-1">{stat.trend}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Partners</CardTitle>
              <CardDescription>Status tracking for registered operators.</CardDescription>
            </div>
            <Button size="sm" variant="outline" asChild>
              <Link href="/admin/partners">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Partner</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {businesses.slice(0, 5).map(biz => (
                        <TableRow key={biz.id}>
                            <TableCell className="font-medium">
                                <div>{biz.name}</div>
                                <div className="text-[10px] text-muted-foreground">{biz.email}</div>
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className="text-[10px]">{biz.plan || 'None'}</Badge>
                            </TableCell>
                            <TableCell>
                                <Badge variant={biz.access_active ? 'secondary' : 'destructive'} className="text-[10px]">
                                    {biz.access_active ? 'ACTIVE' : 'INACTIVE'}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <Button size="sm" variant="ghost" asChild>
                                    <Link href="/admin/partners">Manage</Link>
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                    {businesses.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground italic">
                                No business accounts found.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Action Center</CardTitle>
            <CardDescription>Items requiring manual review.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="p-4 rounded-lg border bg-orange-50 border-orange-200">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-orange-800">Pending Payments</span>
                    <Badge variant="outline" className="bg-white">{pendingPaymentsCount}</Badge>
                </div>
                <p className="text-xs text-orange-700 mb-4">Review Mobile Money proof uploads.</p>
                <Button className="w-full bg-orange-600 hover:bg-orange-700" asChild>
                    <Link href="/admin/payments">Process Payments</Link>
                </Button>
             </div>

             <div className="p-4 rounded-lg border bg-blue-50 border-blue-200">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-blue-800">Account Control</span>
                    <Badge variant="outline" className="bg-white">Queue</Badge>
                </div>
                <p className="text-xs text-blue-700 mb-4">Manage access and verify business profiles.</p>
                <Button className="w-full bg-blue-600 hover:bg-blue-700" asChild>
                    <Link href="/admin/verification">Manage Access</Link>
                </Button>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
