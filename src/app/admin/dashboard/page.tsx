
'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, CheckCircle, Banknote, Users, TrendingUp, AlertCircle, ArrowUpRight } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, ResponsiveContainer, Line, LineChart, Tooltip } from "recharts";

const data = [
  { name: 'Mon', revenue: 4000, bookings: 24 },
  { name: 'Tue', revenue: 3000, bookings: 18 },
  { name: 'Wed', revenue: 2000, bookings: 12 },
  { name: 'Thu', revenue: 2780, bookings: 20 },
  { name: 'Fri', revenue: 1890, bookings: 15 },
  { name: 'Sat', revenue: 2390, bookings: 25 },
  { name: 'Sun', revenue: 3490, bookings: 30 },
];

export default function AdminDashboardPage() {
  const stats = [
    { label: "Total Revenue", value: "P45,230", trend: "+20.1%", icon: Banknote, color: "text-green-600" },
    { label: "Active Bookings", value: "1,250", trend: "+12.5%", icon: Activity, color: "text-blue-600" },
    { label: "Partner Businesses", value: "85", trend: "+4 new", icon: Users, color: "text-purple-600" },
    { label: "Pending Verification", value: "4", trend: "Needs Action", icon: AlertCircle, color: "text-orange-600" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold tracking-tight">Platform Overview</h1>
        <p className="text-muted-foreground">Global marketplace metrics and partner performance.</p>
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
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <span className={stat.trend.startsWith('+') ? 'text-green-500 font-medium' : 'text-orange-500'}>
                  {stat.trend}
                </span>
                from last period
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Revenue Analytics</CardTitle>
            <CardDescription>Daily platform revenue across all cities.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
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
            <CardTitle>Recent Partners</CardTitle>
            <CardDescription>Latest businesses to join the platform.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {[
                { name: "Francistown Gloss", city: "Francistown", status: "Verified", time: "2h ago" },
                { name: "Maun Mobile Wash", city: "Maun", status: "Pending", time: "5h ago" },
                { name: "Kanye Cleaners", city: "Kanye", status: "Verified", time: "1d ago" },
                { name: "Palapye Express", city: "Palapye", status: "Verified", time: "2d ago" },
              ].map((partner, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{partner.name}</p>
                    <p className="text-xs text-muted-foreground">{partner.city}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <Badge variant={partner.status === 'Verified' ? 'secondary' : 'outline'}>
                      {partner.status}
                    </Badge>
                    <p className="text-[10px] text-muted-foreground">{partner.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
