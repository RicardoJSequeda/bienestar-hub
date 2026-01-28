# Casos de Uso Pendientes - Priorización

## 🔴 PRIORIDAD ALTA (Críticos - Afectan flujos principales)

### 1. ✅ Gestión de Sanciones (UI faltante)
**Estado:** Tabla existe en BD, pero NO hay interfaz
**Impacto:** CRÍTICO - Los admins no pueden gestionar sanciones
**Archivos a crear:**
- `src/paginas/Sanciones.tsx` (Admin)
- `src/paginas/estudiante/MisSanciones.tsx` (Estudiante)
- Componentes relacionados

**Funcionalidades:**
- [ ] Crear sanción (admin)
- [ ] Ver sanciones activas (admin y estudiante)
- [ ] Apelar sanción (estudiante)
- [ ] Resolver apelación (admin)
- [ ] Historial de sanciones
- [ ] Bloquear/desbloquear usuario automáticamente según severidad

---

### 2. ✅ Cancelar Evento y Notificar Inscritos
**Estado:** Se puede eliminar evento, pero NO notifica
**Impacto:** ALTO - Estudiantes no saben que evento fue cancelado
**Archivo a modificar:** `src/paginas/Eventos.tsx`

**Funcionalidades:**
- [ ] Cambiar `is_active = false` en lugar de eliminar
- [ ] Notificar a todos los inscritos cuando se cancela
- [ ] Permitir reactivar evento cancelado
- [ ] Mostrar eventos cancelados en historial

---

## 🟡 PRIORIDAD MEDIA (Mejoras importantes)

### 3. Lista de Espera para Eventos
**Estado:** No existe
**Impacto:** MEDIO - Mejora UX cuando cupo está lleno
**Archivos a modificar:**
- `src/paginas/estudiante/Eventos.tsx`
- `src/paginas/Eventos.tsx` (admin)

**Funcionalidades:**
- [ ] Unirse a lista de espera cuando cupo lleno
- [ ] Notificar cuando hay cupo disponible
- [ ] Gestionar lista de espera (admin)

---

### 4. Vista de Calendario para Eventos
**Estado:** No existe
**Impacto:** MEDIO - Mejora visualización
**Archivo a crear:** `src/paginas/estudiante/CalendarioEventos.tsx`

**Funcionalidades:**
- [ ] Vista mensual de eventos
- [ ] Vista semanal
- [ ] Filtros por categoría
- [ ] Exportar a iCal

---

### 5. ✅ Filtros Avanzados en Historiales
**Estado:** COMPLETADO (Parcial - MisPrestamos)
**Impacto:** MEDIO - Mejora búsqueda
**Archivos modificados:**
- `src/paginas/estudiante/MisPrestamos.tsx`

**Funcionalidades:**
- [x] Filtrar por fecha (rango desde/hasta)
- [x] Filtrar por estado específico
- [x] Ordenar por fecha, recurso o estado
- [x] Orden ascendente/descendente
- [x] Limpiar filtros rápidamente
- [ ] Filtrar por recurso/categoría (pendiente)
- [ ] Filtros en MisHoras (pendiente)

---

## 🟢 PRIORIDAD BAJA (Nice to have)

### 6. Certificados de Horas/Asistencia
**Estado:** No existe
**Impacto:** BAJO - Valor agregado
**Funcionalidades:**
- [ ] Generar certificado PDF de horas acumuladas
- [ ] Certificado de asistencia a evento
- [ ] Firma digital/verificación

### 7. Reportes Avanzados con Gráficos
**Estado:** Básicos
**Impacto:** BAJO - Analytics
**Funcionalidades:**
- [ ] Gráficos de uso de recursos
- [ ] Tendencias de préstamos
- [ ] Estadísticas de eventos
- [ ] Exportar reportes

### 8. Notificaciones por Email
**Estado:** Solo in-app
**Impacto:** MEDIO - Mejora comunicación
**Funcionalidades:**
- [ ] Integración con servicio de email
- [ ] Plantillas de notificaciones
- [ ] Preferencias de usuario

---

## 📊 Resumen de Prioridades

| Prioridad | Caso de Uso | Estado | Complejidad | Impacto |
|-----------|-------------|--------|-------------|---------|
| 🔴 Alta | Gestión de Sanciones | ✅ Completo | Media | CRÍTICO |
| 🔴 Alta | Cancelar Evento + Notificar | ✅ Completo | Baja | ALTO |
| 🟡 Media | Lista de Espera Eventos | ✅ Completo | Media | MEDIO |
| 🟡 Media | Calendario Eventos | No existe | Media | MEDIO |
| 🟡 Media | Filtros Avanzados | ✅ Parcial | Baja | MEDIO |
| 🟢 Baja | Certificados | No existe | Alta | BAJO |
| 🟢 Baja | Reportes Avanzados | Básicos | Alta | BAJO |
| 🟡 Media | Notificaciones Email | Solo in-app | Alta | MEDIO |

---

## 🎯 Recomendación de Implementación

**Fase 1 (Ahora):**
1. ✅ Gestión de Sanciones (UI completa)
2. ✅ Cancelar Evento con Notificación

**Fase 2 (Siguiente):**
3. Lista de Espera para Eventos
4. Filtros Avanzados

**Fase 3 (Futuro):**
5. Calendario de Eventos
6. Notificaciones por Email
7. Certificados
8. Reportes Avanzados

---

**Última actualización:** 25 de Enero, 2026
