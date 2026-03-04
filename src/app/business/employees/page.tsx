'use client';

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Employee } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle, Upload, Loader2, User, ShieldCheck, Trash2, RefreshCw, Camera, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

export default function EmployeeRegistryPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [businessId, setBusinessId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: biz } = await supabase
                .from('businesses')
                .select('id')
                .eq('owner_id', user.id)
                .maybeSingle();
            
            if (biz) {
                setBusinessId(biz.id);
                const { data } = await supabase
                    .from('employees')
                    .select('*')
                    .eq('business_id', biz.id)
                    .order('name', { ascending: true });
                setEmployees(data || []);
            }
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
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleAddEmployee = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!businessId || !imageFile || !phone) {
            toast({ variant: 'destructive', title: 'Incomplete', description: 'Photo and Phone are mandatory.' });
            return;
        }

        setSubmitting(true);
        try {
            const fileExt = imageFile.name.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const filePath = `employees/${businessId}/${fileName}`;
            
            const { error: uploadError } = await supabase.storage.from('business-assets').upload(filePath, imageFile);
            if (uploadError) throw uploadError;
            
            const { data: { publicUrl } } = supabase.storage.from('business-assets').getPublicUrl(filePath);

            const { error } = await supabase
                .from('employees')
                .insert({
                    business_id: businessId,
                    name: name.trim(),
                    phone: phone.trim(),
                    image_url: publicUrl
                });
            
            if (error) throw error;

            setName(''); setPhone(''); setImageFile(null); setImagePreview(null);
            setIsAddOpen(false);
            toast({ title: "Staff Registered" });
            fetchData();
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error", description: error.message });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto pb-12">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black uppercase italic tracking-tight text-primary">Detailer Registry</h1>
                    <p className="text-muted-foreground font-medium">Assign professional detailers to client wash requests.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => fetchData()} disabled={loading} className="rounded-full">
                        <RefreshCw className={loading ? "animate-spin h-4 w-4" : "h-4 w-4"} />
                    </Button>
                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button className="shadow-xl rounded-full px-6 h-12 font-black">
                                <PlusCircle className="mr-2 h-5 w-5" /> Register Professional
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-black uppercase italic">New Team Member</DialogTitle>
                                <DialogDescription>Mandatory photo and phone required for assignment eligibility.</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleAddEmployee} className="space-y-6 py-4">
                                <div className="flex flex-col items-center gap-4">
                                    <div 
                                        className="relative h-32 w-32 rounded-3xl overflow-hidden border-4 border-dashed bg-muted group cursor-pointer hover:border-primary transition-all shadow-inner"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        {imagePreview ? (
                                            <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                                        ) : (
                                            <div className="h-full w-full flex flex-col items-center justify-center gap-1 opacity-40">
                                                <Camera className="h-10 w-10" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Photo *</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />

                                <div className="space-y-2">
                                    <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Full Name</Label>
                                    <Input value={name} onChange={e => setName(e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Phone Number *</Label>
                                    <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="77123456" required />
                                </div>
                                <DialogFooter>
                                    <Button type="submit" className="w-full h-14 text-lg font-black shadow-xl" disabled={submitting}>
                                        {submitting ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <ShieldCheck className="mr-2 h-5 w-5" />}
                                        Complete Registration
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Card className="shadow-2xl border-muted/50 overflow-hidden rounded-2xl">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/30">
                            <TableHead className="pl-6 py-4 font-black text-xs uppercase tracking-widest">Detailer Profile</TableHead>
                            <TableHead className="font-black text-xs uppercase tracking-widest">Contact</TableHead>
                            <TableHead className="font-black text-xs uppercase tracking-widest">Status</TableHead>
                            <TableHead className="text-right pr-6 font-black text-xs uppercase tracking-widest">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {employees.map(employee => (
                            <TableRow key={employee.id} className="hover:bg-muted/10 transition-colors">
                                <TableCell className="pl-6 py-4">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-14 w-14 rounded-2xl border-2 border-background shadow-md">
                                            <AvatarImage src={employee.image_url} className="object-cover" />
                                            <AvatarFallback className="bg-primary/10 text-primary font-black"><User /></AvatarFallback>
                                        </Avatar>
                                        <span className="font-bold text-lg">{employee.name}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="font-medium text-primary">{employee.phone}</TableCell>
                                <TableCell>
                                    <Badge className="bg-green-100 text-green-800 border-green-200 font-black text-[10px]">READY FOR ASSIGNMENT</Badge>
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                    <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {employees.length === 0 && !loading && (
                            <TableRow>
                                <TableCell colSpan={4} className="h-64 text-center">
                                    <div className="flex flex-col items-center justify-center gap-4 opacity-40">
                                        <Users className="h-12 w-12" />
                                        <p className="font-black uppercase tracking-widest text-xs">No detailers registered yet.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}