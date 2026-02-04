# Funcionalidades Extendidas de Préstamos

## 📋 Resumen

Este documento describe las nuevas funcionalidades implementadas en el módulo de préstamos del sistema Bienestar Hub.

---

## ✅ Funcionalidades Implementadas

### 1. Cancelar Solicitud de Préstamo (Estudiante)

**Ubicación:** Página "Mis Préstamos" (`/my-loans`)

**Cómo usar:**
1. Ve a "Mis Préstamos" → Tab "Activos"
2. En un préstamo con estado "Pendiente", verás el botón **"Cancelar solicitud"**
3. Haz clic y confirma en el diálogo
4. La solicitud será eliminada inmediatamente

**Restricciones:**
- Solo se puede cancelar si el estado es `pending`
- No se puede cancelar si ya fue aprobado o entregado

---

### 2. Solicitar Extensión de Préstamo

#### Para Estudiantes:

**Ubicación:** Página "Mis Préstamos" → Préstamos activos

**Cómo usar:**
1. En un préstamo con estado "En uso" o "Vencido", haz clic en **"Solicitar extensión"**
2. Completa el formulario con el motivo (obligatorio)
3. Envía la solicitud
4. Recibirás una notificación cuando el admin la apruebe o rechace

**Restricciones:**
- Solo disponible para préstamos activos o vencidos
- No disponible si ya hay una extensión pendiente

#### Para Administradores:

**Ubicación:** Panel Admin → "Gestión de Préstamos" → Tab "Activos"

**Cómo usar:**
1. Cuando un estudiante solicita extensión, verás el botón **"Revisar extensión"** en la tarjeta del préstamo
2. Haz clic y verás:
   - El motivo de la solicitud
   - La fecha actual de vencimiento
   - La fecha original (si ya fue extendido antes)
3. Elige **"Aprobar"** o **"Rechazar"**
4. Si apruebas, selecciona la nueva fecha de vencimiento
5. Opcionalmente agrega notas administrativas
6. Confirma la decisión

**Notas:**
- El estudiante recibirá una notificación automática
- La fecha nueva debe ser posterior a la fecha actual de vencimiento
- Se guarda un registro de la fecha original para auditoría

---

### 3. Recordatorios de Vencimiento

**Tipo:** Automático (Backend)

**Funcionamiento:**
- El sistema envía notificaciones automáticas 1-2 días antes del vencimiento
- Se ejecuta mediante la función SQL `send_due_date_reminders()`

**Configuración:**
- Ejecutar diariamente mediante cron job o Edge Function de Supabase
- Ejemplo de cron: `0 9 * * *` (9 AM todos los días)

**SQL para ejecutar manualmente:**
```sql
SELECT send_due_date_reminders();
```

---

### 4. Renovación Automática

**Tipo:** Automático (Backend)

**Funcionamiento:**
- Si un préstamo está activo y no hay estudiantes en cola de espera, se puede renovar automáticamente
- La función `auto_renew_loan()` verifica la cola antes de renovar

**Cuándo se renueva:**
- ✅ Préstamo está activo
- ✅ No hay solicitudes en cola de espera para ese recurso
- ✅ Se respeta el máximo de días de préstamo según la categoría

**SQL para ejecutar manualmente:**
```sql
SELECT auto_renew_loan('loan-id-aqui');
```

---

### 5. Exportar Historial

**Ubicación:** Página "Mis Préstamos" → Botones de exportación

**Formatos disponibles:**

#### CSV
- Incluye: Recurso, Categoría, Estado, Fechas, Horas, Calificación
- Formato compatible con Excel y Google Sheets
- Nombre del archivo: `mis-prestamos-YYYY-MM-DD.csv`

#### PDF
- Formato profesional con encabezado
- Tabla con todos los préstamos
- Incluye total de horas acumuladas
- Nombre del archivo: `mis-prestamos-YYYY-MM-DD.pdf`

**Cómo usar:**
1. Ve a "Mis Préstamos"
2. Haz clic en **"CSV"** o **"PDF"** en la parte superior
3. El archivo se descargará automáticamente

---

### 6. Calificación Post-Devolución

**Ubicación:** Página "Mis Préstamos" → Tab "Historial"

**Cómo usar:**
1. En un préstamo devuelto sin calificar, verás el botón **"Calificar experiencia"**
2. Haz clic y aparecerá un diálogo con:
   - Sistema de estrellas (1-5)
   - Campo opcional para comentarios
3. Selecciona las estrellas y opcionalmente escribe un comentario
4. Haz clic en **"Enviar calificación"**

**Características:**
- Solo disponible para préstamos devueltos
- Una vez calificado, no se puede cambiar
- Las calificaciones se muestran en el historial
- Alertas cuando hay préstamos sin calificar

**Visualización:**
- Las estrellas aparecen en el historial para préstamos calificados
- Se usa para estadísticas y mejoras del servicio

---

## 🔧 Configuración Backend

### Funciones SQL Disponibles

#### `approve_loan_extension()`
Aprobar o rechazar una extensión de préstamo.

```sql
SELECT approve_loan_extension(
  p_loan_id UUID,
  p_approved BOOLEAN,
  p_admin_id UUID,
  p_new_due_date TIMESTAMPTZ DEFAULT NULL,
  p_admin_notes TEXT DEFAULT NULL
);
```

#### `send_due_date_reminders()`
Enviar recordatorios de vencimiento (retorna cantidad enviados).

```sql
SELECT send_due_date_reminders();
```

#### `mark_overdue_loans()`
Marcar préstamos vencidos automáticamente (retorna cantidad marcados).

```sql
SELECT mark_overdue_loans();
```

#### `auto_renew_loan()`
Renovar automáticamente un préstamo si no hay cola (retorna TRUE/FALSE).

```sql
SELECT auto_renew_loan('loan-id-aqui');
```

### Configurar Cron Jobs (Supabase Edge Functions)

Para automatizar recordatorios y marcado de vencidos, crea Edge Functions o usa pg_cron:

```sql
-- Ejemplo con pg_cron (requiere extensión)
SELECT cron.schedule(
  'send-loan-reminders',
  '0 9 * * *', -- 9 AM diario
  $$SELECT send_due_date_reminders()$$
);

SELECT cron.schedule(
  'mark-overdue-loans',
  '0 0 * * *', -- Medianoche diario
  $$SELECT mark_overdue_loans()$$
);
```

---

## 📊 Nuevas Columnas en BD

### Tabla `loans`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `extension_requested` | BOOLEAN | Si se solicitó extensión |
| `extension_reason` | TEXT | Motivo de la extensión |
| `extension_approved` | BOOLEAN | Aprobación (NULL = pendiente) |
| `extension_approved_by` | UUID | Admin que aprobó/rechazó |
| `extension_approved_at` | TIMESTAMPTZ | Fecha de decisión |
| `original_due_date` | TIMESTAMPTZ | Fecha original antes de extensión |
| `rating` | INTEGER (1-5) | Calificación del estudiante |
| `rating_comment` | TEXT | Comentario de la calificación |
| `rated_at` | TIMESTAMPTZ | Fecha de calificación |
| `reminder_sent_at` | TIMESTAMPTZ | Último recordatorio enviado |
| `auto_renewed` | BOOLEAN | Si fue renovado automáticamente |

---

## 🎯 Casos de Uso Comunes

### Estudiante necesita más tiempo
1. Estudiante solicita extensión con motivo
2. Admin revisa y aprueba con nueva fecha
3. Sistema notifica al estudiante
4. Préstamo se actualiza automáticamente

### Préstamo próximo a vencer
1. Sistema detecta préstamo que vence en 1-2 días
2. Envía notificación automática al estudiante
3. Estudiante puede solicitar extensión o devolver

### Recurso muy solicitado
1. Estudiante solicita extensión
2. Admin verifica cola de espera
3. Si hay cola, rechaza extensión
4. Si no hay cola, puede aprobar

### Calidad del servicio
1. Estudiante devuelve recurso
2. Sistema solicita calificación
3. Calificaciones se acumulan por recurso
4. Admin puede ver estadísticas en vista `resource_ratings`

---

## 🚨 Notificaciones Automáticas

El sistema envía notificaciones automáticas para:

- ✅ Nueva solicitud de extensión → Admins
- ✅ Extensión aprobada/rechazada → Estudiante
- ✅ Recordatorio de vencimiento → Estudiante
- ✅ Préstamo renovado automáticamente → Estudiante
- ✅ Préstamo marcado como vencido → Estudiante

---

## 📈 Estadísticas Disponibles

### Vista `resource_ratings`
Muestra estadísticas de calificaciones por recurso:

```sql
SELECT * FROM resource_ratings;
```

Incluye:
- Total de calificaciones
- Promedio de calificación
- Distribución por estrellas (1-5)

---

## 🔍 Troubleshooting

### La extensión no aparece en admin
- Verifica que `extension_requested = true` en la BD
- Revisa que el préstamo esté en estado `active` o `overdue`

### Recordatorios no se envían
- Verifica que la función `send_due_date_reminders()` se ejecute periódicamente
- Revisa que `reminder_sent_at` esté NULL para préstamos elegibles

### PDF no se genera
- Verifica que `jspdf` esté instalado: `npm install jspdf`
- Revisa la consola del navegador para errores

### Calificación no se guarda
- Verifica que el préstamo esté en estado `returned`
- Revisa que `rating` esté entre 1 y 5

---

## ✅ Checklist de Implementación

- [x] Migración SQL ejecutada
- [x] Dependencias instaladas (`jspdf`)
- [x] Funcionalidades frontend implementadas
- [ ] Cron jobs configurados (opcional)
- [ ] Pruebas de usuario realizadas
- [ ] Documentación revisada

---

## 📝 Notas Finales

- Todas las funcionalidades están completamente integradas con el sistema de notificaciones
- Los cambios son auditados en `audit_logs`
- Las extensiones respetan las políticas de cola de espera
- Las calificaciones ayudan a mejorar la calidad del servicio

---

**Última actualización:** 25 de Enero, 2026
