import { Package, Calendar, Search } from "lucide-react"

interface EmptyStateProps {
    title: string
    description: string
    icon?: React.ElementType
}

export function EmptyState({ title, description, icon: Icon = Package }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in zoom-in duration-500">
            <div className="bg-muted/30 p-4 rounded-full mb-4">
                <Icon className="h-12 w-12 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <p className="text-muted-foreground max-w-sm mt-1">{description}</p>
        </div>
    )
}

export function EmptyLoans() {
    return (
        <EmptyState
            title="Sin préstamos activos"
            description="No tienes materiales prestados actualmente. ¡Explora el catálogo para solicitar uno!"
            icon={Package}
        />
    )
}

export function EmptyEvents() {
    return (
        <EmptyState
            title="Sin eventos próximos"
            description="No estás inscrito en ningún evento. Revisa la agenda para participar."
            icon={Calendar}
        />
    )
}

export function EmptySearch() {
    return (
        <EmptyState
            title="Sin resultados"
            description="No encontramos nada que coincida con tu búsqueda. Intenta con otros términos."
            icon={Search}
        />
    )
}
