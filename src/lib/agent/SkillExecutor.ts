import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { getSkillInstruction, getKnowledgeContext } from "@/lib/knowledge";
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
    private static async uploadToFileApi(file: any): Promise<string> {
        const buffer = file.buffer || (file.arrayBuffer ? Buffer.from(await file.arrayBuffer()) : file);
        if (!(buffer instanceof Buffer)) throw new Error("Could not extract buffer from file object");

        const fileName = file.name || `notiar_${Date.now()}.pdf`;
        const tempPath = path.join(os.tmpdir(), fileName);
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

    private static async fileToGenerativePart(file: any): Promise<any> {
        const buffer = file.buffer || (file.arrayBuffer ? Buffer.from(await file.arrayBuffer()) : file);
        if (!(buffer instanceof Buffer)) throw new Error("Could not extract buffer from file object");

        const base64Data = buffer.toString('base64');
        return { inlineData: { data: base64Data, mimeType: file.type || file.mimeType || "application/pdf" } };
    }

    /**
     * Executes a skill with deterministic or semantic routing.
     */
    static async execute(skillSlug: string, file?: any, contextData?: any): Promise<any> {
        console.log(`[EXECUTOR] Routing: ${skillSlug}`);

        if (skillSlug === 'notary-tax-calculator') return calculateNotaryExpenses(contextData as TaxCalculationInput);
        if (skillSlug === 'notary-timeline-planner') return planTimeline(contextData.targetDate, contextData.jurisdiction, contextData.mode);
        if (skillSlug === 'notary-deed-drafter') return DeedDrafter.generate(contextData as DraftingContext);

        // --- FLASH DIRECTO: Sin pre-procesamiento ni mapeos ---
        return this.executeSemanticSkill(skillSlug, file, contextData);
    }

    private static async executeSemanticSkill(skillSlug: string, file?: any, contextData: any = {}): Promise<any> {
        console.log(`[EXECUTOR] ⚡ FLASH: Starting ${skillSlug} | Has file: ${!!file} | File size: ${file?.size || 0}`);
        const skillDoc = await getSkillInstruction(skillSlug);
        if (!skillDoc) throw new Error(`Skill ${skillSlug} not found.`);

        const config = await import("../aiConfig");
        if (skillSlug === 'notary-entity-extractor') contextData.responseSchema = config.ACTA_EXTRACCION_PARTES_SCHEMA;
        if (skillSlug === 'notary-mortgage-reader') contextData.responseSchema = config.NOTARY_MORTGAGE_READER_SCHEMA;

        const userContext = `INPUT CONTEXT:\n${JSON.stringify(contextData, null, 2)}`;
        let lastError: Error | null = null;

        for (const modelName of MODEL_HIERARCHY) {
            try {
                let filePart = null;
                // NEW: RAG Context Retrieval
                let ragContext = "";
                const queryText = JSON.stringify(contextData);
                const isFid = queryText.toUpperCase().includes("FIDEICOMISO") || queryText.toUpperCase().includes("CESIÓN");
                const isHipo = queryText.toUpperCase().includes("HIPOTECA") || queryText.toUpperCase().includes("MUTUO") || queryText.toUpperCase().includes("CREDITO");

                if (isFid) {
                    console.log("[EXECUTOR] 📚 Fetching Fiduciary RAG Context...");
                    ragContext = await getKnowledgeContext("Constitución de Fideicomisos y Cesiones de Beneficiario en Argentina", "LEGAL_CONTEXT");
                } else if (isHipo) {
                    console.log("[EXECUTOR] 📚 Fetching Mortgage RAG Context...");
                    ragContext = await getKnowledgeContext("Hipotecas, Créditos UVA y Sistema Francés en Argentina", "LEGAL_CONTEXT");
                }

                if (file && file.size > 2 * 1024 * 1024) {
                    const fileUri = await this.uploadToFileApi(file);
                    filePart = { fileData: { fileUri, mimeType: file.type || "application/pdf" } };
                    return await this.runSkillAttempt(modelName, skillSlug, skillDoc, userContext, undefined, null, filePart, ragContext);
                }
                return await this.runSkillAttempt(modelName, skillSlug, skillDoc, userContext, file, null, null, ragContext);
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
        file?: any,
        correctionFeedback: string | null = null,
        providedFilePart: any = null,
        ragContext: string = ""
    ): Promise<any> {
        // FLASH NO USA THINKING MODE
        const { ACTA_EXTRACCION_PARTES_SCHEMA, NOTARY_MORTGAGE_READER_SCHEMA } = await import("../aiConfig");

        const generationConfig: any = {
            responseMimeType: "application/json",
            responseSchema: skillSlug === "notary-entity-extractor" ? ACTA_EXTRACCION_PARTES_SCHEMA :
                skillSlug === "notary-mortgage-reader" ? NOTARY_MORTGAGE_READER_SCHEMA : undefined
        };

        const modelConfig: any = { model: modelName, generationConfig };

        const model = this.genAI.getGenerativeModel(modelConfig);

        // v1.3.0: Critical Rules & Knowledge Injection
        const isFiduciaryDoc = userContext.toUpperCase().includes("FIDEICOMISO") || userContext.toUpperCase().includes("CESIÓN");
        const isMortgageDoc = userContext.toUpperCase().includes("HIPOTECA") || userContext.toUpperCase().includes("MUTUO");

        const fiduciaryKnowledge = isFiduciaryDoc ? `
📘 CONOCIMIENTO EXPERTO (FIDEICOMISOS):
1. **FIDEICOMISO vs FIDUCIARIA:** Son identidades separadas. Si dice "FIDEICOMISO G-4 administrado por SOMAJOFA S.A.", extrae DOS entidades. SOMAJOFA S.A. tiene rol "FIDUCIARIA".
2. **CEDENTE y CESIONARIO:** En una cesión de beneficios, el dueño original es el **CEDENTE** y el nuevo es el **CESIONARIO**. Estos roles tienen prioridad absoluta sobre Vendedor/Comprador.
3. **DOBLE PRECIO:** El precio de construcción (ARS) es histórico. El precio de cesión (USD) es el real de mercado. Extrae ambos en 'operation_details'.
` : isMortgageDoc ? `
📘 CONOCIMIENTO EXPERTO (HIPOTECAS):
1. **ACREEDOR vs DEUDOR:** El Banco (ej: BNA) es siempre el **ACREEDOR**. El cliente es el **DEUDOR**.
2. **UVA y PESOS:** Las hipotecas modernas suelen expresar el monto en PESOS y su equivalente en UVAs. Extrae ambos.
3. **SISTEMA DE AMORTIZACIÓN:** Lo más común es 'FRANCES'. Si dice UVA, busca el Coeficiente de Estabilización de Referencia (CER).
` : '';

        const criticalRules = skillSlug === 'notary-entity-extractor' ? `

⚠️ REGLAS DE ORO (CRÍTICAS PARA EL ÉXITO):
1. **IDENTIDAD Y NOMBRES:** Detecta nombres compuestos (ej: "Maria del Carmen") y apellidos multiples. NO mezcles apellidos en el campo nombre.
2. **CUIT/CUIL OBLIGATORIO:** Formato estricto XX-DDDDDDDD-X (con guiones). Si el doc tiene "20257655998", conviértelo a "20-25765599-8".
3. **BANCOS Y APODERADOS (CRÍTICO):** SIEMPRE busca la entidad financiera ("Banco Galicia", "Banco Nacion", etc).
   - Si dice "norman giralde en representacion de BANCO GALICIA", extrae DOS entidades:
   - Entidad 1: "BANCO GALICIA" (Rol: ACREEDOR, Tipo: JURIDICA).
   - Entidad 2: "NORMAN GIRALDE" (Rol: REPRESENTANTE, Tipo: FISICA).
4. **CÓNYUGES:** Si dice "casado/a con X", extrae a X. El Schema tiene un campo 'conyuge' para esto.
5. **FIDEICOMISOS Y CESIONES (CRÍTICO):** En fideicomisos al costo, extrae AMBOS precios:
   - \`precio_construccion\` (ARS, monto bajo).
   - \`precio_cesion\` (USD, monto alto).
   - Extrae los datos de la cesión en \`cesion_beneficiario\`, identificando al CEDENTE (quien vende el derecho) y al CESIONARIO (quien lo compra). 
   - **MÁXIMA PRIORIDAD (ROLES):** En una 'Cesión de Beneficiario', el vendedor se llama **CEDENTE** y el comprador se llama **CESIONARIO**. No uses Vendedor/Comprador genérico si existen estos roles específicos.
   - **MÁXIMA PRIORIDAD (SOMAJOFA):** Si aparece 'SOMAJOFA S.A.', su rol es **FIDUCIARIA**. No la llames Vendedor.
   - **MÁXIMA PRIORIDAD (PRECIOS):** Extrae AMBOS: \`precio_construccion\` (ARS, histórico) y \`precio_cesion\` (USD, mercado). Si no extraes el precio en Dólares, fallarás la tarea.
6. **INMUEBLES (TRANSCRIPCIÓN):** El campo 'transcripcion_literal' debe ser UNA COPIA EXACTA, PALABRA POR PALABRA. Comienza desde la ubicación ("UNIDAD FUNCIONAL... que es parte del edificio...") hasta el final de medidas. NO RESUMAS. NO EXTRAIGAS SOLO POLIGONOS.
7. **FALTANTES:** Busca en todo el documento. Si falta un CUIT, no inventes, pero asegúrate de que no esté en la foja de firmas.


` : '';

        const systemPrompt = `
            ROL: ERES UN EXPERTO ESCRIBANO ARGENTINO EN EXTRACCIÓN DE DATOS (RIGOR NOTARIAL).
            ${fiduciaryKnowledge}
            
            ${ragContext ? `📚 CONTEXTO DE LA BASE DE CONOCIMIENTO:\n${ragContext}\n` : ""}

            DIRECTRICES:
            1. EXTRACCIÓN EXHAUSTIVA: Debes encontrar a todas las partes intervinientes y los detalles del inmueble.
            2. EVIDENCIA TEXTUAL: Para cada campo, extrae el fragmento exacto que justifica el valor.
            3. CRITERIO DE VERDAD: Si un dato no está presente de ninguna forma, usa null. Pero si el dato es deducible sin ambigüedad del contexto legal, extráelo.
            4. INTEGRIDAD: Asegura que los nombres coincidan exactamente con el DNI/CUIT mencionado.
            ${criticalRules}
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
            const parsed = JSON.parse(cleanJson);
            console.log(`[EXECUTOR][${skillSlug}] ✅ FLASH SUCCESS: Extracted ${parsed.entidades?.length || 0} entities`);
            return parsed;
        } catch (e) {
            console.error(`[EXECUTOR] Parse error in ${skillSlug}:`, responseText);
            throw new Error(`JSON_PARSE_ERROR in ${modelName}: ${responseText.substring(0, 100)}`);
        }
    }
}
