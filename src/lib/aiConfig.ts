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
 * getLatestModel: Simple entry point for compatibility.
 */
export async function getLatestModel(taskType: 'INGEST' | 'DRAFT' = 'DRAFT'): Promise<string> {
    return MODEL_HIERARCHY[0];
}
