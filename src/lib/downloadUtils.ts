import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun } from "docx";
import { jsPDF } from "jspdf";

export const downloadAsTxt = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    saveAs(blob, `${filename}.txt`);
};

export const downloadAsPdf = (filename: string, content: string) => {
    const doc = new jsPDF();

    // Split text to fit page
    const splitText = doc.splitTextToSize(content, 180);

    doc.setFontSize(12);
    doc.text(splitText, 15, 15);

    doc.save(`${filename}.pdf`);
};

export const downloadAsDocx = async (filename: string, content: string) => {
    const doc = new Document({
        sections: [
            {
                properties: {},
                children: [
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: content,
                                font: "Times New Roman",
                                size: 24, // 12pt
                            }),
                        ],
                    }),
                ],
            },
        ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${filename}.docx`);
};
