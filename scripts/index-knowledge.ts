import fs from 'fs';
import path from 'path';
import { indexDocument, KnowledgeCategory } from '../src/lib/knowledge';

/**
 * CLI Script to index knowledge documents from src/knowledge/ directory.
 * Run with: npx ts-node scripts/index-knowledge.ts
 * Ensure environment variables are loaded (e.g., via dotenv -r .env.local)
 */

async function main() {
    const baseDir = path.join(process.cwd(), 'src/knowledge');
    const categories: { folder: string, type: KnowledgeCategory }[] = [
        { folder: 'system_taxonomy', type: 'SYSTEM_TAXONOMY' },
        { folder: 'validation_rules', type: 'VALIDATION_RULES' },
        { folder: 'legal_context', type: 'LEGAL_CONTEXT' }
    ];

    console.log("------------------------------------------");
    console.log("🚀 NotiAR Knowledge Base Indexer");
    console.log("------------------------------------------");

    let totalFiles = 0;
    let totalChunks = 0;

    for (const { folder, type } of categories) {
        const dirPath = path.join(baseDir, folder);
        if (!fs.existsSync(dirPath)) {
            console.log(`[INDEXER] 📁 Directory not found: ${folder}, skipping.`);
            continue;
        }

        const files = fs.readdirSync(dirPath).filter(f =>
            f.toLowerCase().endsWith('.pdf') ||
            f.toLowerCase().endsWith('.docx')
        );

        console.log(`[INDEXER] 📂 Found ${files.length} files in /${folder}`);

        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const buffer = fs.readFileSync(filePath);

            try {
                const result = await indexDocument(buffer, file, type);
                totalFiles++;
                totalChunks += result.chunks;
                console.log(`[INDEXER] ✅ Indexed: ${file} (${result.chunks} chunks)`);
            } catch (err) {
                console.error(`[INDEXER] ❌ Error indexing ${file}:`, err);
            }
        }
    }

    console.log("------------------------------------------");
    console.log(`📊 Indexing Summary:`);
    console.log(`- Files processed: ${totalFiles}`);
    console.log(`- Total chunks saved: ${totalChunks}`);
    console.log("✅ Done.");
    console.log("------------------------------------------");
}

main().catch(error => {
    console.error("[INDEXER] 🛑 Fatal Error:", error);
    process.exit(1);
});
