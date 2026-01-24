import { SkillExecutor, FileData } from "../../agent/SkillExecutor";

export type DocumentType = 'DNI' | 'PASAPORTE' | 'ESCRITURA' | 'BOLETO_COMPRAVENTA' | 'CERTIFICADO_RPI' | 'CATASTRO_ARBA' | 'UNKNOWN';

export interface ClassificationResult {
    document_type: DocumentType;
    confidence: number;
    reasoning?: string;
}

/**
 * DocumentClassifier: Identifies the type of document using the specialized notary skill.
 */
export async function classifyDocument(fileData: FileData, textContext?: string): Promise<ClassificationResult> {
    console.log(`[CLASSIFIER] Identifying document type...`);

    const context = {
        has_ocr_text: !!textContext,
        ocr_sample: textContext?.substring(0, 1000) || "",
        hint: "Analiza la primera página para determinar la naturaleza del documento."
    };

    try {
        const result = await SkillExecutor.execute('notary-document-classifier', context, fileData);

        // Map common outputs to our internal types
        let docType: DocumentType = 'UNKNOWN';
        const rawType = result.document_type?.toUpperCase() || '';

        if (rawType.includes('DNI')) docType = 'DNI';
        else if (rawType.includes('PASAPORTE')) docType = 'PASAPORTE';
        else if (rawType.includes('ESCRITURA')) docType = 'ESCRITURA';
        else if (rawType.includes('BOLETO')) docType = 'BOLETO_COMPRAVENTA';
        else if (rawType.includes('DOMINIO') || rawType.includes('INHIBICION') || rawType.includes('RPI')) docType = 'CERTIFICADO_RPI';
        else if (rawType.includes('CATASTRO') || rawType.includes('ARBA')) docType = 'CATASTRO_ARBA';

        return {
            document_type: docType,
            confidence: result.confidence_score || 0.5,
            reasoning: result.reasoning
        };
    } catch (error) {
        console.error("[CLASSIFIER] Error during classification:", error);
        return { document_type: 'UNKNOWN', confidence: 0 };
    }
}
