import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSkillInstruction } from "@/lib/knowledge";
import { calculateNotaryExpenses, TaxCalculationInput } from "@/lib/skills/deterministic/taxCalculator";
import { planTimeline } from "@/lib/skills/deterministic/timelinePlanner";
import { DeedDrafter, DraftingContext } from "@/lib/skills/generation/deedDrafter";

import { getLatestModel } from "../aiConfig";

/**
 * SkillExecutor: The "Hybrid Router" of NotiAR.
 * It decides whether to use a semantic (LLM) or deterministic (Code) approach.
 */
export class SkillExecutor {
    private static genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

    /**
     * fileToGenerativePart: Robust binary handling for Next.js App Router.
     */
    private static async fileToGenerativePart(file: File): Promise<any> {
        // 1. Convert File to ArrayBuffer (Standard Web API compatible with Next.js)
        const arrayBuffer = await file.arrayBuffer();

        // 2. Convert to Node.js Buffer explicitly
        const buffer = Buffer.from(arrayBuffer);

        // 3. Convert to Base64
        const base64Data = buffer.toString('base64');

        // 4. LOGGING (Crucial): Verify we are not sending 0 bytes
        console.log(`[SkillExecutor] Processing File: ${file.name}`);
        console.log(`[SkillExecutor] MimeType: ${file.type}`);
        console.log(`[SkillExecutor] Buffer Size: ${buffer.length} bytes`); // Should be > 0

        return {
            inlineData: {
                data: base64Data,
                mimeType: file.type || "application/pdf",
            },
        };
    }

    /**
     * Executes a skill based on its slug and provided context.
     */
    static async execute(skillSlug: string, file?: File, contextData?: any): Promise<any> {
        console.log(`[EXECUTOR] Routing skill: ${skillSlug}`);

        // --- 1. DETERMINISTIC ROUTING (Hard Logic Tools) ---
        if (skillSlug === 'notary-tax-calculator') {
            return calculateNotaryExpenses(contextData as TaxCalculationInput);
        }

        if (skillSlug === 'notary-timeline-planner') {
            return planTimeline(contextData.targetDate, contextData.jurisdiction, contextData.mode);
        }

        if (skillSlug === 'notary-deed-drafter') {
            return DeedDrafter.generate(contextData as DraftingContext);
        }

        // --- 2. SEMANTIC ROUTING (LLM Reasoning + Vision) ---
        return this.executeSemanticSkill(skillSlug, file, contextData);
    }

    /**
     * Executes a qualitative skill using a hierarchical fallback system.
     * GOLD (Gemini 3 Pro) -> SILVER (Gemini 3 Flash) -> BRONZE (Gemini 2.5 Flash Lite)
     */
    private static async executeSemanticSkill(skillSlug: string, file?: File, contextData?: any): Promise<any> {
        // 1. Fetch the implementation instruction (SKILL.md) from the Registry
        const skillDoc = await getSkillInstruction(skillSlug);
        if (!skillDoc) {
            throw new Error(`Skill ${skillSlug} is not active or indexed in the Registry.`);
        }

        const userContext = `INPUT CONTEXT:\n${JSON.stringify(contextData, null, 2)}`;
        const hierarchy = (await import("../aiConfig")).MODEL_HIERARCHY;

        let lastError: Error | null = null;

        // 2. Hierarchical Fallback Loop
        for (const modelName of hierarchy) {
            try {
                console.log(`[EXECUTOR][SEMANTIC] Attempting ${modelName} for ${skillSlug}...`);

                // --- THINKING MODE CONFIGURATION ---
                // Thinking models (Pro models in Gemini 3/2.5) should have reasoning enabled.
                const isThinkingModel = modelName.includes('pro');
                const modelConfig: any = {
                    model: modelName,
                };

                // Add Thinking Mode (Specialized for Gemini 3/2.5 Pro)
                if (isThinkingModel) {
                    modelConfig.thinkingConfig = { include_thoughts: true };
                }

                const model = this.genAI.getGenerativeModel(modelConfig);

                // 3. Build the Agentic Prompt
                const systemPrompt = `
                    YOU ARE AN EXPERT NOTARY AGENT ACTING FOR THE NOTIAR SAAS.
                    
                    YOUR LOGIC IS DEFINED BY THE FOLLOWING SKILL DEFINITION:
                    ---
                    ${skillDoc}
                    ---
                    
                    TASK: Process the provided INPUT CONTEXT AND ANY ATTACHED IMAGES/FILES according to the rules in the SKILL definition.
                    IMPORTANT: If an image or file is provided, it is the PRIMARY source of truth. Scanned documents should be read using your Vision capabilities.
                    
                    ${isThinkingModel ? "SYSTEMIC REASONING: Use your 'Thinking' capability to validate the consistency of the extracted data against the original document before outputting." : ""}
                    
                    OUTPUT: Return a valid JSON object only. No preamble.
                `;

                // 4. Multimodal Parts
                const parts: any[] = [{ text: systemPrompt }, { text: userContext }];

                if (file) {
                    const isMultimodal = file.type.startsWith('image/') || file.type === 'application/pdf';
                    if (isMultimodal) {
                        const visionPart = await this.fileToGenerativePart(file);
                        parts.push(visionPart);
                    }
                }

                const result = await model.generateContent(parts);
                const responseText = result.response.text();

                if (!responseText || responseText.trim() === "") {
                    throw new Error("LLM returned an empty response.");
                }

                // Clean markdown if LLM includes it
                const cleanJson = responseText.replace(/```json|```/g, "").trim();
                return JSON.parse(cleanJson);

            } catch (error: any) {
                console.error(`[EXECUTOR][FALLBACK] ${modelName} failed: ${error.message}`);
                lastError = error;
                // Continue to next model in hierarchy (GOLD -> SILVER -> BRONZE)
                continue;
            }
        }

        throw new Error(`Failed to execute semantic skill ${skillSlug} after trying full hierarchy. Last error: ${lastError?.message}`);
    }
}
