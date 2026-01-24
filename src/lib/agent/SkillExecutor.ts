import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSkillInstruction } from "@/lib/knowledge";
import { getLatestModel } from "@/lib/aiConfig";
import { calculateNotaryExpenses, TaxCalculationInput } from "@/lib/skills/deterministic/taxCalculator";
import { planTimeline, TimelinePlan } from "@/lib/skills/deterministic/timelinePlanner";

export interface FileData {
    buffer: Buffer;
    mimeType: string;
}

/**
 * SkillExecutor: The "Hybrid Router" of NotiAR.
 * It decides whether to use a semantic (LLM) or deterministic (Code) approach.
 * Now supports Multimodal (Vision) inputs.
 */
export class SkillExecutor {
    private static genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

    /**
     * Executes a skill based on its slug and provided context.
     * @param fileData Optional binary data for Vision tasks.
     */
    static async execute(skillSlug: string, context: any, fileData?: FileData): Promise<any> {
        console.log(`[EXECUTOR] Routing skill: ${skillSlug}`);

        // --- 1. DETERMINISTIC ROUTING (Hard Logic Tools) ---
        if (skillSlug === 'notary-tax-calculator') {
            return calculateNotaryExpenses(context as TaxCalculationInput);
        }

        if (skillSlug === 'notary-timeline-planner') {
            return planTimeline(context.targetDate, context.jurisdiction, context.mode);
        }

        // --- 2. SEMANTIC ROUTING (LLM Reasoning + Vision) ---
        return this.executeSemanticSkill(skillSlug, context, fileData);
    }

    /**
     * Executes a qualitative skill using LLM with the SKILL.md definition as context.
     */
    private static async executeSemanticSkill(skillSlug: string, context: any, fileData?: FileData): Promise<any> {
        // 1. Fetch the implementation instruction (SKILL.md) from the Registry
        const skillDoc = await getSkillInstruction(skillSlug);
        if (!skillDoc) {
            throw new Error(`Skill ${skillSlug} is not active or indexed in the Registry.`);
        }

        const modelName = await getLatestModel('INGEST');
        const model = this.genAI.getGenerativeModel({
            model: modelName,
            generationConfig: { responseMimeType: "application/json" }
        });

        // 2. Build the Agentic Prompt
        const systemPrompt = `
            YOU ARE AN EXPERT NOTARY AGENT ACTING FOR THE NOTIAR SAAS.
            
            YOUR LOGIC IS DEFINED BY THE FOLLOWING SKILL DEFINITION:
            ---
            ${skillDoc}
            ---
            
            TASK: Process the provided INPUT CONTEXT according to the rules in the SKILL definition.
            OUTPUT: Return a valid JSON object only. No preamble.
        `;

        const userContext = `INPUT CONTEXT:\n${JSON.stringify(context, null, 2)}`;

        // 3. Multimodal Parts
        const parts: any[] = [{ text: systemPrompt }, { text: userContext }];

        if (fileData) {
            console.log(`[EXECUTOR][VISION] Adding binary data for ${skillSlug} (${fileData.mimeType})`);
            parts.push({
                inlineData: {
                    data: fileData.buffer.toString('base64'),
                    mimeType: fileData.mimeType
                }
            });
        }

        try {
            console.log(`[EXECUTOR][SEMANTIC] Calling LLM for ${skillSlug}...`);
            const result = await model.generateContent(parts);
            const responseText = result.response.text();

            // Clean markdown if LLM includes it despite responseMimeType
            const cleanJson = responseText.replace(/```json|```/g, "").trim();
            return JSON.parse(cleanJson);
        } catch (error: any) {
            console.error(`[EXECUTOR][SEMANTIC] Error executing ${skillSlug}:`, error);
            throw new Error(`Failed to execute semantic skill ${skillSlug}: ${error.message}`);
        }
    }
}
