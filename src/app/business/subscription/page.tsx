'use client';
import { mockGetBusinessById, mockSubmitPayment } from "@/lib/mock-api";
import { Business, SubscriptionPlan } from "@/lib/types";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Info, ArrowRight, Upload, X, Clock, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/lib/supabase";

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
    const [network, setNetwork] = useState<'Orange' | 'Smega'>('Orange');

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id) {
                const { data: bizData } = await supabase
                    .from('businesses')
                    .select('*')
                    .eq('owner_id', session.user.id)
                    .single();
                
                if (bizData) {
                    setBusiness(bizData as Business);
                }
            }
        } catch (e) {
            console.error("Subscription fetch error:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetch();
    }, [fetch]);

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
            proofImageUrl: 'https://picsum.photos/seed/proof/400/600',
        });
        
        toast({
            title: "Payment Submitted",
            description: "Payment submitted successfully. Your account will be activated after admin verification.",
        });
        
        await fetch();
        setStep('browse');
        setSubmitting(false);
    };

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

    const expiry = business?.sub_end_date ? new Date(business.sub_end_date) : null;
    const trialRemaining = expiry ? Math.max(0, Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;
    const isPaid = business?.subscription_status === 'active';

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-12">
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-bold tracking-tight">Subscription Management</h1>
                <p className="text-muted-foreground">Manage your platform access and monthly billing.</p>
                
                <div className="flex flex-wrap gap-3 mt-2">
                    {isPaid ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
                            <ShieldCheck className="h-3.5 w-3.5 mr-2" />
                            Premium Access Active ({business?.subscription_plan})
                        </Badge>
                    ) : (
                        <Badge variant={trialRemaining > 0 ? "secondary" : "destructive"} className="flex gap-2 py-1 px-3">
                            <Clock className="h-3.5 w-3.5" />
                            {trialRemaining > 0 
                                ? `${trialRemaining} Days Remaining in Free Trial`
                                : "Free Trial Expired"}
                        </Badge>
                    )}
                </div>
            </div>

            {business?.subscription_status === 'payment_submitted' && (
                <Alert className="bg-blue-50 border-blue-200">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertTitle>Payment Verification Pending</AlertTitle>
                    <AlertDescription>
                        We've received your proof of payment for the <strong>{business.subscription_plan}</strong> plan. Verification usually takes 2-4 hours.
                    </AlertDescription>
                </Alert>
            )}

            {step === 'browse' ? (
                <div className="grid gap-6 md:grid-cols-3">
                    {PLANS.map((plan) => {
                        const isCurrent = business?.subscription_plan === plan.name && isPaid;
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
                                        disabled={isCurrent || business?.subscription_status === 'payment_submitted'}
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
                                Please send the subscription amount to our mobile money or crypto account.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="p-4 bg-muted rounded-lg space-y-4">
                                <div className="flex items-center justify-between border-b pb-2">
                                    <span className="text-sm font-medium text-muted-foreground">Recipient Name</span>
                                    <span className="text-sm font-bold">Kudolo Samuel</span>
                                </div>
                                <div className="space-y-3 border-b pb-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-muted-foreground">Orange Money</span>
                                        <span className="text-sm font-bold">77491261</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-muted-foreground">Smega (BTC Wallet)</span>
                                        <span className="text-sm font-bold">73568188</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-muted-foreground">Reference Code</span>
                                    {business?.id ? (
                                        <code className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-bold">
                                            {business.id.toUpperCase()}
                                        </code>
                                    ) : (
                                        <span className="text-[10px] text-muted-foreground italic text-right">
                                            Your Business ID will be used as payment reference
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            <div className="text-xs text-muted-foreground space-y-2">
                                <p>1. Open your mobile money or crypto wallet</p>
                                <p>2. Select "Send Money"</p>
                                <p>3. Use the correct payment number above</p>
                                <p>4. Enter the exact subscription amount</p>
                                <p>5. Use your Business ID as the reference</p>
                                <p>6. Complete the payment</p>
                                <p>7. Take a screenshot of the successful confirmation</p>
                                <p>8. Upload the screenshot in the provided upload field</p>
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
                                            <SelectItem value="Smega">Smega (BTC Wallet)</SelectItem>
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
