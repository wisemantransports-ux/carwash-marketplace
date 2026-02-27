'use client';

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Employee } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, Upload, Loader2, User, Phone as PhoneIcon, ShieldCheck, Trash2, AlertCircle, RefreshCw, Info, Image as ImageIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Image from "next/image";

export default function EmployeeRegistryPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [businessId, setBusinessId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    // Form state
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [idReference, setIdReference] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setFetchError(null);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setFetchError("Session expired. Please log in again.");
                return;
            }

            const { data: biz, error: bizError } = await supabase
                .from('businesses')
                .select('id, name')
                .eq('owner_id', user.id)
                .maybeSingle();
            
            if (bizError) throw bizError;
            
            if (!biz) {
                setFetchError("Business profile not found. Please complete your profile setup.");
                return;
            }

            setBusinessId(biz.id);

            const { data, error } = await supabase
                .from('employees')
                .select('*')
                .eq('business_id', biz.id)
                .order('name', { ascending: true });
            
            if (error) throw error;
            setEmployees(data || []);

        } catch (error: any) {
            console.error(`[STAFF DEBUG] Fatal Registry Error:`, error);
            setFetchError(error.message || "Unable to load the staff registry.");
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
        if (!businessId) return;

        // Validation
        if (!name.trim() || !phone.trim() || !idReference.trim()) {
            toast({ variant: 'destructive', title: 'Missing Info', description: 'Name, Phone, and ID are required.' });
            return;
        }

        const phoneRegex = /^[0-9+ \-()]{7,20}$/;
        if (!phoneRegex.test(phone.trim())) {
            toast({ variant: 'destructive', title: 'Invalid Phone', description: 'Please enter a valid phone number.' });
            return;
        }

        setSubmitting(true);
        try {
            let uploadedImageUrl = null;

            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `${Date.now()}.${fileExt}`;
                const filePath = `employees/${businessId}/${fileName}`;
                const { error: uploadError } = await supabase.storage.from('business-assets').upload(filePath, imageFile);
                if (uploadError) throw uploadError;
                
                const { data: { publicUrl } } = supabase.storage.from('business-assets').getPublicUrl(filePath);
                uploadedImageUrl = publicUrl;
            }

            const { error: insertError } = await supabase
                .from('employees')
                .insert({
                    business_id: businessId,
                    name: name.trim(),
                    phone: phone.trim(),
                    id_reference: idReference.trim(),
                    image_url: uploadedImageUrl
                });
            
            if (insertError) throw insertError;

            // Clear form and reload
            setName(''); setPhone(''); setIdReference('');
            setImageFile(null); setImagePreview(null);
            setIsAddOpen(false);
            toast({ title: "Staff Registered", description: `${name} has been added to your team.` });
            await fetchData();
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Registration Failed", description: error.message });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteEmployee = async (id: string) => {
        try {
            const { error } = await supabase.from('employees').delete().eq('id', id);
            if (error) throw error;
            toast({ title: 'Employee Removed' });
            setEmployees(prev => prev.filter(e => e.id !== id));
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Removal Failed', description: error.message });
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto pb-12">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-extrabold tracking-tight text-primary">Team Management</h1>
                    <p className="text-muted-foreground">Manage your professional detailers and their verified identity details.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => fetchData()} disabled={loading} className="rounded-full">
                        <RefreshCw className={loading ? "animate-spin h-4 w-4" : "h-4 w-4"} />
                    </Button>
                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button className="shadow-xl rounded-full px-6">
                                <PlusCircle className="mr-2 h-5 w-5" /> Register New Detailer
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>New Team Member</DialogTitle>
                                <DialogDescription>Register a detailer. Omang/ID and Phone are required.</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleAddEmployee} className="space-y-4 py-4">
                                <div className="flex justify-center">
                                    <div 
                                        className="relative h-24 w-24 rounded-full overflow-hidden border-2 bg-muted group cursor-pointer"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        {imagePreview ? (
                                            <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center">
                                                <User className="h-10 w-10 text-muted-foreground opacity-40" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                            <Upload className="h-5 w-5" />
                                        </div>
                                    </div>
                                </div>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />

                                <div className="space-y-2">
                                    <Label htmlFor="name">Full Name (per ID) *</Label>
                                    <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Full legal name" required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone Number *</Label>
                                        <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="77123456" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="idref">Omang / ID *</Label>
                                        <Input id="idref" value={idReference} onChange={e => setIdReference(e.target.value)} placeholder="ID number" required />
                                    </div>
                                </div>
                                <DialogFooter className="pt-4">
                                    <Button type="submit" className="w-full h-12 shadow-lg" disabled={submitting}>
                                        {submitting ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <ShieldCheck className="mr-2 h-5 w-5" />}
                                        Complete Registration
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {fetchError && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Registry Error</AlertTitle>
                    <AlertDescription className="flex flex-col gap-2">
                        <p>{fetchError}</p>
                        <Button variant="outline" size="sm" onClick={fetchData} className="w-fit">Try Again</Button>
                    </AlertDescription>
                </Alert>
            )}

            <Card className="shadow-2xl border-muted/50 overflow-hidden rounded-2xl">
                <CardHeader className="bg-muted/10 border-b">
                    <CardTitle className="text-lg">Staff Registry</CardTitle>
                    <CardDescription>Verified employees available for booking assignments.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                <TableHead className="pl-6 py-4 font-bold">Detailer</TableHead>
                                <TableHead className="font-bold">Contact</TableHead>
                                <TableHead className="font-bold">ID Reference</TableHead>
                                <TableHead className="text-right pr-6 font-bold">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({length: 3}).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="pl-6 py-4"><Skeleton className="h-10 w-40 rounded-full" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                        <TableCell className="text-right pr-6"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : employees.length > 0 ? (
                                employees.map(employee => (
                                    <TableRow key={employee.id} className="hover:bg-muted/10 transition-colors group">
                                        <TableCell className="pl-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-12 w-12 border-2 border-background shadow-md">
                                                    <AvatarImage src={employee.image_url} alt={employee.name} className="object-cover" />
                                                    <AvatarFallback className="bg-primary/10 text-primary font-black uppercase">
                                                        {employee.name?.charAt(0) || '?'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="font-extrabold text-base tracking-tight">{employee.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-sm font-medium">
                                                <div className="bg-muted p-1.5 rounded-lg"><PhoneIcon className="h-3.5 w-3.5 text-primary" /></div>
                                                {employee.phone}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <code className="text-[10px] font-black bg-primary/5 text-primary px-2 py-1 rounded border border-primary/10">
                                                {employee.id_reference}
                                            </code>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-10 w-10 p-0 rounded-full hover:bg-muted border"><MoreHorizontal className="h-5 w-5" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-56 shadow-2xl border-2">
                                                    <DropdownMenuItem onClick={() => handleDeleteEmployee(employee.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10 font-bold">
                                                        <Trash2 className="mr-2 h-4 w-4" /> Remove from Team
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-72 text-center text-muted-foreground italic">
                                        <div className="flex flex-col items-center justify-center gap-4">
                                            <div className="bg-muted/30 p-8 rounded-full border-2 border-dashed">
                                                <User className="h-12 w-12 opacity-10" />
                                            </div>
                                            <p className="text-lg font-bold">No staff members found.</p>
                                            <p className="text-sm opacity-60">Register your first detailer to start accepting bookings.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="flex items-center justify-center gap-2 p-4 bg-muted/20 border-2 border-dashed rounded-xl opacity-50">
                <Info className="h-4 w-4" />
                <span className="text-[10px] font-mono tracking-tighter uppercase font-black">
                    Connected Business ID: {businessId || 'Not Resolved'}
                </span>
            </div>
        </div>
    );
}
