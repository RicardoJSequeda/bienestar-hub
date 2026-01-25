import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/servicios/cliente";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { toast } from "@/ganchos/usar-toast";
import { Loader2, GraduationCap, Lock, CheckCircle } from "lucide-react";

export default function SetPassword() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isValidToken, setIsValidToken] = useState(false);
    const [isCheckingToken, setIsCheckingToken] = useState(true);

    useEffect(() => {
        // Verificar si hay un token válido en la URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get("access_token");
        const type = hashParams.get("type");

        if (type === "recovery" && accessToken) {
            setIsValidToken(true);
        } else {
            toast({
                variant: "destructive",
                title: "Enlace inválido",
                description: "Este enlace no es válido o ha expirado.",
            });
        }
        setIsCheckingToken(false);
    }, []);

    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Validaciones
        if (password.length < 8) {
            toast({
                variant: "destructive",
                title: "Contraseña muy corta",
                description: "La contraseña debe tener al menos 8 caracteres.",
            });
            setIsSubmitting(false);
            return;
        }

        if (password !== confirmPassword) {
            toast({
                variant: "destructive",
                title: "Contraseñas no coinciden",
                description: "Por favor verifica que las contraseñas sean iguales.",
            });
            setIsSubmitting(false);
            return;
        }

        const { error } = await supabase.auth.updateUser({
            password: password,
        });

        if (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message,
            });
        } else {
            toast({
                title: "¡Contraseña establecida!",
                description: "Tu cuenta está lista. Ahora puedes iniciar sesión.",
            });

            // Cerrar sesión y redirigir a login
            await supabase.auth.signOut();
            setTimeout(() => {
                navigate("/auth");
            }, 2000);
        }
        setIsSubmitting(false);
    };

    if (isCheckingToken) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!isValidToken) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Card className="max-w-md">
                    <CardContent className="pt-6 text-center">
                        <p className="text-muted-foreground">
                            Enlace inválido o expirado. Por favor solicita un nuevo enlace.
                        </p>
                        <Button onClick={() => navigate("/auth")} className="mt-4">
                            Volver al inicio
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-6">
            <Card className="w-full max-w-md shadow-xl">
                <CardHeader className="space-y-1 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
                            <GraduationCap className="h-8 w-8 text-primary-foreground" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl">Establece tu contraseña</CardTitle>
                    <CardDescription>
                        Crea una contraseña segura para acceder a tu cuenta
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSetPassword} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">Nueva contraseña</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="Mínimo 8 caracteres"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-10 h-11"
                                    minLength={8}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirm-password">Confirmar contraseña</Label>
                            <div className="relative">
                                <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="confirm-password"
                                    type="password"
                                    placeholder="Confirma tu contraseña"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="pl-10 h-11"
                                    minLength={8}
                                    required
                                />
                            </div>
                        </div>

                        <Button type="submit" className="w-full h-11 font-medium" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Estableciendo...
                                </>
                            ) : (
                                "Establecer contraseña"
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
