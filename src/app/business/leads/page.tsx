'use client';

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, MessageSquare, Phone, User, Tag, Calendar, ShoppingCart, CarFront, Mail, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

/**
 * @fileOverview Business Leads Management Page
 * Uses Manual Wiring for listings to avoid ambiguity.
 */

export default function BusinessLeadsPage() {
    const { user, loading: authLoading } = useAuth();
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchLeads = useCallback(async (silent = false) => {
        if (!user) return;
        if (!silent) setLoading(true);
        else setRefreshing(true);

        try {
            // 1. Resolve Business ID
            const { data: biz } = await supabase
                .from('businesses')
                .select('id')
                .eq('owner_id', user.id)
                .maybeSingle();
            
            if (!biz) {
                setLeads([]);
                return;
            }

            // 2. STAGE 1: Fetch flat leads (avoiding ambiguous listing join)
            const { data: leadData, error } = await supabase
                .from('leads')
                .select('id, customer_name, customer_whatsapp, customer_email, listing_id, listing_type, status, created_at')
                .eq('seller_business_id', biz.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (leadData && leadData.length > 0) {
                // 3. STAGE 2: Manual Wiring - Fetch Listing metadata
                const listingIds = [...new Set(leadData.map(l => l.listing_id).filter(Boolean))];
                
                let listingMap: Record<string, any> = {};
                if (listingIds.length > 0) {
                    const { data: listData, error: listErr } = await supabase
                        .from('listings')
                        .select('id, name, price')
                        .in('id', listingIds);
                    
                    if (listErr) throw listErr;
                    listingMap = (listData || []).reduce((acc: any, l: any) => ({ ...acc, [l.id]: l }), {});
                }

                // 4. STAGE 3: Enriched Mapping
                const enriched = leadData.map(l => ({
                    ...l,
                    listing: listingMap[l.listing_id] || null
                }));

                setLeads(enriched);
            } else {
                setLeads([]);
            }
        } catch (e: any) {
            console.error("[BUSINESS-LEADS] Fetch failure:", {
                message: e?.message,
                details: e?.details,
                code: e?.code,
                hint: e?.hint
            });
            const message = e?.message || "Could not load your leads.";
            toast({ 
                variant: 'destructive', 
                title: 'Sync Error', 
                description: message 
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    useEffect(() => {
        if (!authLoading && user) {
            fetchLeads();
            
            const channel = supabase
                .channel(`business-leads-realtime-${user.id}`)
                .on('postgres_changes', { 
                    event: '*', 
                    schema: 'public', 
                    table: 'leads'
                }, () => fetchLeads(true))
                .subscribe();

            return () => { supabase.removeChannel(channel); };
        }
    }, [authLoading, user, fetchLeads]);

    if (authLoading || (loading && !refreshing)) return (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Loader2 className="animate-spin h-10 w-10 text-primary" />
            <p className="text-sm font-black uppercase tracking-widest text-muted-foreground animate-pulse">Syncing Sales Leads...</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-extrabold tracking-tight text-primary uppercase italic flex items-center gap-3">
                        <MessageSquare className="h-10 w-10" />
                        Sales Leads
                    </h1>
                    <p className="text-muted-foreground font-medium text-lg">Manage marketplace inquiries for your cars and parts.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => fetchLeads(true)} className="rounded-full h-10 px-6 border-primary/20 bg-white shadow-sm">
                    <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} /> Sync Leads
                </Button>
            </div>

            <Card className="shadow-2xl border-2 rounded-2xl overflow-hidden bg-white/50 backdrop-blur-sm">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 border-b-2">
                                <TableHead className="font-black py-4 pl-6 uppercase text-[10px] tracking-widest">Customer Details</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest">Listing & Category</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest">Status</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest">Inquired On</TableHead>
                                <TableHead className="text-right pr-6 font-black uppercase text-[10px] tracking-widest">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {leads.length > 0 ? leads.map((lead) => (
                                <TableRow key={lead.id} className="hover:bg-primary/5 transition-colors border-b">
                                    <TableCell className="pl-6 py-5">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-bold text-sm text-slate-900 flex items-center gap-2">
                                                <User className="h-3 w-3 text-primary opacity-40" />
                                                {lead.customer_name}
                                            </span>
                                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold">
                                                <Phone className="h-3 w-3" /> {lead.customer_whatsapp}
                                            </div>
                                            {lead.customer_email && (
                                                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                                    <Mail className="h-3 w-3 opacity-60" /> {lead.customer_email}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <span className="font-bold text-sm text-slate-900">{lead.listing?.name || 'Automotive Listing'}</span>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className={cn(
                                                    "text-[9px] font-black uppercase",
                                                    lead.listing_type === 'car' ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-purple-50 text-purple-700 border-purple-200"
                                                )}>
                                                    {lead.listing_type?.replace('_', ' ')}
                                                </Badge>
                                                <span className="text-[10px] font-black text-primary">P{Number(lead.listing?.price || 0).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={cn(
                                            "uppercase text-[9px] font-black px-3 py-1 shadow-sm",
                                            lead.status === 'new' ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"
                                        )}>
                                            {lead.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                                            <Calendar className="h-3.5 w-3.5 text-primary opacity-60" />
                                            {new Date(lead.created_at).toLocaleDateString()}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="h-9 px-4 rounded-xl font-black text-[10px] uppercase border-primary/20 bg-white"
                                            asChild
                                        >
                                            <a href={`https://wa.me/${lead.customer_whatsapp.replace(/\D/g, '')}`} target="_blank">
                                                Contact <ExternalLink className="ml-1.5 h-3 w-3" />
                                            </a>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4 opacity-40">
                                            <ShoppingCart className="h-12 w-12" />
                                            <p className="font-black uppercase text-xs tracking-widest">No leads yet</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    );
}
