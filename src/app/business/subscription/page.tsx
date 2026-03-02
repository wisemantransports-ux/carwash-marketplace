
'use client';

import { Business, SubscriptionPlan, SubscriptionPaymentStatus } from "@/lib/types";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Info, ArrowRight, X, Clock, ShieldCheck, CreditCard, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/lib/supabase";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

const PLANS = [
    { 
        name: 'Starter' as SubscriptionPlan, 
        price: 199, 
        desc: 'For small or single-station automotive specialists',
        features: [
            '15 booking requests per month',
            'Up to 3 verified employees',
            'Business profile listed in search',
            'Admin verification badge',
            'Basic business analytics'
        ],
        notIncluded: ['Unlimited bookings', 'Priority ranking', 'Mobile services']
    },
    { 
        name: 'Pro' as SubscriptionPlan, 
        price: 350, 
        desc: 'For established shops offering full services',
        features: [
            'Unlimited booking requests',
            'Up to 10 verified employees',
            'Mobile / on-site wash capabilities',
            'Priority listing in search results',
            'Customer review management'
        ],
        notIncluded: ['Multi-location controls', 'Dedicated support']
    },
    { 
        name: 'Enterprise' as SubscriptionPlan, 
        price: 599, 
        desc: 'For multi-location automotive groups',
        features: [
            'Unlimited employees & locations',
            'Highest priority in search ranking',
            'Advanced performance reporting',
            'Dedicated admin account manager',
            'Custom marketing tools'
        ]
    }
];

export default function SubscriptionPage() {
    const [business, setBusiness] = useState<Business | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedPlan, setSelectedPlan] = useState<typeof PLANS[0] | null>(null);
    const [step, setStep] = useState<'browse' | 'pay'>('browse');
    const [submitting, setSubmitting] = useState(false);

    const fetchBusiness = useCallback(async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id) {
                const { data: bizData, error } = await supabase
                    .from('businesses')
                    .select('*')
                    .eq('owner_id', session.user.id)
                    .maybeSingle();
                
                if (error) throw error;
                if (bizData) setBusiness(bizData as Business);
            }
        } catch (e: any) {
            console.error("Subscription load error:", e);
            toast({ variant: 'destructive', title: 'Load Error', description: e.message });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBusiness();
    }, [fetchBusiness]);

    const handleSelectPlan = (plan: typeof PLANS[0]) => {
        setSelectedPlan(plan);
        setStep('pay');
    };

    const handleManualPayment = () => {
        if (!selectedPlan || !business) return;

        const adminPhone = "26777491261"; // Admin WhatsApp
        const message = `*PAYMENT REQUEST - AUTOLINK AFRICA*\n\n` +
                        `*Business:* ${business.name}\n` +
                        `*Business ID:* ${business.id}\n` +
                        `*Plan Selected:* ${selectedPlan.name}\n` +
                        `*Amount Due:* P${selectedPlan.price}\n\n` +
                        `I would like to pay for my subscription via Mobile Money. Please provide instructions.`;
        
        const whatsappUrl = `https://wa.me/${adminPhone}?text=${encodeURIComponent(message)}`;
        
        // Update status to pending verification
        const updateStatus = async () => {
            await supabase.from('businesses').update({
                subscription_status: 'payment_submitted',
                subscription_payment_status: 'pending_verification'
            }).eq('id', business.id);
            
            toast({ title: "WhatsApp Opened", description: "Coordinate your payment with our team." });
            window.open(whatsappUrl, '_blank');
            fetchBusiness();
            setStep('browse');
        };

        updateStatus();
    };

    const onPayPalSuccess = async (details: any) => {
        if (!selectedPlan || !business) return;
        setSubmitting(true);
        try {
            // 1. Log transaction
            const { error: logError } = await supabase.from('payment_submissions').insert({
                business_id: business.id,
                plan_selected: selectedPlan.name,
                amount: selectedPlan.price,
                mobile_network: 'PayPal',
                reference_text: details.id,
                proof_image_url: 'AUTO_PAYPAL_VERIFIED',
                status: 'approved'
            });

            if (logError) throw logError;

            // 2. Activate Subscription
            const { error: updateError } = await supabase.from('businesses').update({
                subscription_status: 'active',
                subscription_payment_status: 'paypal_confirmed',
                subscription_plan: selectedPlan.name,
                sub_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            }).eq('id', business.id);

            if (updateError) throw updateError;

            toast({ title: "Subscription Active! ✅", description: "Your account has been upgraded automatically." });
            await fetchBusiness();
            setStep('browse');
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Activation Error", description: e.message });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="flex justify-center py-24"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

    const isPaid = business?.subscription_status === 'active';
    const isAwaiting = business?.subscription_status === 'payment_submitted';

    return (
        <PayPalScriptProvider options={{ "clientId": process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "test" }}>
            <div className="max-w-6xl mx-auto space-y-10 pb-20 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b pb-8">
                    <div className="space-y-2">
                        <h1 className="text-4xl font-black tracking-tight text-primary">Billing & Growth</h1>
                        <p className="text-muted-foreground font-medium text-lg">Manage your platform reach and subscription tiers.</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {isPaid ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200 font-black px-5 py-2 text-sm shadow-sm">
                                <ShieldCheck className="h-4 w-4 mr-2" />
                                {business?.subscription_plan?.toUpperCase()} ACTIVE
                            </Badge>
                        ) : isAwaiting ? (
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 font-black px-5 py-2 text-sm animate-pulse">
                                <Clock className="h-4 w-4 mr-2" />
                                AWAITING VERIFICATION
                            </Badge>
                        ) : (
                            <Badge variant="destructive" className="font-black px-5 py-2 text-sm shadow-lg">
                                INACTIVE ACCOUNT
                            </Badge>
                        )}
                    </div>
                </div>

                {isAwaiting && (
                    <Alert className="bg-blue-50 border-blue-200 border-2 shadow-sm rounded-2xl">
                        <Info className="h-5 w-5 text-blue-600" />
                        <AlertTitle className="font-black text-blue-900">Payment in Review</AlertTitle>
                        <AlertDescription className="font-medium text-blue-800">
                            Our team is currently verifying your manual payment. This typically takes 2-4 hours during business days.
                        </AlertDescription>
                    </Alert>
                )}

                {step === 'browse' ? (
                    <div className="grid gap-8 md:grid-cols-3">
                        {PLANS.map((plan) => {
                            const isCurrent = business?.subscription_plan === plan.name && isPaid;
                            return (
                                <Card key={plan.name} className={`relative flex flex-col border-2 transition-all hover:scale-[1.03] duration-300 ${isCurrent ? 'border-primary ring-8 ring-primary/5 shadow-2xl' : 'shadow-md shadow-muted/50'}`}>
                                    {isCurrent && (
                                        <Badge className="absolute -top-4 left-1/2 -translate-x-1/2 font-black py-1 px-4 shadow-lg bg-primary">CURRENT PLAN</Badge>
                                    )}
                                    <CardHeader className="bg-muted/10 pb-8 text-center">
                                        <CardTitle className="text-2xl font-black uppercase tracking-tighter">{plan.name}</CardTitle>
                                        <div className="flex items-baseline justify-center gap-1 mt-4">
                                            <span className="text-5xl font-black">P{plan.price}</span>
                                            <span className="text-muted-foreground font-bold">/mo</span>
                                        </div>
                                        <CardDescription className="pt-4 text-xs font-bold leading-relaxed px-4">{plan.desc}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-grow pt-8 space-y-4">
                                        <ul className="space-y-4 text-sm font-medium">
                                            {plan.features.map(f => (
                                                <li key={f} className="flex items-start gap-3">
                                                    <div className="bg-green-100 p-0.5 rounded-full mt-0.5"><Check className="h-3.5 w-3.5 text-green-700" /></div>
                                                    <span className="text-slate-700">{f}</span>
                                                </li>
                                            ))}
                                            {plan.notIncluded?.map(f => (
                                                <li key={f} className="flex items-start gap-3 text-muted-foreground/40">
                                                    <X className="h-4 w-4 mt-0.5" />
                                                    <span className="italic">{f}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                    <CardFooter className="bg-muted/5 border-t pt-6">
                                        <Button 
                                            className="w-full h-14 font-black text-lg shadow-xl group" 
                                            variant={isCurrent ? 'outline' : 'default'} 
                                            disabled={isCurrent || isAwaiting}
                                            onClick={() => handleSelectPlan(plan)}
                                        >
                                            {isCurrent ? 'MANAGE SUBSCRIPTION' : 'UPGRADE NOW'}
                                            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                        </Button>
                                    </CardFooter>
                                </Card>
                            );
                        })}
                    </div>
                ) : (
                    <div className="grid lg:grid-cols-5 gap-12 items-start animate-in slide-in-from-bottom-8 duration-500">
                        <div className="lg:col-span-3 space-y-8">
                            <Card className="border-2 shadow-2xl overflow-hidden rounded-3xl">
                                <CardHeader className="bg-slate-900 text-white p-8">
                                    <Button variant="ghost" size="sm" className="w-fit mb-6 font-bold text-white hover:bg-white/10" onClick={() => setStep('browse')}>
                                        ← Back to Tiers
                                    </Button>
                                    <CardTitle className="text-3xl font-black">Checkout</CardTitle>
                                    <CardDescription className="text-slate-400 font-bold">
                                        Activate your {selectedPlan?.name} benefits.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-8 space-y-10">
                                    <div className="bg-primary/5 p-6 rounded-3xl border-2 border-primary/10 space-y-6">
                                        <div className="flex justify-between items-center border-b border-primary/10 pb-4">
                                            <span className="text-sm font-black text-muted-foreground uppercase tracking-widest">Selected Tier</span>
                                            <Badge variant="secondary" className="font-black text-sm">{selectedPlan?.name}</Badge>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-black text-muted-foreground uppercase tracking-widest">Amount Due</span>
                                            <span className="text-3xl font-black text-primary">P{selectedPlan?.price}.00</span>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="relative">
                                            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                                            <div className="relative flex justify-center text-xs font-black uppercase"><span className="bg-white px-4 text-muted-foreground">Automated Activation</span></div>
                                        </div>
                                        
                                        <div className="max-w-md mx-auto">
                                            <PayPalButtons 
                                                style={{ layout: "vertical", shape: "pill", label: "pay" }}
                                                createOrder={(data, actions) => {
                                                    return actions.order.create({
                                                        intent: "CAPTURE",
                                                        purchase_units: [{
                                                            amount: { currency_code: "USD", value: (selectedPlan!.price / 13.5).toFixed(2) }, // Simplified Pula to USD conversion
                                                            description: `${selectedPlan!.name} Plan - ${business!.name}`
                                                        }]
                                                    });
                                                }}
                                                onApprove={async (data, actions) => {
                                                    const details = await actions.order!.capture();
                                                    onPayPalSuccess(details);
                                                }}
                                                onError={(err) => {
                                                    console.error("PayPal Error:", err);
                                                    toast({ variant: "destructive", title: "Payment Failed", description: "PayPal transaction could not be completed." });
                                                }}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="lg:col-span-2 space-y-8">
                            <Card className="border-2 shadow-xl rounded-3xl bg-green-50/30 border-green-100 overflow-hidden">
                                <CardHeader className="bg-green-600 text-white p-6">
                                    <CardTitle className="text-xl flex items-center gap-2">
                                        <MessageCircle className="h-6 w-6" />
                                        Manual Payment
                                    </CardTitle>
                                    <CardDescription className="text-green-50 font-medium">
                                        Pay via Orange Money or Smega.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-6 space-y-6">
                                    <p className="text-sm font-medium leading-relaxed text-slate-700">
                                        Don't have a PayPal account? Click below to coordinate a manual transfer via WhatsApp. Once we receive your proof of payment, your account will be activated by an admin.
                                    </p>
                                    <Button 
                                        variant="outline" 
                                        className="w-full h-14 font-black border-2 border-green-600 text-green-700 hover:bg-green-600 hover:text-white rounded-2xl shadow-md group"
                                        onClick={handleManualPayment}
                                    >
                                        COORDINDATE ON WHATSAPP
                                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                    <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-green-100 shadow-sm">
                                        <CreditCard className="h-5 w-5 text-green-600 shrink-0" />
                                        <p className="text-[10px] font-bold text-slate-500 uppercase leading-tight">
                                            Admin Verification required for manual payments.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="p-6 bg-primary/5 rounded-3xl border-2 border-dashed border-primary/20 space-y-4">
                                <h4 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4" />
                                    Growth Guarantee
                                </h4>
                                <p className="text-xs font-medium text-slate-600 leading-relaxed">
                                    Verified partners appear in top search results. Customers value accountability—maintaining an active subscription signals a professional and reliable operation.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </PayPalScriptProvider>
    );
}
