'use client';

import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { Star, Loader2, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

const ratingSchema = z.object({
    rating: z.number().min(1, "Please select a rating").max(5),
    feedback: z.string().optional(),
});

type RatingFormValues = z.infer<typeof ratingSchema>;

export default function RatingPage({ params }: { params: Promise<{ bookingId: string }> }) {
    const { bookingId } = React.use(params);
    const [rating, setRating] = useState(0);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [booking, setBooking] = useState<any>(null);
    const router = useRouter();

    const form = useForm<RatingFormValues>({
        resolver: zodResolver(ratingSchema),
        defaultValues: { rating: 0, feedback: '' }
    });

    useEffect(() => {
        async function checkEligibility() {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return router.push('/login');

            const { data, error } = await supabase
                .from('bookings')
                .select('*, business:business_id(name)')
                .eq('id', bookingId)
                .eq('customer_id', session.user.id)
                .maybeSingle();

            if (error || !data || data.status !== 'completed') {
                toast({ variant: 'destructive', title: 'Ineligible', description: 'You can only rate completed services.' });
                router.push('/customer/bookings');
                return;
            }

            // Check if already rated
            const { data: existing } = await supabase
                .from('ratings')
                .select('id')
                .eq('booking_id', bookingId)
                .maybeSingle();

            if (existing) {
                toast({ title: 'Already Rated', description: 'You have already submitted feedback for this booking.' });
                router.push('/customer/bookings');
                return;
            }

            setBooking(data);
            setLoading(false);
        }
        checkEligibility();
    }, [bookingId, router]);

    const onSubmit = async (values: RatingFormValues) => {
        setSubmitting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Unauthorized");

            const { error } = await supabase
                .from('ratings')
                .insert({
                    booking_id: bookingId,
                    customer_id: session.user.id,
                    business_id: booking.business_id,
                    rating: values.rating,
                    feedback: values.feedback,
                });

            if (error) throw error;

            toast({
                title: "Feedback Submitted",
                description: "Thank you for rating your service!",
            });
            router.push("/customer/bookings");
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setSubmitting(false);
        }
    };

    const handleSetRating = (rate: number) => {
        setRating(rate);
        form.setValue("rating", rate);
        form.clearErrors("rating");
    }

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

    return (
        <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold">Rate Your Service</h1>
                <p className="text-muted-foreground">Share your experience at {booking?.business?.name}.</p>
            </div>

            <Card className="shadow-lg border-2">
                <CardHeader className="bg-muted/10 border-b">
                    <CardTitle>How was the wash?</CardTitle>
                    <CardDescription>Your feedback helps the business improve and helps other customers choose.</CardDescription>
                </CardHeader>
                <CardContent className="pt-8">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            <FormField
                                control={form.control}
                                name="rating"
                                render={() => (
                                    <FormItem className="text-center space-y-4">
                                        <FormLabel className="text-lg">Overall Rating</FormLabel>
                                        <FormControl>
                                            <div className="flex justify-center gap-3">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <Star
                                                        key={star}
                                                        className={cn(
                                                            "h-12 w-12 cursor-pointer transition-all hover:scale-110",
                                                            rating >= star ? "text-yellow-400 fill-yellow-400" : "text-gray-200"
                                                        )}
                                                        onClick={() => handleSetRating(star)}
                                                    />
                                                ))}
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="feedback"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Additional Feedback (optional)</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Tell us more about the quality, timeliness, and professionalism..."
                                                rows={5}
                                                className="resize-none"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="flex gap-4">
                                <Button 
                                    type="submit" 
                                    className="flex-1 h-12 text-lg shadow-lg" 
                                    disabled={submitting || rating === 0}
                                >
                                    {submitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                                    Submit Feedback
                                </Button>
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    className="h-12"
                                    onClick={() => router.back()}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
