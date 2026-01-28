# Progreso de Implementación - Casos de Uso Faltantes

**Fecha:** 25 de Enero, 2026  
**Estado:** En progreso

---

## ✅ COMPLETADO

### SQL/Migraciones
- ✅ **Migración SQL completa** (`20260125000002_casos_uso_faltantes.sql`)
  - Tabla `resource_damages` (daños con fotos, multas)
  - Tabla `resource_movements` (historial de movimientos)
  - Tabla `resource_maintenance_schedule` (mantenimiento programado)
  - Tabla `policy_versions` (historial de versiones)
  - Tabla `policy_acceptances` (aceptación de políticas)
  - Tabla `user_sessions` (sesiones de usuario)
  - Tabla `email_notification_settings` (configuración de emails)
  - Tabla `email_templates` (plantillas de email)
  - Tabla `user_activity_log` (log de actividad)
  - Funciones: `calculate_damage_fine()`, triggers automáticos
  - Políticas RLS configuradas

### UI Implementada
- ✅ **Gestión de Políticas Institucionales** (`src/paginas/Politicas.tsx`)
  - CRUD completo
  - Historial de versiones
  - Requiere aceptación
  - Ruta: `/admin/policies`
  - Integrado en menú y Configuración

- ✅ **Gestión de Daños/Pérdidas Mejorada** (`src/componentes/prestamos/DialogoGestionDanos.tsx`)
  - Subida de fotos (hasta 5)
  - Cálculo automático de multas
  - Tipos: daño, pérdida, robo
  - Severidad: menor, moderada, severa, pérdida total
  - Notificación automática a estudiante
  - Integrado en página de Préstamos

---

## 🚧 EN PROGRESO

### Casos de Uso Pendientes (Prioridad Alta/Media)

1. **Filtros Avanzados en MisHoras** (Prioridad: Alta)
   - Filtrar por tipo de fuente
   - Filtrar por rango de fechas
   - Ordenamiento

2. **Vista de Calendario para Eventos** (Prioridad: Media)
   - Vista mensual
   - Vista semanal
   - Filtros por categoría
   - Exportar a iCal

3. **Gestión de Lista de Espera (Admin)** (Prioridad: Media)
   - Ver lista completa por evento
   - Reorganizar posiciones
   - Notificar manualmente

4. **Gráficos Visuales en Reportes** (Prioridad: Media)
   - Gráficos de barras
   - Gráficos de líneas
   - Gráficos de pastel

5. **Gestión Completa de Notificaciones** (Prioridad: Media)
   - Página completa de notificaciones
   - Filtrar por tipo, fecha
   - Eliminar/archivar

6. **Certificados de Horas** (Prioridad: Media)
   - Generar PDF
   - Certificado de asistencia
   - Firma digital

7. **Búsqueda Avanzada en Usuarios y Préstamos Admin** (Prioridad: Media)
   - Filtros múltiples
   - Búsqueda por código
   - Guardar filtros

---

## 📋 PRÓXIMOS PASOS

1. Implementar filtros avanzados en MisHoras
2. Crear vista de calendario para eventos
3. Agregar gestión de lista de espera en admin
4. Integrar gráficos en reportes
5. Crear página completa de notificaciones
6. Implementar generación de certificados
7. Agregar búsqueda avanzada en admin

---

**Nota:** La migración SQL debe ejecutarse primero en Supabase antes de usar las nuevas funcionalidades.
