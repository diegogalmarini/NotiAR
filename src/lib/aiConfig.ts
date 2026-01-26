import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * HYBRID HIERARCHY v2.0 (Gemini 3 Era)
 * Estrategia de "Cerebro Híbrido":
 * - Flash: Para clasificación, chat rápido y tareas de interfaz (Latencia < 500ms).
 * - Pro: Para lectura jurídica profunda, extracción de hipotecas y redacción compleja (Razonamiento Superior).
 */
export const MODEL_MAPPING = {
    fast: "gemini-3-flash-preview",      // Clasificación, UI, Extracción simple
    complex: "gemini-3-pro-preview",     // Lectura de Escrituras (24.pdf), Hipotecas, Sociedades
    vision: "gemini-3-pro-preview"       // OCR con ruido, DNI, Planos
};

// Mantenemos esto por compatibilidad, pero apuntando al modelo más capaz para fallbacks generales
export const MODEL_HIERARCHY = [
    MODEL_MAPPING.complex, // GOLD: Pro
    MODEL_MAPPING.fast,    // SILVER: Flash
    MODEL_MAPPING.fast     // BRONZE: Flash
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
            description: "Lista de personas físicas o jurídicas participantes. CRITICO: Distinguir Representantes de Representados.",
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    rol: {
                        type: SchemaType.STRING,
                        description: "VENDEDOR, COMPRADOR, ACREEDOR (Banco), DEUDOR, FIADOR. Si es apoderado, usar el rol de la entidad principal."
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
                            dni: {
                                type: SchemaType.OBJECT,
                                description: "DNI: 7-8 dígitos SIN guiones. Ej: 25765599. SOLO para Personas Físicas. null para Jurídicas.",
                                properties: {
                                    valor: { type: SchemaType.STRING, nullable: true },
                                    evidencia: { type: SchemaType.STRING }
                                },
                                required: ["valor", "evidencia"]
                            },
                            cuit_cuil: {
                                type: SchemaType.OBJECT,
                                description: "CUIT/CUIL: 11 dígitos con formato XY-DDDDDDDD-Z. Ej: 20-25765599-8. Preservar guiones. null si no está en documento.",
                                properties: {
                                    valor: { type: SchemaType.STRING, nullable: true },
                                    evidencia: { type: SchemaType.STRING }
                                },
                                required: ["valor", "evidencia"]
                            },
                            estado_civil: { // Solo para Personas Físicas
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
                                        description: "Dirección COMPLETA y LITERAL. Debe incluir el tipo de vía."
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
                            },
                            fecha_nacimiento: {
                                type: SchemaType.OBJECT,
                                description: "Fecha en formato ISO YYYY-MM-DD. Convertir texto a ISO.",
                                properties: {
                                    valor: { type: SchemaType.STRING, nullable: true },
                                    evidencia: { type: SchemaType.STRING }
                                },
                                required: ["valor", "evidencia"]
                            },
                            conyuge: {
                                type: SchemaType.OBJECT,
                                description: "Datos del cónyuge si está casado y se menciona. null si soltero/divorciado.",
                                properties: {
                                    nombre_completo: { type: SchemaType.STRING, nullable: true },
                                    dni: { type: SchemaType.STRING, nullable: true },
                                    cuit_cuil: { type: SchemaType.STRING, nullable: true },
                                    evidencia: { type: SchemaType.STRING }
                                },
                                required: ["evidencia"]
                            }
                        },
                        required: ["nombre_completo", "dni", "cuit_cuil", "domicilio"] // dni y cuit_cuil separados
                    },
                    representacion: {
                        type: SchemaType.OBJECT,
                        description: "Detalle de la cadena de mando / poder.",
                        properties: {
                            es_representado: { type: SchemaType.BOOLEAN, description: "True si esta entidad actúa a través de un humano (ej. Banco)." },
                            representantes: { // Nueva estructura anidada para Norman Giralde
                                type: SchemaType.ARRAY,
                                items: {
                                    type: SchemaType.OBJECT,
                                    properties: {
                                        nombre: { type: SchemaType.STRING },
                                        caracter: { type: SchemaType.STRING, description: "Apoderado, Presidente, Socio Gerente" },
                                        dni: { type: SchemaType.STRING, nullable: true }
                                    }
                                }
                            },
                            documento_base: { type: SchemaType.STRING, nullable: true },
                            folio_evidencia: { type: SchemaType.STRING, nullable: true }
                        },
                        required: ["es_representado"]
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
                        description: "Transcripción COMPLETA y VERBOSA de las medidas. Ignorar ruido OCR como '$'.",
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
 * getLatestModel: Inteligencia de Selección de Modelo.
 * - INGEST (Lectura): Usa PRO para entender estructuras complejas (Bancos, Poderes).
 * - DRAFT (Redacción): Usa PRO para garantizar precisión legal.
 * - CLASSIFY (Otros): Usa FLASH para velocidad.
 */
export async function getLatestModel(taskType: 'INGEST' | 'DRAFT' | 'CLASSIFY' = 'DRAFT'): Promise<string> {
    if (taskType === 'INGEST' || taskType === 'DRAFT') {
        return MODEL_MAPPING.complex; // Gemini 3 Pro
    }
    return MODEL_MAPPING.fast; // Gemini 3 Flash
}

/**
 * estimateCost: Calculates the USD cost based on token usage.
 * Updated for Gemini 3 pricing tiers.
 */
export function estimateCost(modelName: string, inputTokens: number, outputTokens: number): number {
    const isPro = modelName.includes('pro');
    // Precios Estimados Gemini 3 (Sujeto a cambios oficiales)
    // Pro: $3.50/$10.50 (aprox) | Flash: $0.10/$0.40
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