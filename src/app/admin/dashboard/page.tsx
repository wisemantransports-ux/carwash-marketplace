
'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, Banknote, Users, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, Tooltip } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { mockGetBusinesses, mockUpdateBusinessStatus } from "@/lib/mock-api";
import { Business } from "@/lib/types";
import { toast } from "@/hooks/use-toast";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
        const { data } = await mockGetBusinesses();
        setBusinesses(data);
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
    { label: "Total Platform Revenue", value: "P45,230", trend: "+20.1%", icon: Banknote, color: "text-green-600" },
    { label: "Partner Businesses", value: businesses.length.toString(), trend: "Global", icon: Users, color: "text-purple-600" },
    { label: "Pending Verification", value: businesses.filter(b => b.status === 'pending').length.toString(), trend: "Needs Action", icon: AlertCircle, color: "text-orange-600" },
    { label: "System Health", value: "Optimal", trend: "All services up", icon: Activity, color: "text-blue-600" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold tracking-tight text-primary">Platform Administration</h1>
        <p className="text-muted-foreground">Global marketplace oversight and partner management.</p>
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
          <CardHeader>
            <CardTitle>Revenue Analytics</CardTitle>
            <CardDescription>Daily platform fee accumulation.</CardDescription>
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

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Business Listings</CardTitle>
            <CardDescription>Management of active and pending partners.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Partner</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {businesses.map(biz => (
                        <TableRow key={biz.id}>
                            <TableCell>
                                <div className="font-medium text-xs">{biz.name}</div>
                                <div className="text-[10px] text-muted-foreground">{biz.city}</div>
                            </TableCell>
                            <TableCell>
                                <Badge variant={biz.status === 'verified' ? 'secondary' : biz.status === 'suspended' ? 'destructive' : 'outline'} className="text-[10px] px-1.5 py-0">
                                    {biz.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                {biz.status === 'pending' && (
                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-green-600" onClick={() => handleStatusChange(biz.id, 'verified')}>
                                        <CheckCircle className="h-4 w-4" />
                                    </Button>
                                )}
                                {biz.status === 'verified' && (
                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-red-600" onClick={() => handleStatusChange(biz.id, 'suspended')}>
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
      </div>
    </div>
  );
}
