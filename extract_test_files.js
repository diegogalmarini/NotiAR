const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

async function extractText() {
    const pdfPath = 'c:/Users/diego/NotiAr/test-files/CARPETA 8203.pdf';
    const docxPath = 'c:/Users/diego/NotiAr/test-files/CARPETA 8203.docx';

    console.log('--- PDF CONTENT ---');
    try {
        const dataBuffer = fs.readFileSync(pdfPath);
        const data = await pdf(dataBuffer);
        console.log(data.text);
    } catch (err) {
        console.error('Error reading PDF:', err);
    }

    console.log('\n--- DOCX CONTENT ---');
    try {
        const result = await mammoth.extractRawText({ path: docxPath });
        console.log(result.value);
    } catch (err) {
        console.error('Error reading DOCX:', err);
    }
}

extractText();
