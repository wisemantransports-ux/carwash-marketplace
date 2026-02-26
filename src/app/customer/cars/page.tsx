
'use client';
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Car } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, Loader2, Car as CarIcon, Trash2, CheckCircle2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function CarManagementPage() {
    const [cars, setCars] = useState<Car[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Simplified form state: Only Make and Model
    const [make, setMake] = useState('');
    const [model, setModel] = useState('');

    async function fetchCars() {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const { data, error } = await supabase.from('cars').select('*').eq('owner_id', session.user.id);
            if (error) throw error;
            setCars(data || []);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Load Error', description: 'Failed to fetch vehicles.' });
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchCars();
    }, []);

    const handleAddCar = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!make.trim() || !model.trim()) {
            toast({ variant: 'destructive', title: 'Fields Required', description: 'Make and Model are required.' });
            return;
        }

        setSubmitting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            
            // Inserting with only required fields, explicitly setting others to null for clarity
            const { error } = await supabase.from('cars').insert({
                owner_id: session?.user.id,
                make: make.trim(),
                model: model.trim(),
                year: null,
                plate_number: null
            });
            
            if (error) throw error;
            
            toast({ title: 'Car Registered', description: `${make} ${model} added to your profile.` });
            setIsAdding(false);
            setMake(''); setModel('');
            fetchCars();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setSubmitting(false);
        }
    }

    const deleteCar = async (id: string) => {
        try {
            const { error } = await supabase.from('cars').delete().eq('id', id);
            if (error) throw error;
            setCars(cars.filter(c => c.id !== id));
            toast({ title: 'Car Removed' });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete car.' });
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">My Cars</h1>
                    <p className="text-muted-foreground">Manage your vehicles for easy booking.</p>
                </div>
                <Dialog open={isAdding} onOpenChange={setIsAdding}>
                    <DialogTrigger asChild>
                        <Button className="shadow-lg h-11 px-6 rounded-full">
                            <PlusCircle className="mr-2 h-5 w-5" /> Add New Car
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-2xl">Register Vehicle</DialogTitle>
                            <DialogDescription>Enter your car details to proceed with bookings.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAddCar} className="space-y-6 py-4">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="make" className="text-sm font-bold">Vehicle Make *</Label>
                                    <Input 
                                        id="make" 
                                        value={make} 
                                        onChange={e => setMake(e.target.value)} 
                                        placeholder="e.g. Toyota" 
                                        className="h-12 text-lg"
                                        required 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="model" className="text-sm font-bold">Vehicle Model *</Label>
                                    <Input 
                                        id="model" 
                                        value={model} 
                                        onChange={e => setModel(e.target.value)} 
                                        placeholder="e.g. Hilux" 
                                        className="h-12 text-lg"
                                        required 
                                    />
                                </div>
                            </div>
                            <DialogFooter className="pt-2">
                                <Button type="submit" className="w-full h-14 text-lg shadow-xl" disabled={submitting}>
                                    {submitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                                    Complete Registration
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
            
            <Card className="shadow-xl border-muted/50 overflow-hidden rounded-2xl">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/10 hover:bg-muted/10 border-b-2">
                                <TableHead className="w-16"></TableHead>
                                <TableHead className="font-bold py-4">Vehicle Identity</TableHead>
                                <TableHead className="font-bold">Status</TableHead>
                                <TableHead className="text-right pr-6 font-bold">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({length: 3}).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="pl-6"><Skeleton className="h-10 w-10 rounded-full" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-48" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell className="text-right pr-6"><Skeleton className="h-9 w-9 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : cars.length > 0 ? (
                                cars.map(car => (
                                    <TableRow key={car.id} className="hover:bg-muted/5 transition-colors group">
                                        <TableCell className="pl-6 py-5">
                                            <div className="bg-primary/10 p-3 rounded-2xl group-hover:bg-primary/20 transition-colors">
                                                <CarIcon className="h-6 w-6 text-primary" />
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-extrabold text-lg tracking-tight">{car.make}</span>
                                                <span className="text-sm text-muted-foreground font-medium">{car.model}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-[10px] text-green-600 uppercase font-extrabold tracking-widest bg-green-50 w-fit px-2 py-1 rounded border border-green-100">
                                                <CheckCircle2 className="h-3 w-3" /> Ready
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-10 w-10 p-0 rounded-full hover:bg-muted border">
                                                        <MoreHorizontal className="h-5 w-5" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48 shadow-2xl border-2">
                                                    <DropdownMenuItem onClick={() => deleteCar(car.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer font-bold">
                                                        <Trash2 className="h-4 w-4 mr-2" /> Remove Vehicle
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-72 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4">
                                            <div className="bg-muted/30 p-6 rounded-full">
                                                <CarIcon className="h-12 w-12 text-muted-foreground/30" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xl font-bold text-muted-foreground">No vehicles found</p>
                                                <p className="text-sm text-muted-foreground/60">Add a car to start booking wash services.</p>
                                            </div>
                                            <Button variant="outline" className="mt-2" onClick={() => setIsAdding(true)}>
                                                Add Your First Car
                                            </Button>
                                        </div>
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
