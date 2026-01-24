import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabaseAdmin } from "./supabaseAdmin";

/**
 * Universal God-Mode Polyfill for Next.js Server Side
 * High-reach injection of browser globals required by document processing libraries.
 */
function applyUniversalPolyfills() {
    if (typeof globalThis !== 'undefined') {
        const g = globalThis as any;

        // Ensure core browser environments are mocked
        if (!g.window) g.window = g;
        if (!g.self) g.self = g;

        // Polyfill atob/btoa (Critical for PDF character map decoding)
        const atobPolyfill = (str: string) => {
            try {
                return Buffer.from(str, 'base64').toString('binary');
            } catch (e) {
                return "";
            }
        };
        const btoaPolyfill = (str: string) => {
            try {
                return Buffer.from(str, 'binary').toString('base64');
            } catch (e) {
                return "";
            }
        };

        if (!g.atob) g.atob = atobPolyfill;
        if (!g.btoa) g.btoa = btoaPolyfill;

        // Also inject into global for libraries that check global directly
        if (typeof global !== 'undefined') {
            const nodeG = global as any;
            if (!nodeG.atob) nodeG.atob = atobPolyfill;
            if (!nodeG.btoa) nodeG.btoa = btoaPolyfill;
            if (!nodeG.window) nodeG.window = g;
            if (!nodeG.DOMMatrix) {
                nodeG.DOMMatrix = class DOMMatrix {
                    constructor() { }
                    static fromFloat64Array() { return new DOMMatrix(); }
                    static fromFloat32Array() { return new DOMMatrix(); }
                };
            }
        }

        // Polyfill DOMMatrix (required by pdf.js)
        if (!g.DOMMatrix) {
            g.DOMMatrix = class DOMMatrix {
                constructor() { }
                static fromFloat64Array() { return new DOMMatrix(); }
                static fromFloat32Array() { return new DOMMatrix(); }
            };
        }
    }
}

// Apply immediately on module load
applyUniversalPolyfills();

// Dynamic imports for Node.js modules to prevent evaluation errors in some environments
async function getPdfParser() {
    console.log("[RAG] Loading pdf-parser...");
    const pdf = await import("pdf-parse") as any;
    return pdf.default || pdf;
}

async function getMammoth() {
    console.log("[RAG] Loading mammoth...");
    const mammoth = await import("mammoth") as any;
    return mammoth.default || mammoth;
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

export type KnowledgeCategory = 'SYSTEM_TAXONOMY' | 'VALIDATION_RULES' | 'LEGAL_CONTEXT';

/**
 * Extracts text from PDF or DOCX buffer
 */
async function extractText(buffer: Buffer, fileName: string): Promise<string> {
    const ext = fileName.split('.').pop()?.toLowerCase();
    console.log(`[RAG] Starting extraction for ${fileName} (ext: ${ext}, size: ${buffer.length} bytes)`);

    try {
        if (ext === 'pdf') {
            const pdfParser = await getPdfParser();
            // Convert Buffer to Uint8Array for maximum compatibility with pdf.js
            const uint8Array = new Uint8Array(buffer);
            const data = await pdfParser(uint8Array);
            console.log(`[RAG] PDF extraction complete. Text length: ${data.text?.length || 0}`);
            return data.text || "";
        } else if (ext === 'docx') {
            const mammoth = await getMammoth();
            const result = await mammoth.extractRawText({ buffer });
            console.log(`[RAG] DOCX extraction complete. Text length: ${result.value?.length || 0}`);
            return result.value || "";
        }
    } catch (err: any) {
        console.error(`[RAG] Extraction error for ${fileName}:`, err);
        throw new Error(`${err.message}`);
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
 * Indexes a document into the Knowledge Base (Optimized with batching)
 */
export async function indexDocument(fileBuffer: Buffer, fileName: string, category: KnowledgeCategory) {
    console.log(`[RAG] Indexing ${fileName} (${category})...`);

    const text = await extractText(fileBuffer, fileName);
    const chunks = chunkText(text);

    console.log(`[RAG] Generated ${chunks.length} chunks for ${fileName}. Starting batch indexing...`);

    const BATCH_SIZE = 50;
    const allDataToInsert: any[] = [];

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batchChunks = chunks.slice(i, i + BATCH_SIZE);

        try {
            // 1. Batch Generate Embeddings
            const embeddingResult = await embeddingModel.batchEmbedContents({
                requests: batchChunks.map(chunk => ({
                    content: { role: 'user', parts: [{ text: chunk }] },
                    taskType: "RETRIEVAL_DOCUMENT" as any
                }))
            });

            const embeddings = embeddingResult.embeddings;

            // 2. Prepare data for Supabase
            batchChunks.forEach((chunk, index) => {
                if (chunk.length < 20) return;

                allDataToInsert.push({
                    content: chunk,
                    embedding: embeddings[index].values,
                    metadata: {
                        source_file: fileName,
                        category: category,
                        chunk_index: i + index,
                        indexed_at: new Date().toISOString()
                    }
                });
            });

            console.log(`[RAG] Processed batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)}`);
        } catch (err: any) {
            console.error(`[RAG] Error in batch processing for ${fileName}:`, err);
            throw new Error(`Error en generación de embeddings: ${err.message}`);
        }
    }

    // 3. Bulk insert to Supabase (limit per insert to avoid large payloads)
    if (allDataToInsert.length > 0) {
        console.log(`[RAG] Inserting ${allDataToInsert.length} records into Supabase...`);

        // Insert in smaller chunks to avoid Supabase/PostgREST limits
        const DB_BATCH = 100;
        for (let i = 0; i < allDataToInsert.length; i += DB_BATCH) {
            const batch = allDataToInsert.slice(i, i + DB_BATCH);
            const { error } = await supabaseAdmin.from('knowledge_base').insert(batch);
            if (error) {
                console.error(`[RAG] DB Insert error for ${fileName} at batch ${i}:`, error);
                throw new Error(`Error al guardar en base de datos: ${error.message}`);
            }
        }
    }

    console.log(`[RAG] Successfully indexed ${fileName}`);
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

/**
 * Fetches a system skill definition from the Skill Registry (Supabase)
 * Used to inject specialized notary logic as prompts for the agent.
 */
export async function getSkillInstruction(slug: string): Promise<string> {
    try {
        console.log(`[SKILLS] Fetching instruction for: ${slug}`);
        const { data, error } = await supabaseAdmin
            .from('system_skills')
            .select('content_md')
            .eq('slug', slug)
            .eq('is_active', true)
            .single();

        if (error) {
            console.warn(`[SKILLS] Skill ${slug} not found or error:`, error.message);
            return "";
        }

        return data?.content_md || "";
    } catch (err) {
        console.error(`[SKILLS] Unexpected error fetching skill ${slug}:`, err);
        return "";
    }
}
