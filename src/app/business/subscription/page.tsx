'use client';
import { Business, SubscriptionPlan } from "@/lib/types";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Info, ArrowRight, Upload, X, Clock, ShieldCheck, Camera } from "lucide-react";
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
                    .maybeSingle();
                
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
        if (!selectedPlan || !business || !reference) {
            toast({ variant: 'destructive', title: 'Details Required', description: 'Please provide the transaction reference.' });
            return;
        }

        setSubmitting(true);
        try {
            // 1. Insert real submission record
            const { error: insertError } = await supabase
                .from('payment_submissions')
                .insert({
                    business_id: business.id,
                    plan_selected: selectedPlan.name,
                    amount: selectedPlan.price,
                    mobile_network: network,
                    reference_text: reference.trim().toUpperCase(),
                    proof_image_url: `https://picsum.photos/seed/${reference}/400/600`, // Placeholder for actual upload
                    status: 'pending'
                });

            if (insertError) throw insertError;

            // 2. Update business status to show 'payment_submitted' UI
            const { error: bizUpdateError } = await supabase
                .from('businesses')
                .update({ 
                    subscription_status: 'payment_submitted'
                })
                .eq('id', business.id);
            
            if (bizUpdateError) throw bizUpdateError;

            toast({
                title: "Payment Submitted ✅",
                description: "Our admin team is verifying your transaction. Check back in 2-4 hours.",
            });
            
            await fetch();
            setStep('browse');
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Submission Failed', description: e.message });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;

    const expiry = business?.sub_end_date ? new Date(business.sub_end_date) : null;
    const trialRemaining = expiry ? Math.max(0, Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;
    const isPaid = business?.subscription_status === 'active';

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-extrabold tracking-tight text-primary">Subscription Manager</h1>
                <p className="text-muted-foreground font-medium">Control your platform access, billing tiers, and premium visibility.</p>
                
                <div className="flex flex-wrap gap-3 mt-2">
                    {isPaid ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200 font-black px-4 py-1.5">
                            <ShieldCheck className="h-3.5 w-3.5 mr-2" />
                            PREMIUM ACTIVE ({business?.subscription_plan?.toUpperCase()})
                        </Badge>
                    ) : (
                        <Badge variant={trialRemaining > 0 ? "secondary" : "destructive"} className="flex gap-2 py-1.5 px-4 font-bold">
                            <Clock className="h-3.5 w-3.5" />
                            {trialRemaining > 0 
                                ? `${trialRemaining} Days Remaining in Free Trial`
                                : "Access Period Expired"}
                        </Badge>
                    )}
                </div>
            </div>

            {business?.subscription_status === 'payment_submitted' && (
                <Alert className="bg-blue-50 border-blue-200 border-2">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="font-bold">Payment Verification Pending</AlertTitle>
                    <AlertDescription className="font-medium text-blue-800">
                        We've received your proof of payment for the <strong>{business.subscription_plan}</strong> plan. Admin review is underway.
                    </AlertDescription>
                </Alert>
            )}

            {step === 'browse' ? (
                <div className="grid gap-6 md:grid-cols-3">
                    {PLANS.map((plan) => {
                        const isCurrent = business?.subscription_plan === plan.name && isPaid;
                        return (
                            <Card key={plan.name} className={`relative flex flex-col border-2 transition-all hover:scale-[1.02] ${isCurrent ? 'border-primary ring-4 ring-primary/10 shadow-2xl' : 'shadow-md'}`}>
                                {isCurrent && (
                                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 font-black">CURRENT ACTIVE PLAN</Badge>
                                )}
                                <CardHeader className="bg-muted/10">
                                    <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                                    <div className="flex items-baseline gap-1 mt-2">
                                        <span className="text-4xl font-black">P{plan.price}</span>
                                        <span className="text-muted-foreground font-medium">/mo</span>
                                    </div>
                                    <CardDescription className="pt-2 text-xs font-medium">{plan.desc}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow pt-6">
                                    <ul className="space-y-3 text-xs">
                                        {plan.features.map(f => (
                                            <li key={f} className="flex items-start gap-2 font-medium">
                                                <Check className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" />
                                                <span>{f}</span>
                                            </li>
                                        ))}
                                        {plan.notIncluded?.map(f => (
                                            <li key={f} className="flex items-start gap-2 text-muted-foreground opacity-40">
                                                <X className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                                <span>{f}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                                <CardFooter className="bg-muted/5 border-t pt-4">
                                    <Button 
                                        className="w-full h-11 font-black shadow-lg" 
                                        variant={isCurrent ? 'outline' : 'default'} 
                                        disabled={isCurrent || business?.subscription_status === 'payment_submitted'}
                                        onClick={() => handleSelectPlan(plan)}
                                    >
                                        {isCurrent ? 'MANAGE PLAN' : 'ACTIVATE NOW'}
                                    </Button>
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <div className="grid lg:grid-cols-2 gap-8 items-start animate-in slide-in-from-right-4 duration-300">
                    <Card className="border-2 shadow-xl">
                        <CardHeader className="bg-muted/10 border-b">
                            <Button variant="ghost" size="sm" className="w-fit mb-4 font-bold" onClick={() => setStep('browse')}>
                                ← Back to Plans
                            </Button>
                            <CardTitle>Manual Payment Hub</CardTitle>
                            <CardDescription className="font-medium">
                                Follow these steps to activate your professional dashboard.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            <div className="p-5 bg-primary/5 rounded-2xl space-y-4 border border-primary/10">
                                <div className="flex items-center justify-between border-b border-primary/10 pb-3">
                                    <span className="text-xs font-black text-muted-foreground uppercase">Recipient Name</span>
                                    <span className="text-sm font-black text-primary">Kudolo Samuel</span>
                                </div>
                                <div className="space-y-3 border-b border-primary/10 pb-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-black text-muted-foreground uppercase">Orange Money</span>
                                        <span className="text-sm font-black">77491261</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-black text-muted-foreground uppercase">Smega (Wallet)</span>
                                        <span className="text-sm font-black">73568188</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-muted-foreground uppercase">Your Reference</span>
                                    <code className="text-xs bg-white border px-2 py-1 rounded font-black text-primary">
                                        {business?.id?.slice(-8).toUpperCase() || '---'}
                                    </code>
                                </div>
                            </div>
                            
                            <div className="text-xs text-muted-foreground space-y-3 font-medium bg-muted/20 p-4 rounded-xl">
                                <p>1. Open your Orange Money or Smega wallet.</p>
                                <p>2. Send the exact amount: <span className="font-black text-foreground">P{selectedPlan?.price}</span></p>
                                <p>3. Use Reference: <span className="font-black text-primary">{business?.id?.slice(-8).toUpperCase()}</span></p>
                                <p>4. Take a clear screenshot of the confirmation SMS or app screen.</p>
                                <p>5. Enter the transaction ID from the SMS in the form opposite.</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-2 shadow-xl">
                        <CardHeader className="bg-primary text-primary-foreground">
                            <CardTitle>Submit Transaction</CardTitle>
                            <CardDescription className="text-primary-foreground/80 font-bold">
                                Selected: {selectedPlan?.name} (P{selectedPlan?.price})
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <form onSubmit={handleSubmitPayment} className="space-y-6">
                                <div className="space-y-2">
                                    <Label className="font-bold">Mobile Network Provider</Label>
                                    <Select value={network} onValueChange={(v: any) => setNetwork(v)}>
                                        <SelectTrigger className="h-12 bg-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Orange">Orange Money (77491261)</SelectItem>
                                            <SelectItem value="Smega">Smega Wallet (73568188)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="ref" className="font-bold">Transaction Reference ID</Label>
                                    <Input 
                                        id="ref" 
                                        placeholder="e.g. TXN123456789" 
                                        className="h-12 text-lg font-mono font-black"
                                        required 
                                        value={reference} 
                                        onChange={e => setReference(e.target.value)}
                                    />
                                    <p className="text-[10px] text-muted-foreground italic">Enter the unique code found in your confirmation SMS.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-bold">Confirmation Screenshot</Label>
                                    <div className="border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-muted/50 transition-all group border-primary/20">
                                        <div className="bg-primary/10 p-3 rounded-full group-hover:scale-110 transition-transform">
                                            <Camera className="h-8 w-8 text-primary" />
                                        </div>
                                        <span className="text-sm font-black uppercase text-primary">Upload Proof</span>
                                        <span className="text-[10px] text-muted-foreground font-bold">JPEG, PNG up to 5MB</span>
                                    </div>
                                </div>
                                <Button type="submit" className="w-full h-14 text-lg font-black shadow-xl" disabled={submitting}>
                                    {submitting ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <ArrowRight className="mr-2 h-5 w-5" />}
                                    SUBMIT FOR VERIFICATION
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
