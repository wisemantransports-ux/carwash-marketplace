import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import Link from "next/link";

export default function BookingConfirmationPage({ params }: { params: { bookingId: string } }) {
    // In a real app, you'd fetch the booking details using the bookingId
    // to confirm and display the correct information.

    return (
        <div className="flex flex-col items-center justify-center pt-16">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto bg-green-100 rounded-full h-16 w-16 flex items-center justify-center">
                        <CheckCircle className="h-10 w-10 text-green-600" />
                    </div>
                    <CardTitle className="mt-4 text-2xl">Booking Confirmed!</CardTitle>
                    <CardDescription>
                        Your car wash appointment is scheduled. We've sent a confirmation to your email.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                        Booking ID: <span className="font-mono">{params.bookingId}</span>
                    </p>
                    <div className="flex gap-4">
                        <Button className="flex-1" asChild>
                            <Link href="/customer/bookings">View My Bookings</Link>
                        </Button>
                        <Button variant="outline" className="flex-1" asChild>
                            <Link href="/customer/home">Book Another</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
