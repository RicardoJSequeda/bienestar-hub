import { useState } from "react";
import { supabase } from "@/servicios/cliente";
import { useAuth } from "@/contextos/ContextoAutenticacion";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/componentes/ui/dialog";
import { Button } from "@/componentes/ui/button";
import { Label } from "@/componentes/ui/label";
import { Textarea } from "@/componentes/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/componentes/ui/select";
import { Input } from "@/componentes/ui/input";
import { ImageUpload } from "@/componentes/ui/ImageUpload";
import { toast } from "@/ganchos/usar-toast";
import { Loader2, Upload, X, AlertTriangle } from "lucide-react";
import { cn } from "@/utilidades/utilidades";

interface DamageDialogProps {
  loan: {
    id: string;
    resource_id: string;
    user_id: string;
    resources: { name: string };
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DamageManagementDialog({ loan, isOpen, onClose, onSuccess }: DamageDialogProps) {
  const { user } = useAuth();
  const [damageType, setDamageType] = useState<"damage" | "loss" | "theft">("damage");
  const [severity, setSeverity] = useState<"minor" | "moderate" | "severe" | "total_loss">("minor");
  const [description, setDescription] = useState("");
  const [damageImages, setDamageImages] = useState<string[]>([]);
  const [estimatedCost, setEstimatedCost] = useState("");
  const [fineAmount, setFineAmount] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  const calculateFine = async () => {
    if (!damageType || !severity) return;
    
    setIsCalculating(true);
    try {
      const { data, error } = await (supabase.rpc as any)("calculate_damage_fine", {
        p_damage_type: damageType,
        p_severity: severity,
        p_resource_id: loan.resource_id,
      });

      if (error) throw error;
      setFineAmount(data || 0);
    } catch (err: any) {
      console.error("Error calculating fine:", err);
      toast({ title: "Error", description: "No se pudo calcular la multa", variant: "destructive" });
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSave = async () => {
    if (!description.trim()) {
      toast({ title: "Error", description: "La descripción es requerida", variant: "destructive" });
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Crear registro de daño
      const { data: damageData, error: damageError } = await supabase
        .from("resource_damages")
        .insert({
          loan_id: loan.id,
          resource_id: loan.resource_id,
          user_id: loan.user_id,
          damage_type: damageType,
          severity,
          description: description.trim(),
          damage_images: damageImages.length > 0 ? damageImages : null,
          estimated_cost: estimatedCost ? parseFloat(estimatedCost) : null,
          fine_amount: fineAmount,
          reported_by: user?.id,
          status: "reviewed",
        } as any)
        .select()
        .single();

      if (damageError) throw damageError;

      // 2. Actualizar préstamo
      const newStatus = damageType === "loss" || severity === "total_loss" ? "lost" : "damaged";
      const { error: loanError } = await supabase
        .from("loans")
        .update({
          status: newStatus,
          damage_notes: description.trim(),
        } as any)
        .eq("id", loan.id);

      if (loanError) throw loanError;

      // 3. Notificar al estudiante
      await supabase.from("notifications").insert({
        user_id: loan.user_id,
        type: "damage_reported",
        title: "Daño reportado en recurso",
        message: `Se ha reportado un ${damageType === "damage" ? "daño" : damageType === "loss" ? "pérdida" : "robo"} en el recurso "${loan.resources.name}". ${fineAmount ? `Multa: $${fineAmount.toLocaleString()}` : ""}`,
        link: "/my-loans",
        data: { damage_id: damageData.id, fine_amount: fineAmount },
      } as any);

      toast({
        title: "Daño registrado",
        description: fineAmount ? `Se ha calculado una multa de $${fineAmount.toLocaleString()}` : "El daño ha sido registrado",
      });

      onSuccess();
      onClose();
      resetForm();
    } catch (err: any) {
      console.error("Error saving damage:", err);
      toast({ title: "Error", description: "No se pudo registrar el daño", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setDamageType("damage");
    setSeverity("minor");
    setDescription("");
    setDamageImages([]);
    setEstimatedCost("");
    setFineAmount(null);
  };

  const handleAddImage = (url: string) => {
    setDamageImages([...damageImages, url]);
  };

  const handleRemoveImage = (index: number) => {
    setDamageImages(damageImages.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Daño/Pérdida</DialogTitle>
          <DialogDescription>
            Recurso: {loan.resources.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Tipo de Incidencia *</Label>
            <Select value={damageType} onValueChange={(v: any) => setDamageType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="damage">Daño</SelectItem>
                <SelectItem value="loss">Pérdida</SelectItem>
                <SelectItem value="theft">Robo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Severidad *</Label>
            <Select value={severity} onValueChange={(v: any) => setSeverity(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minor">Menor</SelectItem>
                <SelectItem value="moderate">Moderada</SelectItem>
                <SelectItem value="severe">Severa</SelectItem>
                <SelectItem value="total_loss">Pérdida Total</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Descripción del Daño *</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe detalladamente el daño, pérdida o robo..."
              className="min-h-[120px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Fotos del Daño</Label>
            <div className="space-y-2">
              {damageImages.map((url, index) => (
                <div key={index} className="relative group">
                  <img src={url} alt={`Daño ${index + 1}`} className="w-full h-32 object-cover rounded-lg" />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => handleRemoveImage(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {damageImages.length < 5 && (
                <ImageUpload
                  value=""
                  onChange={handleAddImage}
                  bucket="damage-images"
                  label="Agregar Foto"
                />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Máximo 5 fotos. Se recomienda tomar fotos desde diferentes ángulos.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Costo Estimado de Reparación (opcional)</Label>
              <Input
                type="number"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
                placeholder="0"
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Multa Calculada</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={fineAmount || ""}
                  readOnly
                  className="bg-muted"
                  placeholder="Calcular multa"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={calculateFine}
                  disabled={isCalculating}
                >
                  {isCalculating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Calcular"
                  )}
                </Button>
              </div>
            </div>
          </div>

          {fineAmount && (
            <div className={cn(
              "rounded-lg p-3 border",
              "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
            )}>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                  Multa calculada: ${fineAmount.toLocaleString()} COP
                </p>
              </div>
              <p className="text-xs text-yellow-700 dark:text-yellow-200 mt-1">
                El estudiante será notificado y deberá pagar esta multa.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isProcessing || !description.trim()}
            variant="destructive"
          >
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar Daño
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
