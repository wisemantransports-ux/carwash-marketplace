
'use client';
import { mockGetServicesForBusiness } from "@/lib/mock-api";
import type { Service } from "@/lib/types";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, Loader2, Sparkles } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { generateServiceDescription } from "@/ai/flows/business-owner-service-description-flow";

export default function ServicesManagementPage() {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [generatingAi, setGeneratingAi] = useState(false);
    const [newServiceName, setNewServiceName] = useState('');
    const [newServiceDesc, setNewServiceDesc] = useState('');
    const [newServicePrice, setNewServicePrice] = useState('');

    useEffect(() => {
        const fetchServices = async () => {
            setLoading(true);
            const businessId = "biz-1";
            const { data } = await mockGetServicesForBusiness(businessId);
            setServices(data);
            setLoading(false);
        };
        fetchServices();
    }, []);

    const handleAiDescription = async () => {
        if (!newServiceName || !newServicePrice) {
            toast({ variant: 'destructive', title: "Details Required", description: "Enter service name and price first." });
            return;
        }
        setGeneratingAi(true);
        try {
            const result = await generateServiceDescription({
                serviceName: newServiceName,
                price: `P${newServicePrice}`,
            });
            setNewServiceDesc(result.generatedDescription);
        } catch (e) {
            toast({ variant: 'destructive', title: "AI Error", description: "Could not generate description." });
        } finally {
            setGeneratingAi(false);
        }
    };

    const handleAddService = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        await new Promise(resolve => setTimeout(resolve, 800));
        toast({ title: "Service Created", description: `${newServiceName} has been added to your catalog.` });
        setIsAddOpen(false);
        setSubmitting(false);
        setNewServiceName('');
        setNewServiceDesc('');
        setNewServicePrice('');
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Services Catalog</h1>
                    <p className="text-muted-foreground">Manage your car wash packages and pricing.</p>
                </div>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Service
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Create New Service</DialogTitle>
                            <DialogDescription>Define a new wash package for your customers.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAddService} className="space-y-4 py-2">
                            <div className="space-y-2">
                                <Label htmlFor="sname">Service Name</Label>
                                <Input id="sname" value={newServiceName} onChange={e => setNewServiceName(e.target.value)} placeholder="e.g. Eco Interior Steam Clean" required />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label htmlFor="sdesc">Description</Label>
                                    <Button type="button" variant="ghost" size="sm" className="text-primary text-[10px] h-6" onClick={handleAiDescription} disabled={generatingAi}>
                                        {generatingAi ? <Loader2 className="animate-spin h-3 w-3 mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                                        Generate with AI
                                    </Button>
                                </div>
                                <Textarea id="sdesc" value={newServiceDesc} onChange={e => setNewServiceDesc(e.target.value)} placeholder="Describe the service benefits..." rows={3} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="sprice">Price (Pula)</Label>
                                    <Input id="sprice" type="number" value={newServicePrice} onChange={e => setNewServicePrice(e.target.value)} placeholder="e.g. 150" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="sdur">Duration (min)</Label>
                                    <Input id="sdur" type="number" placeholder="e.g. 45" required />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" className="w-full" disabled={submitting}>
                                    {submitting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                                    Add to Catalog
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Service Name</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Duration</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead><span className="sr-only">Actions</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({length: 2}).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-64" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                        <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                                    </TableRow>
                                ))
                            ) : services.length > 0 ? (
                                services.map(service => (
                                    <TableRow key={service.id}>
                                        <TableCell className="font-medium">{service.name}</TableCell>
                                        <TableCell className="text-muted-foreground max-w-xs truncate">{service.description}</TableCell>
                                        <TableCell>{service.duration} min</TableCell>
                                        <TableCell className="font-bold">P{service.price.toFixed(2)}</TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem>Edit Pricing</DropdownMenuItem>
                                                    <DropdownMenuItem className="text-destructive">Remove Service</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        No services found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
