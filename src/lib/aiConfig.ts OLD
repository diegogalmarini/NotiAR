import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * FLASH-ONLY HIERARCHY: Velocidad extrema sobre precisión
 * GOLD/SILVER/BRONZE: Todo usa Flash para evitar latencia del Pro.
 */
export const MODEL_HIERARCHY = [
    "gemini-3-flash-preview",  // GOLD: Flash para TODO
    "gemini-3-flash-preview",  // SILVER: Flash para TODO
    "gemini-3-flash-preview"   // BRONZE: Flash para TODO
];

/**
 * getModelHierarchy: Returns the full hierarchy for the SkillExecutor to handle fallbacks.
 */
export function getModelHierarchy() {
    return MODEL_HIERARCHY;
}

/**
 * ACTA_EXTRACCION_PARTES_SCHEMA
 * Strict JSON Schema for the Notary Entity Extractor GOLD standard.
 * Refactored for Google SDK (v1beta) compatibility using SchemaType.
 */
export const ACTA_EXTRACCION_PARTES_SCHEMA: any = {
    type: SchemaType.OBJECT,
    properties: {
        tipo_objeto: {
            type: SchemaType.STRING,
            description: "Debe ser ACTA_EXTRACCION_PARTES"
        },
        entidades: {
            type: SchemaType.ARRAY,
            description: "Lista de personas físicas o jurídicas participantes",
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    rol: {
                        type: SchemaType.STRING,
                        description: "VENDEDOR, COMPRADOR, APODERADO, USUFRUCTUARIO, CONYUGE_ASINTIENTE, ACREEDOR, DEUDOR, FIADOR"
                    },
                    tipo_persona: {
                        type: SchemaType.STRING,
                        description: "FISICA o JURIDICA"
                    },
                    datos: {
                        type: SchemaType.OBJECT,
                        properties: {
                            nombre_completo: {
                                type: SchemaType.OBJECT,
                                properties: {
                                    valor: { type: SchemaType.STRING, nullable: true },
                                    evidencia: { type: SchemaType.STRING }
                                },
                                required: ["valor", "evidencia"]
                            },
                            dni_cuil_cuit: {
                                type: SchemaType.OBJECT,
                                properties: {
                                    valor: { type: SchemaType.STRING, nullable: true },
                                    evidencia: { type: SchemaType.STRING }
                                },
                                required: ["valor", "evidencia"]
                            },
                            estado_civil: {
                                type: SchemaType.OBJECT,
                                properties: {
                                    valor: { type: SchemaType.STRING, nullable: true },
                                    evidencia: { type: SchemaType.STRING }
                                },
                                required: ["valor", "evidencia"]
                            },
                            nupcias: {
                                type: SchemaType.OBJECT,
                                properties: {
                                    valor: { type: SchemaType.NUMBER, nullable: true },
                                    descripcion: { type: SchemaType.STRING },
                                    evidencia: { type: SchemaType.STRING }
                                },
                                required: ["valor", "descripcion", "evidencia"]
                            },
                            domicilio: {
                                type: SchemaType.OBJECT,
                                properties: {
                                    valor: {
                                        type: SchemaType.STRING,
                                        nullable: true,
                                        description: "Dirección COMPLETA y LITERAL. Debe incluir el tipo de vía (Calle, Avenida, Pasaje, Ruta) tal cual figura en el texto. Ej: 'Calle San Martín 123' y NO 'San Martín 123'."
                                    },
                                    evidencia: { type: SchemaType.STRING }
                                },
                                required: ["valor", "evidencia"]
                            },
                            nacionalidad: {
                                type: SchemaType.OBJECT,
                                properties: {
                                    valor: { type: SchemaType.STRING, nullable: true },
                                    evidencia: { type: SchemaType.STRING }
                                },
                                required: ["valor", "evidencia"]
                            }
                        },
                        required: ["nombre_completo", "dni_cuil_cuit", "estado_civil", "nupcias", "domicilio", "nacionalidad"]
                    },
                    representacion: {
                        type: SchemaType.OBJECT,
                        properties: {
                            es_representado: { type: SchemaType.BOOLEAN },
                            documento_base: { type: SchemaType.STRING, nullable: true },
                            folio_evidencia: { type: SchemaType.STRING, nullable: true }
                        },
                        required: ["es_representado", "documento_base", "folio_evidencia"]
                    }
                },
                required: ["rol", "tipo_persona", "datos", "representacion"]
            }
        },
        inmuebles: {
            type: SchemaType.ARRAY,
            description: "Lista de inmuebles objeto de la operación",
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    partido: {
                        type: SchemaType.OBJECT,
                        properties: { valor: { type: SchemaType.STRING }, evidencia: { type: SchemaType.STRING } },
                        required: ["valor", "evidencia"]
                    },
                    partida_inmobiliaria: {
                        type: SchemaType.OBJECT,
                        properties: { valor: { type: SchemaType.STRING }, evidencia: { type: SchemaType.STRING } },
                        required: ["valor", "evidencia"]
                    },
                    nomenclatura: {
                        type: SchemaType.OBJECT,
                        properties: { valor: { type: SchemaType.STRING }, evidencia: { type: SchemaType.STRING } },
                        required: ["valor", "evidencia"]
                    },
                    transcripcion_literal: {
                        type: SchemaType.OBJECT,
                        description: "Transcripción COMPLETA y VERBOSA de las medidas, linderos y superficie. NO ABREVIAR.",
                        properties: { valor: { type: SchemaType.STRING }, evidencia: { type: SchemaType.STRING } },
                        required: ["valor", "evidencia"]
                    },
                    valuacion_fiscal: {
                        type: SchemaType.OBJECT,
                        properties: { valor: { type: SchemaType.NUMBER }, evidencia: { type: SchemaType.STRING } },
                        required: ["valor", "evidencia"]
                    }
                },
                required: ["partido", "partida_inmobiliaria", "nomenclatura", "transcripcion_literal", "valuacion_fiscal"]
            }
        },
        detalles_operacion: {
            type: SchemaType.OBJECT,
            properties: {
                precio: {
                    type: SchemaType.OBJECT,
                    properties: { valor: { type: SchemaType.NUMBER }, moneda: { type: SchemaType.STRING, description: "ARS, USD, UVA" }, evidencia: { type: SchemaType.STRING } },
                    required: ["valor", "moneda", "evidencia"]
                },
                fecha_escritura: {
                    type: SchemaType.OBJECT,
                    properties: { valor: { type: SchemaType.STRING }, evidencia: { type: SchemaType.STRING } },
                    required: ["valor", "evidencia"]
                },
                numero_escritura: {
                    type: SchemaType.OBJECT,
                    properties: { valor: { type: SchemaType.STRING }, evidencia: { type: SchemaType.STRING } },
                    required: ["valor", "evidencia"]
                },
                tipo_acto: {
                    type: SchemaType.OBJECT,
                    properties: { valor: { type: SchemaType.STRING }, evidencia: { type: SchemaType.STRING } },
                    required: ["valor", "evidencia"]
                },
                escribano_nombre: {
                    type: SchemaType.OBJECT,
                    properties: { valor: { type: SchemaType.STRING }, evidencia: { type: SchemaType.STRING } },
                    required: ["valor", "evidencia"]
                },
                registro_numero: {
                    type: SchemaType.OBJECT,
                    properties: { valor: { type: SchemaType.STRING }, evidencia: { type: SchemaType.STRING } },
                    required: ["valor", "evidencia"]
                }
            },
            required: ["precio", "fecha_escritura", "numero_escritura", "tipo_acto", "escribano_nombre", "registro_numero"]
        },
        validacion_sistemica: {
            type: SchemaType.OBJECT,
            properties: {
                coherencia_identidad: { type: SchemaType.BOOLEAN },
                observaciones_criticas: { type: SchemaType.STRING, nullable: true }
            },
            required: ["coherencia_identidad", "observaciones_criticas"]
        }
    },
    required: ["tipo_objeto", "entidades", "inmuebles", "detalles_operacion", "validacion_sistemica"]
};

/**
 * NOTARY_MORTGAGE_READER_SCHEMA
 * Specific schema for financial mortgage terms.
 */
export const NOTARY_MORTGAGE_READER_SCHEMA: any = {
    type: SchemaType.OBJECT,
    properties: {
        financial_terms: {
            type: SchemaType.OBJECT,
            properties: {
                capital: {
                    type: SchemaType.OBJECT,
                    properties: { valor: { type: SchemaType.NUMBER }, currency: { type: SchemaType.STRING }, evidencia: { type: SchemaType.STRING } },
                    required: ["valor", "currency", "evidencia"]
                },
                uva_quoted: {
                    type: SchemaType.OBJECT,
                    properties: { valor: { type: SchemaType.NUMBER }, evidencia: { type: SchemaType.STRING } },
                    required: ["valor", "evidencia"]
                },
                rate: {
                    type: SchemaType.OBJECT,
                    properties: { valor: { type: SchemaType.STRING }, evidencia: { type: SchemaType.STRING } },
                    required: ["valor", "evidencia"]
                },
                system: {
                    type: SchemaType.OBJECT,
                    properties: { valor: { type: SchemaType.STRING }, evidencia: { type: SchemaType.STRING } },
                    required: ["valor", "evidencia"]
                }
            },
            required: ["capital", "uva_quoted", "rate", "system"]
        },
        legal_status: {
            type: SchemaType.OBJECT,
            properties: {
                grado: { type: SchemaType.STRING },
                letra_hipotecaria: { type: SchemaType.BOOLEAN }
            },
            required: ["grado", "letra_hipotecaria"]
        }
    },
    required: ["financial_terms", "legal_status"]
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
