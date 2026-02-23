'use client';
import { mockGetBusinessById, mockSubmitPayment } from "@/lib/mock-api";
import { Business, SubscriptionPlan } from "@/lib/types";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Info, ArrowRight, Upload, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const PLANS = [
    { 
        name: 'Starter' as SubscriptionPlan, 
        price: 150, 
        desc: 'For small or single-station car wash businesses',
        features: [
            '1 registered car wash location',
            'Up to 3 verified employees',
            'Station-based bookings only',
            'Business profile listed in search',
            'Admin verification badge'
        ],
        notIncluded: ['Mobile service', 'Priority listing']
    },
    { 
        name: 'Pro' as SubscriptionPlan, 
        price: 300, 
        desc: 'For established stations offering mobile service',
        features: [
            'Up to 10 verified employees',
            'Mobile / on-site services',
            'Employee ID + photo verification',
            'Service area radius selection',
            'Higher search ranking'
        ],
        notIncluded: ['Unlimited employees', 'Multi-location accounts']
    },
    { 
        name: 'Enterprise' as SubscriptionPlan, 
        price: 600, 
        desc: 'For multi-location operators',
        features: [
            'Unlimited employees',
            'Multiple locations under one account',
            'Priority listing in search results',
            'Dedicated admin review',
            'Advanced business analytics'
        ]
    }
];

export default function SubscriptionPage() {
    const [business, setBusiness] = useState<Business | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedPlan, setSelectedPlan] = useState<typeof PLANS[0] | null>(null);
    const [step, setStep] = useState<'browse' | 'pay'>('browse');
    const [submitting, setSubmitting] = useState(false);

    // Form states
    const [reference, setReference] = useState('');
    const [network, setNetwork] = useState<'Orange' | 'Mascom'>('Orange');

    useEffect(() => {
        const fetch = async () => {
            const { data } = await mockGetBusinessById('biz-2'); // Pula Mobile Wash
            setBusiness(data);
            setLoading(false);
        };
        fetch();
    }, []);

    const handleSelectPlan = (plan: typeof PLANS[0]) => {
        setSelectedPlan(plan);
        setStep('pay');
    };

    const handleSubmitPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPlan || !business || !reference) return;

        setSubmitting(true);
        await mockSubmitPayment({
            businessId: business.id,
            planSelected: selectedPlan.name,
            amount: selectedPlan.price,
            mobileNetwork: network,
            referenceText: reference,
            proofImageUrl: 'https://picsum.photos/seed/proof/400/600', // Mocked upload
        });
        
        toast({
            title: "Payment Submitted",
            description: "An admin will verify your payment shortly.",
        });
        
        // Refresh local state
        const { data } = await mockGetBusinessById(business.id);
        setBusiness(data);
        setStep('browse');
        setSubmitting(false);
    };

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-12">
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-bold tracking-tight">Subscription Management</h1>
                <p className="text-muted-foreground">Manage your platform access and monthly billing.</p>
                <p className="text-xs text-primary font-medium italic">Note: Customers do not pay the platform. Only verified car wash businesses subscribe to use the system.</p>
            </div>

            {business?.subscriptionStatus === 'payment_submitted' && (
                <Alert className="bg-blue-50 border-blue-200">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertTitle>Payment Verification Pending</AlertTitle>
                    <AlertDescription>
                        We've received your proof of payment for the <strong>{business.subscriptionPlan}</strong> plan. Verification usually takes 2-4 hours.
                    </AlertDescription>
                </Alert>
            )}

            {step === 'browse' ? (
                <div className="grid gap-6 md:grid-cols-3">
                    {PLANS.map((plan) => {
                        const isCurrent = business?.subscriptionPlan === plan.name && business?.subscriptionStatus === 'active';
                        return (
                            <Card key={plan.name} className={`relative flex flex-col ${isCurrent ? 'border-primary ring-1 ring-primary shadow-lg' : ''}`}>
                                {isCurrent && (
                                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Current Plan</Badge>
                                )}
                                <CardHeader>
                                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                                    <div className="flex items-baseline gap-1 mt-2">
                                        <span className="text-3xl font-bold">P{plan.price}</span>
                                        <span className="text-muted-foreground">/mo</span>
                                    </div>
                                    <CardDescription className="pt-2 text-xs">{plan.desc}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <ul className="space-y-2 text-xs">
                                        {plan.features.map(f => (
                                            <li key={f} className="flex items-center gap-2">
                                                <Check className="h-3 w-3 text-green-500 shrink-0" />
                                                <span>{f}</span>
                                            </li>
                                        ))}
                                        {plan.notIncluded?.map(f => (
                                            <li key={f} className="flex items-center gap-2 text-muted-foreground opacity-50">
                                                <X className="h-3 w-3 shrink-0" />
                                                <span>{f}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                                <CardFooter>
                                    <Button 
                                        className="w-full" 
                                        variant={isCurrent ? 'outline' : 'default'} 
                                        disabled={isCurrent || business?.subscriptionStatus === 'payment_submitted'}
                                        onClick={() => handleSelectPlan(plan)}
                                    >
                                        {isCurrent ? 'Active' : 'Subscribe Now'}
                                    </Button>
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <div className="grid lg:grid-cols-2 gap-8 items-start">
                    <Card>
                        <CardHeader>
                            <Button variant="ghost" size="sm" className="w-fit mb-4" onClick={() => setStep('browse')}>
                                ← Back to Plans
                            </Button>
                            <CardTitle>Manual Payment Instructions</CardTitle>
                            <CardDescription>
                                Please send the subscription amount to our mobile money account.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="p-4 bg-muted rounded-lg space-y-4">
                                <div className="flex items-center justify-between border-b pb-2">
                                    <span className="text-sm font-medium">Recipient Name</span>
                                    <span className="text-sm font-bold">Carwash Marketplace</span>
                                </div>
                                <div className="flex items-center justify-between border-b pb-2">
                                    <span className="text-sm font-medium">Payment Number</span>
                                    <span className="text-sm font-bold">+267 71 234 567</span>
                                </div>
                                <div className="flex items-center justify-between border-b pb-2">
                                    <span className="text-sm font-medium">Available Networks</span>
                                    <div className="flex gap-2">
                                        <Badge variant="secondary">Orange</Badge>
                                        <Badge variant="secondary">Mascom</Badge>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Reference Code</span>
                                    <code className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                        {business?.id.toUpperCase()}
                                    </code>
                                </div>
                            </div>
                            
                            <div className="text-xs text-muted-foreground space-y-1">
                                <p>1. Open your mobile money menu</p>
                                <p>2. Select "Send Money"</p>
                                <p>3. Use the number and reference code above</p>
                                <p>4. Take a screenshot of the confirmation message</p>
                                <p>5. Upload the screenshot on the right</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Submit Proof of Payment</CardTitle>
                            <CardDescription>
                                Selected: <span className="font-bold text-foreground">{selectedPlan?.name} (P{selectedPlan?.price})</span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmitPayment} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Network Used</Label>
                                    <Select value={network} onValueChange={(v: any) => setNetwork(v)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Orange">Orange Money</SelectItem>
                                            <SelectItem value="Mascom">MyZaka (Mascom)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="ref">Transaction Reference (from SMS)</Label>
                                    <Input 
                                        id="ref" 
                                        placeholder="e.g. TXN123456789" 
                                        required 
                                        value={reference} 
                                        onChange={e => setReference(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Upload Screenshot</Label>
                                    <div className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors">
                                        <Upload className="h-8 w-8 text-muted-foreground" />
                                        <span className="text-sm font-medium">Click to upload confirmation</span>
                                        <span className="text-xs text-muted-foreground">JPEG, PNG up to 5MB</span>
                                    </div>
                                </div>
                                <Button type="submit" className="w-full" disabled={submitting}>
                                    {submitting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                                    Submit for Verification
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
