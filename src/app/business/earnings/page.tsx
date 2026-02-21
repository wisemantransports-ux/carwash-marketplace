import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Banknote, Percent } from "lucide-react";

export default function EarningsPage() {
    // Mocked data
    const summary = {
        totalRevenue: 5230.50,
        pendingPayout: 1240.00,
        platformFees: 523.05,
    };
    const payouts = [
        { id: 'p-1', date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), amount: 850.00, status: 'Paid' },
        { id: 'p-2', date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), amount: 1120.50, status: 'Paid' },
        { id: 'p-3', date: new Date(), amount: 1240.00, status: 'Processing' },
    ];

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Earnings & Payouts</h1>
            <div className="grid gap-4 md:grid-cols-3 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue (All Time)</CardTitle>
                        <Banknote className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">P{summary.totalRevenue.toFixed(2)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Payout</CardTitle>
                        <Banknote className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">P{summary.pendingPayout.toFixed(2)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Platform Fees</CardTitle>
                        <Percent className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">P{summary.platformFees.toFixed(2)}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Payout History</CardTitle>
                    <CardDescription>
                        Payouts are processed weekly.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {payouts.map(payout => (
                                <TableRow key={payout.id}>
                                    <TableCell>{payout.date.toLocaleDateString()}</TableCell>
                                    <TableCell>
                                        <Badge variant={payout.status === 'Paid' ? 'secondary' : 'default'}>{payout.status}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">P{payout.amount.toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
