
'use client';

import React, { Suspense } from 'react';
import CarMarketplace from '@/components/app/car-marketplace';
import { Loader2, ArrowLeft, ShieldCheck, Car as CarIcon } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function CarMarketplacePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/find-wash" className="flex items-center gap-2 text-primary font-bold hover:opacity-80 transition-opacity">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Marketplace</span>
          </Link>
          <div className="flex items-center gap-2">
            <CarIcon className="h-5 w-5 text-primary" />
            <span className="text-sm font-bold text-primary tracking-tight uppercase">Car Discovery</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" asChild><Link href="/login">Sign In</Link></Button>
            <Button size="sm" asChild><Link href="/signup">Sign Up</Link></Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 space-y-12">
        <div className="space-y-4 max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
            <ShieldCheck className="h-3 w-3" />
            <span>Verified Vehicle Sellers Only</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Cars for Sale</h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Browse high-quality vehicles listed by verified individuals and dealerships across Botswana.
          </p>
        </div>

        <Suspense fallback={
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="animate-spin h-10 w-10 text-primary" />
            <p className="text-muted-foreground animate-pulse font-medium">Loading car listings...</p>
          </div>
        }>
          <CarMarketplace />
        </Suspense>
      </main>
    </div>
  );
}
