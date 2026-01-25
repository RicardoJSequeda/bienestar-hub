import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, User, Mail, Smartphone, Hash, GraduationCap } from "lucide-react";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { Separator } from "@/components/ui/separator";

export default function Profile() {
    const { user, profile, refreshProfile } = useAuth();
    const [isSaving, setIsSaving] = useState(false);
    const [programs, setPrograms] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        full_name: "",
        phone: "",
        student_code: "",
        program_id: "",
        avatar_url: "",
    });

    useEffect(() => {
        if (profile) {
            setFormData({
                full_name: profile.full_name || "",
                phone: profile.phone || "",
                student_code: profile.student_code || "",
                program_id: profile.program_id || "",
                avatar_url: profile.avatar_url || "",
            });
        }
        fetchMetaData();
    }, [profile]);

    const fetchMetaData = async () => {
        const { data: progs } = await supabase
            .from("academic_programs")
            .select("id, name");

        if (progs) setPrograms(progs);
    };

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);

        const { error } = await supabase
            .from("profiles")
            .update({
                full_name: formData.full_name.trim(),
                phone: formData.phone.trim(),
                student_code: formData.student_code.trim(),
                program_id: formData.program_id || null,
                avatar_url: formData.avatar_url || null,
                updated_at: new Date().toISOString(),
            })
            .eq("user_id", user.id);

        if (error) {
            console.error("Error updating profile:", error);
            toast({ title: "Error", description: "No se pudo actualizar el perfil", variant: "destructive" });
        } else {
            toast({ title: "Éxito", description: "Perfil actualizado correctamente" });
            await refreshProfile();
        }
        setIsSaving(false);
    };

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Mi Perfil</h1>
                    <p className="text-muted-foreground">Gestiona tu información personal y académica</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Avatar Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Foto de Perfil</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ImageUpload
                                value={formData.avatar_url}
                                onChange={(url) => setFormData({ ...formData, avatar_url: url })}
                                bucket="profile-avatars"
                                label="Avatar"
                            />
                        </CardContent>
                    </Card>

                    {/* Info Section */}
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-lg">Información Personal</CardTitle>
                            <CardDescription>Estos datos son utilizados para tus préstamos y registros</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="full_name">Nombre Completo</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="full_name"
                                            className="pl-10"
                                            value={formData.full_name}
                                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Correo Electrónico</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            disabled
                                            className="pl-10 bg-muted"
                                            value={profile?.email || ""}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Número de Celular</Label>
                                    <div className="relative">
                                        <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="phone"
                                            className="pl-10"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            placeholder="Ej: 3001234567"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="code">Código Estudiantil / ID</Label>
                                    <div className="relative">
                                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="code"
                                            className="pl-10"
                                            value={formData.student_code}
                                            onChange={(e) => setFormData({ ...formData, student_code: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div className="max-w-md">
                                <div className="space-y-2">
                                    <Label>Programa Académico</Label>
                                    <div className="relative">
                                        <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                                        <select
                                            className="w-full h-10 pl-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            value={formData.program_id}
                                            onChange={(e) => setFormData({ ...formData, program_id: e.target.value })}
                                        >
                                            <option value="">Selecciona tu programa</option>
                                            {programs.map((p) => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="border-t pt-6 bg-muted/30">
                            <Button onClick={handleSave} disabled={isSaving} className="ml-auto">
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Guardar Cambios
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
