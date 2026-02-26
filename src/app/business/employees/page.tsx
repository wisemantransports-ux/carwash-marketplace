'use client';

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Employee } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, Upload, Loader2, User, Phone as PhoneIcon, ShieldCheck, Trash2, AlertCircle, RefreshCw } from "lucide-react";
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

            console.log("Registry: Current User UID:", user.id);

            // 1. Fetch Business Profile
            const { data: bizData, error: bizError } = await supabase
                .from('businesses')
                .select('id, name')
                .eq('owner_id', user.id)
                .maybeSingle();
            
            if (bizError) throw bizError;
            
            if (bizData) {
                setBusiness(bizData);
                console.log("Registry: Found Business ID (UUID):", bizData.id);
                
                // 2. Fetch Employees with Resilient Search
                // We check both the Business UUID and the User UID in case of manual data entry mismatch
                const { data: empData, error: empError } = await supabase
                    .from('employees')
                    .select('id, business_id, name, phone, image_url, id_reference')
                    .or(`business_id.eq.${bizData.id},business_id.eq.${user.id}`)
                    .order('name');
                
                if (empError) {
                    console.error("Registry: Employee Fetch Error:", empError);
                    throw empError;
                }
                
                console.log("Registry: Employees found:", empData?.length || 0, empData);
                setEmployees(empData || []);
            } else {
                console.warn("Registry: No business profile found. Staff can only be assigned to a business profile.");
            }
        } catch (error: any) {
            console.error("Registry: Load error detail:", error);
            toast({ 
                variant: 'destructive', 
                title: 'Load Error', 
                description: error.message || 'Could not load registry.' 
            });
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
                toast({ variant: 'destructive', title: 'File Too Large', description: 'Staff photo must be under 2MB.' });
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
            toast({ variant: 'destructive', title: 'Action Denied', description: 'Please set up your business profile first.' });
            return;
        }

        if (!name.trim() || !phone.trim() || !idReference.trim()) {
            toast({ variant: 'destructive', title: 'Missing Info', description: 'Full Name, Phone, and ID are required.' });
            return;
        }

        setSubmitting(true);
        try {
            let uploadedImageUrl = null;

            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `${business.id}/${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('business-assets')
                    .upload(`employees/${fileName}`, imageFile, {
                        cacheControl: '3600',
                        upsert: true
                    });
                
                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('business-assets')
                    .getPublicUrl(`employees/${fileName}`);
                
                uploadedImageUrl = publicUrl;
            }

            const { error: insertError } = await supabase
                .from('employees')
                .insert({
                    id: crypto.randomUUID(),
                    business_id: business.id, // Using Business UUID
                    name: name.trim(),
                    phone: phone.trim(),
                    id_reference: idReference.trim(),
                    image_url: uploadedImageUrl
                });
            
            if (insertError) {
                console.error("Employee Registration Error:", insertError);
                throw insertError;
            }

            setName('');
            setPhone('');
            setIdReference('');
            setImageFile(null);
            setImagePreview(null);
            setIsAddOpen(false);
            
            toast({ title: "Employee Registered", description: `${name} has been added successfully.` });
            await fetchData();
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: "Registration Failed",
                description: error.message || "Please check your database constraints.",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteEmployee = async (id: string, empName: string) => {
        try {
            const { error } = await supabase.from('employees').delete().eq('id', id);
            if (error) throw error;
            toast({ title: 'Employee Removed', description: `${empName} has been removed from the team.` });
            await fetchData();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Removal Failed', description: 'Could not remove staff member.' });
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary">Employee Registry</h1>
                    <p className="text-muted-foreground">Manage your verified team members and their identification.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => fetchData()} disabled={loading}>
                        <RefreshCw className={loading ? "animate-spin h-4 w-4" : "h-4 w-4"} />
                    </Button>
                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button className="shadow-lg">
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Employee
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Register New Staff</DialogTitle>
                                <DialogDescription>Omang/ID is mandatory for safety and insurance verification.</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleAddEmployee} className="space-y-4 py-4">
                                <div className="flex justify-center mb-4">
                                    <div className="relative h-24 w-24 rounded-full overflow-hidden border-2 bg-muted group cursor-pointer shadow-inner">
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
                                    <Label htmlFor="name">Full Name (as per ID)</Label>
                                    <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Enter full name" required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone Number</Label>
                                        <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+267 7XXXXXXX" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="idref">ID Number (Omang)</Label>
                                        <Input id="idref" value={idReference} onChange={e => setIdReference(e.target.value)} placeholder="Enter ID number" required />
                                    </div>
                                </div>
                                <DialogFooter className="pt-4">
                                    <Button type="submit" className="w-full h-12 text-lg" disabled={submitting}>
                                        {submitting ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <ShieldCheck className="mr-2 h-5 w-5" />}
                                        Complete Registration
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Card className="shadow-lg border-muted/50 overflow-hidden">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                <TableHead className="pl-6">Staff Member</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>ID Reference</TableHead>
                                <TableHead className="text-right pr-6">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({length: 3}).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="pl-6"><Skeleton className="h-10 w-40 rounded-full" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                        <TableCell className="text-right pr-6"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : employees.length > 0 ? (
                                employees.map(employee => (
                                    <TableRow key={employee.id} className="hover:bg-muted/10 transition-colors">
                                        <TableCell className="pl-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-10 w-10 border shadow-sm">
                                                    <AvatarImage src={employee.image_url} alt={employee.name} className="object-cover" />
                                                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                                        {employee.name?.charAt(0) || '?'}
                                                    </AvatarFallback>
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
                                        <TableCell className="font-mono text-[10px] font-bold text-primary bg-primary/5 w-fit px-2 py-1 rounded">
                                            {employee.id_reference}
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48 shadow-xl border-2">
                                                    <DropdownMenuItem onClick={() => handleDeleteEmployee(employee.id, employee.name)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                                        <Trash2 className="mr-2 h-4 w-4" /> Remove from Team
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-64 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center justify-center gap-4">
                                            <div className="p-4 bg-muted/20 rounded-full">
                                                <ShieldCheck className="h-12 w-12 opacity-10" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="font-bold text-lg">No staff registered yet</p>
                                                <p className="text-sm">Verified employees linked to your account will appear here.</p>
                                            </div>
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
