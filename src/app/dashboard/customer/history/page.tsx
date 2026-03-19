'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, History, RotateCcw, CheckCircle2, Star, Calendar } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function BookingHistoryPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rebooking, setRebooking] = useState<string | null>(null);

  const resolveCustomerId = async (authUserId: string): Promise<string | null> => {
    const { data: canonical, error } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', authUserId)
      .maybeSingle();

    if (error) {
      console.error('[CANONICAL RESOLVE ERROR]', error);
      return null;
    }

    return canonical?.id || null;
  };

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const canonicalUserId = await resolveCustomerId(user.id);
      console.log('Session user.id:', user.id);
      console.log('Resolved users.id:', canonicalUserId);

      const targetCustomerId = canonicalUserId || user.id;
      if (!canonicalUserId) {
        console.warn('[CANONICAL USER ID MISSING] using auth ID fallback', { userId: user.id });
      }

      const { data } = await supabase
        .from('bookings')
        .select('*')
        .eq('customer_id', targetCustomerId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });
      
      if (data && data.length > 0) {
        const bizIds = [...new Set(data.map(b => b.seller_business_id))];
        const svcIds = [...new Set(data.map(b => b.wash_service_id))];

        const [bizRes, svcRes] = await Promise.all([
          supabase.from('businesses').select('id, name').in('id', bizIds),
          supabase.from('listings').select('id, name, price').in('id', svcIds)
        ]);

        const bizMap = (bizRes.data || []).reduce((acc: any, b: any) => ({ ...acc, [b.id]: b.name }), {});
        const svcMap = (svcRes.data || []).reduce((acc: any, s: any) => ({ ...acc, [s.id]: s }), {});

        setHistory(data.map(b => ({
          ...b,
          business_name: bizMap[b.seller_business_id],
          service: svcMap[b.wash_service_id]
        })));
      } else {
        setHistory([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) fetchHistory();
  }, [authLoading, user, fetchHistory]);

  const handleRebook = async (prev: any) => {
    setRebooking(prev.id);
    try {
      // Create new booking with tomorrow's date at the same time
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const bookingDate = tomorrow.toISOString().split('T')[0];
      const previousTime = prev.scheduled_at ? new Date(prev.scheduled_at).toISOString().split('T')[1] : '00:00:00';
      const scheduledAt = new Date(`${bookingDate}T${previousTime}`).toISOString();

      const canonicalUserId = await resolveCustomerId(user!.id);
      const targetCustomerId = canonicalUserId || user!.id;

      const { data, error } = await supabase.from('bookings').insert({
        customer_id: targetCustomerId,
        customer_name: user!.user_metadata?.name || 'Customer',
        customer_whatsapp: user!.user_metadata?.whatsapp || user!.phone || 'No Phone',
        wash_service_id: prev.wash_service_id,
        service_id: prev.wash_service_id,
        business_id: prev.business_id,
        seller_business_id: prev.seller_business_id,
        location: prev.location,
        scheduled_at: scheduledAt,
        status: 'pending_assignment'
      }).select().single();

      if (error) throw error;

      toast({ title: 'Rebooked Successfully!', description: 'Your new request has been sent.' });
      router.push(`/dashboard/customer/bookings/${data.id}`);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Rebook Failed', description: e.message });
    } finally {
      setRebooking(null);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8">
      <header className="space-y-1 pt-4">
        <h1 className="text-3xl font-black uppercase italic tracking-tight">Wash Archive</h1>
        <p className="text-slate-500 font-medium italic">Revisit and rebook your past showroom experiences.</p>
      </header>

      <div className="space-y-4">
        {history.length > 0 ? history.map((b) => (
          <Card key={b.id} className="rounded-3xl border-2 shadow-lg hover:shadow-xl transition-all overflow-hidden bg-white">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-6">
                  <div className="bg-green-50 p-4 rounded-3xl border-2 border-green-100 shadow-inner">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-black">{b.service?.name}</h3>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{b.business_name}</p>
                    <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase pt-1">
                      <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /> {new Date(b.created_at).toLocaleDateString()}</span>
                      <span className="bg-slate-100 px-2 py-0.5 rounded">P{Number(b.service?.price || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                <Button 
                  onClick={() => handleRebook(b)} 
                  disabled={rebooking === b.id}
                  className="w-full md:w-auto h-12 rounded-2xl px-8 font-black uppercase shadow-lg shadow-primary/10 group"
                >
                  {rebooking === b.id ? <Loader2 className="animate-spin mr-2" /> : <RotateCcw className="mr-2 h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />}
                  Rebook Now
                </Button>
              </div>
            </CardContent>
          </Card>
        )) : (
          <div className="py-32 border-2 border-dashed rounded-3xl text-center space-y-6 bg-white/50">
            <History className="h-16 w-16 mx-auto text-slate-200" />
            <div className="space-y-2">
              <p className="text-2xl font-black uppercase italic text-slate-300">Archive Empty</p>
              <p className="text-slate-400 font-medium">Completed washes will be recorded here.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
