'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User as ProfileUser, Service, Rating } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Banknote, Loader2, ArrowLeft, ShieldCheck, MapPin, Star, Store, UserCircle } from 'lucide-react';
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

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // 1. Resolve Business Record first (handling UUID or UID)
                const { data: bRec } = await supabase
                    .from('businesses')
                    .select('*')
                    .or(`id.eq.${businessId},owner_id.eq.${businessId}`)
                    .maybeSingle();
                
                if (bRec) {
                    setBizRecord(bRec);

                    // 2. Fetch Owner Info from users_with_access using owner_id
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

                    // 3. Fetch Services using the Business UUID
                    const { data: svcsData } = await supabase
                        .from('services')
                        .select('*')
                        .eq('business_id', bRec.id);
                    setServices(svcsData || []);

                    // 4. Fetch Recent Ratings using the Business UUID
                    const { data: ratingsData } = await supabase
                        .from('ratings')
                        .select(`
                            id,
                            rating,
                            feedback,
                            created_at,
                            customer:customer_id ( name )
                        `)
                        .eq('business_id', bRec.id)
                        .order('created_at', { ascending: false })
                        .limit(3);
                    
                    setRatings((ratingsData || []).map(r => ({
                        ...r,
                        createdAt: r.created_at
                    })));
                }
            } catch (e) {
                console.error('Error loading business details:', e);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [businessId]);

    if (loading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (!business || !business.access_active) {
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
        <div className="min-h-screen bg-background">
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
                                {business.avatarUrl ? (
                                    <Image src={business.avatarUrl} alt={business.name} fill className="object-cover" />
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
                                    <span className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {bizRecord?.address || 'Gaborone'}, {bizRecord?.city || 'Botswana'}</span>
                                    <div className="flex items-center gap-1.5 pt-1">
                                        <div className="flex">
                                            {[1, 2, 3, 4, 5].map((s) => (
                                                <Star key={s} className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                                            ))}
                                        </div>
                                        <span className="text-sm font-bold text-foreground">{avgRating}</span>
                                        <span className="text-sm text-muted-foreground">({ratings.length} verified reviews)</span>
                                    </div>
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {business.description || "Welcome to our professional car wash facility. We take pride in delivering showroom-quality results for every vehicle."}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold border-b pb-2">Service Catalog</h2>
                            <div className="grid gap-4">
                                {services.length > 0 ? services.map(service => (
                                    <Card key={service.id} className="group hover:border-primary transition-colors bg-card">
                                        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="space-y-1">
                                                <CardTitle className="text-xl group-hover:text-primary transition-colors">{service.name}</CardTitle>
                                                <CardDescription>{service.description}</CardDescription>
                                                <div className="flex items-center gap-4 text-xs font-medium pt-2">
                                                    <span className="flex items-center gap-1.5 bg-muted px-2 py-1 rounded"><Clock className="h-3 w-3" /> {service.duration} min</span>
                                                    <span className="flex items-center gap-1.5 bg-primary/10 text-primary px-2 py-1 rounded font-bold"><Banknote className="h-3 w-3" /> P{service.price.toFixed(2)}</span>
                                                </div>
                                            </div>
                                            <Button asChild className="shrink-0">
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
                                    Recent Reviews
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {ratings.length > 0 ? ratings.map((review) => (
                                    <div key={review.id} className="space-y-2 border-b last:border-0 pb-4 last:pb-0">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <UserCircle className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-xs font-bold">{review.customer?.name || 'Customer'}</span>
                                            </div>
                                            <div className="flex">
                                                {Array.from({ length: 5 }).map((_, i) => (
                                                    <Star key={i} className={cn("h-3 w-3", i < review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300")} />
                                                ))}
                                            </div>
                                        </div>
                                        {review.feedback && (
                                            <p className="text-xs text-muted-foreground italic leading-relaxed">
                                                &quot;{review.feedback}&quot;
                                            </p>
                                        )}
                                        <p className="text-[10px] text-muted-foreground">{new Date(review.createdAt).toLocaleDateString()}</p>
                                    </div>
                                )) : (
                                    <div className="text-center py-8">
                                        <p className="text-xs text-muted-foreground italic">No reviews yet. Be the first to rate!</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-8 text-center space-y-6">
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold">Ready to book?</h3>
                                <p className="text-sm text-muted-foreground">Join the marketplace to manage your vehicle details and track bookings.</p>
                            </div>
                            <Button asChild size="lg" className="w-full"><Link href="/signup">Create Free Account</Link></Button>
                            <p className="text-[10px] text-muted-foreground italic">Registration is quick and free for customers.</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
