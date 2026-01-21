"use server";

import { supabase } from "@/lib/supabaseClient";

export async function getClientWithRelations(dni: string) {
    try {
        // 1. Get the client (persona) data
        const { data: persona, error: personaError } = await supabase
            .from("personas")
            .select("*")
            .eq("dni", dni)
            .single();

        if (personaError) {
            console.error("Error fetching persona:", personaError);
            return { success: false, error: "No se encontró el cliente" };
        }

        // 2. Get participaciones in operaciones
        const { data: participaciones, error: partError } = await supabase
            .from("participantes_operacion")
            .select("*")
            .eq("persona_id", dni);

        if (partError) {
            console.error("Error fetching participaciones:", partError);
        }

        console.log("[DEBUG] Participaciones for DNI", dni, ":", participaciones);

        // 3. Get operaciones details
        const operacionIds = participaciones?.map(p => p.operacion_id).filter(Boolean) || [];
        const { data: operacionesData } = await supabase
            .from("operaciones")
            .select("*")
            .in("id", operacionIds);

        console.log("[DEBUG] Operaciones:", operacionesData);

        // 4. Get escrituras details
        const escrituraIds = operacionesData?.map(o => o.escritura_id).filter(Boolean) || [];
        const { data: escriturasData } = await supabase
            .from("escrituras")
            .select("*")
            .in("id", escrituraIds);

        console.log("[DEBUG] Escrituras:", escriturasData);

        // 5. Get carpetas details
        const carpetaIds = escriturasData?.map(e => e.carpeta_id).filter(Boolean) || [];
        const { data: carpetasData } = await supabase
            .from("carpetas")
            .select("*")
            .in("id", carpetaIds);

        console.log("[DEBUG] Carpetas:", carpetasData);

        // 6. Build the relationships
        const operaciones = participaciones?.map(part => {
            const op = operacionesData?.find(o => o.id === part.operacion_id);
            const esc = escriturasData?.find(e => e.id === op?.escritura_id);
            const carp = carpetasData?.find(c => c.id === esc?.carpeta_id);

            return {
                id: op?.id || '',
                tipo: op?.tipo || '',
                rol: part.rol || '',
                escritura: esc ? {
                    id: esc.id,
                    numero: esc.numero,
                    tipo: esc.tipo,
                    carpeta: carp ? {
                        id: carp.id,
                        numero: carp.numero
                    } : undefined
                } : undefined
            };
        }).filter(op => op.id) || [];

        const carpetas = carpetasData?.map(c => ({
            id: c.id,
            numero: c.numero,
            observaciones: c.observaciones || c.descripcion || ''
        })) || [];

        const escrituras = escriturasData?.map(e => ({
            id: e.id,
            numero: e.numero,
            tipo: e.tipo
        })) || [];

        return {
            success: true,
            data: {
                persona,
                operaciones,
                escrituras,
                carpetas
            }
        };
    } catch (error: any) {
        console.error("Error in getClientWithRelations:", error);
        return { success: false, error: error.message };
    }
}
