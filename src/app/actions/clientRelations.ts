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
            .select(`
                rol,
                operacion:operaciones (
                    id,
                    tipo,
                    escritura:escrituras (
                        id,
                        numero,
                        tipo,
                        carpeta:carpetas (
                            id,
                            numero,
                            observaciones
                        )
                    )
                )
            `)
            .eq("persona_dni", dni);

        if (partError) {
            console.error("Error fetching participaciones:", partError);
        }

        // 3. Process and organize the relationships
        const carpetas = new Map();
        const escrituras = new Map();
        const operaciones: any[] = [];

        participaciones?.forEach((part: any) => {
            if (part.operacion) {
                // Add operación with role
                operaciones.push({
                    id: part.operacion.id,
                    tipo: part.operacion.tipo,
                    rol: part.rol,
                    escritura: part.operacion.escritura
                });

                // Add escritura if exists
                if (part.operacion.escritura) {
                    const esc = part.operacion.escritura;
                    if (!escrituras.has(esc.id)) {
                        escrituras.set(esc.id, {
                            id: esc.id,
                            numero: esc.numero,
                            tipo: esc.tipo,
                            carpeta: esc.carpeta
                        });
                    }

                    // Add carpeta if exists
                    if (esc.carpeta) {
                        const carp = esc.carpeta;
                        if (!carpetas.has(carp.id)) {
                            carpetas.set(carp.id, {
                                id: carp.id,
                                numero: carp.numero,
                                observaciones: carp.observaciones
                            });
                        }
                    }
                }
            }
        });

        return {
            success: true,
            data: {
                persona,
                operaciones,
                escrituras: Array.from(escrituras.values()),
                carpetas: Array.from(carpetas.values())
            }
        };
    } catch (error: any) {
        console.error("Error in getClientWithRelations:", error);
        return { success: false, error: error.message };
    }
}
