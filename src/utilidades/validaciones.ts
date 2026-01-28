interface ValidarRecursoInput {
  nombre: string;
  categoriaId: string | null;
}

interface ValidarEventoInput {
  titulo: string;
  inicio: string;
  fin: string;
  cupoMaximo: string;
  horasBienestar: string;
}

interface ValidarUsuarioEdicionInput {
  nombreCompleto: string;
  codigoEstudiantil: string;
  celular: string;
}

export function validarRecurso(data: ValidarRecursoInput): string | null {
  const nombre = data.nombre.trim();
  if (nombre.length < 3) {
    return "El nombre debe tener al menos 3 caracteres";
  }

  if (!data.categoriaId) {
    return "La categoria es requerida";
  }

  return null;
}

export function validarEvento(data: ValidarEventoInput): string | null {
  const titulo = data.titulo.trim();
  if (!titulo || !data.inicio || !data.fin) {
    return "Completa los campos requeridos";
  }

  if (titulo.length < 3) {
    return "El titulo debe tener al menos 3 caracteres";
  }

  const inicio = new Date(data.inicio);
  const fin = new Date(data.fin);
  if (fin <= inicio) {
    return "La fecha de fin debe ser posterior al inicio";
  }

  const cupo = data.cupoMaximo ? parseInt(data.cupoMaximo) : null;
  if (cupo !== null && cupo < 1) {
    return "El cupo maximo debe ser mayor a 0";
  }

  const horas = parseFloat(data.horasBienestar);
  if (Number.isNaN(horas) || horas <= 0) {
    return "Las horas de bienestar deben ser mayores a 0";
  }

  return null;
}

export function validarUsuarioEdicion(data: ValidarUsuarioEdicionInput): string | null {
  const nombre = data.nombreCompleto.trim();
  if (nombre.length < 3) {
    return "El nombre debe tener al menos 3 caracteres";
  }

  const codigo = data.codigoEstudiantil.trim();
  const codigoRegex = /^\d{4,10}$/;
  if (codigo && !codigoRegex.test(codigo)) {
    return "El codigo estudiantil debe ser numerico (4-10 digitos)";
  }

  const celular = data.celular.trim();
  const celularRegex = /^\d{7,15}$/;
  if (celular && !celularRegex.test(celular)) {
    return "El celular debe tener entre 7 y 15 digitos";
  }

  return null;
}
