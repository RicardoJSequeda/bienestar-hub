import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, Loader2, Shield, Sparkles, BookOpen, Users } from "lucide-react";

export default function Auth() {
  const { user, isLoading, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form state
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerFullName, setRegisterFullName] = useState("");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-muted" />
            <div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { error } = await signIn(loginEmail, loginPassword);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error al iniciar sesión",
        description: error.message,
      });
    }

    setIsSubmitting(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!registerEmail.includes("@")) {
      toast({
        variant: "destructive",
        title: "Email inválido",
        description: "Por favor ingresa un email institucional válido.",
      });
      setIsSubmitting(false);
      return;
    }

    const { error } = await signUp(registerEmail, registerPassword, registerFullName);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error al registrarse",
        description: error.message,
      });
    } else {
      toast({
        title: "¡Registro exitoso!",
        description: "Tu cuenta ha sido creada. Ya puedes iniciar sesión.",
      });
    }

    setIsSubmitting(false);
  };

  const features = [
    { icon: BookOpen, text: "Préstamo de recursos" },
    { icon: Sparkles, text: "Horas de bienestar" },
    { icon: Users, text: "Eventos universitarios" },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary to-primary-dark relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-accent blur-3xl" />
        </div>
        
        <div className="relative z-10 flex flex-col justify-center px-12 lg:px-16">
          {/* Logo */}
          <div className="flex items-center gap-4 mb-12">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Bienestar</h1>
              <p className="text-white/70 text-sm">Universitario</p>
            </div>
          </div>

          {/* Main heading */}
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
            Tu bienestar,<br />
            <span className="text-accent">nuestra prioridad</span>
          </h2>
          
          <p className="text-lg text-white/80 mb-10 max-w-md">
            Accede a recursos, eventos y actividades diseñadas para tu desarrollo integral como estudiante.
          </p>

          {/* Features */}
          <div className="space-y-4">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="flex items-center gap-3 text-white/90"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
                  <feature.icon className="h-5 w-5" />
                </div>
                <span className="font-medium">{feature.text}</span>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="flex gap-8 mt-12 pt-8 border-t border-white/20">
            <div>
              <p className="text-3xl font-bold text-white">500+</p>
              <p className="text-sm text-white/60">Estudiantes activos</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">50+</p>
              <p className="text-sm text-white/60">Recursos disponibles</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">100+</p>
              <p className="text-sm text-white/60">Eventos al año</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Forms */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4">
              <GraduationCap className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">Bienestar Universitario</h1>
            <p className="text-muted-foreground mt-1">Sistema de Gestión</p>
          </div>

          <Card className="border-0 shadow-xl">
            <Tabs defaultValue="login" className="w-full">
              <CardHeader className="pb-4">
                <TabsList className="grid w-full grid-cols-2 h-12">
                  <TabsTrigger value="login" className="text-sm font-medium">
                    Iniciar Sesión
                  </TabsTrigger>
                  <TabsTrigger value="register" className="text-sm font-medium">
                    Registrarse
                  </TabsTrigger>
                </TabsList>
              </CardHeader>

              <CardContent className="pt-2">
                <TabsContent value="login" className="mt-0 space-y-6">
                  <div className="space-y-2">
                    <CardTitle className="text-xl">Bienvenido de vuelta</CardTitle>
                    <CardDescription>
                      Ingresa tus credenciales para acceder al sistema
                    </CardDescription>
                  </div>
                  
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email institucional</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="correo@universidad.edu"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="h-11"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Contraseña</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="h-11"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full h-11 font-medium" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Ingresando...
                        </>
                      ) : (
                        <>
                          <Shield className="mr-2 h-4 w-4" />
                          Iniciar Sesión
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register" className="mt-0 space-y-6">
                  <div className="space-y-2">
                    <CardTitle className="text-xl">Crear cuenta</CardTitle>
                    <CardDescription>
                      Registra tu cuenta con tu email institucional
                    </CardDescription>
                  </div>
                  
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-name">Nombre completo</Label>
                      <Input
                        id="register-name"
                        type="text"
                        placeholder="Juan Pérez"
                        value={registerFullName}
                        onChange={(e) => setRegisterFullName(e.target.value)}
                        className="h-11"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-email">Email institucional</Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="correo@universidad.edu"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        className="h-11"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password">Contraseña</Label>
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="Mínimo 6 caracteres"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        className="h-11"
                        minLength={6}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full h-11 font-medium" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Registrando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Crear Cuenta
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Sistema de Bienestar Universitario © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}