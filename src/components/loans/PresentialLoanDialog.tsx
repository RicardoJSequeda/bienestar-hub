import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Loader2, Search, UserPlus, Package, CheckCircle, ArrowRightLeft } from "lucide-react";
import { TrustScoreBadge } from "./TrustScoreBadge";
import { format, addDays } from "date-fns";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  student_code: string | null;
  major: string | null;
}

interface Resource {
  id: string;
  name: string;
  status: string;
  category_id: string | null;
  resource_categories: {
    name: string;
    max_loan_days: number;
  } | null;
}

interface StudentScore {
  trust_score: number;
  is_blocked: boolean;
  blocked_reason: string | null;
}

interface PresentialLoanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function PresentialLoanDialog({ open, onOpenChange, onSuccess }: PresentialLoanDialogProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<"search" | "create" | "resource" | "confirm">("search");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Profile | null>(null);
  const [studentScore, setStudentScore] = useState<StudentScore | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [dueDate, setDueDate] = useState(format(addDays(new Date(), 7), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [programs, setPrograms] = useState<Array<{ id: string; name: string }>>([]);

  // New student form
  const [newStudent, setNewStudent] = useState({
    full_name: "",
    email: "",
    student_code: "",
    phone: "",
    program_id: "",
  });

  useEffect(() => {
    if (open) {
      fetchAvailableResources();
      fetchPrograms();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      resetDialog();
    }
  }, [open]);

  const resetDialog = () => {
    setStep("search");
    setSearchTerm("");
    setSearchResults([]);
    setSelectedStudent(null);
    setStudentScore(null);
    setSelectedResource(null);
    setDueDate(format(addDays(new Date(), 7), "yyyy-MM-dd"));
    setNotes("");
    setNewStudent({ full_name: "", email: "", student_code: "", phone: "", program_id: "" });
  };

  const fetchAvailableResources = async () => {
    const { data } = await supabase
      .from("resources")
      .select(`
        id, name, status, category_id,
        resource_categories (name, max_loan_days)
      `)
      .eq("status", "available")
      .order("name");

    if (data) setResources(data as Resource[]);
  };

  const fetchPrograms = async () => {
    const { data } = await supabase
      .from("academic_programs")
      .select("id, name")
      .order("name");
    if (data) setPrograms(data);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.trim().length >= 2) {
        searchStudents();
      } else if (searchTerm.trim().length === 0) {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const searchStudents = async () => {
    setIsSearching(true);

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,student_code.ilike.%${searchTerm}%`)
      .limit(10);

    setSearchResults(data || []);
    setIsSearching(false);
  };

  const selectStudent = async (profile: Profile) => {
    setSelectedStudent(profile);

    // Fetch student score
    const { data: scoreData } = await supabase
      .from("student_behavioral_status")
      .select("trust_score, is_blocked, blocked_reason")
      .eq("user_id", profile.user_id)
      .maybeSingle();

    setStudentScore(scoreData || { trust_score: 100, is_blocked: false, blocked_reason: null });
    setStep("resource");
  };

  const createNewStudent = async () => {
    if (!newStudent.full_name || !newStudent.email) {
      toast({ title: "Error", description: "Nombre y email son requeridos", variant: "destructive" });
      return;
    }

    // Validar código de 6 dígitos si se proporciona
    if (newStudent.student_code) {
      const codeRegex = /^\d{6}$/;
      if (!codeRegex.test(newStudent.student_code)) {
        toast({
          title: "Código inválido",
          description: "El código debe tener exactamente 6 dígitos (ej: 507730)",
          variant: "destructive",
        });
        return;
      }

      // Verificar código único
      const { data: existingCode } = await supabase
        .from("profiles")
        .select("student_code")
        .eq("student_code", newStudent.student_code)
        .maybeSingle();

      if (existingCode) {
        toast({
          title: "Código duplicado",
          description: "Este código ya está registrado. Verifica el código o busca al estudiante.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsProcessing(true);

    // Create user via auth (this will trigger the handle_new_user function)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: newStudent.email,
      password: crypto.randomUUID(), // Temporary password
      email_confirm: true,
      user_metadata: {
        full_name: newStudent.full_name,
      },
    });

    if (authError) {
      // If admin API fails, try to find existing user or create profile directly
      // First check if profile already exists
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", newStudent.email)
        .maybeSingle();

      if (existingProfile) {
        selectStudent(existingProfile);
        setIsProcessing(false);
        return;
      }

      toast({
        title: "Error",
        description: "No se pudo crear el usuario. Verifica que el email no exista.",
        variant: "destructive"
      });
      setIsProcessing(false);
      return;
    }

    // Update profile with additional info
    if (authData.user) {
      await supabase
        .from("profiles")
        .update({
          student_code: newStudent.student_code || null,
          phone: newStudent.phone || null,
          program_id: newStudent.program_id || null,
        })
        .eq("user_id", authData.user.id);

      // Select the new student
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", authData.user.id)
        .single();

      if (profile) {
        // Enviar email de activación de cuenta
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          newStudent.email,
          {
            redirectTo: `${window.location.origin}/set-password`,
          }
        );

        if (!resetError) {
          toast({
            title: "Estudiante creado y notificado",
            description: `Se ha enviado un email a ${newStudent.email} para establecer su contraseña.`,
          });
        }

        selectStudent(profile);
      }
    }

    setIsProcessing(false);
  };

  const selectResource = (resource: Resource) => {
    setSelectedResource(resource);

    // Set due date based on category settings
    const maxDays = resource.resource_categories?.max_loan_days || 7;
    setDueDate(format(addDays(new Date(), maxDays), "yyyy-MM-dd"));

    setStep("confirm");
  };

  const createLoan = async () => {
    if (!selectedStudent || !selectedResource || !user) return;

    // Check if student is blocked
    if (studentScore?.is_blocked) {
      toast({
        title: "Estudiante bloqueado",
        description: studentScore.blocked_reason || "Este estudiante no puede realizar préstamos",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    // Create the loan directly as active (presential loan)
    const { error: loanError } = await supabase.from("loans").insert({
      user_id: selectedStudent.user_id,
      resource_id: selectedResource.id,
      status: "active",
      approved_at: new Date().toISOString(),
      approved_by: user.id,
      delivered_at: new Date().toISOString(),
      due_date: new Date(dueDate).toISOString(),
      admin_notes: notes || null,
      created_by_admin: true,
      trust_score_at_request: studentScore?.trust_score || 100,
    });

    if (loanError) {
      toast({ title: "Error", description: "No se pudo crear el préstamo", variant: "destructive" });
      setIsProcessing(false);
      return;
    }

    // Update resource status
    await supabase
      .from("resources")
      .update({ status: "borrowed" })
      .eq("id", selectedResource.id);

    // Log audit
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "presential_loan_created",
      entity_type: "loan",
      entity_id: selectedResource.id,
      new_data: {
        student_id: selectedStudent.user_id,
        student_name: selectedStudent.full_name,
        resource_name: selectedResource.name,
      },
    });

    toast({
      title: "Préstamo creado",
      description: `${selectedResource.name} prestado a ${selectedStudent.full_name}`
    });

    setIsProcessing(false);
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === "search" && "Buscar Estudiante"}
            {step === "create" && "Crear Estudiante"}
            {step === "resource" && "Seleccionar Recurso"}
            {step === "confirm" && "Confirmar Préstamo"}
          </DialogTitle>
          <DialogDescription>
            {step === "search" && "Busca por nombre, email o código de estudiante"}
            {step === "create" && "Registra un nuevo estudiante en el sistema"}
            {step === "resource" && `Préstamo para: ${selectedStudent?.full_name}`}
            {step === "confirm" && "Revisa y confirma el préstamo"}
          </DialogDescription>
        </DialogHeader>

        {/* Step: Search Student */}
        {step === "search" && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Escribe el nombre, email o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                autoFocus
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1 animate-in fade-in slide-in-from-top-2">
                {searchResults.map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => selectStudent(profile)}
                    className="w-full p-3 rounded-lg border bg-card hover:bg-accent hover:border-primary/50 text-left transition-all group"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium group-hover:text-primary transition-colors">{profile.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {profile.student_code || profile.email}
                        </p>
                      </div>
                      <ArrowRightLeft className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searchResults.length === 0 && searchTerm && !isSearching && (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No se encontró el estudiante</p>
                <Button variant="outline" onClick={() => setStep("create")}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Crear nuevo estudiante
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Step: Create Student */}
        {step === "create" && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Registrando nuevo estudiante:</strong> Los datos ingresados se guardarán en el sistema para futuros préstamos.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create-name">Nombre completo *</Label>
                <Input
                  id="create-name"
                  value={newStudent.full_name}
                  onChange={(e) => setNewStudent({ ...newStudent, full_name: e.target.value })}
                  placeholder="Ej: Juan Carlos Pérez López"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-email">Email institucional *</Label>
                <Input
                  id="create-email"
                  type="email"
                  value={newStudent.email}
                  onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                  placeholder="Ej: juan.perez@universidad.edu"
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">Se usará para notificaciones del sistema</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-phone">Número de celular</Label>
                <Input
                  id="create-phone"
                  type="tel"
                  value={newStudent.phone}
                  onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                  placeholder="Ej: 3001234567"
                  className="h-11"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-code">Código estudiantil</Label>
                  <Input
                    id="create-code"
                    value={newStudent.student_code}
                    onChange={(e) => setNewStudent({ ...newStudent, student_code: e.target.value })}
                    placeholder="Ej: 2024001"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-program">Programa Académico</Label>
                  <Select
                    value={newStudent.program_id}
                    onValueChange={(value) => setNewStudent({ ...newStudent, program_id: value })}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Selecciona programa" />
                    </SelectTrigger>
                    <SelectContent>
                      {programs.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
              <Button variant="outline" onClick={() => setStep("search")} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button onClick={createNewStudent} disabled={isProcessing} className="w-full sm:w-auto">
                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear y continuar
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step: Select Resource */}
        {step === "resource" && (
          <div className="space-y-4">
            {/* Student info card */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="flex-1">
                <p className="font-medium">{selectedStudent?.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedStudent?.student_code || selectedStudent?.email}
                </p>
              </div>
              {studentScore && <TrustScoreBadge score={studentScore.trust_score} />}
            </div>

            {studentScore?.is_blocked && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                ⚠️ Este estudiante está bloqueado: {studentScore.blocked_reason}
              </div>
            )}

            <div className="space-y-2 max-h-64 overflow-y-auto">
              <Label>Recursos disponibles</Label>
              {resources.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No hay recursos disponibles
                </p>
              ) : (
                resources.map((resource) => (
                  <button
                    key={resource.id}
                    onClick={() => selectResource(resource)}
                    className="w-full p-3 rounded-lg border bg-card hover:bg-accent text-left transition-colors flex items-center gap-3"
                  >
                    <Package className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="font-medium">{resource.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {resource.resource_categories?.name}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("search")}>
                Cambiar estudiante
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step: Confirm */}
        {step === "confirm" && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estudiante:</span>
                <span className="font-medium">{selectedStudent?.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recurso:</span>
                <span className="font-medium">{selectedResource?.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Trust Score:</span>
                {studentScore && <TrustScoreBadge score={studentScore.trust_score} showDetails />}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Fecha de devolución</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observaciones del préstamo..."
              />
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setStep("resource")}>
                Cambiar recurso
              </Button>
              <Button onClick={createLoan} disabled={isProcessing || studentScore?.is_blocked}>
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                Confirmar Préstamo
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
