'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Sparkles, TrendingUp, ShoppingCart } from 'lucide-react';

export default function BusinessSpareShopPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold tracking-tight">Spare Shop</h1>
        <p className="text-muted-foreground text-lg">Inventory and retail management for your car wash.</p>
      </div>

      <Card className="border-2 border-dashed bg-muted/10 overflow-hidden">
        <div className="bg-primary/5 p-12 text-center flex flex-col items-center gap-6">
          <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center">
            <Package className="h-10 w-10 text-primary animate-pulse" />
          </div>
          <div className="space-y-2 max-w-md">
            <Badge className="bg-primary hover:bg-primary">FEATURE ROADMAP</Badge>
            <h2 className="text-3xl font-extrabold tracking-tight">Launching Soon</h2>
            <p className="text-muted-foreground">
              We are building a powerful retail tool that allows you to sell car accessories and spare parts directly to customers when they book a wash.
            </p>
          </div>
        </div>
        <CardContent className="grid md:grid-cols-3 gap-8 p-12 border-t border-dashed">
          <div className="space-y-4">
            <div className="h-10 w-10 bg-accent/20 rounded-lg flex items-center justify-center text-accent-foreground">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h4 className="font-bold">Increase Revenue</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Upsell high-margin items like air fresheners, premium shampoos, and wipers during the booking process.
            </p>
          </div>
          <div className="space-y-4">
            <div className="h-10 w-10 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-600">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <h4 className="font-bold">Automated Inventory</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Track your stock levels automatically as bookings are completed. Never run out of essential cleaning supplies.
            </p>
          </div>
          <div className="space-y-4">
            <div className="h-10 w-10 bg-green-500/10 rounded-lg flex items-center justify-center text-green-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <h4 className="font-bold">Customer Loyalty</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Provide a one-stop shop for car maintenance, making your business the preferred choice for vehicle owners.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 flex items-start gap-4">
        <div className="bg-white p-2 rounded-lg shadow-sm border border-blue-100">
          <Sparkles className="h-5 w-5 text-blue-600" />
        </div>
        <div className="space-y-1">
          <p className="font-bold text-blue-900">Experience Preview</p>
          <p className="text-sm text-blue-800 leading-relaxed">
            Customers will see a preview of your spare shop during booking. This increases awareness and builds anticipation for your retail offerings.
          </p>
        </div>
      </div>
    </div>
  );
}
