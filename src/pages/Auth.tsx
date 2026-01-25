import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, Loader2, Shield, Sparkles, BookOpen, Users, Phone, Hash, Landmark, School, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function Auth() {
  const { user, isLoading, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [view, setView] = useState<"login" | "register">("login");

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Forgot Password State
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [isRecovering, setIsRecovering] = useState(false);

  // Register form state
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerFullName, setRegisterFullName] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerStudentCode, setRegisterStudentCode] = useState("");
  const [registerProgramId, setRegisterProgramId] = useState("");

  const [programs, setPrograms] = useState<any[]>([]);

  useEffect(() => {
    async function fetchMetadata() {
      const { data: programData, error: programError } = await supabase.from("academic_programs" as any).select("*");
      if (programError) console.error("Error cargando programas:", programError);
      if (programData) setPrograms(programData);
    }
    fetchMetadata();
  }, []);

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
        title: "Error de autenticación",
        description: "Credenciales inválidas. Por favor verifique su correo y contraseña.",
      });
    }

    setIsSubmitting(false);
  };

  const handleRecoverPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail) return;
    setIsRecovering(true);

    const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail, {
      redirectTo: `${window.location.origin}/set-password`,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } else {
      toast({
        title: "Correo enviado",
        description: "Revisa tu bandeja de entrada para restablecer tu contraseña.",
      });
      setIsForgotPasswordOpen(false);
      setRecoveryEmail("");
    }
    setIsRecovering(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validaciones completas
    // 1. Email institucional
    const INSTITUTIONAL_DOMAIN = '@ucc.edu.co'; // Ajustar según necesidad
    const SECONDARY_DOMAIN = '@campusucc.edu.co'; // Ejemplo

    const email = registerEmail.toLowerCase();
    if (!email.includes("@")) {
      toast({ variant: "destructive", title: "Email inválido", description: "Por favor ingresa un email válido." });
      setIsSubmitting(false);
      return;
    }

    // 2. Nombre completo
    if (registerFullName.trim().length < 3) {
      toast({ variant: "destructive", title: "Nombre inválido", description: "Ingresa tu nombre completo." });
      setIsSubmitting(false);
      return;
    }

    // 3. Teléfono
    if (registerPhone.length < 10) {
      toast({ variant: "destructive", title: "Celular inválido", description: "El celular debe tener al menos 10 dígitos." });
      setIsSubmitting(false);
      return;
    }

    // 4. Código estudiantil
    const codeRegex = /^\d{4,10}$/; // Adjusted to be more flexible usually, or strict 6
    if (!codeRegex.test(registerStudentCode)) {
      toast({
        variant: "destructive",
        title: "Código inválido",
        description: "El código estudiantil debe ser numérico.",
      });
      setIsSubmitting(false);
      return;
    }

    // 5. Verificar código único
    const { data: existingCode } = await supabase
      .from("profiles")
      .select("student_code")
      .eq("student_code", registerStudentCode)
      .maybeSingle();

    if (existingCode) {
      toast({
        variant: "destructive",
        title: "Código duplicado",
        description: "Este código estudiantil ya está registrado. Contacta soporte si es un error.",
      });
      setIsSubmitting(false);
      return;
    }

    // 6. Programa académico
    if (!registerProgramId) {
      toast({ variant: "destructive", title: "Programa requerido", description: "Por favor selecciona tu programa académico." });
      setIsSubmitting(false);
      return;
    }

    // 7. Contraseña fuerte
    if (registerPassword.length < 8) {
      toast({
        variant: "destructive",
        title: "Contraseña débil",
        description: "La contraseña debe tener al menos 8 caracteres.",
      });
      setIsSubmitting(false);
      return;
    }

    const { error } = await signUp({
      email: registerEmail,
      password: registerPassword,
      fullName: registerFullName,
      studentCode: registerStudentCode,
      phone: registerPhone,
      programId: registerProgramId,
      campusId: "", // Optional or handled if select is added
    });

    if (error) {
      // Manejar errores específicos
      if (error.message?.includes("already registered") || error.message?.includes("User already registered")) {
        toast({
          variant: "destructive",
          title: "Email ya registrado",
          description: "Esta cuenta ya existe. ¿Deseas iniciar sesión?",
        });
        setLoginEmail(registerEmail);
        setView("login");
      } else {
        toast({
          variant: "destructive",
          title: "Error al registrarse",
          description: error.message,
        });
      }
    } else {
      toast({
        title: "¡Solicitud enviada!",
        description: "Tu cuenta ha sido creada. Por favor verifica tu correo electrónico si es requerido o inicia sesión.",
      });

      setLoginEmail(registerEmail);
      setView("login");
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

          {view === "login" ? (
            <Card className="border-0 shadow-xl">
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold">Iniciar Sesión</CardTitle>
                <CardDescription>
                  Ingresa tus credenciales institucionales
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email institucional</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="nombre@ucc.edu.co"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="h-11"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Contraseña</Label>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="h-11 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => setIsForgotPasswordOpen(true)}
                        className="text-sm font-medium text-primary hover:underline text-right"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-11 font-medium" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Iniciando sesión...
                      </>
                    ) : (
                      "Acceder"
                    )}
                  </Button>
                </form>
              </CardContent>
              <CardFooter className="flex flex-col gap-4 border-t pt-6 bg-muted/20">
                <div className="text-center text-sm text-muted-foreground">
                  ¿No tienes cuenta?{" "}
                  <button onClick={() => setView("register")} className="font-semibold text-primary hover:underline">
                    Solicita acceso aquí
                  </button>
                </div>
                <p className="text-xs text-center text-muted-foreground/60">
                  Uso exclusivo para la comunidad universitaria. Tus datos están protegidos.
                </p>
              </CardFooter>
            </Card>
          ) : (
            <Card className="border-0 shadow-xl animate-fade-in">
              <CardHeader className="space-y-1">
                <Button
                  variant="ghost"
                  className="w-fit p-0 h-auto mb-2 text-muted-foreground hover:text-foreground"
                  onClick={() => setView("login")}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" /> Volver al login
                </Button>
                <CardTitle className="text-2xl font-bold">Solicitar Acceso</CardTitle>
                <CardDescription>
                  Completa tus datos para registrarte en el sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <Label htmlFor="register-code">Código estudiantil</Label>
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="register-code"
                          type="text"
                          placeholder="20241000"
                          value={registerStudentCode}
                          onChange={(e) => setRegisterStudentCode(e.target.value)}
                          className="h-11 pl-10"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-email">Email institucional</Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="nombre@ucc.edu.co"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        className="h-11"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-phone">Celular</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="register-phone"
                          type="tel"
                          placeholder="3001234567"
                          value={registerPhone}
                          onChange={(e) => setRegisterPhone(e.target.value)}
                          className="h-11 pl-10"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Programa Académico</Label>
                    <Select value={registerProgramId} onValueChange={setRegisterProgramId}>
                      <SelectTrigger className="h-11">
                        <div className="flex items-center">
                          <School className="mr-2 h-4 w-4 text-muted-foreground" />
                          <SelectValue placeholder="Selecciona programa" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {programs.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password">Contraseña</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="Mínimo 8 caracteres"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      className="h-11"
                      minLength={8}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full h-11 font-medium mt-2" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Registrando...
                      </>
                    ) : (
                      "Registrarme"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          <p className="text-center text-sm text-muted-foreground mt-8">
            Sistema de Bienestar Universitario © {new Date().getFullYear()}
          </p>
        </div>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={isForgotPasswordOpen} onOpenChange={setIsForgotPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recuperar contraseña</DialogTitle>
            <DialogDescription>
              Ingresa tu correo institucional y te enviaremos un enlace para restablecer tu contraseña.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="recovery-email">Email institucional</Label>
              <Input
                id="recovery-email"
                placeholder="nombre@ucc.edu.co"
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsForgotPasswordOpen(false)}>Cancelar</Button>
            <Button onClick={handleRecoverPassword} disabled={isRecovering}>
              {isRecovering && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar enlace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}