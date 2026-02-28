'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User as ProfileUser, Service } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Banknote, Loader2, ArrowLeft, ShieldCheck, MapPin, Star, Store, UserCircle, Car as CarIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function PublicBusinessServicesPage({ params }: { params: Promise<{ businessId: string }> }) {
    const { businessId } = React.use(params);
    const [business, setBusiness] = useState<ProfileUser | null>(null);
    const [bizRecord, setBizRecord] = useState<any>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [ratings, setRatings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const loadData = async () => {
            setLoading(true);
            try {
                // 1. Resolve Business Record
                const { data: bRec } = await supabase
                    .from('businesses')
                    .select('*')
                    .or(`id.eq.${businessId},owner_id.eq.${businessId}`)
                    .maybeSingle();
                
                if (bRec) {
                    setBizRecord(bRec);

                    // 2. Fetch Owner Info
                    const { data: userData } = await supabase
                        .from('users_with_access')
                        .select('*')
                        .eq('id', bRec.owner_id)
                        .maybeSingle();

                    if (userData) {
                        setBusiness({
                            ...userData,
                            avatarUrl: userData.avatar_url,
                            plan: bRec.subscription_plan
                        } as ProfileUser);
                    }

                    // 3. Fetch Services
                    const { data: svcsData } = await supabase
                        .from('services')
                        .select('*')
                        .eq('business_id', bRec.id);
                    setServices(svcsData || []);

                    // 4. Fetch Verified Ratings & Reviews using requested Logic
                    const { data: reviewsData } = await supabase
                        .from('bookings')
                        .select(`
                            booking_time,
                            rating:ratings!booking_id ( rating, feedback ),
                            customer:users!bookings_customer_id_fkey ( name ),
                            service:services!bookings_service_id_fkey ( name ),
                            car:cars!bookings_car_id_fkey ( make, model )
                        `)
                        .eq('business_id', bRec.id)
                        .eq('status', 'completed')
                        .not('ratings', 'is', null)
                        .order('booking_time', { ascending: false });
                    
                    const formattedReviews = (reviewsData || [])
                        .filter(b => b.rating && b.rating.length > 0)
                        .map(b => ({
                            id: Math.random().toString(), // local id for list
                            customerName: b.customer?.name || 'Customer',
                            rating: b.rating[0].rating,
                            review: b.rating[0].feedback,
                            serviceName: b.service?.name,
                            carDetails: b.car ? `${b.car.make} ${b.car.model}` : null,
                            bookingTime: b.booking_time
                        }));

                    setRatings(formattedReviews);
                }
            } catch (e) {
                console.error('Error loading business details:', e);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [businessId]);

    if (!mounted || loading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (!business || !bizRecord || !business.access_active) {
        return (
            <div className="flex flex-col items-center justify-center h-screen space-y-4 px-4 text-center">
                <div className="bg-destructive/10 p-6 rounded-full">
                    <Store className="h-12 w-12 text-destructive" />
                </div>
                <h1 className="text-2xl font-bold">Business Not Available</h1>
                <p className="text-muted-foreground max-sm">This business is currently not accepting bookings through the marketplace.</p>
                <Button asChild><Link href="/find-wash">Back to Search</Link></Button>
            </div>
        );
    }

    const avgRating = ratings.length > 0 
        ? (ratings.reduce((acc, curr) => acc + curr.rating, 0) / ratings.length).toFixed(1)
        : "5.0";

    return (
        <div className="min-h-screen bg-background pb-20">
             <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <Link href="/find-wash" className="flex items-center gap-2 text-primary font-bold hover:opacity-80 transition-opacity">
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to Search</span>
                </Link>
                <div className="flex items-center gap-2">
                    <div className="bg-primary text-primary-foreground font-bold p-1 rounded text-[10px]">CWM</div>
                    <span className="text-sm font-bold text-primary tracking-tight">Carwash Marketplace</span>
                </div>
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" asChild>
                        <Link href="/login">Sign In</Link>
                    </Button>
                    <Button size="sm" asChild>
                        <Link href="/signup">Sign Up</Link>
                    </Button>
                </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-12 max-w-5xl space-y-12">
                <div className="grid md:grid-cols-3 gap-8 items-start">
                    <div className="md:col-span-2 space-y-8">
                        <div className="flex flex-col md:flex-row gap-8 items-start">
                            <div className="relative h-48 w-full md:w-64 rounded-2xl overflow-hidden border shadow-xl shrink-0 bg-muted">
                                {bizRecord.logo_url ? (
                                    <Image src={bizRecord.logo_url} alt={business.name} fill className="object-cover" />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                                        <Store className="h-12 w-12 opacity-20" />
                                    </div>
                                )}
                                <div className="absolute top-2 right-2">
                                    <Badge variant="secondary" className="bg-white/90 text-black uppercase font-bold">{business.plan}</Badge>
                                </div>
                            </div>
                            <div className="space-y-4 flex-1">
                                <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider">
                                    <ShieldCheck className="h-4 w-4" />
                                    <span>Verified Partner</span>
                                </div>
                                <h1 className="text-4xl font-extrabold">{business.name}</h1>
                                <div className="flex flex-col gap-2 text-muted-foreground">
                                    <span className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4" /> {bizRecord?.address || 'Gaborone'}, {bizRecord?.city || 'Botswana'}</span>
                                    <div className="flex items-center gap-1.5 pt-1">
                                        <div className="flex">
                                            {[1, 2, 3, 4, 5].map((s) => (
                                                <Star key={s} className={cn("h-3.5 w-3.5", s <= Math.round(Number(avgRating)) ? "text-yellow-400 fill-yellow-400" : "text-gray-200")} />
                                            ))}
                                        </div>
                                        <span className="text-sm font-bold text-foreground">{avgRating}</span>
                                        <span className="text-sm text-muted-foreground">({ratings.length} verified reviews)</span>
                                    </div>
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed italic">
                                    {business.description || "Welcome to our professional car wash facility. We take pride in delivering showroom-quality results for every vehicle."}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold border-b pb-2 flex items-center gap-2">
                                <Banknote className="h-5 w-5 text-primary" />
                                Service Packages
                            </h2>
                            <div className="grid gap-4">
                                {services.length > 0 ? services.map(service => (
                                    <Card key={service.id} className="group hover:border-primary transition-colors bg-card shadow-sm">
                                        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="space-y-1">
                                                <CardTitle className="text-xl group-hover:text-primary transition-colors">{service.name}</CardTitle>
                                                <CardDescription className="line-clamp-2 text-xs">{service.description}</CardDescription>
                                                <div className="flex items-center gap-4 text-[10px] font-bold pt-2">
                                                    <span className="flex items-center gap-1.5 bg-muted px-2 py-1 rounded text-muted-foreground uppercase"><Clock className="h-3 w-3" /> {service.duration} min</span>
                                                    <span className="flex items-center gap-1.5 bg-primary/10 text-primary px-2 py-1 rounded uppercase tracking-wider"><Banknote className="h-3 w-3" /> P{Number(service.price).toFixed(2)}</span>
                                                </div>
                                            </div>
                                            <Button asChild className="shrink-0 rounded-full font-bold">
                                                <Link href="/login">Sign In to Book</Link>
                                            </Button>
                                        </CardHeader>
                                    </Card>
                                )) : (
                                    <div className="text-center py-20 bg-muted/20 rounded-2xl border-2 border-dashed">
                                        <p className="text-muted-foreground font-medium italic">No services are currently listed for this partner.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <Card className="bg-muted/30 border-dashed">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                                    Verified Reviews
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {ratings.length > 0 ? ratings.map((review) => (
                                    <div key={review.id} className="space-y-3 border-b last:border-0 pb-6 last:pb-0">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <UserCircle className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-xs font-bold">{review.customerName}</span>
                                            </div>
                                            <div className="flex">
                                                {Array.from({ length: 5 }).map((_, i) => (
                                                    <Star key={i} className={cn("h-3 w-3", i < review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300")} />
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                                <Badge variant="outline" className="h-4 px-1.5 text-[8px] border-primary/20 text-primary font-bold uppercase">{review.serviceName}</Badge>
                                                {review.carDetails && <span className="flex items-center gap-1"><CarIcon className="h-2.5 w-2.5" /> {review.carDetails}</span>}
                                            </div>
                                            {review.review && (
                                                <p className="text-xs text-foreground font-medium leading-relaxed bg-white/50 p-2 rounded-lg border border-dashed italic">
                                                    &quot;{review.review}&quot;
                                                </p>
                                            )}
                                        </div>
                                        <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter">{new Date(review.bookingTime).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                    </div>
                                )) : (
                                    <div className="text-center py-8">
                                        <p className="text-xs text-muted-foreground italic">No reviews yet. Be the first to rate!</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-8 text-center space-y-6 sticky top-24">
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold">Ready to book?</h3>
                                <p className="text-sm text-muted-foreground">Join the marketplace to manage your vehicle details and track bookings.</p>
                            </div>
                            <Button asChild size="lg" className="w-full shadow-xl font-bold rounded-full transition-transform hover:scale-105 active:scale-95"><Link href="/signup">Create Free Account</Link></Button>
                            <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground italic font-medium">
                                <ShieldCheck className="h-3 w-3" />
                                Registration is quick and free for customers.
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
