'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Droplets, 
  Clock, 
  History, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Calendar, 
  Smartphone, 
  User, 
  ArrowRight,
  RotateCcw,
  Navigation,
  ShieldCheck
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// --- TYPES ---
type BookingStatus = 'pending' | 'pending_assignment' | 'assigned' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

interface Booking {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_whatsapp: string;
  customer_email: string | null;
  wash_service_id: string;
  business_id: string;
  seller_business_id: string;
  location: string | null;
  booking_status: BookingStatus;
  requested_time: string;
  booking_date: string;
  created_at: string;
  updated_at: string;
  // Wired fields
  service_name?: string;
  business_name?: string;
  price?: number;
}

// --- HELPERS ---
const getStatusColor = (status: BookingStatus) => {
  switch (status) {
    case 'pending':
    case 'pending_assignment': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'assigned': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
    case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'in_progress': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'completed': return 'bg-green-100 text-green-800 border-green-200';
    case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-slate-100 text-slate-800';
  }
};

export default function CustomerDashboardHub() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackingId, setTrackingId] = useState<string | null>(null);

  // Form State for Booking
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [selectedBiz, setSelectedBiz] = useState<string>('');
  const [selectedSvc, setSelectedSvc] = useState<string>('');
  const [bookDate, setDate] = useState('');
  const [bookTime, setTime] = useState('');
  const [bookLocation, setLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: bData, error: bErr } = await supabase
        .from('wash_bookings')
        .select('*')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (bErr) throw bErr;

      if (bData && bData.length > 0) {
        const bizIds = [...new Set(bData.map(b => b.seller_business_id))];
        const svcIds = [...new Set(bData.map(b => b.wash_service_id))];

        const [bizRes, svcRes] = await Promise.all([
          supabase.from('businesses').select('id, name').in('id', bizIds),
          supabase.from('listings').select('id, name, price').in('id', svcIds)
        ]);

        const bizMap = (bizRes.data || []).reduce((acc: any, b: any) => ({ ...acc, [b.id]: b.name }), {});
        const svcMap = (svcRes.data || []).reduce((acc: any, s: any) => ({ ...acc, [s.id]: s }), {});

        const enriched = bData.map(b => ({
          ...b,
          business_name: bizMap[b.seller_business_id] || 'Verified Partner',
          service_name: svcMap[b.wash_service_id]?.name || 'Wash Service',
          price: svcMap[b.wash_service_id]?.price || 0
        }));
        setBookings(enriched);
      } else {
        setBookings([]);
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Sync Error', description: e.message });
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchMetadata = useCallback(async () => {
    const { data: bizData } = await supabase.from('businesses').select('id, name').eq('verification_status', 'verified');
    setBusinesses(bizData || []);
  }, []);

  useEffect(() => {
    if (selectedBiz) {
      supabase.from('listings')
        .select('id, name, price')
        .eq('business_id', selectedBiz)
        .eq('type', 'wash_service')
        .then(({ data }) => setServices(data || []));
    }
  }, [selectedBiz]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchData();
      fetchMetadata();

      const channel = supabase.channel(`customer-hub-${user.id}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'wash_bookings',
          filter: `customer_id=eq.${user.id}`
        }, () => fetchData())
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [authLoading, user, fetchData, fetchMetadata]);

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedBiz || !selectedSvc || !bookDate || !bookTime) {
      toast({ variant: 'destructive', title: 'Missing Info', description: 'Please fill all required fields.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const requestedTime = `${bookDate}T${bookTime}:00`;
      const { error } = await supabase.from('wash_bookings').insert({
        customer_id: user.id,
        customer_name: user.user_metadata?.name || 'Customer',
        customer_whatsapp: user.user_metadata?.whatsapp || user.phone || 'No Phone',
        customer_email: user.email,
        wash_service_id: selectedSvc,
        business_id: selectedBiz,
        seller_business_id: selectedBiz,
        location: bookLocation,
        booking_status: 'pending',
        requested_time: requestedTime,
        booking_date: bookDate
      });

      if (error) throw error;

      toast({ title: 'Booking Sent! 🚿', description: 'Your request is now pending approval.' });
      setActiveTab('my-bookings');
      fetchData();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Booking Failed', description: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelBooking = async (id: string) => {
    if (!confirm('Cancel this request?')) return;
    try {
      const { error } = await supabase.from('wash_bookings')
        .update({ booking_status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Booking Cancelled' });
      fetchData();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  const handleRebook = async (prevBooking: Booking) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('wash_bookings').insert({
        customer_id: prevBooking.customer_id,
        customer_name: prevBooking.customer_name,
        customer_whatsapp: prevBooking.customer_whatsapp,
        customer_email: prevBooking.customer_email,
        wash_service_id: prevBooking.wash_service_id,
        business_id: prevBooking.business_id,
        seller_business_id: prevBooking.seller_business_id,
        location: prevBooking.location,
        booking_status: 'pending',
        requested_time: new Date(Date.now() + 86400000).toISOString(), // Suggest tomorrow
        booking_date: new Date(Date.now() + 86400000).toISOString().split('T')[0]
      });

      if (error) throw error;
      toast({ title: 'Rebooked Successfully', description: 'Check "My Bookings" for your new request.' });
      setActiveTab('my-bookings');
      fetchData();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Rebook Failed', description: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || loading) return (
    <div className="flex flex-col items-center justify-center py-24 space-y-4">
      <Loader2 className="animate-spin h-10 w-10 text-primary" />
      <p className="text-sm font-black uppercase tracking-widest text-muted-foreground animate-pulse">Initializing Portal...</p>
    </div>
  );

  const activeBookings = bookings.filter(b => !['completed', 'cancelled'].includes(b.booking_status));
  const completedBookings = bookings.filter(b => b.booking_status === 'completed');
  const currentlyTracking = bookings.find(b => b.id === trackingId) || activeBookings[0];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black uppercase italic tracking-tight text-primary">Customer Experience</h1>
        <p className="text-muted-foreground font-medium">Manage your automotive services and tracking history.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-12 bg-white border shadow-sm rounded-xl p-1">
          <TabsTrigger value="overview" className="rounded-lg font-bold text-xs uppercase">Overview</TabsTrigger>
          <TabsTrigger value="book" className="rounded-lg font-bold text-xs uppercase">Book Wash</TabsTrigger>
          <TabsTrigger value="my-bookings" className="rounded-lg font-bold text-xs uppercase">My Bookings</TabsTrigger>
          <TabsTrigger value="tracker" className="rounded-lg font-bold text-xs uppercase">Tracker</TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg font-bold text-xs uppercase">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8 pt-6">
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-2 shadow-sm bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-primary">Active Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-black">{activeBookings.length}</div>
              </CardContent>
            </Card>
            <Card className="border-2 shadow-sm bg-green-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-green-700">Total Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-black">{completedBookings.length}</div>
              </CardContent>
            </Card>
            <Card className="border-2 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Platform Rank</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className="bg-slate-900 text-white font-black uppercase text-[10px]">Verified User</Badge>
              </CardContent>
            </Card>
          </div>

          <Card className="border-2 shadow-lg">
            <CardHeader className="bg-muted/10 border-b">
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {bookings.length > 0 ? (
                <div className="space-y-4">
                  {bookings.slice(0, 3).map(b => (
                    <div key={b.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border">
                      <div className="flex items-center gap-4">
                        <div className="bg-white p-2 rounded-xl border shadow-sm">
                          <Droplets className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">{b.service_name}</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-bold">{b.business_name} • {new Date(b.requested_time).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={cn("text-[9px] font-black uppercase px-3 py-1 border-2", getStatusColor(b.booking_status))}>
                        {b.booking_status.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground italic">You have no bookings yet.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="book" className="pt-6">
          <form onSubmit={handleCreateBooking} className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-2 shadow-xl overflow-hidden">
                <CardHeader className="bg-primary text-white p-6">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Smartphone className="h-6 w-6" />
                    Reservation Details
                  </CardTitle>
                  <CardDescription className="text-primary-foreground/80 font-medium">Select a partner and choose your wash package.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Select Partner</Label>
                      <Select value={selectedBiz} onValueChange={setSelectedBiz}>
                        <SelectTrigger className="h-12 border-2"><SelectValue placeholder="Choose a business" /></SelectTrigger>
                        <SelectContent>
                          {businesses.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Service Package</Label>
                      <Select value={selectedSvc} onValueChange={setSelectedSvc} disabled={!selectedBiz}>
                        <SelectTrigger className="h-12 border-2"><SelectValue placeholder="Select a wash" /></SelectTrigger>
                        <SelectContent>
                          {services.map(s => <SelectItem key={s.id} value={s.id}>{s.name} (P{s.price})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Booking Date</Label>
                      <Input type="date" value={bookDate} onChange={e => setDate(e.target.value)} className="h-12 border-2" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Requested Time</Label>
                      <Input type="time" value={bookTime} onChange={e => setTime(e.target.value)} className="h-12 border-2" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Service Location / Pickup Point</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Plot No, Street Name, City" 
                        value={bookLocation} 
                        onChange={e => setLocation(e.target.value)} 
                        className="pl-10 h-12 border-2" 
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="border-2 shadow-lg bg-slate-50 border-dashed">
                <CardHeader>
                  <CardTitle className="text-sm font-black uppercase tracking-widest">Pricing Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center border-b pb-4">
                    <span className="text-xs font-bold text-muted-foreground">Estimated Total</span>
                    <span className="text-2xl font-black text-primary">P{services.find(s => s.id === selectedSvc)?.price || '0.00'}</span>
                  </div>
                  <p className="text-[10px] leading-relaxed text-muted-foreground italic">
                    Final price may vary based on vehicle condition. Payment is handled directly with the business partner.
                  </p>
                </CardContent>
              </Card>
              <Button 
                className="w-full h-16 rounded-2xl text-xl font-black uppercase shadow-xl group" 
                disabled={isSubmitting}
                onClick={handleCreateBooking}
              >
                {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <ShieldCheck className="mr-2 group-hover:scale-110 transition-transform" />}
                Confirm Booking
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="my-bookings" className="pt-6">
          {activeBookings.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeBookings.map(b => (
                <Card key={b.id} className="border-2 shadow-lg hover:border-primary transition-all overflow-hidden flex flex-col">
                  <div className={cn("h-1.5 w-full", getStatusColor(b.booking_status).split(' ')[0])} />
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline" className={cn("text-[10px] font-black uppercase tracking-widest px-3 py-1", getStatusColor(b.booking_status))}>
                        {b.booking_status.replace('_', ' ')}
                      </Badge>
                      <span className="font-mono text-[10px] opacity-40 uppercase">REF: {b.id.slice(-6)}</span>
                    </div>
                    <CardTitle className="text-xl">{b.service_name}</CardTitle>
                    <CardDescription className="flex items-center gap-1 font-bold text-primary">
                      <Navigation className="h-3 w-3" /> {b.business_name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 flex-grow">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span className="text-xs font-black uppercase text-slate-400 leading-none mb-1">Scheduled</span>
                        <span className="text-sm font-bold">{new Date(b.requested_time).toLocaleDateString()} at {new Date(b.requested_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                    {b.location && (
                      <div className="flex items-start gap-2 text-xs text-muted-foreground px-1">
                        <MapPin className="h-3.5 w-3.5 mt-0.5" />
                        <span className="font-medium line-clamp-1">{b.location}</span>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="bg-muted/10 border-t pt-4 grid grid-cols-2 gap-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="font-black text-[10px] uppercase border-2 h-10"
                      onClick={() => { setTrackingId(b.id); setActiveTab('tracker'); }}
                    >
                      Track Request
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="font-black text-[10px] uppercase text-destructive hover:bg-red-50 h-10"
                      onClick={() => handleCancelBooking(b.id)}
                    >
                      Cancel
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 space-y-6 bg-white border-2 border-dashed rounded-[2.5rem]">
              <div className="bg-muted p-8 rounded-full">
                <Clock className="h-16 w-16 text-muted-foreground opacity-20" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-2xl font-black uppercase italic tracking-tighter">No active bookings yet.</p>
                <p className="text-muted-foreground font-medium">Ready for a showroom shine? Book your first wash today.</p>
              </div>
              <Button size="lg" className="rounded-full px-10 font-black uppercase shadow-xl" onClick={() => setActiveTab('book')}>
                Book Service Now <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="tracker" className="pt-6">
          {currentlyTracking ? (
            <div className="max-w-3xl mx-auto space-y-8">
              <Card className="border-2 shadow-2xl overflow-hidden rounded-3xl">
                <CardHeader className="bg-slate-900 text-white p-8">
                  <div className="flex justify-between items-center mb-4">
                    <Badge className="bg-primary border-none font-black px-4 py-1 text-xs uppercase">Live Status</Badge>
                    <span className="font-mono text-xs text-slate-400">BOOKING ID: {currentlyTracking.id.toUpperCase()}</span>
                  </div>
                  <CardTitle className="text-3xl font-black italic">{currentlyTracking.service_name}</CardTitle>
                  <CardDescription className="text-slate-400 font-bold flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-green-500" /> Authorized Partner: {currentlyTracking.business_name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-10">
                  <div className="space-y-12 relative">
                    <div className="absolute left-6 top-0 bottom-0 w-1 bg-slate-100 -z-0" />
                    
                    {[
                      { id: 'pending', label: 'Request Received', desc: 'Partner is reviewing your booking.' },
                      { id: 'assigned', label: 'Team Assigned', desc: 'A professional detailer has been chosen.' },
                      { id: 'confirmed', label: 'Confirmed', desc: 'Schedule locked and ready for service.' },
                      { id: 'in_progress', label: 'In Progress', desc: 'Work has started on your vehicle.' },
                      { id: 'completed', label: 'Service Complete', desc: 'Your wash is finished! Check your dashboard.' }
                    ].map((step, idx) => {
                      const steps = ['pending', 'pending_assignment', 'assigned', 'confirmed', 'in_progress', 'completed'];
                      const currentIdx = steps.indexOf(currentlyTracking.booking_status);
                      const stepIdx = steps.indexOf(step.id);
                      const isDone = currentIdx >= stepIdx;
                      const isCurrent = currentlyTracking.booking_status === step.id;

                      return (
                        <div key={step.id} className={cn(
                          "flex gap-8 relative z-10 transition-all duration-500",
                          !isDone && "opacity-30 grayscale"
                        )}>
                          <div className={cn(
                            "h-12 w-12 rounded-full border-4 flex items-center justify-center shadow-lg transition-all",
                            isDone ? "bg-primary border-primary text-white" : "bg-white border-slate-200 text-slate-300",
                            isCurrent && "scale-125 ring-8 ring-primary/10 animate-pulse"
                          )}>
                            {isDone ? <CheckCircle2 className="h-6 w-6" /> : (idx + 1)}
                          </div>
                          <div className="flex-1 pt-1">
                            <h4 className="font-black uppercase tracking-tight text-slate-900">{step.label}</h4>
                            <p className="text-sm text-muted-foreground font-medium">{step.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-32 space-y-4">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground opacity-20" />
              <p className="font-bold text-muted-foreground">Select a booking from "My Bookings" to track progress.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="pt-6">
          {completedBookings.length > 0 ? (
            <div className="space-y-6">
              {completedBookings.map(b => (
                <Card key={b.id} className="border-2 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                      <div className="flex items-center gap-6">
                        <div className="bg-green-100 p-4 rounded-3xl border-2 border-green-200">
                          <CheckCircle2 className="h-8 w-8 text-green-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-xl font-black tracking-tight">{b.service_name}</h3>
                            <Badge className="bg-green-600 font-black text-[9px] uppercase">Verified Complete</Badge>
                          </div>
                          <p className="text-sm font-bold text-muted-foreground flex items-center gap-2 uppercase tracking-widest">
                            {b.business_name} • P{b.price?.toFixed(2)} • {new Date(b.booking_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button 
                        onClick={() => handleRebook(b)} 
                        disabled={isSubmitting}
                        className="rounded-full px-8 font-black uppercase shadow-lg h-12"
                      >
                        {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                        Rebook Service
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-24 bg-slate-50 border-2 border-dashed rounded-[2.5rem] space-y-4">
              <History className="h-12 w-12 mx-auto text-muted-foreground opacity-20" />
              <div className="space-y-1">
                <p className="font-black uppercase tracking-widest text-slate-900">Archive Empty</p>
                <p className="text-sm text-muted-foreground">Your completed wash details will be archived here.</p>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
