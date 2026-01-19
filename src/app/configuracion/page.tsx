import { Settings } from "lucide-react";

export default function ConfiguracionPage() {
    return (
        <div className="p-8 space-y-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4 animate-pulse">
                <Settings size={40} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Configuración del Sistema</h1>
            <p className="text-muted-foreground max-w-md">
                Ajustes de usuario, configuración de la IA (Gemini) y personalización de minutas.
            </p>
        </div>
    );
}
