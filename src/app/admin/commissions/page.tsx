import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CommissionManagementPage() {
    // Mocked current commission rate
    const currentRate = 10;

    return (
        <div>
            <h1 className="text-3xl font-bold mb-2">Commission Management</h1>
            <p className="text-muted-foreground mb-6">Set the platform-wide commission rate for bookings.</p>

            <Card className="max-w-md">
                <CardHeader>
                    <CardTitle>Set Commission Rate</CardTitle>
                    <CardDescription>
                        This rate will be deducted from business owner payouts for each completed booking.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="commission-rate">Commission Rate (%)</Label>
                        <Input id="commission-rate" type="number" defaultValue={currentRate} />
                    </div>
                    <Button className="w-full">Update Rate</Button>
                </CardContent>
            </Card>
        </div>
    );
}
