'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const ratingSchema = z.object({
    rating: z.number().min(1, "Please select a rating").max(5),
    feedback: z.string().optional(),
});

type RatingFormValues = z.infer<typeof ratingSchema>;

export default function RatingPage({ params }: { params: Promise<{ bookingId: string }> }) {
    const { bookingId } = React.use(params);
    const [rating, setRating] = useState(0);
    const router = useRouter();

    const form = useForm<RatingFormValues>({
        resolver: zodResolver(ratingSchema),
    });

    const onSubmit = (values: RatingFormValues) => {
        console.log({ bookingId, ...values });
        toast({
            title: "Feedback Submitted",
            description: "Thank you for rating your service!",
        });
        router.push("/customer/bookings");
    };

    const handleSetRating = (rate: number) => {
        setRating(rate);
        form.setValue("rating", rate);
        form.clearErrors("rating");
    }

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Rate Your Service</h1>
            <Card className="max-w-lg mx-auto">
                <CardHeader>
                    <CardTitle>How was your experience?</CardTitle>
                    <CardDescription>Your feedback helps us and the business improve.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="rating"
                                render={() => (
                                    <FormItem>
                                        <FormLabel>Overall Rating</FormLabel>
                                        <FormControl>
                                            <div className="flex gap-2">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <Star
                                                        key={star}
                                                        className={cn(
                                                            "h-8 w-8 cursor-pointer transition-colors",
                                                            rating >= star ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
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
                                                placeholder="Tell us more about your experience..."
                                                rows={4}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full">Submit Feedback</Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}