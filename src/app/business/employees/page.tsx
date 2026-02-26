'use client';

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { Employee } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, Upload, Loader2, User, Phone as PhoneIcon, ShieldCheck, Trash2, AlertCircle, RefreshCw, AlertTriangle } from "lucide-react";
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
        if (!isSupabaseConfigured) {
            setFetchError("Unable to connect to Supabase. Please check environment variables.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setFetchError(null);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }

            // Diagnostic Log for Checklist #2 & #3
            console.log(`[${new Date().toISOString()}] Checklist Check: Fetching staff for business_id: ${user.id}`);

            // Fetch directly aligned with RLS: USING (business_id = auth.uid())
            const { data: empData, error: empError } = await supabase
                .from('employees')
                .select('*')
                .eq('business_id', user.id)
                .order('name');
            
            if (empError) throw empError;
            
            // Checklist #6: Handle empty list
            setEmployees(empData || []);
        } catch (error: any) {
            console.error(`[${new Date().toISOString()}] Checklist Error - Fetch Failure:`, {
                message: error.message,
                code: error.code,
                details: error.details,
                timestamp: new Date().toISOString()
            });
            setFetchError("Unable to fetch employees. Please check database connection or RLS policies.");
            toast({ 
                variant: 'destructive', 
                title: 'Database Alert', 
                description: 'We had trouble reaching your staff list.' 
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
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            toast({ variant: 'destructive', title: 'Action Denied', description: 'Session expired.' });
            return;
        }

        if (!name.trim() || !phone.trim() || !idReference.trim()) {
            toast({ variant: 'destructive', title: 'Missing Info', description: 'Name, Phone, and ID are required.' });
            return;
        }

        setSubmitting(true);
        const tempId = crypto.randomUUID();
        
        // Checklist #4: Optimistic Update - Show entry immediately
        const tempEmployee: Employee = {
            id: tempId,
            business_id: user.id,
            name: name.trim(),
            phone: phone.trim(),
            id_reference: idReference.trim(),
            image_url: imagePreview || ''
        };
        
        setEmployees(prev => [tempEmployee, ...prev]);

        try {
            let uploadedImageUrl = null;

            // Checklist #5: Upload to business-assets/employees/{user.id}/
            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('business-assets')
                    .upload(`employees/${user.id}/${fileName}`, imageFile, {
                        cacheControl: '3600',
                        upsert: true
                    });
                
                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('business-assets')
                    .getPublicUrl(`employees/${user.id}/${fileName}`);
                
                uploadedImageUrl = publicUrl;
            }

            // Checklist #3 & #4: Insert row with business_id = user.id
            const { error: insertError } = await supabase
                .from('employees')
                .insert({
                    id: tempId,
                    business_id: user.id,
                    name: name.trim(),
                    phone: phone.trim(),
                    id_reference: idReference.trim(),
                    image_url: uploadedImageUrl
                });
            
            if (insertError) throw insertError;

            // Reset form and close
            setName(''); setPhone(''); setIdReference('');
            setImageFile(null); setImagePreview(null);
            setIsAddOpen(false);
            
            toast({ title: "Employee Registered", description: "The record is now permanently stored." });
            
            // Checklist #4: Re-fetch to sync
            await fetchData();
        } catch (error: any) {
            console.error(`[${new Date().toISOString()}] Checklist Error - Insertion Failed:`, error);
            // Re-fetch to clear optimistic state if insert failed
            await fetchData();
            toast({
                variant: 'destructive',
                title: "Registration Error",
                description: error.message || "Could not save to database. Check RLS policies.",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteEmployee = async (id: string) => {
        const original = [...employees];
        setEmployees(prev => prev.filter(e => e.id !== id));
        
        try {
            const { error } = await supabase.from('employees').delete().eq('id', id);
            if (error) throw error;
            toast({ title: 'Employee Removed' });
        } catch (error: any) {
            setEmployees(original);
            toast({ variant: 'destructive', title: 'Removal Failed', description: 'Could not delete from database.' });
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

            {/* Checklist #1 & #6: Supabase Connection Alerts */}
            {!isSupabaseConfigured && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Configuration Error</AlertTitle>
                    <AlertDescription>
                        Unable to connect to Supabase. Please check environment variables (URL/Anon Key).
                    </AlertDescription>
                </Alert>
            )}

            {fetchError && isSupabaseConfigured && (
                <Card className="bg-destructive/5 border-destructive/20">
                    <CardContent className="flex items-center gap-4 py-4">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        <div className="flex-1">
                            <p className="text-sm font-bold text-destructive">Database Connection Alert</p>
                            <p className="text-xs text-destructive/80">{fetchError}</p>
                        </div>
                        <Button variant="outline" size="sm" className="h-8" onClick={fetchData}>Retry Sync</Button>
                    </CardContent>
                </Card>
            )}

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
                            {loading && employees.length === 0 ? (
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
                                                <div className="flex flex-col">
                                                    <span className="font-bold">{employee.name}</span>
                                                    {/* Optimistic State Hint */}
                                                    {employee.id.includes('-') && employee.id.length > 20 && (
                                                        <span className="text-[8px] text-primary/60 font-mono italic">Syncing...</span>
                                                    )}
                                                </div>
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
                                    <TableCell colSpan={4} className="h-64 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center justify-center gap-4">
                                            <div className="p-4 bg-muted/20 rounded-full">
                                                <ShieldCheck className="h-12 w-12 opacity-10" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="font-bold text-lg">No employees registered yet.</p>
                                                <p className="text-sm">Employees linked to your account will appear here.</p>
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
