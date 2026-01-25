import { useState, useRef } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { ImagePlus, X, Loader2, UploadCloud } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ImageUploadProps {
    value?: string | null;
    onChange: (url: string) => void;
    bucket: "resource-images" | "event-images" | "category-images" | "profile-avatars";
    label?: string;
}

export function ImageUpload({ value, onChange, bucket, label = "Imagen" }: ImageUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const file = event.target.files?.[0];
            if (!file) return;

            // Validaciones
            const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
            if (!allowedTypes.includes(file.type)) {
                toast({
                    variant: "destructive",
                    title: "Formato no válido",
                    description: "Solo se permiten imágenes (JPG, PNG, WebP, GIF)",
                });
                return;
            }

            if (file.size > 2 * 1024 * 1024) {
                toast({
                    variant: "destructive",
                    title: "Archivo muy grande",
                    description: "La imagen no debe superar los 2MB",
                });
                return;
            }

            setIsUploading(true);
            const fileExt = file.name.split(".").pop();
            const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(filePath);

            onChange(publicUrl);
            toast({
                title: "Imagen cargada",
                description: "La imagen se ha subido correctamente.",
            });
        } catch (error: any) {
            console.error("Error uploading image:", error);
            toast({
                variant: "destructive",
                title: "Error al subir",
                description: error.message || "No se pudo cargar la imagen",
            });
        } finally {
            setIsUploading(false);
        }
    };

    const removeImage = () => {
        onChange("");
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <div className="space-y-3">
            <Label>{label}</Label>

            {value ? (
                <div className="relative aspect-video rounded-lg overflow-hidden border bg-muted group">
                    <img src={value} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                        >
                            Cambiar
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8"
                            onClick={removeImage}
                            disabled={isUploading}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            ) : (
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors"
                >
                    {isUploading ? (
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    ) : (
                        <>
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <UploadCloud className="h-6 w-6 text-primary" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-medium">Haz clic para subir</p>
                                <p className="text-xs text-muted-foreground">JPG, PNG o WebP (Máx. 2MB)</p>
                            </div>
                        </>
                    )}
                </div>
            )}

            <Input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleUpload}
                disabled={isUploading}
            />
        </div>
    );
}
