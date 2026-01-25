import { createRoot } from "react-dom/client";
import Aplicacion from "./Aplicacion";
import { ErrorBoundary } from "@/componentes/errores/ErrorBoundary";
import "./estilos.css";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <Aplicacion />
  </ErrorBoundary>
);
