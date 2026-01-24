import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSkillInstruction } from "@/lib/knowledge";
import { getLatestModel } from "@/lib/aiConfig";
import { calculateNotaryExpenses, TaxCalculationInput } from "@/lib/skills/deterministic/taxCalculator";
import { planTimeline, TimelinePlan } from "@/lib/skills/deterministic/timelinePlanner";
import { DeedDrafter, DraftingContext } from "@/lib/skills/generation/deedDrafter";

export interface FileData {
    buffer: Buffer;
    mimeType: string;
}

/**
 * SkillExecutor: The "Hybrid Router" of NotiAR.
 * It decides whether to use a semantic (LLM) or deterministic (Code) approach.
 * Now supports Multimodal (Vision) inputs and Drafting generation.
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

        if (skillSlug === 'notary-deed-drafter') {
            return DeedDrafter.generate(context as DraftingContext);
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
            
            TASK: Process the provided INPUT CONTEXT AND ANY ATTACHED IMAGES/FILES according to the rules in the SKILL definition.
            IMPORTANT: If an image or file is provided, it is the PRIMARY source of truth. Scanned documents should be read using your Vision capabilities.
            OUTPUT: Return a valid JSON object only. No preamble.
        `;

        const userContext = `INPUT CONTEXT:\n${JSON.stringify(context, null, 2)}`;

        // 3. Multimodal Parts
        const parts: any[] = [{ text: systemPrompt }, { text: userContext }];

        if (fileData) {
            const base64Data = fileData.buffer.toString('base64');
            console.log(`🚀 Vision Payload: ${fileData.mimeType} | Size: ${fileData.buffer.length} bytes | Base64: ${base64Data.substring(0, 20)}...`);
            parts.push({
                inlineData: {
                    data: base64Data,
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
