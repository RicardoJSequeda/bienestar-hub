import { useState } from "react";
import { useAuth } from "@/contextos/ContextoAutenticacion";
import { Button } from "@/componentes/ui/button";
import { toast } from "@/ganchos/usar-toast";
import { Download, FileText, Loader2 } from "lucide-react";
import jsPDF from "jspdf";

interface CertificateData {
  totalHours: number;
  hoursFromLoans: number;
  hoursFromEvents: number;
  currentLevel: string;
  semesterGoal: number;
}

export function CertificateGenerator({ totalHours, hoursFromLoans, hoursFromEvents, currentLevel, semesterGoal }: CertificateData) {
  const { profile } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);

  const generateCertificate = async () => {
    setIsGenerating(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Header con logo
      doc.setFillColor(0, 51, 102); // Color azul oscuro
      doc.rect(0, 0, pageWidth, 40, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("UNIVERSIDAD COOPERATIVA DE COLOMBIA", pageWidth / 2, 20, { align: "center" });
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.text("Sistema de Bienestar Universitario", pageWidth / 2, 30, { align: "center" });

      // Título del certificado
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("CERTIFICADO DE HORAS", pageWidth / 2, 60, { align: "center" });

      // Contenido
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      
      let yPos = 80;
      doc.text("Se certifica que:", pageWidth / 2, yPos, { align: "center" });
      
      yPos += 15;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(profile?.full_name || "Estudiante", pageWidth / 2, yPos, { align: "center" });
      
      yPos += 20;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.text(`Código: ${profile?.student_code || "N/A"}`, pageWidth / 2, yPos, { align: "center" });
      
      yPos += 20;
      const text = `Ha acumulado un total de ${totalHours.toFixed(1)} horas de bienestar universitario durante el semestre actual, de las cuales ${hoursFromLoans.toFixed(1)} horas provienen de préstamos de recursos y ${hoursFromEvents.toFixed(1)} horas de participación en eventos.`;
      
      const splitText = doc.splitTextToSize(text, pageWidth - 40);
      doc.text(splitText, pageWidth / 2, yPos, { align: "center", maxWidth: pageWidth - 40 });
      
      yPos += splitText.length * 7 + 10;
      doc.text(`Nivel alcanzado: ${currentLevel}`, pageWidth / 2, yPos, { align: "center" });
      
      yPos += 15;
      doc.text(`Meta semestral: ${semesterGoal} horas`, pageWidth / 2, yPos, { align: "center" });
      
      yPos += 20;
      doc.setFontSize(10);
      doc.text(`Fecha de emisión: ${new Date().toLocaleDateString("es-CO", { 
        year: "numeric", 
        month: "long", 
        day: "numeric" 
      })}`, pageWidth / 2, yPos, { align: "center" });

      // Firma
      yPos = pageHeight - 60;
      doc.setFontSize(10);
      doc.text("_________________________", pageWidth / 2, yPos, { align: "center" });
      yPos += 10;
      doc.text("Sistema de Bienestar Universitario", pageWidth / 2, yPos, { align: "center" });
      yPos += 5;
      doc.text("Universidad Cooperativa de Colombia", pageWidth / 2, yPos, { align: "center" });

      // Guardar
      const fileName = `certificado_horas_${profile?.student_code || "estudiante"}_${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);

      toast({
        title: "Certificado generado",
        description: "El certificado se ha descargado correctamente",
      });
    } catch (error) {
      console.error("Error generating certificate:", error);
      toast({
        title: "Error",
        description: "No se pudo generar el certificado",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      onClick={generateCertificate}
      disabled={isGenerating || totalHours === 0}
      variant="outline"
      className="w-full sm:w-auto"
    >
      {isGenerating ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      Generar Certificado PDF
    </Button>
  );
}
