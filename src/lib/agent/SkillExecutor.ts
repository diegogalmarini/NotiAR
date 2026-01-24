import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSkillInstruction } from "@/lib/knowledge";
import { calculateNotaryExpenses, TaxCalculationInput } from "@/lib/skills/deterministic/taxCalculator";
import { planTimeline } from "@/lib/skills/deterministic/timelinePlanner";
import { DeedDrafter, DraftingContext } from "@/lib/skills/generation/deedDrafter";

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
     * Executes a qualitative skill using gemini-1.5-pro for maximum OCR accuracy.
     */
    private static async executeSemanticSkill(skillSlug: string, file?: File, contextData?: any): Promise<any> {
        // 1. Fetch the implementation instruction (SKILL.md) from the Registry
        const skillDoc = await getSkillInstruction(skillSlug);
        if (!skillDoc) {
            throw new Error(`Skill ${skillSlug} is not active or indexed in the Registry.`);
        }

        // USE 'gemini-1.5-pro' NOT 'flash'. Pro is much better at OCR for scanned docs.
        const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

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

        const userContext = `INPUT CONTEXT:\n${JSON.stringify(contextData, null, 2)}`;

        // 3. Multimodal Parts
        const parts: any[] = [{ text: systemPrompt }, { text: userContext }];

        if (file) {
            const isMultimodal = file.type.startsWith('image/') || file.type === 'application/pdf';

            if (isMultimodal) {
                const visionPart = await this.fileToGenerativePart(file);
                parts.push(visionPart);
            } else {
                console.log(`[EXECUTOR] Skipping Vision Part for ${file.type} (Not a multimodal supported type)`);
            }
        }

        try {
            console.log(`[EXECUTOR][SEMANTIC] Calling LLM (gemini-1.5-pro) for ${skillSlug}...`);
            const result = await model.generateContent(parts);
            const responseText = result.response.text();

            console.log(`[EXECUTOR][RAW_RESPONSE] for ${skillSlug}:`, responseText.substring(0, 100) + (responseText.length > 100 ? '...' : ''));

            if (!responseText || responseText.trim() === "") {
                throw new Error("LLM returned an empty response.");
            }

            // Clean markdown if LLM includes it
            const cleanJson = responseText.replace(/```json|```/g, "").trim();

            try {
                return JSON.parse(cleanJson);
            } catch (jsonError) {
                console.error(`[EXECUTOR][JSON_PARSE_ERROR] Failed to parse:`, cleanJson);
                throw new Error(`LLM returned invalid JSON for ${skillSlug}`);
            }
        } catch (error: any) {
            console.error(`[EXECUTOR][SEMANTIC] Error executing ${skillSlug}:`, error);
            throw new Error(`Failed to execute semantic skill ${skillSlug}: ${error.message}`);
        }
    }
}
