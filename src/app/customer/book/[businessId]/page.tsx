'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AiRecommender } from '@/components/app/ai-recommender';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { User as ProfileUser, Business } from '@/lib/types';
import { Clock, Banknote, Loader2, Store, MapPin, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from '@/hooks/use-toast';
import { BookingModal } from '@/components/app/booking-modal';

export default function BookingPage({ params }: { params: Promise<{ businessId: string }> }) {
    const { businessId } = React.use(params);
    const [bizRecord, setBizRecord] = useState<Business | null>(null);
    const [services, setServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [bookingOpen, setBookingOpen] = useState(false);
    const [selectedService, setSelectedService] = useState<any>(null);

    const router = useRouter();

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                // 1. Resolve Business Record from unified 'businesses' table
                const { data: bizData } = await supabase
                    .from('businesses')
                    .select('*')
                    .or(`id.eq.${businessId},owner_id.eq.${businessId}`)
                    .maybeSingle();

                if (bizData) {
                    const typedBiz = bizData as Business;
                    setBizRecord(typedBiz);
                    
                    // 2. Fetch Services from UNIFIED 'listings' table
                    const { data: svcs } = await supabase
                        .from('listings')
                        .select('*')
                        .eq('business_id', typedBiz.id)
                        .eq('type', 'wash_service');
                    setServices(svcs || []);
                }
            } catch (e) {
                console.error("Load error:", e);
                toast({ variant: 'destructive', title: 'Load Error', description: 'Failed to load details.' });
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [businessId]);

    const handleOpenBooking = (service: any) => {
        setSelectedService(service);
        setBookingOpen(true);
    };
    
    if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    if (!bizRecord) return <div className="text-center py-20 italic">Partner not found.</div>;

    return (
        <div className="grid lg:grid-cols-3 gap-8 pb-12">
            <div className="lg:col-span-2 space-y-12">
                <div className="flex flex-col sm:flex-row items-center gap-6 bg-card border rounded-2xl p-6 shadow-sm">
                    <div className="relative h-32 w-32 rounded-2xl overflow-hidden border shadow-inner shrink-0 bg-muted">
                        {bizRecord.logo_url ? (
                            <Image src={bizRecord.logo_url} alt={bizRecord.name} fill className="object-cover" />
                        ) : (
                            <div className="h-full w-full flex items-center justify-center text-muted-foreground"><Store className="h-12 w-12" /></div>
                        )}
                    </div>
                    <div className="flex-1 text-center sm:text-left space-y-2">
                        <div className="flex items-center justify-center sm:justify-start gap-2 text-primary font-bold text-xs uppercase tracking-widest">
                            <ShieldCheck className="h-4 w-4" />
                            <span>Verified Partner</span>
                        </div>
                        <h1 className="text-4xl font-extrabold">{bizRecord.name}</h1>
                        <p className="text-muted-foreground flex items-center justify-center sm:justify-start gap-2">
                            <MapPin className="h-4 w-4" /> {bizRecord.address}, {bizRecord.city}
                        </p>
                    </div>
                </div>

                <div className="space-y-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        Available Services
                        <Badge variant="outline" className="ml-2">{services.length}</Badge>
                    </h2>
                    <div className="grid gap-4">
                        {services.length > 0 ? services.map(service => (
                            <Card key={service.id} className="group hover:border-primary transition-all duration-300">
                                <CardHeader className="flex-1 pb-2">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-xl group-hover:text-primary transition-colors">{service.name}</CardTitle>
                                        <div className="text-xl font-bold text-primary">P{Number(service.price).toFixed(2)}</div>
                                    </div>
                                    <CardDescription className="text-sm line-clamp-2">{service.description}</CardDescription>
                                </CardHeader>
                                <CardFooter className="flex items-center justify-between border-t pt-4 bg-muted/5">
                                    <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
                                        <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" />Professional Wash</span>
                                        <span className="flex items-center gap-1.5"><Banknote className="h-3 w-3" />Pula Payments</span>
                                    </div>
                                    <Button size="sm" onClick={() => handleOpenBooking(service)}>Book Service</Button>
                                </CardFooter>
                            </Card>
                        )) : (
                            <div className="text-center py-20 border-2 border-dashed rounded-2xl bg-muted/20">
                                <p className="text-muted-foreground font-medium italic">No wash packages currently listed.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="lg:col-span-1 space-y-6">
                <AiRecommender />
            </div>

            <BookingModal 
                isOpen={bookingOpen}
                onClose={() => setBookingOpen(false)}
                service={selectedService}
            />
        </div>
    );
}
