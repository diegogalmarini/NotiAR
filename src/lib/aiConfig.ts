import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Hybrid Model Configuration
 * - INGEST: Gemini 1.5 Pro 002 (The gold standard for zero-error document extraction)
 * - DRAFT/DEFAULT: Gemini 1.5 Pro 002
 */
export async function getLatestModel(taskType: 'INGEST' | 'DRAFT' = 'DRAFT') {
    // We use the stable '002' identifier to avoid 404 aliasing issues in the SDK
    return "gemini-1.5-pro-002";
}
