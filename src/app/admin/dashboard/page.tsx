'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, Banknote, Users, AlertCircle, CheckCircle, XCircle, CreditCard, ShieldCheck } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, Tooltip } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { mockGetBusinesses, mockUpdateBusinessStatus, mockGetPendingPayments } from "@/lib/mock-api";
import { Business, PaymentSubmission } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";

const chartData = [
  { name: 'Mon', revenue: 4000 },
  { name: 'Tue', revenue: 3000 },
  { name: 'Wed', revenue: 2000 },
  { name: 'Thu', revenue: 2780 },
  { name: 'Fri', revenue: 1890 },
  { name: 'Sat', revenue: 2390 },
  { name: 'Sun', revenue: 3490 },
];

export default function AdminDashboardPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PaymentSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
        const { data: bizData } = await mockGetBusinesses();
        const { data: payData } = await mockGetPendingPayments();
        setBusinesses(bizData);
        setPendingPayments(payData);
        setLoading(false);
    }
    fetch();
  }, []);

  const handleStatusChange = async (id: string, status: 'verified' | 'suspended') => {
    await mockUpdateBusinessStatus(id, status);
    setBusinesses(businesses.map(b => b.id === id ? { ...b, status } : b));
    toast({ title: `Business ${status === 'verified' ? 'Verified' : 'Suspended'}`, description: "Platform status updated successfully." });
  }

  const stats = [
    { label: "Platform Revenue (Fees)", value: "P45,230", trend: "+20.1%", icon: Banknote, color: "text-green-600" },
    { label: "Verified Partners", value: businesses.filter(b => b.status === 'verified').length.toString(), trend: "Active Hubs", icon: ShieldCheck, color: "text-blue-600" },
    { label: "Pending Payments", value: pendingPayments.length.toString(), trend: "Action Required", icon: CreditCard, color: "text-orange-600" },
    { label: "New Registrations", value: businesses.filter(b => b.status === 'pending').length.toString(), trend: "Verification", icon: Users, color: "text-purple-600" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold tracking-tight text-primary">Platform Administration</h1>
        <p className="text-muted-foreground">Manual oversight of business verification and manual mobile money subscriptions.</p>
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
              <CardTitle>Partner Verifications</CardTitle>
              <CardDescription>Management of registered car wash locations.</CardDescription>
            </div>
            <Button size="sm" variant="outline" asChild>
              <Link href="/admin/verification">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Partner</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {businesses.slice(0, 5).map(biz => (
                        <TableRow key={biz.id}>
                            <TableCell className="font-medium">{biz.name}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{biz.city}</TableCell>
                            <TableCell>
                                <Badge variant={biz.status === 'verified' ? 'secondary' : biz.status === 'suspended' ? 'destructive' : 'outline'} className="text-[10px]">
                                    {biz.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                {biz.status === 'pending' && (
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => handleStatusChange(biz.id, 'verified')}>
                                        <CheckCircle className="h-4 w-4" />
                                    </Button>
                                )}
                                {biz.status === 'verified' && (
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => handleStatusChange(biz.id, 'suspended')}>
                                        <XCircle className="h-4 w-4" />
                                    </Button>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Pending Payments</CardTitle>
              <CardDescription>Manual MM verification.</CardDescription>
            </div>
            <Button size="sm" variant="outline" asChild>
              <Link href="/admin/payments">Process</Link>
            </Button>
          </CardHeader>
          <CardContent>
             <div className="space-y-4">
               {pendingPayments.length > 0 ? pendingPayments.slice(0, 3).map(sub => (
                 <div key={sub.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                   <div className="space-y-1">
                     <p className="text-sm font-bold">{sub.businessId}</p>
                     <p className="text-[10px] text-muted-foreground font-mono">{sub.referenceText}</p>
                   </div>
                   <div className="text-right">
                     <Badge className="text-[10px] mb-1">P{sub.amount}</Badge>
                     <p className="text-[10px] text-muted-foreground">{new Date(sub.submittedAt).toLocaleDateString()}</p>
                   </div>
                 </div>
               )) : (
                 <div className="text-center py-8 text-muted-foreground text-sm italic">
                   No pending payments found.
                 </div>
               )}
             </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
          <CardHeader>
            <CardTitle>Revenue Analytics</CardTitle>
            <CardDescription>Daily platform fee accumulation from monthly business subscriptions.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <Tooltip 
                  cursor={{fill: 'hsl(var(--muted)/0.2)'}}
                  content={({active, payload}) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-background border rounded-lg p-2 shadow-md">
                          <p className="text-xs font-bold uppercase">{payload[0].payload.name}</p>
                          <p className="text-sm text-primary">P{payload[0].value?.toLocaleString()}</p>
                        </div>
                      )
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="revenue" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
    </div>
  );
}
