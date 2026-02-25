
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { BusinessEarning } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Banknote, Loader2, AlertCircle } from "lucide-react";
import { toast } from '@/hooks/use-toast';

export default function EarningsPage() {
  const [earnings, setEarnings] = useState<BusinessEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalEarned, setTotalEarned] = useState(0);

  useEffect(() => {
    async function fetchEarnings() {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('business_earnings')
          .select('*')
          .eq('business_id', session.user.id)
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        if (data) {
          const earningsData = data as BusinessEarning[];
          setEarnings(earningsData);
          
          const total = earningsData.reduce((sum, item) => 
            item.status === 'earned' ? sum + item.amount : sum, 0
          );
          setTotalEarned(total);
        }
      } catch (error: any) {
        console.error('Error fetching earnings:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message || 'Failed to load earnings data.',
        });
      } finally {
        setLoading(false);
      }
    }

    fetchEarnings();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Business Earnings</h1>
        <p className="text-muted-foreground">View your historical earnings records.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-1">
        <Card className="max-w-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earned Amount</CardTitle>
            <Banknote className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">P{totalEarned.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Based on records marked as &quot;earned&quot;.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Earnings History</CardTitle>
          <CardDescription>
            A list of all earnings associated with your business account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {earnings.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Reference ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {earnings.map((earning) => (
                  <TableRow key={earning.id}>
                    <TableCell className="text-xs">
                      {new Date(earning.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-mono text-[10px] text-muted-foreground">
                      {earning.id.toUpperCase()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={earning.status === 'earned' ? 'secondary' : 'outline'}>
                        {earning.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      P{earning.amount.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
              <div className="space-y-1">
                <p className="font-medium">No earnings found</p>
                <p className="text-sm text-muted-foreground">When you complete bookings, your earnings will appear here.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
