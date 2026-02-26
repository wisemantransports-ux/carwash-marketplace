'use client';

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Employee, Business } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, Upload, Loader2, User, Phone as PhoneIcon, ShieldCheck, Trash2, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import Image from "next/image";

export default function EmployeeRegistryPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [business, setBusiness] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [idReference, setIdReference] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch Business
            const { data: bizData, error: bizError } = await supabase
                .from('businesses')
                .select('id, name')
                .eq('owner_id', user.id)
                .maybeSingle();
            
            if (bizError) throw bizError;
            
            if (bizData) {
                setBusiness(bizData);
                
                // 2. Fetch Employees
                const { data: empData, error: empError } = await supabase
                    .from('employees')
                    .select('*')
                    .eq('business_id', bizData.id)
                    .order('name');
                
                if (empError) throw empError;
                setEmployees(empData || []);
            }
        } catch (error: any) {
            console.error("Employee fetch error:", error);
            toast({ variant: 'destructive', title: 'Load Error', description: 'Could not load staff registry.' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 2 * 1024 * 1024) {
                toast({ variant: 'destructive', title: 'File Too Large', description: 'Photo must be under 2MB.' });
                return;
            }
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleAddEmployee = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!business) {
            toast({ variant: 'destructive', title: 'Error', description: 'Business profile not found.' });
            return;
        }

        // Validation
        if (!name.trim() || !phone.trim() || !idReference.trim()) {
            toast({ variant: 'destructive', title: 'Validation Error', description: 'Name, phone, and Omang/ID are required.' });
            return;
        }

        setSubmitting(true);
        try {
            let image_url = null;

            // 1. Upload Photo if present
            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `${business.id}/${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('business-assets')
                    .upload(`employees/${fileName}`, imageFile);
                
                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('business-assets')
                    .getPublicUrl(`employees/${fileName}`);
                
                image_url = publicUrl;
            }

            // 2. Insert into database
            const { error: insertError } = await supabase
                .from('employees')
                .insert({
                    id: crypto.randomUUID(), // Generate UUID as requested
                    business_id: business.id,
                    name,
                    phone,
                    id_reference: idReference,
                    image_url: image_url
                });
            
            if (insertError) throw insertError;

            toast({
                title: "Employee Registered",
                description: `${name} has been added to your team.`,
            });
            
            // 3. Reset form and refresh
            setName('');
            setPhone('');
            setIdReference('');
            setImageFile(null);
            setImagePreview(null);
            setIsAddOpen(false);
            await fetchData();
        } catch (error: any) {
            console.error("Employee insertion error detail:", {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
            });
            toast({
                variant: 'destructive',
                title: "Registration Failed",
                description: error.message || "An error occurred while creating the employee profile.",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteEmployee = async (id: string) => {
        try {
            const { error } = await supabase
                .from('employees')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            setEmployees(prev => prev.filter(e => e.id !== id));
            toast({ title: 'Employee Removed', description: 'The employee has been removed from your team.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary">Employee Registry</h1>
                    <p className="text-muted-foreground">Manage your verified team members for mobile detailing.</p>
                </div>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button className="shadow-lg">
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Employee
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Register New Staff</DialogTitle>
                            <DialogDescription>
                                Enter legal details for your verified team member. 
                                Omang/ID is required for mobile security.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAddEmployee} className="space-y-4 py-4">
                            <div className="flex justify-center mb-4">
                                <div className="relative h-24 w-24 rounded-full overflow-hidden border-2 bg-muted group">
                                    {imagePreview ? (
                                        <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center">
                                            <User className="h-10 w-10 text-muted-foreground opacity-40" />
                                        </div>
                                    )}
                                    <button 
                                        type="button"
                                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Upload className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />

                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name (as per Omang/ID)</Label>
                                <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Enter full name" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number</Label>
                                <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+267 7X XXX XXX" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="idref">ID Number (Omang)</Label>
                                <Input id="idref" value={idReference} onChange={e => setIdReference(e.target.value)} placeholder="Enter ID number" required />
                            </div>
                            <DialogFooter className="pt-4">
                                <Button type="submit" className="w-full h-12" disabled={submitting}>
                                    {submitting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                                    Register Employee
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
                            <TableRow className="bg-muted/30">
                                <TableHead>Staff Member</TableHead>
                                <TableHead>Phone Number</TableHead>
                                <TableHead>Omang/ID</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({length: 3}).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Skeleton className="h-10 w-10 rounded-full" />
                                                <Skeleton className="h-5 w-32" />
                                            </div>
                                        </TableCell>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : employees.length > 0 ? (
                                employees.map(employee => (
                                    <TableRow key={employee.id} className="hover:bg-muted/10 transition-colors">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="border">
                                                    <AvatarImage src={employee.image_url} alt={employee.name} />
                                                    <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                                                </Avatar>
                                                <span className="font-bold">{employee.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm font-medium">
                                            <div className="flex items-center gap-2">
                                                <PhoneIcon className="h-3 w-3 text-muted-foreground" />
                                                {employee.phone}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs font-bold text-primary bg-primary/5 w-fit px-2 py-1 rounded">
                                            {employee.id_reference}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48 shadow-xl border-2">
                                                    <DropdownMenuItem onClick={() => handleDeleteEmployee(employee.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                                        <Trash2 className="mr-2 h-4 w-4" /> Remove from Team
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-48 text-center text-muted-foreground italic">
                                        <div className="flex flex-col items-center gap-2">
                                            <ShieldCheck className="h-12 w-12 opacity-10 mb-2" />
                                            No verified employees found in your registry.
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
