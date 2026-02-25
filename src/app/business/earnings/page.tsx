
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { BusinessEarning } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Banknote, Loader2, AlertCircle, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
import { toast } from '@/hooks/use-toast';

export default function EarningsPage() {
  const [earnings, setEarnings] = useState<BusinessEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [summaries, setSummaries] = useState({
    total: 0,
    pending: 0,
    completed: 0,
  });

  useEffect(() => {
    async function fetchEarnings() {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setLoading(false);
          return;
        }

        // Fetch earnings with linked booking, customer, and service data
        const { data, error } = await supabase
          .from('business_earnings')
          .select(`
            *,
            bookings:reference_id (
              id,
              booking_time,
              status,
              customer:customer_id ( name ),
              service:service_id ( service_name, price )
            )
          `)
          .eq('business_id', session.user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data) {
          const earningsData = data as any[];
          setEarnings(earningsData);
          
          const stats = earningsData.reduce((acc, item) => {
            acc.total += item.amount;
            if (item.status === 'pending payout') acc.pending += item.amount;
            if (item.status === 'paid out') acc.completed += item.amount;
            return acc;
          }, { total: 0, pending: 0, completed: 0 });

          setSummaries(stats);
        }
      } catch (error: any) {
        console.error('Error fetching earnings:', error);
        toast({
          variant: 'destructive',
          title: 'Fetch Failed',
          description: error.message || 'Could not load your earnings records.',
        });
      } finally {
        setLoading(false);
      }
    }

    fetchEarnings();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Calculating revenue details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold tracking-tight">Financial Overview</h1>
        <p className="text-muted-foreground text-lg">Track your service revenue and platform payouts.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">P{summaries.total.toFixed(2)}</div>
            <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold tracking-wider">Gross platform earnings</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payout</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">P{summaries.pending.toFixed(2)}</div>
            <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold tracking-wider">Processing for transfer</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-600 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Payout</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">P{summaries.completed.toFixed(2)}</div>
            <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold tracking-wider">Total funds received</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg border-muted/50">
        <CardHeader>
          <CardTitle>Earnings History</CardTitle>
          <CardDescription>
            Detailed list of earnings from completed bookings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {earnings.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Booking Detail</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Earnings</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {earnings.map((earning) => (
                  <TableRow key={earning.id} className="group hover:bg-muted/20 transition-colors">
                    <TableCell className="font-mono text-[10px] font-bold">
                      #{earning.reference_id?.slice(-6).toUpperCase() || 'MANUAL'}
                    </TableCell>
                    <TableCell>
                      {earning.bookings?.customer?.name || (
                        <span className="text-muted-foreground italic text-xs">Platform Adjustment</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">
                        {earning.bookings?.service?.service_name || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {earning.bookings?.booking_time 
                        ? new Date(earning.bookings.booking_time).toLocaleString() 
                        : new Date(earning.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          earning.status === 'paid out' ? 'secondary' : 
                          earning.status === 'pending payout' ? 'outline' : 'default'
                        }
                        className="text-[10px] uppercase font-bold"
                      >
                        {earning.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      P{earning.amount.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
              <div className="bg-muted p-6 rounded-full">
                <AlertCircle className="h-12 w-12 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-xl font-bold">No earnings yet</p>
                <p className="text-muted-foreground max-w-sm">
                  Complete your first car wash booking to start seeing your revenue history here.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
