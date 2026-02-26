
'use client';
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Car } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, Loader2, Car as CarIcon, Trash2 } from "lucide-react";
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

    // Form state
    const [make, setMake] = useState('');
    const [model, setModel] = useState('');
    const [year, setYear] = useState('');
    const [plate, setPlate] = useState('');

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
            
            // Year is a number in DB, ensure we pass null if empty to avoid NaN errors
            const yearVal = year.trim() ? parseInt(year) : null;
            const plateVal = plate.trim() || null;

            const { error } = await supabase.from('cars').insert({
                owner_id: session?.user.id,
                make: make.trim(),
                model: model.trim(),
                year: yearVal,
                plate_number: plateVal
            });
            if (error) throw error;
            toast({ title: 'Car Registered', description: `${make} ${model} added to your profile.` });
            setIsAdding(false);
            setMake(''); setModel(''); setYear(''); setPlate('');
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
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold">My Cars</h1>
                    <p className="text-muted-foreground">Manage your vehicles for easy booking.</p>
                </div>
                <Dialog open={isAdding} onOpenChange={setIsAdding}>
                    <DialogTrigger asChild>
                        <Button className="shadow-md">
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Car
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Register New Vehicle</DialogTitle>
                            <DialogDescription>Enter your car details. Only Make and Model are required.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAddCar} className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="make">Make *</Label>
                                    <Input id="make" value={make} onChange={e => setMake(e.target.value)} placeholder="e.g. Toyota" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="model">Model *</Label>
                                    <Input id="model" value={model} onChange={e => setModel(e.target.value)} placeholder="e.g. Hilux" required />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="year">Year (Optional)</Label>
                                    <Input id="year" type="number" value={year} onChange={e => setYear(e.target.value)} placeholder="2023" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="plate">License Plate (Optional)</Label>
                                    <Input id="plate" value={plate} onChange={e => setPlate(e.target.value)} placeholder="B 123 ABC" />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" className="w-full" disabled={submitting}>
                                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Save Vehicle
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
            
            <Card className="shadow-lg border-muted/50 overflow-hidden">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/10">
                                <TableHead className="w-12"></TableHead>
                                <TableHead>Vehicle</TableHead>
                                <TableHead>License Plate</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({length: 2}).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : cars.length > 0 ? (
                                cars.map(car => (
                                    <TableRow key={car.id} className="hover:bg-muted/5 transition-colors">
                                        <TableCell>
                                            <div className="bg-muted p-2 rounded-full">
                                                <CarIcon className="h-4 w-4 text-primary" />
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-semibold text-sm">
                                            {car.year ? `${car.year} ` : ''}{car.make} {car.model}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs font-bold text-muted-foreground">{car.licensePlate || (car as any).plate_number || 'N/A'}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => deleteCar(car.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-48 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <CarIcon className="h-8 w-8 text-muted-foreground opacity-20" />
                                            <p className="text-muted-foreground font-medium italic">No vehicles registered to your profile yet.</p>
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
