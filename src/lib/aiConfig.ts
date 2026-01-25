import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * C-LEVEL MODEL HIERARCHY (Gemini 3 / 2.5)
 * GOLD: Maximum accuracy and systemic reasoning (Thinking Mode).
 * SILVER: Mass extraction speed with Gemini 3.
 * BRONZE: High-availability and cost-efficiency.
 */
export const MODEL_HIERARCHY = [
    "gemini-3-pro-preview",    // GOLD: High-fidelity reasoning
    "gemini-3-flash-preview",  // SILVER: High-speed extraction
    "gemini-2.5-flash-lite",   // BRONZE: Efficiency fallback
    "gemini-1.5-pro-002",      // LEGACY GOLD
    "gemini-1.5-flash"         // ULTIMATE FALLBACK
];

/**
 * getModelHierarchy: Returns the full hierarchy for the SkillExecutor to handle fallbacks.
 */
export function getModelHierarchy() {
    return MODEL_HIERARCHY;
}

/**
 * getEvidenceSchema: Returns a JSON Schema fragment for the "valor/evidencia" structure.
 */
export function getEvidenceSchema(type: string = "string") {
    return {
        type: "object",
        properties: {
            valor: { type },
            evidencia_origen: { type: "string" }
        },
        required: ["valor", "evidencia_origen"]
    };
}

/**
 * ACTA_EXTRACCION_PARTES_SCHEMA
 * Strict JSON Schema for the Notary Entity Extractor GOLD standard.
 */
export const ACTA_EXTRACCION_PARTES_SCHEMA = {
    type: "object",
    properties: {
        tipo_objeto: { type: "string", enum: ["ACTA_EXTRACCION_PARTES"] },
        entidades: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    rol: { type: "string", enum: ["VENDEDOR", "COMPRADOR", "APODERADO", "USUFRUCTUARIO", "CONYUGE_ASINTIENTE"] },
                    tipo_persona: { type: "string", enum: ["FISICA", "JURIDICA"] },
                    datos: {
                        type: "object",
                        properties: {
                            nombre_completo: {
                                type: "object",
                                properties: { valor: { type: ["string", "null"] }, evidencia: { type: "string" }, confianza: { type: "number" } },
                                required: ["valor", "evidencia", "confianza"]
                            },
                            dni_cuil_cuit: {
                                type: "object",
                                properties: { valor: { type: ["string", "null"] }, evidencia: { type: "string" }, confianza: { type: "number" } },
                                required: ["valor", "evidencia", "confianza"]
                            },
                            estado_civil: {
                                type: "object",
                                properties: { valor: { type: ["string", "null"], enum: ["SOLTERO", "CASADO", "DIVORCIADO", "VIUDO", "CONVIVIENTE", null] }, evidencia: { type: "string" } },
                                required: ["valor", "evidencia"]
                            },
                            nupcias: {
                                type: "object",
                                properties: { valor: { type: ["number", "null"] }, descripcion: { type: "string" }, evidencia: { type: "string" } },
                                required: ["valor", "descripcion", "evidencia"]
                            },
                            domicilio: {
                                type: "object",
                                properties: { valor: { type: ["string", "null"] }, evidencia: { type: "string" } },
                                required: ["valor", "evidencia"]
                            },
                            nacionalidad: {
                                type: "object",
                                properties: { valor: { type: ["string", "null"] }, evidencia: { type: "string" } },
                                required: ["valor", "evidencia"]
                            }
                        },
                        required: ["nombre_completo", "dni_cuil_cuit", "estado_civil", "nupcias", "domicilio", "nacionalidad"]
                    },
                    representacion: {
                        type: "object",
                        properties: {
                            es_representado: { type: "boolean" },
                            documento_base: { type: ["string", "null"] },
                            folio_evidencia: { type: ["string", "null"] }
                        },
                        required: ["es_representado", "documento_base", "folio_evidencia"]
                    }
                },
                required: ["rol", "tipo_persona", "datos", "representacion"]
            }
        },
        validación_sistémica: {
            type: "object",
            properties: {
                coherencia_identidad: { type: "boolean" },
                observaciones_criticas: { type: ["string", "null"] }
            },
            required: ["coherencia_identidad", "observaciones_criticas"]
        }
    },
    required: ["tipo_objeto", "entidades", "validación_sistémica"]
};

/**
 * getLatestModel: Simple entry point for compatibility.
 */
export async function getLatestModel(taskType: 'INGEST' | 'DRAFT' = 'DRAFT'): Promise<string> {
    return MODEL_HIERARCHY[0];
}

/**
 * estimateCost: Calculates the USD cost based on token usage.
 * Prices based on Gemini 1.5/3 Pro and Flash tiers.
 */
export function estimateCost(modelName: string, inputTokens: number, outputTokens: number): number {
    const isPro = modelName.includes('pro');
    // Prices per 1M tokens (USD)
    const inputPrice = isPro ? 3.50 : 0.10;
    const outputPrice = isPro ? 10.50 : 0.40;

    return ((inputTokens * inputPrice) + (outputTokens * outputPrice)) / 1000000;
}

/**
 * getOrBuildContextCache: Manages Google Context Caching.
 * Reduces costs by 90% for repeated large contexts (Manuals, Laws).
 */
export async function getOrBuildContextCache(content: string, modelName: string): Promise<string | null> {
    // Caching is only effective for content > 32k tokens.
    if (content.length < 100000) return null; // Very rough estimate for 32k tokens

    console.log(`[AI_CONFIG] High-redundancy context detected (${content.length} chars). Checking Context Cache...`);

    // In a production environment, we would use crypto.createHash to identify the content
    // and check a local/DB cache of existing ContextCache names.
    // For now, this serves as the hook for the Notary Cost Monitor skill.
    return null;
}
