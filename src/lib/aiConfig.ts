import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Hybrid Model Configuration
 * - INGEST: Gemini 2.0 Flash (Optimized for speed/vision in this environment)
 * - DRAFT/DEFAULT: Gemini 2.0 Flash
 */
export async function getLatestModel(taskType: 'INGEST' | 'DRAFT' = 'DRAFT') {
    // Force use gemini-2.0-flash-exp as it is known to work and has excellent OCR capabilities
    return "gemini-2.0-flash-exp";
}
