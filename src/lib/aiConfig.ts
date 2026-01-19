import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Hybrid Model Configuration
 * - INGEST: Returns gemini-1.5-pro-latest for superior vision/OCR.
 * - DRAFT/DEFAULT: Returns gemini-2.0-flash-exp for speed and cost-efficiency.
 */
export async function getLatestModel(taskType: 'INGEST' | 'DRAFT' = 'DRAFT') {
    if (taskType === 'INGEST') {
        // Gemini 2.0 Flash is ultra-fast and reliable in v1beta as of now.
        return "gemini-2.0-flash-exp";
    }
    return "gemini-2.0-flash-exp";
}
