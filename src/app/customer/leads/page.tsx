'use client';

import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, MessageCircle, MapPin, Tag, Calendar, History, ShoppingCart, CarFront, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";

/**
 * @fileOverview Customer Leads Activity Hub (Manual Wiring Pattern)
 * Resolves "more than one relationship found" error by using join-free fetches.
 */

export default function CustomerLeadsPage() {
    const { user: authUser, loading: authLoading } = useAuth();
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchLeads = useCallback(async (silent = false) => {
        if (!authUser?.id) {
            setLeads([]);
            if (!authLoading) setLoading(false);
            return;
        }

        if (!silent) setLoading(true);
        else setRefreshing(true);

        try {
            // 1. STAGE 1: Fetch Flat Leads (No Joins to avoid ambiguity)
            const { data: leadData, error: leadError } = await supabase
                .from('leads')
                .select('id, customer_name, customer_whatsapp, customer_email, status, listing_id, listing_type, created_at, seller_business_id')
                .eq('customer_id', authUser.id)
                .order('created_at', { ascending: false });

            if (leadError) throw leadError;

            if (leadData && leadData.length > 0) {
                // 2. STAGE 2: Parallel Metadata Fetching
                const listingIds = [...new Set(leadData.map(l => l.listing_id).filter(Boolean))];
                const businessIds = [...new Set(leadData.map(l => l.seller_business_id).filter(Boolean))];
                
                const [listingRes, businessRes] = await Promise.all([
                    listingIds.length > 0 ? supabase.from('listings').select('id, name, price').in('id', listingIds) : Promise.resolve({ data: [] }),
                    businessIds.length > 0 ? supabase.from('businesses').select('id, name, city, whatsapp_number').in('id', businessIds) : Promise.resolve({ data: [] })
                ]);

                if (listingRes.error) throw listingRes.error;
                if (businessRes.error) throw businessRes.error;

                const listingMap = (listingRes.data || []).reduce((acc: any, l: any) => ({ ...acc, [l.id]: l }), {});
                const businessMap = (businessRes.data || []).reduce((acc: any, b: any) => ({ ...acc, [b.id]: b }), {});

                // 3. STAGE 3: In-Memory Merge
                const enriched = leadData.map(l => ({
                    ...l,
                    listing: listingMap[l.listing_id] || null,
                    business: businessMap[l.seller_business_id] || { name: 'Verified Dealer', city: 'Botswana' }
                }));

                setLeads(enriched);
            } else {
                setLeads([]);
            }
        } catch (e: any) {
            // Detailed error extraction to fix the {} console issue
            console.error("[CUSTOMER-LEADS] Fetch failure:", {
                message: e?.message,
                details: e?.details,
                code: e?.code,
                hint: e?.hint,
                full: e
            });
            const message = e?.message || "Could not load your inquiries. Please try again.";
            toast({ 
                variant: 'destructive', 
                title: 'Fetch Failed', 
                description: message 
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [authUser?.id, authLoading]);

    useEffect(() => {
        if (!authLoading && authUser) {
            fetchLeads();
            
            const channel = supabase
                .channel(`customer-leads-realtime-${authUser.id}`)
                .on('postgres_changes', { 
                    event: '*', 
                    schema: 'public', 
                    table: 'leads',
                    filter: `customer_id=eq.${authUser.id}`
                }, () => fetchLeads(true))
                .subscribe();

            return () => { supabase.removeChannel(channel); };
        }
    }, [authLoading, authUser, fetchLeads]);

    const handleReconnect = (lead: any) => {
        const phone = lead.business?.whatsapp_number?.replace(/\D/g, '') || '26777491261';
        const listingName = lead.listing?.name || 'Automotive Listing';
        const message = `Hi! 👋 I'm following up on my inquiry for *${listingName}*. My name is ${lead.customer_name}.`;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    };

    if (authLoading || (loading && !refreshing)) return (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Loader2 className="animate-spin h-10 w-10 text-primary" />
            <p className="text-sm font-black uppercase tracking-widest text-muted-foreground animate-pulse">Syncing Inquiries...</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-extrabold tracking-tight text-primary uppercase italic flex items-center gap-3">
                        <MessageCircle className="h-10 w-10" />
                        My Inquiries
                    </h1>
                    <p className="text-muted-foreground font-medium text-lg">Track your marketplace leads and dealer connections.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => fetchLeads(true)} className="rounded-full h-10 px-6 border-primary/20 bg-white shadow-sm">
                    <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} /> Sync Live
                </Button>
            </div>

            <div className="grid gap-6">
                {leads.length > 0 ? leads.map((lead) => (
                    <Card key={lead.id} className="rounded-3xl border-2 shadow-lg overflow-hidden group hover:border-primary/30 transition-all bg-white">
                        <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-4 flex-1">
                                <div className={cn(
                                    "p-4 rounded-2xl shrink-0",
                                    lead.listing_type === 'car' ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                                )}>
                                    {lead.listing_type === 'car' ? <CarFront className="h-8 w-8" /> : <ShoppingCart className="h-8 w-8" />}
                                </div>
                                <div className="space-y-1 overflow-hidden">
                                    <div className="flex items-center gap-2">
                                        <Badge className={cn(
                                            "font-black uppercase text-[9px] px-3 py-1 shadow-sm",
                                            lead.status === 'new' ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"
                                        )}>
                                            {lead.status}
                                        </Badge>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            {lead.listing_type?.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 truncate">{lead.listing?.name || 'Unknown Listing'}</h3>
                                    <p className="text-sm font-bold text-primary italic">{lead.business?.name || 'Verified Dealer'}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:flex md:items-center gap-8 border-t md:border-t-0 pt-4 md:pt-0">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase text-slate-400">Interested Price</p>
                                    <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                                        <Tag className="h-3.5 w-3.5 text-primary" />
                                        P{Number(lead.listing?.price || 0).toLocaleString()}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase text-slate-400">Location</p>
                                    <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                                        <MapPin className="h-3.5 w-3.5 text-primary" />
                                        {lead.business?.city || 'Botswana'}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase text-slate-400">Inquired On</p>
                                    <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                                        <Calendar className="h-3.5 w-3.5 text-primary" />
                                        {new Date(lead.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>

                            <Button 
                                onClick={() => handleReconnect(lead)}
                                className="rounded-2xl h-12 px-6 font-black uppercase text-xs shadow-xl shadow-primary/10 group"
                            >
                                <MessageCircle className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform text-green-400" />
                                Contact Dealer
                            </Button>
                        </div>
                    </Card>
                )) : (
                    <div className="py-32 border-2 border-dashed rounded-3xl text-center space-y-6 bg-white/50">
                        <History className="h-16 w-16 mx-auto text-slate-200" />
                        <div className="space-y-2">
                            <p className="text-2xl font-black uppercase italic text-slate-300">No Inquiries Found</p>
                            <p className="text-slate-400 font-medium">Browse our marketplace to connect with verified dealers.</p>
                        </div>
                        <Button asChild className="rounded-full px-10 font-black uppercase h-12 shadow-lg">
                            <Link href="/find-wash">Browse Marketplace</Link>
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
