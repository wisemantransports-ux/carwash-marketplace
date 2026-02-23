'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { mockGetBusinessById, mockGetServicesForBusiness } from '@/lib/mock-api';
import type { Business, Service } from '@/lib/types';
import { Clock, Banknote, Loader2, ArrowLeft, ShieldCheck, MapPin, Star } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function PublicBusinessServicesPage({ params }: { params: Promise<{ businessId: string }> }) {
    const { businessId } = React.use(params);
    const [business, setBusiness] = useState<Business | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            const { data: businessData } = await mockGetBusinessById(businessId);
            setBusiness(businessData);
            if (businessData) {
                const { data: servicesData } = await mockGetServicesForBusiness(businessId);
                setServices(servicesData);
            }
            setLoading(false);
        };
        loadData();
    }, [businessId]);

    if (loading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (!business) {
        return (
            <div className="flex flex-col items-center justify-center h-screen space-y-4">
                <h1 className="text-2xl font-bold">Business Not Found</h1>
                <Button asChild><Link href="/find-wash">Back to search</Link></Button>
            </div>
        );
    }

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

            <main className="container mx-auto px-4 py-12 max-w-4xl space-y-8">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                    <div className="relative h-48 w-full md:w-64 rounded-2xl overflow-hidden border shadow-xl shrink-0">
                        <Image src={business.imageUrl} alt={business.name} fill className="object-cover" />
                        <div className="absolute top-2 right-2">
                             <Badge variant="secondary" className="bg-white/90 text-black uppercase">{business.type}</Badge>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider">
                            <ShieldCheck className="h-4 w-4" />
                            <span>Verified Partner</span>
                        </div>
                        <h1 className="text-4xl font-extrabold">{business.name}</h1>
                        <div className="flex flex-col gap-2 text-muted-foreground">
                            <span className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {business.address}, {business.city}</span>
                            <div className="flex items-center gap-1.5 pt-1">
                                <div className="flex">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                        <Star key={s} className={`h-3 w-3 ${s <= Math.floor(business.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                                    ))}
                                </div>
                                <span className="text-xs font-bold text-foreground">{business.rating}</span>
                                <span className="text-xs">({business.reviewCount} reviews)</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6 pt-8">
                    <h2 className="text-2xl font-bold border-b pb-2">Service Catalog</h2>
                    <div className="grid gap-4">
                        {services.length > 0 ? services.map(service => (
                            <Card key={service.id} className="group hover:border-primary transition-colors bg-card">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                                    <div className="space-y-1">
                                        <CardTitle className="text-xl group-hover:text-primary transition-colors">{service.name}</CardTitle>
                                        <CardDescription>{service.description}</CardDescription>
                                        <div className="flex items-center gap-4 text-xs font-medium pt-2">
                                            <span className="flex items-center gap-1.5 bg-muted px-2 py-1 rounded"><Clock className="h-3 w-3" /> {service.duration} min</span>
                                            <span className="flex items-center gap-1.5 bg-primary/10 text-primary px-2 py-1 rounded"><Banknote className="h-3 w-3" /> P{service.price.toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <Button asChild>
                                        <Link href="/login">Book Now</Link>
                                    </Button>
                                </CardHeader>
                            </Card>
                        )) : (
                            <div className="text-center py-12 bg-muted/20 rounded-xl">
                                <p className="text-muted-foreground">No services are currently listed for this partner.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 text-center space-y-4">
                    <p className="text-sm font-medium">Ready to book a professional wash?</p>
                    <div className="flex justify-center gap-4">
                        <Button asChild><Link href="/signup">Create Free Account</Link></Button>
                        <Button variant="outline" asChild><Link href="/login">Log In</Link></Button>
                    </div>
                    <p className="text-xs text-muted-foreground italic">Quick account registration is required to manage your vehicle details and booking history.</p>
                </div>
            </main>
        </div>
    );
}