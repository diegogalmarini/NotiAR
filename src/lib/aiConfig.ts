import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Hybrid Model Configuration
 * - INGEST: Returns gemini-1.5-pro-latest for superior vision/OCR.
 * - DRAFT/DEFAULT: Returns gemini-2.0-flash-exp for speed and cost-efficiency.
 */
export async function getLatestModel(taskType?: 'INGEST' | 'DRAFT') {
    if (taskType === 'INGEST') {
        return "gemini-1.5-pro-latest";
    }

    // Default to latest Flash for speed
    return "gemini-2.0-flash-exp";
}
