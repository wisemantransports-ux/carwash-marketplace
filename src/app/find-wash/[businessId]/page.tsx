'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Business } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Banknote, Loader2, ArrowLeft, ShieldCheck, MapPin, Store, Sparkles } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { BookingModal } from '@/components/app/booking-modal';

export default function PublicBusinessServicesPage() {
    const params = useParams();
    const businessId = params?.businessId as string;
    const router = useRouter();
    const [bizRecord, setBizRecord] = useState<Business | null>(null);
    const [services, setServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [bookingOpen, setBookingOpen] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            if (!businessId) return;
            setLoading(true);
            try {
                const { data: bRec } = await supabase
                    .from('businesses')
                    .select('*')
                    .or(`id.eq.${businessId},owner_id.eq.${businessId}`)
                    .maybeSingle();
                
                if (bRec) {
                    setBizRecord(bRec as any);
                    const { data: svcsData } = await supabase
                        .from('listings')
                        .select('*')
                        .eq('business_id', bRec.id)
                        .eq('type', 'wash_service');
                    setServices(svcsData || []);
                }
            } catch (e) {
                console.error('Error loading:', e);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [businessId]);

    if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    if (!bizRecord) return <div className="text-center py-20">Business not found.</div>;

    return (
        <div className="min-h-screen bg-background pb-20">
             <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <Link href="/find-wash" className="flex items-center gap-2 text-primary font-bold">
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back</span>
                </Link>
                <div className="flex items-center gap-2">
                    <div className="bg-primary text-primary-foreground font-bold p-1 rounded text-[10px]">ALM</div>
                    <span className="text-sm font-bold text-primary">Marketplace</span>
                </div>
                <Button size="sm" variant="outline" asChild><Link href="/login">Partner Login</Link></Button>
                </div>
            </header>

            <main className="container mx-auto px-4 py-12 max-w-5xl space-y-12 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                    <div className="relative h-48 w-full md:w-64 rounded-3xl overflow-hidden border-4 border-white shadow-2xl shrink-0 bg-muted">
                        {bizRecord.logo_url ? (
                            <Image src={bizRecord.logo_url} alt={bizRecord.name} fill className="object-cover" />
                        ) : (
                            <div className="h-full w-full flex items-center justify-center text-muted-foreground"><Store className="h-12 w-12 opacity-20" /></div>
                        )}
                    </div>
                    <div className="space-y-4 flex-1">
                        <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider bg-primary/5 w-fit px-3 py-1 rounded-full">
                            <ShieldCheck className="h-4 w-4" />
                            <span>Verified Partner</span>
                        </div>
                        <h1 className="text-5xl font-black tracking-tighter">{bizRecord.name}</h1>
                        <span className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4" /> {bizRecord.address}, {bizRecord.city}</span>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-3xl font-black tracking-tight flex items-center gap-2">
                            <Banknote className="h-6 w-6 text-primary" />
                            Wash Packages
                        </h2>
                        <Button onClick={() => setBookingOpen(true)} className="h-12 px-8 font-black rounded-full shadow-xl">
                            <Sparkles className="mr-2 h-4 w-4" /> Quick Book
                        </Button>
                    </div>
                    <div className="grid gap-4">
                        {services.map(service => (
                            <Card key={service.id} className="group hover:border-primary transition-all border-2 rounded-2xl overflow-hidden">
                                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6">
                                    <div className="space-y-1">
                                        <CardTitle className="text-2xl font-bold group-hover:text-primary transition-colors">{service.name}</CardTitle>
                                        <div className="flex items-center gap-4 text-[10px] font-black pt-2">
                                            {service.duration && <span className="flex items-center gap-1.5 bg-muted px-2 py-1 rounded uppercase tracking-widest"><Clock className="h-3 w-3" /> {service.duration} MIN</span>}
                                            <span className="flex items-center gap-1.5 bg-primary/10 text-primary px-2 py-1 rounded uppercase tracking-widest">P{Number(service.price || 0).toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <Button onClick={() => setBookingOpen(true)} className="shrink-0 rounded-full font-black px-6">Select Package</Button>
                                </CardHeader>
                            </Card>
                        ))}
                    </div>
                </div>
            </main>

            <BookingModal 
                isOpen={bookingOpen}
                onClose={() => setBookingOpen(false)}
                businessId={bizRecord.id}
                businessName={bizRecord.name}
                services={services}
            />
        </div>
    );
}