'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AiRecommender } from '@/components/app/ai-recommender';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { User as ProfileUser, Service, Car } from '@/lib/types';
import { Clock, Banknote, Loader2, Store, Calendar as CalendarIcon, MapPin, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from '@/hooks/use-toast';

export default function BookingPage({ params }: { params: Promise<{ businessId: string }> }) {
    const { businessId } = React.use(params);
    const [business, setBusiness] = useState<ProfileUser | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [cars, setCars] = useState<Car[]>([]);
    const [loading, setLoading] = useState(true);
    const [bookingOpen, setBookingOpen] = useState(false);
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [submitting, setSubmitting] = useState(false);
    
    // Booking Form State
    const [selectedCarId, setSelectedCarId] = useState<string>('');
    const [bookingTime, setBookingTime] = useState<string>('');

    const router = useRouter();

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                const { data: { session } } = await supabase.auth.getSession();
                
                // Fetch Business
                const { data: biz } = await supabase.from('users').select('*').eq('id', businessId).maybeSingle();
                if (biz) {
                  setBusiness({ ...biz, avatarUrl: biz.avatar_url } as ProfileUser);
                }

                // Fetch Services
                const { data: svcs } = await supabase.from('services').select('*').eq('business_id', businessId);
                setServices(svcs || []);

                // Fetch Cars for dropdown
                if (session) {
                    const { data: userCars } = await supabase.from('cars').select('*').eq('owner_id', session.user.id);
                    setCars(userCars || []);
                }
            } catch (e) {
                toast({ variant: 'destructive', title: 'Load Error', description: 'Failed to load details.' });
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [businessId]);

    const handleOpenBooking = (service: Service) => {
        if (cars.length === 0) {
            toast({ 
                title: "Register a Car", 
                description: "You need to add a vehicle to your profile before booking.",
                action: <Button size="sm" onClick={() => router.push('/customer/cars')}>Go to Cars</Button>
            });
            return;
        }
        setSelectedService(service);
        setBookingOpen(true);
    };

    const confirmBooking = async () => {
        if (!selectedCarId || !bookingTime || !selectedService || !business) {
            toast({ variant: 'destructive', title: 'Details Required', description: 'Please pick a car and a valid time.' });
            return;
        }

        setSubmitting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const { data: newBooking, error } = await supabase.from('bookings').insert({
                customer_id: session.user.id,
                business_id: business.id,
                service_id: selectedService.id,
                car_id: selectedCarId,
                booking_time: new Date(bookingTime).toISOString(),
                status: 'requested',
                price: selectedService.price,
                payment: { escrowStatus: 'funded', commission: selectedService.price * 0.1 }
            }).select().single();

            if (error) throw error;

            toast({ title: 'Booking Requested', description: 'The business has been notified.' });
            setBookingOpen(false);
            router.push(`/customer/booking-confirmation/${newBooking.id}`);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Booking Failed', description: e.message });
        } finally {
            setSubmitting(false);
        }
    };
    
    if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    if (!business) return <div className="text-center py-20">Business not found.</div>;

    return (
        <div className="grid lg:grid-cols-3 gap-8 pb-12">
            <div className="lg:col-span-2 space-y-8">
                <div className="flex flex-col sm:flex-row items-center gap-6 bg-card border rounded-2xl p-6 shadow-sm">
                    <div className="relative h-32 w-32 rounded-2xl overflow-hidden border shadow-inner shrink-0">
                        {business.avatarUrl ? (
                            <Image src={business.avatarUrl} alt={business.name} fill className="object-cover" />
                        ) : (
                            <div className="h-full w-full flex items-center justify-center text-muted-foreground"><Store className="h-12 w-12" /></div>
                        )}
                    </div>
                    <div className="flex-1 text-center sm:text-left space-y-2">
                        <div className="flex items-center justify-center sm:justify-start gap-2 text-primary font-bold text-xs uppercase tracking-widest">
                            <ShieldCheck className="h-4 w-4" />
                            <span>Verified Partner</span>
                        </div>
                        <h1 className="text-4xl font-extrabold">{business.name}</h1>
                        <p className="text-muted-foreground flex items-center justify-center sm:justify-start gap-2">
                            <MapPin className="h-4 w-4" /> {business.address || 'Gaborone'}, {business.city || 'Botswana'}
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
                                        <CardTitle className="text-xl group-hover:text-primary transition-colors">{service.service_name}</CardTitle>
                                        <div className="text-xl font-bold text-primary">P{service.price.toFixed(2)}</div>
                                    </div>
                                    <CardDescription className="text-sm line-clamp-2">{service.description}</CardDescription>
                                </CardHeader>
                                <CardFooter className="flex items-center justify-between border-t pt-4 bg-muted/5">
                                    <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
                                        <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" />{service.duration} mins</span>
                                        <span className="flex items-center gap-1.5"><Banknote className="h-3 w-3" />Pula Payments</span>
                                    </div>
                                    <Button size="sm" onClick={() => handleOpenBooking(service)}>Book Service</Button>
                                </CardFooter>
                            </Card>
                        )) : (
                            <div className="text-center py-20 border-2 border-dashed rounded-2xl bg-muted/20">
                                <p className="text-muted-foreground font-medium italic">No services are currently listed for this partner.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="lg:col-span-1 space-y-6">
                <AiRecommender />
                <Card className="bg-muted/30">
                    <CardHeader>
                        <CardTitle className="text-lg">Location Context</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="aspect-video bg-muted rounded-lg flex items-center justify-center border-2 border-dashed text-muted-foreground">
                            Map Preview Area
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed italic">
                            Distance and duration are estimated based on your current registered city ({business.city || 'Gaborone'}).
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Booking Dialog */}
            <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Finalize Your Booking</DialogTitle>
                        <DialogDescription>
                            Select your vehicle and preferred time for: <span className="font-bold text-foreground">{selectedService?.service_name}</span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-6">
                        <div className="space-y-2">
                            <Label>Choose Your Vehicle</Label>
                            <Select value={selectedCarId} onValueChange={setSelectedCarId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a registered car" />
                                </SelectTrigger>
                                <SelectContent>
                                    {cars.map(car => (
                                        <SelectItem key={car.id} value={car.id}>
                                            {car.year} {car.make} {car.model} ({car.licensePlate || (car as any).plate_number})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Select Date & Time</Label>
                            <div className="relative">
                                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                  type="datetime-local" 
                                  className="pl-10"
                                  value={bookingTime}
                                  onChange={e => setBookingTime(e.target.value)}
                                  min={new Date().toISOString().slice(0, 16)}
                                />
                            </div>
                            <p className="text-[10px] text-muted-foreground italic">Business will review and confirm this slot shortly.</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button className="w-full" size="lg" disabled={submitting} onClick={confirmBooking}>
                            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                            Confirm Request (P{selectedService?.price.toFixed(2)})
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
