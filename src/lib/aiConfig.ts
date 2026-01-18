import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Stabilized Model Configuration
 * Hardcoded to gemini-1.5-flash-latest for deterministic results in legal drafting.
 */
export async function getLatestModel() {
    // Hardcoded for stability as requested to avoid experimental model hallucinations.
    return "gemini-1.5-flash-latest";
}
