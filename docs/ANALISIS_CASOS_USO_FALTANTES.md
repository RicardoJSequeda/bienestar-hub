# Análisis Completo de Casos de Uso Faltantes

**Fecha:** 25 de Enero, 2026  
**Estado:** Análisis exhaustivo por módulo

---

## 📋 Resumen Ejecutivo

Este documento identifica todos los casos de uso faltantes o incompletos en el sistema Bienestar Hub, organizados por módulo y prioridad.

---

## 🔴 MÓDULO: RECURSOS

### Estado Actual
- ✅ CRUD completo (Crear, Leer, Actualizar, Eliminar)
- ✅ Búsqueda básica por nombre/descripción
- ✅ Gestión de categorías
- ✅ Subida de imágenes
- ✅ Estados: disponible, prestado, mantenimiento

### Casos de Uso Faltantes

#### 1. **Gestión de Inventario Avanzada** (Prioridad: Media)
- [ ] **Historial de movimientos**: Ver quién ha usado cada recurso y cuándo
- [ ] **Estadísticas de uso**: Veces prestado, horas totales de uso, popularidad
- [ ] **Mantenimiento programado**: Agendar mantenimientos periódicos
- [ ] **Alertas de bajo stock**: Si hay múltiples recursos del mismo tipo
- [ ] **Código QR/Serial único**: Escanear para identificar recursos rápidamente
- [ ] **Filtros avanzados**: Por categoría, estado, fecha de creación, campus

#### 2. **Importación/Exportación** (Prioridad: Baja)
- [ ] **Importar recursos desde CSV/Excel**
- [ ] **Exportar inventario completo**
- [ ] **Plantilla de importación**

#### 3. **Gestión de Categorías** (Prioridad: Media)
- [ ] **Ver recursos por categoría** (ya existe en estudiante, falta en admin)
- [ ] **Estadísticas por categoría**
- [ ] **Reordenar categorías** (drag & drop)

---

## 🔴 MÓDULO: PRÉSTAMOS

### Estado Actual
- ✅ Solicitar préstamo
- ✅ Aprobar/rechazar (admin)
- ✅ Entregar/devolver
- ✅ Cancelar solicitud (estudiante)
- ✅ Extensión de préstamo
- ✅ Calificación post-devolución
- ✅ Exportar historial (CSV/PDF)
- ✅ Recordatorios automáticos (backend)
- ✅ Renovación automática (backend)
- ✅ Cola de espera
- ✅ Préstamo presencial
- ✅ Auto-aprobación para recursos de bajo riesgo

### Casos de Uso Faltantes

#### 1. **Gestión de Cola de Espera** (Prioridad: Media)
- [ ] **Ver cola de espera completa** (admin): Quién está esperando qué recurso
- [ ] **Notificar automáticamente** cuando recurso está disponible
- [ ] **Reorganizar cola**: Cambiar prioridades manualmente
- [ ] **Expirar posiciones**: Si usuario no responde en X tiempo

#### 2. **Reportes de Préstamos** (Prioridad: Media)
- [ ] **Gráficos de tendencias**: Préstamos por mes, categoría, recurso
- [ ] **Análisis de devoluciones tardías**: Tasa de retraso, recursos más problemáticos
- [ ] **Estadísticas de calificaciones**: Recursos mejor/poor calificados
- [ ] **Exportar reportes personalizados**: Con filtros específicos

#### 3. **Gestión de Daños/Pérdidas** (Prioridad: Alta)
- [ ] **Registrar daño con fotos**: Subir imágenes del daño
- [ ] **Cobro de multas**: Sistema de cálculo automático
- [ ] **Historial de daños por recurso**: Ver recurso problemático
- [ ] **Notificar a estudiante sobre multa**

#### 4. **Búsqueda y Filtros Avanzados (Admin)** (Prioridad: Media)
- [ ] **Filtros por estudiante, recurso, fecha, estado**
- [ ] **Búsqueda por código de estudiante**
- [ ] **Filtros combinados** (múltiples criterios)
- [ ] **Guardar filtros favoritos**

---

## 🔴 MÓDULO: EVENTOS

### Estado Actual
- ✅ CRUD completo
- ✅ Inscripción/cancelación
- ✅ Registro de asistencia
- ✅ Cancelar evento con notificación
- ✅ Lista de espera
- ✅ Categorías de eventos
- ✅ Búsqueda básica

### Casos de Uso Faltantes

#### 1. **Vista de Calendario** (Prioridad: Media)
- [ ] **Vista mensual**: Ver todos los eventos en calendario
- [ ] **Vista semanal**: Planificación semanal
- [ ] **Vista diaria**: Agenda del día
- [ ] **Filtros en calendario**: Por categoría, campus
- [ ] **Exportar a iCal/Google Calendar**

#### 2. **Gestión de Lista de Espera (Admin)** (Prioridad: Media)
- [ ] **Ver lista de espera por evento**: Quién está esperando
- [ ] **Gestionar posiciones**: Reorganizar manualmente
- [ ] **Notificar manualmente**: Si hay cupo disponible
- [ ] **Estadísticas de lista de espera**: Eventos más demandados

#### 3. **Eventos Recurrentes** (Prioridad: Baja)
- [ ] **Crear eventos recurrentes**: Semanal, mensual
- [ ] **Editar serie completa**: Modificar todos los eventos de una serie
- [ ] **Cancelar serie completa**

#### 4. **Recordatorios de Eventos** (Prioridad: Media)
- [ ] **Recordatorio automático**: 24h antes del evento
- [ ] **Recordatorio personalizado**: Configurar tiempo
- [ ] **Notificación push**: Si está disponible

#### 5. **Reportes de Eventos** (Prioridad: Baja)
- [ ] **Tasa de asistencia**: % de inscritos que asistieron
- [ ] **Eventos más populares**: Por inscripciones
- [ ] **Análisis de participación**: Estudiantes más activos

---

## 🔴 MÓDULO: HORAS DE BIENESTAR

### Estado Actual
- ✅ Visualización de horas acumuladas
- ✅ Progreso semestral
- ✅ Desglose por fuente (préstamos/eventos)
- ✅ Gamificación (niveles)
- ✅ Tendencia mensual
- ✅ Historial básico

### Casos de Uso Faltantes

#### 1. **Filtros Avanzados** (Prioridad: Media)
- [ ] **Filtrar por tipo de fuente**: Solo préstamos, solo eventos
- [ ] **Filtrar por rango de fechas**
- [ ] **Filtrar por categoría de recurso/evento**
- [ ] **Ordenar por fecha, horas, fuente**

#### 2. **Certificados** (Prioridad: Media)
- [ ] **Generar certificado PDF**: Horas acumuladas
- [ ] **Certificado de asistencia a evento**: Individual
- [ ] **Firma digital/verificación**: Código QR para verificar
- [ ] **Plantilla personalizable**: Con logo institucional

#### 3. **Estadísticas Avanzadas** (Prioridad: Baja)
- [ ] **Gráficos de progreso**: Línea de tiempo
- [ ] **Comparación con otros estudiantes**: Anónima
- [ ] **Proyección de meta**: Si continúa al ritmo actual

---

## 🔴 MÓDULO: SANCIONES

### Estado Actual
- ✅ Crear sanción (admin)
- ✅ Ver sanciones (admin y estudiante)
- ✅ Apelar sanción (estudiante)
- ✅ Resolver apelación (admin)
- ✅ Bloqueo automático (críticas/altas)
- ✅ Asociar a política institucional

### Casos de Uso Faltantes

#### 1. **Historial y Análisis** (Prioridad: Baja)
- [ ] **Estadísticas de sanciones**: Por tipo, severidad, período
- [ ] **Tendencias**: Aumento/disminución de sanciones
- [ ] **Estudiantes más sancionados**: Identificar patrones

#### 2. **Automatización** (Prioridad: Media)
- [ ] **Sanciones automáticas**: Por devoluciones tardías repetidas
- [ ] **Escalamiento automático**: Si acumula X sanciones
- [ ] **Notificación a coordinadores**: Cuando se aplica sanción crítica

---

## 🔴 MÓDULO: USUARIOS

### Estado Actual
- ✅ Ver lista de usuarios
- ✅ Editar perfil
- ✅ Asignar/quitar rol admin
- ✅ Eliminar usuario
- ✅ Búsqueda básica
- ✅ Crear sanción desde usuario

### Casos de Uso Faltantes

#### 1. **Gestión de Roles Avanzada** (Prioridad: Media)
- [ ] **Roles adicionales**: Coordinador, Monitor, Manager
- [ ] **Permisos granulares**: Por módulo/función
- [ ] **Historial de cambios de rol**: Auditoría

#### 2. **Gestión de Perfiles** (Prioridad: Media)
- [ ] **Ver perfil completo**: Préstamos, eventos, horas, sanciones
- [ ] **Editar información académica**: Programa, código estudiante
- [ ] **Historial de actividad**: Timeline de acciones
- [ ] **Bloquear/desbloquear manualmente**: Sin sanción

#### 3. **Importación/Exportación** (Prioridad: Baja)
- [ ] **Importar usuarios desde CSV**
- [ ] **Exportar lista de usuarios**
- [ ] **Sincronización con sistema académico**

#### 4. **Búsqueda Avanzada** (Prioridad: Media)
- [ ] **Filtros múltiples**: Por rol, campus, programa, estado
- [ ] **Búsqueda por código de estudiante**
- [ ] **Ordenar por diferentes criterios**

---

## 🔴 MÓDULO: REPORTES

### Estado Actual
- ✅ Resumen mensual (préstamos, eventos, horas)
- ✅ Top recursos más prestados
- ✅ Top estudiantes por horas
- ✅ Exportar a CSV
- ✅ Predicción de demanda
- ✅ Panel de alertas

### Casos de Uso Faltantes

#### 1. **Gráficos Visuales** (Prioridad: Media)
- [ ] **Gráficos de barras**: Préstamos por mes
- [ ] **Gráficos de líneas**: Tendencias temporales
- [ ] **Gráficos de pastel**: Distribución por categoría
- [ ] **Dashboard interactivo**: Con filtros dinámicos

#### 2. **Reportes Personalizados** (Prioridad: Media)
- [ ] **Crear reportes personalizados**: Seleccionar métricas
- [ ] **Guardar reportes favoritos**
- [ ] **Programar reportes**: Envío automático por email
- [ ] **Comparar períodos**: Mes actual vs mes anterior

#### 3. **Exportación Avanzada** (Prioridad: Baja)
- [ ] **Exportar a PDF**: Con gráficos y formato profesional
- [ ] **Exportar a Excel**: Con múltiples hojas
- [ ] **Exportar a PowerPoint**: Para presentaciones

#### 4. **Análisis Predictivo** (Prioridad: Baja)
- [ ] **Predicción de demanda mejorada**: ML básico
- [ ] **Identificar patrones**: Recursos/eventos estacionales
- [ ] **Recomendaciones**: Basadas en datos históricos

---

## 🔴 MÓDULO: CONFIGURACIÓN

### Estado Actual
- ✅ Configuración del sistema (horas semestrales, etc.)
- ✅ Gestión de categorías de recursos
- ✅ Gestión de categorías de eventos
- ✅ Configuración de políticas de préstamos

### Casos de Uso Faltantes

#### 1. **Gestión de Políticas Institucionales** (Prioridad: Alta)
- [ ] **CRUD de políticas**: Crear, editar, eliminar políticas
- [ ] **Versiones de políticas**: Historial de cambios
- [ ] **Publicar/despublicar políticas**: Activar/desactivar
- [ ] **Vista pública de políticas**: Para estudiantes
- [ ] **Aceptar políticas**: Requerir aceptación al registrarse

#### 2. **Gestión de Campus y Programas** (Prioridad: Media)
- [ ] **CRUD de campus**: Crear, editar, eliminar
- [ ] **CRUD de programas académicos**: Gestión completa
- [ ] **Asignar recursos a campus**: Filtrar por campus
- [ ] **Estadísticas por campus**: Reportes separados

#### 3. **Configuración de Notificaciones** (Prioridad: Media)
- [ ] **Plantillas de notificaciones**: Personalizar mensajes
- [ ] **Configurar tipos de notificaciones**: Activar/desactivar
- [ ] **Configurar frecuencia**: Cuándo enviar recordatorios

#### 4. **Backup y Restauración** (Prioridad: Baja)
- [ ] **Exportar configuración**: Backup de settings
- [ ] **Importar configuración**: Restaurar desde backup
- [ ] **Historial de cambios**: Auditoría de configuraciones

---

## 🔴 MÓDULO: NOTIFICACIONES

### Estado Actual
- ✅ Notificaciones in-app
- ✅ Marcar como leída
- ✅ Marcar todas como leídas
- ✅ Contador de no leídas
- ✅ Tiempo real (Supabase Realtime)
- ✅ Toast automático

### Casos de Uso Faltantes

#### 1. **Gestión de Notificaciones** (Prioridad: Media)
- [ ] **Página de notificaciones completa**: Ver todas, no solo últimas 20
- [ ] **Filtrar notificaciones**: Por tipo, fecha, leídas/no leídas
- [ ] **Eliminar notificaciones**: Individual o masivo
- [ ] **Archivar notificaciones**: Mantener historial sin saturar

#### 2. **Notificaciones por Email** (Prioridad: Media)
- [ ] **Integración con servicio de email**: SendGrid, Mailgun, etc.
- [ ] **Plantillas de email**: Personalizables
- [ ] **Preferencias de usuario**: Qué notificaciones por email
- [ ] **Confirmación de lectura**: Tracking de emails abiertos

#### 3. **Notificaciones Push** (Prioridad: Baja)
- [ ] **Push notifications**: Para PWA
- [ ] **Configurar permisos**: Usuario decide qué recibir
- [ ] **Notificaciones programadas**: Recordatorios

---

## 🔴 MÓDULO: DASHBOARD

### Estado Actual
- ✅ Dashboard estudiante: Préstamos activos, eventos próximos, recursos recomendados
- ✅ Dashboard admin: Estadísticas generales, préstamos pendientes, eventos próximos
- ✅ Progreso de horas
- ✅ Acciones rápidas

### Casos de Uso Faltantes

#### 1. **Widgets Personalizables** (Prioridad: Baja)
- [ ] **Arrastrar y soltar widgets**: Personalizar dashboard
- [ ] **Agregar/quitar widgets**: Según necesidades
- [ ] **Guardar configuración**: Por usuario

#### 2. **Acciones Rápidas Mejoradas** (Prioridad: Media)
- [ ] **Atajos de teclado**: Para acciones comunes
- [ ] **Búsqueda global**: Buscar en todo el sistema
- [ ] **Accesos directos**: A funciones frecuentes

#### 3. **Análisis en Dashboard** (Prioridad: Media)
- [ ] **Gráficos mini**: Tendencias rápidas
- [ ] **Alertas destacadas**: Problemas urgentes
- [ ] **Actividad reciente**: Timeline de acciones

---

## 🔴 MÓDULO: AUTENTICACIÓN

### Estado Actual
- ✅ Login/Registro
- ✅ Recuperación de contraseña
- ✅ Verificación de email
- ✅ Establecer contraseña

### Casos de Uso Faltantes

#### 1. **Gestión de Sesiones** (Prioridad: Media)
- [ ] **Ver sesiones activas**: Dispositivos conectados
- [ ] **Cerrar sesión remota**: Desde otros dispositivos
- [ ] **Historial de inicios de sesión**: Auditoría

#### 2. **Autenticación de Dos Factores** (Prioridad: Baja)
- [ ] **2FA con TOTP**: Google Authenticator, etc.
- [ ] **Códigos de respaldo**: Para recuperar acceso
- [ ] **Configuración opcional**: Activar/desactivar

---

## 📊 Priorización General

### 🔴 Prioridad Alta (Críticos)
1. **Gestión de Políticas Institucionales** (Configuración)
2. **Gestión de Daños/Pérdidas** (Préstamos)
3. **Filtros Avanzados en MisHoras** (Horas de Bienestar)

### 🟡 Prioridad Media (Importantes)
1. **Vista de Calendario** (Eventos)
2. **Gestión de Lista de Espera (Admin)** (Eventos)
3. **Gráficos Visuales** (Reportes)
4. **Gestión de Notificaciones** (Notificaciones)
5. **Notificaciones por Email** (Notificaciones)
6. **Certificados** (Horas de Bienestar)
7. **Gestión de Roles Avanzada** (Usuarios)
8. **Búsqueda Avanzada** (Usuarios, Préstamos Admin)

### 🟢 Prioridad Baja (Nice to have)
1. **Importación/Exportación** (Varios módulos)
2. **Widgets Personalizables** (Dashboard)
3. **Autenticación de Dos Factores** (Autenticación)
4. **Análisis Predictivo** (Reportes)
5. **Eventos Recurrentes** (Eventos)

---

## 📝 Notas Finales

- **Total de casos de uso identificados**: ~60+
- **Críticos**: 3
- **Importantes**: 15+
- **Nice to have**: 10+

**Recomendación**: Enfocarse primero en los casos de uso de prioridad alta y media que tienen mayor impacto en la experiencia del usuario y la gestión administrativa.

---

**Última actualización:** 25 de Enero, 2026
