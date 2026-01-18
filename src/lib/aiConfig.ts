import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function getLatestModel() {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
        const data = await response.json();

        if (data.error) {
            console.warn("Error fetching models from API:", data.error);
            return "gemini-1.5-flash-latest"; // Safe fallback
        }

        const models = data.models || [];

        // Filtering for models that support generating content
        const generationModels = models.filter((m: any) =>
            m.supportedGenerationMethods.includes("generateContent")
        );

        // Ranking Logic:
        // 1. Prefer Gemini 2.0 over others
        // 2. Prefer -flash for speed/cost if version is the same
        // 3. Prefer -latest names

        const sorted = generationModels.sort((a: any, b: any) => {
            // Very simple heuristic based on name strings
            const score = (name: string) => {
                let s = 0;
                if (name.includes("gemini-2.0")) s += 1000;
                if (name.includes("gemini-1.5")) s += 500;
                if (name.includes("pro")) s += 100;
                if (name.includes("flash")) s += 50;
                if (name.includes("latest")) s += 10;
                return s;
            };

            return score(b.name) - score(a.name);
        });

        const bestModel = sorted[0]?.name.split("/").pop() || "gemini-1.5-flash-latest";
        console.log(`[AI Configuration] Selected best model: ${bestModel}`);
        return bestModel;
    } catch (error) {
        console.error("Failed to auto-discover AI model:", error);
        return "gemini-1.5-flash-latest"; // Conservative fallback
    }
}
