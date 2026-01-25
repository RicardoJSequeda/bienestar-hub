import { describe, it, expect } from "vitest";
import { validarEvento, validarRecurso, validarUsuarioEdicion } from "@/utilidades/validaciones";

describe("validaciones", () => {
  it("valida recurso con nombre corto", () => {
    const error = validarRecurso({ nombre: "ab", categoriaId: "cat" });
    expect(error).toBe("El nombre debe tener al menos 3 caracteres");
  });

  it("valida recurso sin categoria", () => {
    const error = validarRecurso({ nombre: "Recurso", categoriaId: null });
    expect(error).toBe("La categoria es requerida");
  });

  it("valida evento con fechas invalidas", () => {
    const error = validarEvento({
      titulo: "Evento",
      inicio: "2024-01-02T10:00",
      fin: "2024-01-02T09:00",
      cupoMaximo: "10",
      horasBienestar: "1",
    });
    expect(error).toBe("La fecha de fin debe ser posterior al inicio");
  });

  it("valida evento con horas invalidas", () => {
    const error = validarEvento({
      titulo: "Evento",
      inicio: "2024-01-02T10:00",
      fin: "2024-01-02T11:00",
      cupoMaximo: "",
      horasBienestar: "0",
    });
    expect(error).toBe("Las horas de bienestar deben ser mayores a 0");
  });

  it("valida usuario con codigo invalido", () => {
    const error = validarUsuarioEdicion({
      nombreCompleto: "Juan Perez",
      codigoEstudiantil: "abc",
      celular: "",
    });
    expect(error).toBe("El codigo estudiantil debe ser numerico (4-10 digitos)");
  });

  it("acepta datos validos", () => {
    const error = validarUsuarioEdicion({
      nombreCompleto: "Juan Perez",
      codigoEstudiantil: "20241000",
      celular: "3001234567",
    });
    expect(error).toBeNull();
  });
});
