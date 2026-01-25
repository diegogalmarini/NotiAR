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
 * Unified under Gemini 3 Pro (GOLD) for the highest notary rigor.
 */
export class SkillExecutor {
    private static genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    private static fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY || "");

    /**
     * uploadToFileApi: Efficient upload for documents > 2MB.
     */
    private static async uploadToFileApi(file: File): Promise<string> {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const tempPath = path.join(os.tmpdir(), `notiar_${Date.now()}_${file.name}`);
        fs.writeFileSync(tempPath, buffer);

        try {
            console.log(`[SkillExecutor] Uploading heavy file: ${file.name}`);
            const uploadResponse = await this.fileManager.uploadFile(tempPath, {
                mimeType: file.type || "application/pdf",
                displayName: file.name,
            });
            return uploadResponse.file.uri;
        } finally {
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        }
    }

    private static async fileToGenerativePart(file: File): Promise<any> {
        const arrayBuffer = await file.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString('base64');
        return { inlineData: { data: base64Data, mimeType: file.type || "application/pdf" } };
    }

    /**
     * Executes a skill with deterministic or semantic routing.
     */
    static async execute(skillSlug: string, file?: File, contextData?: any): Promise<any> {
        console.log(`[EXECUTOR] Routing: ${skillSlug}`);

        if (skillSlug === 'notary-tax-calculator') return calculateNotaryExpenses(contextData as TaxCalculationInput);
        if (skillSlug === 'notary-timeline-planner') return planTimeline(contextData.targetDate, contextData.jurisdiction, contextData.mode);
        if (skillSlug === 'notary-deed-drafter') return DeedDrafter.generate(contextData as DraftingContext);

        // --- HYBRID PIPELINE FOR LARGE DEEDS ---
        if (skillSlug === 'notary-entity-extractor' && file && file.size > 2 * 1024 * 1024) {
            return this.executeHybridPipeline(skillSlug, file, contextData);
        }

        return this.executeSemanticSkill(skillSlug, file, contextData);
    }

    /**
     * executeHybridPipeline: 2-step process to optimize context and reasoning.
     */
    private static async executeHybridPipeline(skillSlug: string, file: File, contextData: any): Promise<any> {
        console.log(`[EXECUTOR][HYBRID] Initializing 2-step pipeline for large doc...`);
        const fileUri = await this.uploadToFileApi(file);
        const filePart = { fileData: { fileUri, mimeType: file.type || "application/pdf" } };

        // Step 1: Mapping (SILVER Model)
        const indexPrompt = "ACT AS A NOTARY INDEXER. Map page ranges for: COMPARECENCIA, OBJETO, CIERRE. OUTPUT JSON: { segments: [] }";
        const silverModelId = MODEL_HIERARCHY[1]; // Gemini 3 Flash
        const silverModel = this.genAI.getGenerativeModel({ model: silverModelId });

        const indexResult = await silverModel.generateContent([indexPrompt, filePart]);
        const { segments } = JSON.parse(indexResult.response.text().replace(/```json|```/g, "").trim());

        console.log(`[EXECUTOR][HYBRID] Mapping complete. Triggering GOLD Notary Censor...`);

        // Step 2: Extraction (GOLD Model)
        contextData.segments = segments;
        const skillDoc = await getSkillInstruction(skillSlug);
        return this.runSkillAttempt(MODEL_HIERARCHY[0], skillSlug, skillDoc!, JSON.stringify(contextData), undefined, null, filePart);
    }

    private static async executeSemanticSkill(skillSlug: string, file?: File, contextData: any = {}): Promise<any> {
        const skillDoc = await getSkillInstruction(skillSlug);
        if (!skillDoc) throw new Error(`Skill ${skillSlug} not found.`);

        const config = await import("../aiConfig");
        if (skillSlug === 'notary-entity-extractor') contextData.responseSchema = config.ACTA_EXTRACCION_PARTES_SCHEMA;

        const userContext = `INPUT CONTEXT:\n${JSON.stringify(contextData, null, 2)}`;
        let lastError: Error | null = null;

        for (const modelName of MODEL_HIERARCHY) {
            try {
                let filePart = null;
                if (file && file.size > 2 * 1024 * 1024) {
                    const fileUri = await this.uploadToFileApi(file);
                    filePart = { fileData: { fileUri, mimeType: file.type || "application/pdf" } };
                    return await this.runSkillAttempt(modelName, skillSlug, skillDoc, userContext, undefined, null, filePart);
                }
                return await this.runSkillAttempt(modelName, skillSlug, skillDoc, userContext, file, null);
            } catch (error: any) {
                console.warn(`[EXECUTOR][RETRY] ${modelName} failed: ${error.message}`);
                lastError = error;
                continue;
            }
        }
        throw new Error(`Execution failed: ${lastError?.message}`);
    }

    private static async runSkillAttempt(
        modelName: string,
        skillSlug: string,
        skillDoc: string,
        userContext: string,
        file?: File,
        correctionFeedback: string | null = null,
        providedFilePart: any = null
    ): Promise<any> {
        const isThinkingModel = modelName.includes('pro') || modelName.includes('thinking');
        const { ACTA_EXTRACCION_PARTES_SCHEMA } = await import("../aiConfig");

        const generationConfig: any = {
            responseMimeType: "application/json",
            responseSchema: skillSlug === "notary-entity-extractor" ? ACTA_EXTRACCION_PARTES_SCHEMA : undefined
        };

        const modelConfig: any = { model: modelName, generationConfig };
        if (isThinkingModel) modelConfig.thinkingConfig = { include_thoughts: true };

        const model = this.genAI.getGenerativeModel(modelConfig);

        const systemPrompt = `
            ROL: ERES UN EXPERTO ESCRIBANO ARGENTINO EN EXTRACCIÓN DE DATOS (RIGOR NOTARIAL).
            
            DIRECTRICES:
            1. EXTRACCIÓN EXHAUSTIVA: Debes encontrar a todas las partes intervinientes y los detalles del inmueble.
            2. EVIDENCIA TEXTUAL: Para cada campo, extrae el fragmento exacto que justifica el valor.
            3. CRITERIO DE VERDAD: Si un dato no está presente de ninguna forma, usa null. Pero si el dato es deducible sin ambigüedad del contexto legal, extráelo.
            4. INTEGRIDAD: Asegura que los nombres coincidan exactamente con el DNI/CUIT mencionado.
            
            ${userContext.includes("segments") ? "ENFOQUE: Concéntrate especialmente en los segmentos de páginas indicados en el contexto." : ""}

            PROTOCOLO:
            --- SKILL ---
            ${skillDoc}
            ---
            
            IMPORTANTE: Respeta estrictamente los nombres de campos del JSON SCHEMA. El campo "evidencia" es obligatorio.
            ${correctionFeedback ? `CORREGIR: ${correctionFeedback}` : ""}
        `;

        const parts: any[] = [{ text: systemPrompt }, { text: userContext }];
        if (providedFilePart) parts.push(providedFilePart);
        else if (file) parts.push(await this.fileToGenerativePart(file));

        const result = await model.generateContent(parts);
        const responseText = result.response.text();

        console.log(`[EXECUTOR][${skillSlug}] Raw response:`, responseText.substring(0, 500) + "...");

        try {
            // Remove markdown formatting if present
            const cleanJson = responseText.replace(/```json|```/g, "").trim();
            return JSON.parse(cleanJson);
        } catch (e) {
            console.error(`[EXECUTOR] Parse error in ${skillSlug}:`, responseText);
            throw new Error(`JSON_PARSE_ERROR in ${modelName}: ${responseText.substring(0, 100)}`);
        }
    }
}
