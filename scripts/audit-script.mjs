import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';

const SITE_URL = 'http://localhost:3000'; // Target local server
const TEST_DIR = 'test-files';

const files = [
    '24.pdf',
    '103.pdf',
    '113.pdf',
    '36.pdf',
    '68.pdf',
    '7.pdf',
    '84.pdf'
];

async function auditFile(fileName) {
    console.log(`\n🔍 AUDITING: ${fileName}...`);
    const filePath = path.join(process.cwd(), TEST_DIR, fileName);

    if (!fs.existsSync(filePath)) {
        console.error(`❌ File not found: ${filePath}`);
        return;
    }

    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    try {
        const start = Date.now();
        const response = await fetch(`${SITE_URL}/api/ingest`, {
            method: 'POST',
            body: form
        });

        const duration = (Date.now() - start) / 1000;
        const rawText = await response.text();
        let result;
        try {
            result = JSON.parse(rawText);
        } catch (e) {
            console.error(`❌ FAILED to parse JSON [${duration}s]`);
            console.error(`   Raw Response: ${rawText.substring(0, 200)}...`);
            return;
        }

        if (response.ok) {
            console.log(`✅ SUCCESS [${duration}s]`);
            console.log(`   Folder ID: ${result.folderId}`);
            console.log(`   Status: ${result.status}`);
            console.log(`   Detected: ${result.debug?.clients} partes, ${result.debug?.assets} inmuebles`);
            if (result.db_logs?.length > 0) {
                console.log(`   DB Warnings:`, result.db_logs);
            }
        } else {
            console.error(`❌ FAILED [${duration}s]`);
            console.error(`   Error: ${result.error}`);
            console.error(`   Details:`, result.details || result);
        }
    } catch (error) {
        console.error(`💥 CRASH:`, error.message);
    }
}

async function runAudit() {
    console.log('🚀 Starting Ingestion Audit...');
    for (const file of files) {
        await auditFile(file);
    }
    console.log('\n🏁 Audit Finished.');
}

runAudit();
