
'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { TestDriveRequest, Employee, Business } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, User, Phone, CarFront, CheckCircle2, XCircle, RefreshCw, MoreHorizontal, UserCheck } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function TestDriveManagementPage() {
  const [requests, setRequests] = useState<TestDriveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mounted, setMounted] = useState(false);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: biz } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (biz) {
        // Fetch Test Drives with Car and Customer info
        const { data: tds, error } = await supabase
          .from('test_drive_requests')
          .select(`
            *,
            car_listing:car_listing_id ( make, model, year ),
            customer:users!test_drive_requests_customer_id_fkey ( name, email, phone ),
            staff:employees!test_drive_requests_staff_id_fkey ( id, name, phone, image_url )
          `)
          .eq('car_listing.business_id', biz.id)
          .order('requested_time', { ascending: false });
        
        if (error) throw error;
        setRequests(tds as any[] || []);

        // Fetch Employees for assignment
        const { data: emps } = await supabase
          .from('employees')
          .select('*')
          .eq('business_id', biz.id);
        setEmployees(emps || []);
      }
    } catch (e: any) {
      console.error("Test drive fetch error:", e);
      toast({ variant: 'destructive', title: 'Fetch Error', description: e.message });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, [fetchData]);

  const updateStatus = async (id: string, status: TestDriveRequest['status']) => {
    try {
      const { error } = await supabase.from('test_drive_requests').update({ status }).eq('id', id);
      if (error) throw error;
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
      toast({ title: "Request Updated" });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
    }
  };

  const assignStaff = async (requestId: string, staffId: string) => {
    try {
      const { error } = await supabase.from('test_drive_requests').update({ staff_id: staffId, status: 'confirmed' }).eq('id', requestId);
      if (error) throw error;
      toast({ title: "Staff Assigned", description: "Request confirmed and detailer assigned." });
      fetchData(true);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Assignment Failed', description: e.message });
    }
  };

  if (!mounted || loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight">Test Drive Requests</h1>
          <p className="text-muted-foreground font-medium">Coordinate with potential buyers and assign sales detailers.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchData(true)} className="rounded-full h-9 px-4 border-primary/20">
          <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} /> Refresh Queue
        </Button>
      </div>

      <Card className="shadow-2xl border-muted/50 overflow-hidden rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 border-b-2">
              <TableHead className="font-bold py-4 pl-6">Vehicle</TableHead>
              <TableHead className="font-bold">Customer</TableHead>
              <TableHead className="font-bold">Proposed Time</TableHead>
              <TableHead className="font-bold">Assigned Salesperson</TableHead>
              <TableHead className="font-bold text-center">Status</TableHead>
              <TableHead className="text-right pr-6 font-bold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length > 0 ? requests.map((req) => (
              <TableRow key={req.id} className="hover:bg-muted/5 transition-colors border-b last:border-0">
                <TableCell className="pl-6">
                  <div className="flex items-center gap-2">
                    <CarFront className="h-4 w-4 text-primary opacity-60" />
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">{req.car_listing?.year} {req.car_listing?.make} {req.car_listing?.model}</span>
                      <span className="text-[10px] text-muted-foreground uppercase font-black">Ref: {req.id.slice(-6).toUpperCase()}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold flex items-center gap-1.5"><User className="h-3 w-3 opacity-40" /> {req.customer?.name}</span>
                    <span className="text-[10px] text-muted-foreground font-bold">{req.customer?.phone || req.customer?.email}</span>
                  </div>
                </TableCell>
                <TableCell className="text-xs font-medium">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    {new Date(req.requested_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                </TableCell>
                <TableCell className="min-w-[200px]">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7 border shadow-sm shrink-0">
                      <AvatarImage src={req.staff?.image_url} className="object-cover" />
                      <AvatarFallback className="text-[10px]"><UserCheck className="h-3 w-3" /></AvatarFallback>
                    </Avatar>
                    <select
                      className="h-8 flex-1 rounded-md border bg-background px-2 text-[11px] font-bold cursor-pointer outline-none focus:ring-1 focus:ring-primary"
                      value={req.staff?.id || ""}
                      onChange={(e) => assignStaff(req.id, e.target.value)}
                      disabled={req.status === 'completed' || req.status === 'cancelled'}
                    >
                      <option value="">Unassigned</option>
                      {employees.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={
                    req.status === 'confirmed' ? 'default' : 
                    req.status === 'completed' ? 'secondary' : 
                    req.status === 'cancelled' ? 'destructive' : 'outline'
                  } className="uppercase text-[9px] font-black px-2">
                    {req.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right pr-6">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Coordination</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => updateStatus(req.id, 'completed')} className="text-green-600 font-bold">
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Completed
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateStatus(req.id, 'cancelled')} className="text-destructive font-bold">
                        <XCircle className="mr-2 h-4 w-4" /> Reject Request
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={6} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center gap-4 opacity-40">
                    <History className="h-12 w-12" />
                    <p className="font-bold text-lg">No requests yet.</p>
                    <p className="text-sm italic">Potential buyers will appear here once your listings are public.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
