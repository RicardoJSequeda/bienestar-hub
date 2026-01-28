import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/componentes/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary capturo un error:", error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <Card className="max-w-md w-full shadow-lg">
            <CardHeader>
              <CardTitle>Ocurrio un error</CardTitle>
              <CardDescription>
                Algo salio mal al cargar la aplicacion. Puedes intentar recargar.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-end">
              <Button onClick={this.handleReload}>Recargar</Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
