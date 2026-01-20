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
import { Loader2, Search, UserPlus, Package, CheckCircle } from "lucide-react";
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

  // New student form
  const [newStudent, setNewStudent] = useState({
    full_name: "",
    email: "",
    student_code: "",
    major: "",
  });

  useEffect(() => {
    if (open) {
      fetchAvailableResources();
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
    setNewStudent({ full_name: "", email: "", student_code: "", major: "" });
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

  const searchStudents = async () => {
    if (!searchTerm.trim()) return;
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
      .from("student_scores")
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
          major: newStudent.major || null,
        })
        .eq("user_id", authData.user.id);

      // Select the new student
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", authData.user.id)
        .single();

      if (profile) {
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
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nombre, email o código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchStudents()}
                  className="pl-10"
                />
              </div>
              <Button onClick={searchStudents} disabled={isSearching}>
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {searchResults.map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => selectStudent(profile)}
                    className="w-full p-3 rounded-lg border bg-card hover:bg-accent text-left transition-colors"
                  >
                    <p className="font-medium">{profile.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {profile.student_code || profile.email}
                    </p>
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
            <div className="space-y-2">
              <Label>Nombre completo *</Label>
              <Input
                value={newStudent.full_name}
                onChange={(e) => setNewStudent({ ...newStudent, full_name: e.target.value })}
                placeholder="Juan Pérez"
              />
            </div>
            <div className="space-y-2">
              <Label>Email institucional *</Label>
              <Input
                type="email"
                value={newStudent.email}
                onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                placeholder="juan.perez@universidad.edu"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Código de estudiante</Label>
                <Input
                  value={newStudent.student_code}
                  onChange={(e) => setNewStudent({ ...newStudent, student_code: e.target.value })}
                  placeholder="2024001"
                />
              </div>
              <div className="space-y-2">
                <Label>Carrera</Label>
                <Input
                  value={newStudent.major}
                  onChange={(e) => setNewStudent({ ...newStudent, major: e.target.value })}
                  placeholder="Ingeniería"
                />
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setStep("search")}>
                Volver
              </Button>
              <Button onClick={createNewStudent} disabled={isProcessing}>
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
