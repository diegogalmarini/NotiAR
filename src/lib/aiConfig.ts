import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Hybrid Model Configuration
 * - INGEST: Returns gemini-1.5-pro-latest for superior vision/OCR.
 * - DRAFT/DEFAULT: Returns gemini-2.0-flash-exp for speed and cost-efficiency.
 */
export async function getLatestModel(taskType: 'INGEST' | 'DRAFT' = 'DRAFT') {
    if (taskType === 'INGEST') {
        // Flash is significantly faster (usually < 5s),
        // avoiding the 10s Vercel Hobby timeout that Pro often hits.
        return "gemini-1.5-flash-latest";
    }
    return "gemini-1.5-flash-latest";
}
