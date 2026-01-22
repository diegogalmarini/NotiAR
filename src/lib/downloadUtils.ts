import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun } from "docx";
import { jsPDF } from "jspdf";

const formatInmuebleContent = (inmueble: any): string => {
    return `DETALLE DEL INMUEBLE

Partido / Dpto: ${inmueble.partido_id || 'No especificado'}
Nro. Partida: ${inmueble.nro_partida || 'No especificado'}
Nomenclatura: ${inmueble.nomenclatura || 'No especificada'}

Transcripción Literal:
${inmueble.transcripcion_literal || 'No disponible'}`;
};

export const downloadAsTxt = (filename: string, inmueble: any) => {
    try {
        const content = formatInmuebleContent(inmueble);
        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        saveAs(blob, `${filename}.txt`);
    } catch (error) {
        console.error("Error downloading as TXT:", error);
    }
};

export const downloadAsPdf = (filename: string, inmueble: any) => {
    try {
        const doc = new jsPDF();
        const content = formatInmuebleContent(inmueble);

        // Split text to fit page
        const splitText = doc.splitTextToSize(content, 180);

        doc.setFontSize(12);
        doc.text(splitText, 15, 15);

        doc.save(`${filename}.pdf`);
    } catch (error) {
        console.error("Error downloading as PDF:", error);
    }
};

export const downloadAsDocx = async (filename: string, inmueble: any) => {
    try {
        const content = formatInmuebleContent(inmueble);

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
    } catch (error) {
        console.error("Error downloading as DOCX:", error);
    }
};
