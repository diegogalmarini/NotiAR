import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * GOLD STANDARD HIERARCHY
 * We list models from most intelligent to most available.
 * Every time the app starts or a critical failure occurs, we find the best "living" model.
 */
const MODEL_HIERARCHY = [
    "gemini-1.5-pro-002",   // Top Quality (Stable identifier)
    "gemini-1.5-pro",       // Top Quality (Alias)
    "gemini-2.0-flash-exp", // Next Gen Flash (Very smart)
    "gemini-1.5-flash"      // Safety net (High availability)
];

let activeModel: string | null = null;
let lastCheck = 0;

/**
 * getLatestModel: The self-healing engine of NotiAR.
 * It ensures the SaaS never "dies" by falling back to the next best available model.
 */
export async function getLatestModel(taskType: 'INGEST' | 'DRAFT' = 'DRAFT'): Promise<string> {
    const now = Date.now();
    // Cache the verified model for 30 minutes to optimize latency
    if (activeModel && (now - lastCheck < 1800000)) {
        return activeModel;
    }

    console.log("[AI_CONFIG] Verifying model health for SaaS Core...");

    for (const modelName of MODEL_HIERARCHY) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            // Cheap operation to verify the model is reachable and active for this API Key
            await model.countTokens("health-check");

            activeModel = modelName;
            lastCheck = now;
            console.log(`[AI_CONFIG] Active Engine Set: ${modelName}`);
            return modelName;
        } catch (error) {
            console.warn(`[AI_CONFIG] Model ${modelName} is UNAVAILABLE. Falling back...`);
        }
    }

    // Ultimate fallback if everything fails
    return "gemini-1.5-flash";
}
