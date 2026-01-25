import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSkillInstruction } from "@/lib/knowledge";
import { calculateNotaryExpenses, TaxCalculationInput } from "@/lib/skills/deterministic/taxCalculator";
import { planTimeline } from "@/lib/skills/deterministic/timelinePlanner";
import { DeedDrafter, DraftingContext } from "@/lib/skills/generation/deedDrafter";

import { getLatestModel, MODEL_HIERARCHY } from "../aiConfig";

/**
 * SkillExecutor: The "Hybrid Router" of NotiAR.
 * It decides whether to use a semantic (LLM) or deterministic (Code) approach.
 * Now evolved with a 2-step hybrid pipeline for handling large documents.
 */
export class SkillExecutor {
    private static genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

    /**
     * fileToGenerativePart: Robust binary handling for Next.js App Router.
     */
    private static async fileToGenerativePart(file: File): Promise<any> {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Data = buffer.toString('base64');

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

        // --- 2. HYBRID EXTRACTION PIPELINE (For Deed Extraction) ---
        if (skillSlug === 'notary-entity-extractor' && file && file.size > 2 * 1024 * 1024) { // > 2MB or large page count
            return this.executeHybridPipeline(skillSlug, file, contextData);
        }

        // --- 3. SEMANTIC ROUTING (LLM Reasoning + Vision) ---
        return this.executeSemanticSkill(skillSlug, file, contextData);
    }

    /**
     * executeHybridPipeline: 2-step process for high-fidelity extraction on large docs.
     */
    private static async executeHybridPipeline(skillSlug: string, file: File, contextData: any): Promise<any> {
        console.log(`[EXECUTOR][HYBRID] Starting 2-step pipeline for ${file.name}`);

        // Step 1: Page Indexing (Flash Model - SILVER)
        const indexPrompt = `
            YOU ARE A NOTARY DOCUMENT INDEXER. Analyze the whole PDF and identify the page ranges for:
            1. COMPARECENCIA (Introduction, parties presentation).
            2. OBJETO (The act itself, price, property details).
            3. CIERRE (Signatures, closure).
            
            OUTPUT VALID JSON ONLY: { "segments": [{ "type": "string", "start_page": number, "end_page": number }] }
        `;

        const silverModel = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash-002" });
        const visionPart = await this.fileToGenerativePart(file);

        console.log("[EXECUTOR][HYBRID] Step 1: Mapping document segments...");
        const indexResult = await silverModel.generateContent([indexPrompt, visionPart]);
        const indexText = indexResult.response.text().replace(/```json|```/g, "").trim();
        const { segments } = JSON.parse(indexText);

        console.log(`[EXECUTOR][HYBRID] Segments found: ${segments.length}. Selecting critical pages for deep reasoning.`);

        // Step 2: Deep Extraction (Pro Model - GOLD)
        // We inject the segment info into context so the Pro model knows where to focus
        contextData.segments = segments;
        const skillDoc = await getSkillInstruction(skillSlug);

        return this.runSkillAttempt("gemini-1.5-pro-002", skillDoc!, JSON.stringify(contextData), file);
    }

    /**
     * Executes a qualitative skill using a hierarchical fallback system.
     */
    private static async executeSemanticSkill(skillSlug: string, file?: File, contextData: any = {}): Promise<any> {
        const skillDoc = await getSkillInstruction(skillSlug);
        if (!skillDoc) throw new Error(`Skill ${skillSlug} not found.`);

        const config = await import("../aiConfig");
        if (skillSlug === 'notary-entity-extractor') {
            contextData.responseSchema = config.ACTA_EXTRACCION_PARTES_SCHEMA;
        }

        const userContext = `INPUT CONTEXT:\n${JSON.stringify(contextData, null, 2)}`;
        const hierarchy = config.MODEL_HIERARCHY;

        let lastError: Error | null = null;
        for (const modelName of hierarchy) {
            try {
                return await this.runSkillAttempt(modelName, skillDoc, userContext, file, null);
            } catch (error: any) {
                console.warn(`[EXECUTOR][RETRY] ${modelName} failed. Error: ${error.message}`);
                lastError = error;
                continue;
            }
        }
        throw new Error(`Failed to execute ${skillSlug}: ${lastError?.message}`);
    }

    private static async runSkillAttempt(modelName: string, skillDoc: string, userContext: string, file?: File, correctionFeedback: string | null = null): Promise<any> {
        const isThinkingModel = modelName.includes('pro') || modelName.includes('thinking');

        // --- SCHEMA INJECTION ---
        let responseSchema: any = null;
        try {
            const ctx = JSON.parse(userContext.replace("INPUT CONTEXT:\n", ""));
            if (ctx.responseSchema) responseSchema = ctx.responseSchema;
            else if (skillDoc.includes("notary-entity-extractor")) {
                const { ACTA_EXTRACCION_PARTES_SCHEMA } = await import("../aiConfig");
                responseSchema = ACTA_EXTRACCION_PARTES_SCHEMA;
            }
        } catch (e) { }

        const generationConfig: any = { responseMimeType: "application/json" };
        if (responseSchema) generationConfig.responseSchema = responseSchema;

        const modelConfig: any = { model: modelName, generationConfig };
        if (isThinkingModel) modelConfig.thinkingConfig = { include_thoughts: true };

        const model = this.genAI.getGenerativeModel(modelConfig);

        const systemPrompt = `
            YOU ARE AN EXPERT NOTARY AGENT.
            --- SKILL ---
            ${skillDoc}
            ---
            STRICT JSON: { "valor": any, "evidencia_origen": "string" }.
            ${isThinkingModel ? "REASON before extracting." : ""}
            ${correctionFeedback ? `FIX PREVIOUS ERROR: ${correctionFeedback}` : ""}
        `;

        const parts: any[] = [{ text: systemPrompt }, { text: userContext }];
        if (file) {
            const visionPart = await this.fileToGenerativePart(file);
            parts.push(visionPart);
        }

        const result = await model.generateContent(parts);
        const responseText = result.response.text();

        try {
            return JSON.parse(responseText.replace(/```json|```/g, "").trim());
        } catch (e) {
            throw new Error(`JSON_PARSE_ERROR in ${modelName}`);
        }
    }
}
