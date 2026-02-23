'use client';

import React, { useEffect, useState } from 'react';
import { AiRecommender } from '@/components/app/ai-recommender';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { mockGetBusinessById, mockGetServicesForBusiness } from '@/lib/mock-api';
import type { Business, Service } from '@/lib/types';
import { Clock, Banknote, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function BookingPage({ params }: { params: Promise<{ businessId: string }> }) {
    const { businessId } = React.use(params);
    const [business, setBusiness] = useState<Business | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

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

    const handleBooking = (serviceId: string) => {
        router.push(`/customer/booking-confirmation/${serviceId}`);
    };
    
    if (loading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (!business) {
        return <div className="text-center">Business not found.</div>;
    }

    return (
        <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center gap-4">
                    <div className="relative h-24 w-24 rounded-lg overflow-hidden">
                        <Image src={business.imageUrl} alt={business.name} fill className="object-cover" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-bold">{business.name}</h1>
                        <p className="text-muted-foreground">{business.address}, {business.city}</p>
                    </div>
                </div>

                <h2 className="text-2xl font-semibold">Select a Service</h2>
                <div className="space-y-4">
                    {services.map(service => (
                        <Card key={service.id} className="flex flex-col sm:flex-row items-start sm:items-center">
                            <CardHeader className="flex-1">
                                <CardTitle>{service.name}</CardTitle>
                                <CardDescription>{service.description}</CardDescription>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2">
                                    <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{service.duration} min</span>
                                    <span className="flex items-center gap-1"><Banknote className="h-4 w-4" />P{service.price.toFixed(2)}</span>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 pt-0 sm:pt-6">
                                <Button onClick={() => handleBooking(service.id)}>Book Now</Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
            <div className="lg:col-span-1">
                <AiRecommender />
            </div>
        </div>
    );
}