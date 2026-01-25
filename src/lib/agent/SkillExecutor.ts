import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { getSkillInstruction } from "@/lib/knowledge";
import { calculateNotaryExpenses, TaxCalculationInput } from "@/lib/skills/deterministic/taxCalculator";
import { planTimeline } from "@/lib/skills/deterministic/timelinePlanner";
import { DeedDrafter, DraftingContext } from "@/lib/skills/generation/deedDrafter";
import { getLatestModel, MODEL_HIERARCHY } from "../aiConfig";
import fs from "fs";
import path from "path";
import os from "os";

/**
 * SkillExecutor: The "Hybrid Router" of NotiAR.
 * Now evolved with a 2-step hybrid pipeline and Google File API for large documents.
 */
export class SkillExecutor {
    private static genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    private static fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY || "");

    /**
     * uploadToFileApi: Uploads heavy files to Google File API to reduce prompt latency.
     */
    private static async uploadToFileApi(file: File): Promise<string> {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Google File Manager requires a physical file path
        const tempPath = path.join(os.tmpdir(), `notiar_${Date.now()}_${file.name}`);
        fs.writeFileSync(tempPath, buffer);

        try {
            console.log(`[SkillExecutor] Uploading to Google File API: ${file.name} (${buffer.length} bytes)`);
            const uploadResponse = await this.fileManager.uploadFile(tempPath, {
                mimeType: file.type || "application/pdf",
                displayName: file.name,
            });

            console.log(`[SkillExecutor] File uploaded successfully: ${uploadResponse.file.uri}`);
            return uploadResponse.file.uri;
        } finally {
            // Clean up temp file
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        }
    }

    /**
     * fileToGenerativePart: Standard inline handling for smaller images/docs.
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

        if (skillSlug === 'notary-tax-calculator') {
            return calculateNotaryExpenses(contextData as TaxCalculationInput);
        }
        if (skillSlug === 'notary-timeline-planner') {
            return planTimeline(contextData.targetDate, contextData.jurisdiction, contextData.mode);
        }
        if (skillSlug === 'notary-deed-drafter') {
            return DeedDrafter.generate(contextData as DraftingContext);
        }

        // --- 2. HYBRID PIPELINE FOR DEEDS ---
        if (skillSlug === 'notary-entity-extractor' && file && file.size > 2 * 1024 * 1024) {
            return this.executeHybridPipeline(skillSlug, file, contextData);
        }

        return this.executeSemanticSkill(skillSlug, file, contextData);
    }

    /**
     * executeHybridPipeline: 2-step process using File API and segmented reasoning.
     */
    private static async executeHybridPipeline(skillSlug: string, file: File, contextData: any): Promise<any> {
        console.log(`[EXECUTOR][HYBRID] Starting 2-step optimization for ${file.name}`);

        // Step 1: Upload to File API (Crucial for large files)
        const fileUri = await this.uploadToFileApi(file);
        const filePart = { fileData: { fileUri, mimeType: file.type || "application/pdf" } };

        // Step 2: Page Indexing (Flash Model)
        const indexPrompt = `
            YOU ARE A NOTARY DOCUMENT INDEXER. Analyze the whole PDF and identify ONLY the page ranges for:
            1. COMPARECENCIA (Introduction, parties).
            2. OBJETO (Act details, price, property).
            3. CIERRE (Signatures).
            
            OUTPUT VALID JSON ONLY: { "segments": [{ "type": "string", "start_page": number, "end_page": number }] }
        `;

        const silverModel = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash-002" });
        console.log("[EXECUTOR][HYBRID] Step 1: Mapping document segments via File API...");
        const indexResult = await silverModel.generateContent([indexPrompt, filePart]);
        const indexText = indexResult.response.text().replace(/```json|```/g, "").trim();
        const { segments } = JSON.parse(indexText);

        console.log(`[EXECUTOR][HYBRID] Segments identified. Targeting specific context for GOLD model.`);

        // Step 3: Deep Extraction (Pro Model)
        contextData.segments = segments;
        const skillDoc = await getSkillInstruction(skillSlug);

        // Pass the fileUri part to the runSkillAttempt to avoid re-uploading or large Base64
        return this.runSkillAttempt("gemini-1.5-pro-002", skillDoc!, JSON.stringify(contextData), undefined, null, filePart);
    }

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
                // If it's a large file, use File API even for standard semantic skill
                let filePart = null;
                if (file && file.size > 2 * 1024 * 1024) {
                    const fileUri = await this.uploadToFileApi(file);
                    filePart = { fileData: { fileUri, mimeType: file.type || "application/pdf" } };
                    return await this.runSkillAttempt(modelName, skillDoc, userContext, undefined, null, filePart);
                }

                return await this.runSkillAttempt(modelName, skillDoc, userContext, file, null);
            } catch (error: any) {
                console.warn(`[EXECUTOR][RETRY] ${modelName} failed. Error: ${error.message}`);
                lastError = error;
                continue;
            }
        }
        throw new Error(`Failed to execute ${skillSlug}: ${lastError?.message}`);
    }

    private static async runSkillAttempt(
        modelName: string,
        skillDoc: string,
        userContext: string,
        file?: File,
        correctionFeedback: string | null = null,
        providedFilePart: any = null
    ): Promise<any> {
        const isThinkingModel = modelName.includes('pro') || modelName.includes('thinking');

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

        if (providedFilePart) {
            parts.push(providedFilePart);
        } else if (file) {
            const visionPart = await this.fileToGenerativePart(file);
            parts.push(visionPart);
        }

        const result = await model.generateContent(parts);
        const responseText = result.response.text();

        try {
            return JSON.parse(responseText.replace(/```json|```/g, "").trim());
        } catch (e) {
            throw new Error(`JSON_PARSE_ERROR in ${modelName}: ${responseText.substring(0, 100)}`);
        }
    }
}
