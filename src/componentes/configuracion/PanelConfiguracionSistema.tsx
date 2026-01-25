import { useEffect, useState } from "react";
import { supabase } from "@/servicios/cliente";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Switch } from "@/componentes/ui/switch";
import { Separator } from "@/componentes/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/componentes/ui/tabs";
import { toast } from "@/ganchos/usar-toast";
import { 
  Settings, 
  Clock, 
  ShieldCheck, 
  Sparkles, 
  AlertTriangle, 
  Save,
  Loader2,
  RefreshCw,
  Package,
  Users,
  Bell
} from "lucide-react";

interface SystemSetting {
  id: string;
  key: string;
  value: any;
  description: string | null;
  category: string;
}

interface SettingGroup {
  loans: Record<string, any>;
  wellness: Record<string, any>;
  penalties: Record<string, any>;
  security: Record<string, any>;
  notifications: Record<string, any>;
}

const defaultSettings: SettingGroup = {
  loans: {
    max_active_loans: 3,
    default_loan_days: 7,
    pickup_timeout_minutes: 30,
    approval_timeout_minutes: 60,
    auto_approve_low_risk: true,
    min_trust_score_auto_approve: 80,
    allow_queue_for_unavailable: true,
    max_queue_size: 10,
  },
  wellness: {
    base_hours_per_loan: 1,
    max_hours_per_loan: 5,
    hourly_bonus_factor: 0.5,
    event_attendance_hours: 2,
    monthly_hours_limit: 20,
    round_to_half_hour: true,
  },
  penalties: {
    late_return_penalty_hours: 1,
    damage_penalty_hours: 5,
    loss_penalty_hours: 10,
    block_after_late_returns: 3,
    block_duration_days: 7,
    auto_block_on_loss: true,
  },
  security: {
    require_email_verification: false,
    session_timeout_hours: 24,
    max_login_attempts: 5,
    lockout_duration_minutes: 15,
    require_2fa_for_admins: false,
  },
  notifications: {
    email_on_loan_approved: true,
    email_on_loan_due: true,
    email_on_event_reminder: true,
    due_reminder_hours_before: 24,
    enable_push_notifications: false,
  },
};

export function SystemSettingsPanel() {
  const [settings, setSettings] = useState<SettingGroup>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from("system_settings")
      .select("*");

    if (!error && data) {
      const loadedSettings = { ...defaultSettings };
      
      for (const setting of data) {
        const category = setting.category as keyof SettingGroup;
        if (loadedSettings[category]) {
          loadedSettings[category][setting.key] = setting.value;
        }
      }

      setSettings(loadedSettings);
    }
    setIsLoading(false);
  };

  const updateSetting = (category: keyof SettingGroup, key: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));
    setHasChanges(true);
  };

  const saveSettings = async () => {
    setIsSaving(true);

    try {
      const upserts: { key: string; value: any; category: string; description: string | null }[] = [];

      for (const [category, categorySettings] of Object.entries(settings)) {
        for (const [key, value] of Object.entries(categorySettings)) {
          upserts.push({
            key,
            value,
            category,
            description: null,
          });
        }
      }

      // Upsert all settings
      for (const setting of upserts) {
        const { error } = await supabase
          .from("system_settings")
          .upsert(
            { key: setting.key, value: setting.value, category: setting.category },
            { onConflict: "key" }
          );

        if (error) throw error;
      }

      toast({ title: "Guardado", description: "Configuración actualizada correctamente" });
      setHasChanges(false);
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({ title: "Error", description: "No se pudo guardar la configuración", variant: "destructive" });
    }

    setIsSaving(false);
  };

  const resetToDefaults = () => {
    if (confirm("¿Restaurar todos los valores por defecto?")) {
      setSettings(defaultSettings);
      setHasChanges(true);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with save button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Configuración del Sistema</h2>
          <p className="text-sm text-muted-foreground">Personaliza las reglas y comportamientos</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={resetToDefaults}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Restaurar
          </Button>
          <Button onClick={saveSettings} disabled={!hasChanges || isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Guardar Cambios
          </Button>
        </div>
      </div>

      <Tabs defaultValue="loans" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="loans">
            <Package className="mr-2 h-4 w-4" />
            Préstamos
          </TabsTrigger>
          <TabsTrigger value="wellness">
            <Sparkles className="mr-2 h-4 w-4" />
            Bienestar
          </TabsTrigger>
          <TabsTrigger value="penalties">
            <AlertTriangle className="mr-2 h-4 w-4" />
            Penalizaciones
          </TabsTrigger>
          <TabsTrigger value="security">
            <ShieldCheck className="mr-2 h-4 w-4" />
            Seguridad
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="mr-2 h-4 w-4" />
            Notificaciones
          </TabsTrigger>
        </TabsList>

        {/* Loans Settings */}
        <TabsContent value="loans">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Préstamos</CardTitle>
              <CardDescription>Reglas para solicitudes y aprobaciones</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="max_loans">Máximo préstamos activos por estudiante</Label>
                  <Input
                    id="max_loans"
                    type="number"
                    min="1"
                    max="10"
                    value={settings.loans.max_active_loans}
                    onChange={(e) => updateSetting("loans", "max_active_loans", parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="default_days">Días de préstamo por defecto</Label>
                  <Input
                    id="default_days"
                    type="number"
                    min="1"
                    max="30"
                    value={settings.loans.default_loan_days}
                    onChange={(e) => updateSetting("loans", "default_loan_days", parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pickup_timeout">Tiempo límite para recoger (minutos)</Label>
                  <Input
                    id="pickup_timeout"
                    type="number"
                    min="5"
                    max="120"
                    value={settings.loans.pickup_timeout_minutes}
                    onChange={(e) => updateSetting("loans", "pickup_timeout_minutes", parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    El préstamo expira si no se recoge en este tiempo
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="approval_timeout">Tiempo límite para aprobar (minutos)</Label>
                  <Input
                    id="approval_timeout"
                    type="number"
                    min="10"
                    max="1440"
                    value={settings.loans.approval_timeout_minutes}
                    onChange={(e) => updateSetting("loans", "approval_timeout_minutes", parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    La solicitud expira si el admin no responde
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-aprobar recursos de bajo riesgo</Label>
                    <p className="text-xs text-muted-foreground">
                      Aprobación automática para recursos marcados como bajo riesgo
                    </p>
                  </div>
                  <Switch
                    checked={settings.loans.auto_approve_low_risk}
                    onCheckedChange={(checked) => updateSetting("loans", "auto_approve_low_risk", checked)}
                  />
                </div>
                {settings.loans.auto_approve_low_risk && (
                  <div className="space-y-2 ml-4">
                    <Label htmlFor="min_score">Score mínimo para auto-aprobación</Label>
                    <Input
                      id="min_score"
                      type="number"
                      min="0"
                      max="200"
                      value={settings.loans.min_trust_score_auto_approve}
                      onChange={(e) => updateSetting("loans", "min_trust_score_auto_approve", parseInt(e.target.value))}
                    />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Permitir cola de espera</Label>
                    <p className="text-xs text-muted-foreground">
                      Los estudiantes pueden unirse a una cola cuando el recurso no está disponible
                    </p>
                  </div>
                  <Switch
                    checked={settings.loans.allow_queue_for_unavailable}
                    onCheckedChange={(checked) => updateSetting("loans", "allow_queue_for_unavailable", checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Wellness Settings */}
        <TabsContent value="wellness">
          <Card>
            <CardHeader>
              <CardTitle>Horas de Bienestar</CardTitle>
              <CardDescription>Configuración de horas otorgadas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="base_hours">Horas base por préstamo</Label>
                  <Input
                    id="base_hours"
                    type="number"
                    min="0"
                    max="10"
                    step="0.5"
                    value={settings.wellness.base_hours_per_loan}
                    onChange={(e) => updateSetting("wellness", "base_hours_per_loan", parseFloat(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_hours">Máximo horas por préstamo</Label>
                  <Input
                    id="max_hours"
                    type="number"
                    min="1"
                    max="20"
                    step="0.5"
                    value={settings.wellness.max_hours_per_loan}
                    onChange={(e) => updateSetting("wellness", "max_hours_per_loan", parseFloat(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hourly_bonus">Factor de bonificación por hora</Label>
                  <Input
                    id="hourly_bonus"
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    value={settings.wellness.hourly_bonus_factor}
                    onChange={(e) => updateSetting("wellness", "hourly_bonus_factor", parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Horas adicionales por cada hora de uso del recurso
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event_hours">Horas por asistencia a evento</Label>
                  <Input
                    id="event_hours"
                    type="number"
                    min="0"
                    max="10"
                    step="0.5"
                    value={settings.wellness.event_attendance_hours}
                    onChange={(e) => updateSetting("wellness", "event_attendance_hours", parseFloat(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthly_limit">Límite mensual de horas</Label>
                  <Input
                    id="monthly_limit"
                    type="number"
                    min="0"
                    max="100"
                    value={settings.wellness.monthly_hours_limit}
                    onChange={(e) => updateSetting("wellness", "monthly_hours_limit", parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    0 = sin límite
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>Redondear a media hora</Label>
                  <p className="text-xs text-muted-foreground">
                    Las horas se redondean al 0.5 más cercano
                  </p>
                </div>
                <Switch
                  checked={settings.wellness.round_to_half_hour}
                  onCheckedChange={(checked) => updateSetting("wellness", "round_to_half_hour", checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Penalties Settings */}
        <TabsContent value="penalties">
          <Card>
            <CardHeader>
              <CardTitle>Penalizaciones</CardTitle>
              <CardDescription>Reglas para incumplimientos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="late_penalty">Horas restadas por devolución tardía</Label>
                  <Input
                    id="late_penalty"
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    value={settings.penalties.late_return_penalty_hours}
                    onChange={(e) => updateSetting("penalties", "late_return_penalty_hours", parseFloat(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="damage_penalty">Horas restadas por daño</Label>
                  <Input
                    id="damage_penalty"
                    type="number"
                    min="0"
                    max="50"
                    step="1"
                    value={settings.penalties.damage_penalty_hours}
                    onChange={(e) => updateSetting("penalties", "damage_penalty_hours", parseFloat(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loss_penalty">Horas restadas por pérdida</Label>
                  <Input
                    id="loss_penalty"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={settings.penalties.loss_penalty_hours}
                    onChange={(e) => updateSetting("penalties", "loss_penalty_hours", parseFloat(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="block_after">Bloquear después de X devoluciones tardías</Label>
                  <Input
                    id="block_after"
                    type="number"
                    min="1"
                    max="10"
                    value={settings.penalties.block_after_late_returns}
                    onChange={(e) => updateSetting("penalties", "block_after_late_returns", parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="block_duration">Duración del bloqueo (días)</Label>
                  <Input
                    id="block_duration"
                    type="number"
                    min="1"
                    max="365"
                    value={settings.penalties.block_duration_days}
                    onChange={(e) => updateSetting("penalties", "block_duration_days", parseInt(e.target.value))}
                  />
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>Bloqueo automático por pérdida</Label>
                  <p className="text-xs text-muted-foreground">
                    El estudiante se bloquea automáticamente si pierde un recurso
                  </p>
                </div>
                <Switch
                  checked={settings.penalties.auto_block_on_loss}
                  onCheckedChange={(checked) => updateSetting("penalties", "auto_block_on_loss", checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Seguridad</CardTitle>
              <CardDescription>Configuración de autenticación y acceso</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="session_timeout">Tiempo de sesión (horas)</Label>
                  <Input
                    id="session_timeout"
                    type="number"
                    min="1"
                    max="168"
                    value={settings.security.session_timeout_hours}
                    onChange={(e) => updateSetting("security", "session_timeout_hours", parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_attempts">Máximo intentos de login</Label>
                  <Input
                    id="max_attempts"
                    type="number"
                    min="3"
                    max="10"
                    value={settings.security.max_login_attempts}
                    onChange={(e) => updateSetting("security", "max_login_attempts", parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lockout_duration">Duración del bloqueo (minutos)</Label>
                  <Input
                    id="lockout_duration"
                    type="number"
                    min="5"
                    max="60"
                    value={settings.security.lockout_duration_minutes}
                    onChange={(e) => updateSetting("security", "lockout_duration_minutes", parseInt(e.target.value))}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Requerir verificación de email</Label>
                    <p className="text-xs text-muted-foreground">
                      Los usuarios deben verificar su email antes de usar el sistema
                    </p>
                  </div>
                  <Switch
                    checked={settings.security.require_email_verification}
                    onCheckedChange={(checked) => updateSetting("security", "require_email_verification", checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Requerir 2FA para administradores</Label>
                    <p className="text-xs text-muted-foreground">
                      Autenticación de dos factores obligatoria para admins
                    </p>
                  </div>
                  <Switch
                    checked={settings.security.require_2fa_for_admins}
                    onCheckedChange={(checked) => updateSetting("security", "require_2fa_for_admins", checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notificaciones</CardTitle>
              <CardDescription>Configuración de alertas y recordatorios</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email al aprobar préstamo</Label>
                    <p className="text-xs text-muted-foreground">
                      Enviar email cuando se aprueba una solicitud
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.email_on_loan_approved}
                    onCheckedChange={(checked) => updateSetting("notifications", "email_on_loan_approved", checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email de recordatorio de devolución</Label>
                    <p className="text-xs text-muted-foreground">
                      Recordar al estudiante antes del vencimiento
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.email_on_loan_due}
                    onCheckedChange={(checked) => updateSetting("notifications", "email_on_loan_due", checked)}
                  />
                </div>
                {settings.notifications.email_on_loan_due && (
                  <div className="space-y-2 ml-4">
                    <Label htmlFor="reminder_hours">Horas antes para recordatorio</Label>
                    <Input
                      id="reminder_hours"
                      type="number"
                      min="1"
                      max="72"
                      value={settings.notifications.due_reminder_hours_before}
                      onChange={(e) => updateSetting("notifications", "due_reminder_hours_before", parseInt(e.target.value))}
                    />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Recordatorio de eventos</Label>
                    <p className="text-xs text-muted-foreground">
                      Enviar recordatorio antes de eventos programados
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.email_on_event_reminder}
                    onCheckedChange={(checked) => updateSetting("notifications", "email_on_event_reminder", checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Notificaciones push</Label>
                    <p className="text-xs text-muted-foreground">
                      Habilitar notificaciones push en navegador
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.enable_push_notifications}
                    onCheckedChange={(checked) => updateSetting("notifications", "enable_push_notifications", checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
