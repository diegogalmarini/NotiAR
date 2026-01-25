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
     * Includes Strict JSON Enforcement and Auto-Correction Retry logic.
     */
    private static async executeSemanticSkill(skillSlug: string, file?: File, contextData: any = {}): Promise<any> {
        // 1. Fetch the implementation instruction (SKILL.md) from the Registry
        const skillDoc = await getSkillInstruction(skillSlug);
        if (!skillDoc) {
            throw new Error(`Skill ${skillSlug} is not active or indexed in the Registry.`);
        }

        // --- AUTOMATIC SCHEMA INJECTION ---
        const config = await import("../aiConfig");
        if (skillSlug === 'notary-entity-extractor') {
            contextData.responseSchema = config.ACTA_EXTRACCION_PARTES_SCHEMA;
        }

        const userContext = `INPUT CONTEXT:\n${JSON.stringify(contextData, null, 2)}`;
        const hierarchy = config.MODEL_HIERARCHY;

        let lastError: Error | null = null;

        // 2. Hierarchical Fallback Loop
        for (const modelName of hierarchy) {
            try {
                // --- ATTEMPT 1: Strict Execution ---
                return await this.runSkillAttempt(modelName, skillDoc, userContext, file, null);
            } catch (error: any) {
                console.warn(`[EXECUTOR][RETRY-MODE] ${modelName} failed on first attempt for ${skillSlug}. Error: ${error.message}`);

                // --- ATTEMPT 2: Auto-Correction (Only for GOLD/SILVER models) ---
                if (modelName.includes('pro') || modelName.includes('flash-preview')) {
                    try {
                        console.log(`[EXECUTOR][RETRY-MODE] Attempting Auto-Correction with 'Thinking' feedback for ${modelName}...`);
                        return await this.runSkillAttempt(modelName, skillDoc, userContext, file, error.message);
                    } catch (retryError: any) {
                        console.error(`[EXECUTOR][FALLBACK] ${modelName} auto-correction failed: ${retryError.message}`);
                    }
                }

                lastError = error;
                // Move to next model in hierarchy (GOLD -> SILVER -> BRONZE)
                continue;
            }
        }

        throw new Error(`Failed to execute semantic skill ${skillSlug} after trying full hierarchy and auto-correction. Last error: ${lastError?.message}`);
    }

    /**
     * Internal runner for a single skill attempt.
     */
    private static async runSkillAttempt(modelName: string, skillDoc: string, userContext: string, file?: File, correctionFeedback: string | null = null): Promise<any> {
        const isThinkingModel = modelName.includes('pro') || modelName.includes('thinking');

        // Extract optional responseSchema from userContext (injected via contextData)
        let responseSchema: any = null;
        try {
            const ctx = JSON.parse(userContext.replace("INPUT CONTEXT:\n", ""));

            // Priority: Explicit schema in context > Global Extraction Schema if applicable
            if (ctx.responseSchema) {
                responseSchema = ctx.responseSchema;
            } else if (skillDoc.includes("notary-entity-extractor")) {
                const { ACTA_EXTRACCION_PARTES_SCHEMA } = await import("../aiConfig");
                responseSchema = ACTA_EXTRACCION_PARTES_SCHEMA;
            }
        } catch (e) { /* ignore */ }

        // --- CONTEXT CACHING (Cost Monitor) ---
        const { getOrBuildContextCache } = await import("../aiConfig");
        const cacheName = await getOrBuildContextCache(userContext, modelName);

        const generationConfig: any = {
            responseMimeType: "application/json"
        };

        if (responseSchema) {
            generationConfig.responseSchema = responseSchema;
        }

        const modelConfig: any = {
            model: modelName,
            generationConfig
        };

        if (cacheName) {
            modelConfig.cachedContent = cacheName;
        }

        if (isThinkingModel) {
            modelConfig.thinkingConfig = { include_thoughts: true };
        }

        const model = this.genAI.getGenerativeModel(modelConfig);

        // Build the prompt with Strict JSON and Evidence rules
        const systemPrompt = `
            YOU ARE AN EXPERT NOTARY AGENT ACTING FOR THE NOTIAR SAAS.
            
            YOUR LOGIC IS DEFINED BY THE FOLLOWING SKILL DEFINITION:
            ---
            ${skillDoc}
            ---
            
            STRICT JSON RULES:
            1. Output MUST be valid JSON.
            2. For EVERY field, provide an object with { "valor": any, "evidencia_origen": "string" }.
            3. "evidencia_origen" MUST contain the literal snippet from the document justifying the value.
            
            ${isThinkingModel ? "SYSTEMIC REASONING: Use your 'Thinking' capability to validate consistency and resolve ambiguities before outputting." : ""}
            ${correctionFeedback ? `CRITICAL: Your previous attempt failed with the following error. CORRECT IT NOW: ${correctionFeedback}` : ""}
            
            OUTPUT: Valid JSON only.
        `;

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
        const usage = result.response.usageMetadata;

        // --- ASYNC LOGGING (Cost Monitor) ---
        if (usage) {
            const { estimateCost } = await import("../aiConfig");
            const { supabaseAdmin } = await import("../knowledge");

            const cost = estimateCost(modelName, usage.promptTokenCount, usage.candidatesTokenCount);

            // Extract IDs from context for tracking
            let folderId = null;
            let userId = null;
            try {
                const ctx = JSON.parse(userContext.replace("INPUT CONTEXT:\n", ""));
                folderId = ctx.folder_id || null;
                userId = ctx.user_id || null;
            } catch (e) { }

            supabaseAdmin.from('api_usage_logs').insert({
                user_id: userId,
                folder_id: folderId,
                model_id: modelName,
                skill_slug: skillDoc.match(/name: (.*)/)?.[1] || "unknown",
                input_tokens: usage.promptTokenCount,
                output_tokens: usage.candidatesTokenCount,
                total_tokens: usage.totalTokenCount,
                cost_est: cost
            }).then(async ({ error }) => {
                if (error) console.error("[COST_MONITOR] Failed to log usage:", error.message);

                // --- THRESHOLD ALERT ($10 Daily Limit) ---
                const today = new Date().toISOString().split('T')[0];
                const { data: totalData } = await supabaseAdmin
                    .from('api_usage_logs')
                    .select('cost_est')
                    .gte('created_at', today);

                const dailyTotal = totalData?.reduce((acc, curr) => acc + (Number(curr.cost_est) || 0), 0) || 0;
                if (dailyTotal > 8) { // Alert at 80% of limit
                    console.error(`[COST_CRITICAL] Daily AI spend at $${dailyTotal.toFixed(2)}. Limit: $10.00`);
                    // In a real app, this would trigger an AppShell notification via Realtime or a dedicated table.
                }
            });
        }

        if (!responseText || responseText.trim() === "") {
            throw new Error("Empty response from AI.");
        }

        const cleanJson = responseText.replace(/```json|```/g, "").trim();
        let parsed: any;

        try {
            parsed = JSON.parse(cleanJson);
        } catch (e) {
            throw new Error(`JSON_PARSE_ERROR: ${cleanJson.substring(0, 100)}...`);
        }

        // --- STRUCTURAL VALIDATION ---
        // Basic check to ensure the "valor" structure is followed if no schema was provided.
        if (!responseSchema && typeof parsed === 'object' && parsed !== null) {
            const keys = Object.keys(parsed);
            if (keys.length > 5) { // Only check if many fields exist to avoid false positives on small objects
                let missingValor = 0;
                keys.slice(0, 5).forEach(k => {
                    if (typeof parsed[k] === 'object' && !('valor' in parsed[k]) && !Array.isArray(parsed[k])) {
                        missingValor++;
                    }
                });
                if (missingValor > 2) {
                    throw new Error("STRICT_JSON_VIOLATION: Missing 'valor/evidencia_origen' structure in majority of fields.");
                }
            }
        }

        // --- POST-PROCESSING: Confidence Highlighting ---
        // If confidence < 0.98 in critical fields, add a UI flag.
        if (parsed?.tipo_objeto === "ACTA_EXTRACCION_PARTES" && Array.isArray(parsed.entidades)) {
            parsed.entidades = parsed.entidades.map((ent: any) => {
                const criticalFields = ['nombre_completo', 'dni_cuil_cuit'];
                let needsReview = false;

                criticalFields.forEach(field => {
                    const data = ent.datos?.[field];
                    if (data && typeof data.confianza === 'number' && data.confianza < 0.98) {
                        needsReview = true;
                    }
                });

                if (needsReview) {
                    ent.ui_status = {
                        alert: "LOW_CONFIDENCE",
                        color: "red",
                        message: "Revisar datos críticos: Confianza < 98%"
                    };
                }
                return ent;
            });
        }

        return parsed;
    }
}
