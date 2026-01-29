const fs = require('fs');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

async function extractPDFText(pdfPath) {
    try {
        const data = new Uint8Array(fs.readFileSync(pdfPath));
        const loadingTask = pdfjsLib.getDocument({ data });
        const pdf = await loadingTask.promise;

        let fullText = '';

        // Extract text from first 5 pages
        for (let pageNum = 1; pageNum <= Math.min(5, pdf.numPages); pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += `\n\n=== PÁGINA ${pageNum} ===\n${pageText}`;
        }

        console.log(fullText);
    } catch (error) {
        console.error('Error:', error);
    }
}

extractPDFText('C:\\Users\\diego\\NotiAr\\test-files\\7.pdf');
