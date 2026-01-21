import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabaseAdmin } from "./supabaseAdmin";
// Dynamic imports for Node.js modules to prevent evaluation errors in some environments
async function getPdfParser() {
    const pdf = await import("pdf-parse") as any;
    return pdf.default || pdf;
}

async function getMammoth() {
    const mammoth = await import("mammoth") as any;
    return mammoth.default || mammoth;
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

export type KnowledgeCategory = 'LAW' | 'MANUAL' | 'TEMPLATE';

/**
 * Extracts text from PDF or DOCX buffer
 */
async function extractText(buffer: Buffer, fileName: string): Promise<string> {
    const ext = fileName.split('.').pop()?.toLowerCase();

    if (ext === 'pdf') {
        const pdfParser = await getPdfParser();
        const data = await pdfParser(buffer);
        return data.text;
    } else if (ext === 'docx') {
        const mammoth = await getMammoth();
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
    }

    throw new Error(`Unsupported file type: ${ext}`);
}

/**
 * Splits text into overlapping chunks
 */
function chunkText(text: string, size: number = 1000, overlap: number = 200): string[] {
    const chunks: string[] = [];
    let start = 0;

    // Clean up text
    const cleanText = text.replace(/\s+/g, ' ').trim();

    while (start < cleanText.length) {
        let end = start + size;

        // Try to find a natural break (period or newline) near the end
        if (end < cleanText.length) {
            const nextPeriod = cleanText.lastIndexOf('. ', end);
            if (nextPeriod > start + (size * 0.8)) {
                end = nextPeriod + 1;
            }
        }

        chunks.push(cleanText.slice(start, end).trim());
        start = end - overlap;

        // Safety break
        if (start < 0) start = 0;
        if (chunks.length > 1000) break; // Limit chunks per file
    }

    return chunks;
}

/**
 * Indexes a document into the Knowledge Base
 */
export async function indexDocument(fileBuffer: Buffer, fileName: string, category: KnowledgeCategory) {
    console.log(`[RAG] Indexing ${fileName} (${category})...`);

    const text = await extractText(fileBuffer, fileName);
    const chunks = chunkText(text);

    console.log(`[RAG] Generated ${chunks.length} chunks for ${fileName}`);

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (chunk.length < 20) continue; // Skip tiny chunks

        try {
            // Generate Embedding
            const result = await embeddingModel.embedContent(chunk);
            const embedding = result.embedding.values;

            // Save to Supabase
            const { error } = await supabaseAdmin.from('knowledge_base').insert({
                content: chunk,
                embedding: embedding,
                metadata: {
                    source_file: fileName,
                    category: category,
                    chunk_index: i,
                    indexed_at: new Date().toISOString()
                }
            });

            if (error) throw error;
        } catch (err) {
            console.error(`[RAG] Error indexing chunk ${i} of ${fileName}:`, err);
        }
    }

    console.log(`[RAG] Completed indexing for ${fileName}`);
    return { success: true, chunks: chunks.length };
}

/**
 * Queries the Knowledge Base for relevant context
 */
export async function queryKnowledge(query: string, category?: KnowledgeCategory) {
    try {
        // 1. Generate Query Embedding
        const result = await embeddingModel.embedContent(query);
        const embedding = result.embedding.values;

        // 2. Perform Vector Search
        const { data, error } = await supabaseAdmin.rpc('match_knowledge', {
            query_embedding: embedding,
            match_threshold: 0.4, // Adjustable
            match_count: 5,
            filter: category ? { category } : {}
        });

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('[RAG] Query error:', err);
        return [];
    }
}

/**
 * Helper to get a formatted context string for prompt injection
 */
export async function getKnowledgeContext(query: string, category?: KnowledgeCategory): Promise<string> {
    const relevantChunks = await queryKnowledge(query, category);

    if (relevantChunks.length === 0) return "";

    let context = "\n--- KNOWLEDGE BASE CONTEXT ---\n";
    relevantChunks.forEach((chunk: any, i: number) => {
        context += `[Source: ${chunk.metadata.source_file} | Relevance: ${(chunk.similarity * 100).toFixed(1)}%]\n`;
        context += `${chunk.content}\n\n`;
    });
    context += "-------------------------------\n";

    return context;
}
