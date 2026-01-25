import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Placeholder

    try {
        console.log("Listing available models from Google AI SDK...");
        // The SDK doesn't have a direct listModels on genAI in all versions, 
        // usually we might need to fetch it via the REST API or it might be hidden.
        // Let's try the direct fetch if available or use a known pattern.

        // Actually, the most reliable way in some versions is to use the rest endpoint directly with the key
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
        const data = await response.json();

        if (data.models) {
            const fs = require('fs');
            fs.writeFileSync('scripts/available_models.json', JSON.stringify(data.models, null, 2));
            console.log("Available models saved to scripts/available_models.json");
        } else {
            console.error("No models found or error:", data);
        }
    } catch (e) {
        console.error("Error listing models:", e);
    }
}

listModels();
