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
import type { User as ProfileUser, Service, Car, Business } from '@/lib/types';
import { Clock, Banknote, Loader2, Store, Calendar as CalendarIcon, MapPin, ShieldCheck, Package } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from '@/hooks/use-toast';

const SPARE_SHOP_PREVIEW = [
  { name: 'Car Shampoo', price: 'P85', hint: 'car shampoo' },
  { name: 'Air Freshener', price: 'P25', hint: 'air freshener' },
  { name: 'Dashboard Polish', price: 'P60', hint: 'dashboard polish' },
  { name: 'Wiper Fluid', price: 'P45', hint: 'wiper fluid' },
];

export default function BookingPage({ params }: { params: Promise<{ businessId: string }> }) {
    const { businessId } = React.use(params); // This could be the Owner UID OR Business UUID
    const [business, setBusiness] = useState<ProfileUser | null>(null);
    const [bizRecord, setBizRecord] = useState<Business | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [cars, setCars] = useState<Car[]>([]);
    const [loading, setLoading] = useState(true);
    const [bookingOpen, setBookingOpen] = useState(false);
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [submitting, setSubmitting] = useState(false);
    
    const [selectedCarId, setSelectedCarId] = useState<string>('');
    const [bookingTime, setBookingTime] = useState<string>('');

    const router = useRouter();

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                const { data: { session } } = await supabase.auth.getSession();
                
                // 1. Resolve the Business Record first (handling both ID types)
                const { data: bizData } = await supabase
                    .from('businesses')
                    .select('*')
                    .or(`id.eq.${businessId},owner_id.eq.${businessId}`)
                    .maybeSingle();

                if (bizData) {
                    const typedBiz = bizData as Business;
                    setBizRecord(typedBiz);
                    
                    // 2. Fetch User Profile (Owner) using the owner_id from the record
                    const { data: userProfile } = await supabase
                        .from('users')
                        .select('*')
                        .eq('id', typedBiz.owner_id)
                        .maybeSingle();

                    if (userProfile) {
                      setBusiness({ 
                        ...userProfile, 
                        avatarUrl: userProfile.avatar_url,
                        plan: typedBiz.subscription_plan || 'None'
                      } as ProfileUser);
                    }

                    // 3. Fetch Services using the CORRECT Business UUID
                    const { data: svcs } = await supabase
                        .from('services')
                        .select('*')
                        .eq('business_id', typedBiz.id);
                    setServices(svcs || []);
                } else {
                    console.error("No business record found for ID:", businessId);
                }

                // 4. Fetch Customer's Cars
                if (session) {
                    const { data: userCars } = await supabase.from('cars').select('*').eq('owner_id', session.user.id);
                    setCars(userCars || []);
                    
                    if (userCars && userCars.length > 0) {
                        setSelectedCarId(userCars[0].id);
                    }
                }
            } catch (e) {
                console.error("Load error:", e);
                toast({ variant: 'destructive', title: 'Load Error', description: 'Failed to load details. Please refresh.' });
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
        
        const defaultTime = new Date();
        defaultTime.setHours(defaultTime.getHours() + 2);
        defaultTime.setMinutes(0);
        setBookingTime(defaultTime.toISOString().slice(0, 16));
        
        if (!selectedCarId && cars.length > 0) {
            setSelectedCarId(cars[0].id);
        }
        
        setBookingOpen(true);
    };

    const confirmBooking = async () => {
        if (!selectedService || !bizRecord) {
            toast({ 
                variant: 'destructive', 
                title: 'System Error', 
                description: !bizRecord ? 'Business profile is incomplete. Please choose another partner.' : 'No service selected.' 
            });
            return;
        }
        if (!selectedCarId) {
            toast({ variant: 'destructive', title: 'Car Required', description: 'Please select a vehicle for this wash.' });
            return;
        }
        if (!bookingTime) {
            toast({ variant: 'destructive', title: 'Time Required', description: 'Please pick a valid booking date and time.' });
            return;
        }

        setSubmitting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Session expired. Please log in again.');

            // 1. Prevent Multiple Active Bookings for the Same Car
            const { count, error: countError } = await supabase
                .from('bookings')
                .select('*', { count: 'exact', head: true })
                .eq('car_id', selectedCarId)
                .eq('status', 'pending');
            
            if (countError) throw countError;

            if (count !== null && count > 0) {
                toast({ 
                    variant: 'destructive', 
                    title: 'Active Booking Found', 
                    description: 'This car already has a pending booking. Please wait for it to complete before booking again.' 
                });
                setSubmitting(false);
                return;
            }

            // 2. Insert Booking using bizRecord.id (the actual Business Record UUID)
            const { data: newBooking, error } = await supabase.from('bookings').insert({
                customer_id: session.user.id,
                business_id: bizRecord.id,
                service_id: selectedService.id,
                car_id: selectedCarId,
                booking_time: new Date(bookingTime).toISOString(),
                status: 'pending',
                price: selectedService.price
            }).select().single();

            if (error) throw error;

            // 3. Conditional WhatsApp Redirect
            const allowsMobile = bizRecord.subscription_plan === 'Pro' || bizRecord.subscription_plan === 'Enterprise';
            const hasWhatsapp = !!bizRecord.whatsapp_number;
            
            if (allowsMobile && hasWhatsapp) {
                const selectedCar = cars.find(c => c.id === selectedCarId);
                const timeStr = new Date(bookingTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
                const message = `Hello! I've just booked a *${selectedService.name}* for my *${selectedCar?.make} ${selectedCar?.model}* via HydroFlow Marketplace.\n\n*Scheduled Time:* ${timeStr}\n*Ref:* ${newBooking.id.slice(-8).toUpperCase()}`;
                
                const whatsappUrl = `https://wa.me/${bizRecord.whatsapp_number?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
                
                toast({ title: 'Booking Saved', description: 'Opening WhatsApp to coordinate with the business...' });
                
                setTimeout(() => {
                    window.location.href = whatsappUrl;
                }, 1000);
            } else {
                toast({ title: 'Booking Successful', description: 'Your request has been registered.' });
                setBookingOpen(false);
                router.push(`/customer/booking-confirmation/${newBooking.id}`);
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Booking Failed', description: e.message });
        } finally {
            setSubmitting(false);
        }
    };
    
    if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    if (!business || !bizRecord) return (
        <div className="text-center py-20 bg-muted/10 rounded-3xl border-2 border-dashed">
            <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-20" />
            <h3 className="text-xl font-bold">Partner Not Found</h3>
            <p className="text-muted-foreground mt-2">The business profile you are looking for is currently unavailable.</p>
            <Button className="mt-6" variant="outline" onClick={() => router.push('/customer/home')}>Back to Marketplace</Button>
        </div>
    );

    return (
        <div className="grid lg:grid-cols-3 gap-8 pb-12">
            <div className="lg:col-span-2 space-y-12">
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
                            <MapPin className="h-4 w-4" /> {bizRecord.address || 'Gaborone'}, {bizRecord.city || 'Botswana'}
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

                <div className="space-y-6 border-t pt-8">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Package className="h-6 w-6" />
                        <h2 className="text-2xl font-bold">Spare Shop <span className="text-sm font-normal">(Coming Soon)</span></h2>
                    </div>
                    <p className="text-muted-foreground">Soon you&apos;ll be able to add car accessories and spare parts to your booking.</p>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {SPARE_SHOP_PREVIEW.map((product) => (
                            <Card key={product.name} className="opacity-60 grayscale hover:grayscale-0 transition-all">
                                <div className="aspect-square bg-muted relative rounded-t-lg overflow-hidden">
                                    <Image 
                                        src={`https://picsum.photos/seed/${product.name}/300/300`} 
                                        alt={product.name} 
                                        fill 
                                        className="object-cover"
                                        data-ai-hint={product.hint}
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                        <Badge variant="secondary" className="bg-white/90 text-black text-[10px]">COMING SOON</Badge>
                                    </div>
                                </div>
                                <CardContent className="p-3">
                                    <p className="text-xs font-bold truncate">{product.name}</p>
                                    <p className="text-[10px] text-muted-foreground">From {product.price}</p>
                                </CardContent>
                            </Card>
                        ))}
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
                            Distance and duration are estimated based on the business registered city ({bizRecord.city || 'Gaborone'}).
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Finalize Your Booking</DialogTitle>
                        <DialogDescription>
                            Select your vehicle and preferred time for: <span className="font-bold text-foreground">{selectedService?.name}</span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-6">
                        <div className="space-y-2">
                            <Label>Choose Your Vehicle</Label>
                            <Select value={selectedCarId} onValueChange={setSelectedCarId}>
                                <SelectTrigger className="w-full bg-white">
                                    <SelectValue placeholder="Select a registered car" />
                                </SelectTrigger>
                                <SelectContent>
                                    {cars.map(car => (
                                        <SelectItem key={car.id} value={car.id}>
                                            {car.make} {car.model}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Select Date & Time</Label>
                            <div className="relative group">
                                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none" />
                                <Input 
                                  type="datetime-local" 
                                  className="pl-10 h-12 bg-white"
                                  value={bookingTime}
                                  onChange={e => setBookingTime(e.target.value)}
                                  min={new Date().toISOString().slice(0, 16)}
                                />
                            </div>
                            <p className="text-[10px] text-muted-foreground italic">Business will review and confirm this slot shortly.</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button className="w-full h-12 text-lg shadow-xl" disabled={submitting} onClick={confirmBooking}>
                            {submitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShieldCheck className="mr-2 h-5 w-5" />}
                            Confirm Request
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
