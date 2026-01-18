import { Document, Paragraph, TextRun, AlignmentType, HeadingLevel, convertInchesToTwip } from "docx";
import { saveAs } from "file-saver";

export async function exportMinutaToDocx(data: any) {
    const doc = new Document({
        sections: [
            {
                properties: {
                    page: {
                        margin: {
                            top: convertInchesToTwip(1),
                            right: convertInchesToTwip(1),
                            bottom: convertInchesToTwip(1),
                            left: convertInchesToTwip(1),
                        },
                    },
                },
                children: [
                    // Title
                    new Paragraph({
                        text: "MINUTA ROGATORIA",
                        heading: HeadingLevel.HEADING_1,
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 400 },
                    }),

                    // Subtitle
                    new Paragraph({
                        text: "Resumen para Registro de la Propiedad",
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 600 },
                        children: [
                            new TextRun({
                                text: "Resumen para Registro de la Propiedad",
                                italics: true,
                                size: 24,
                            }),
                        ],
                    }),

                    // Inmueble Section
                    new Paragraph({
                        text: "DATOS DEL INMUEBLE",
                        heading: HeadingLevel.HEADING_2,
                        spacing: { before: 400, after: 200 },
                    }),

                    new Paragraph({
                        spacing: { after: 120 },
                        children: [
                            new TextRun({ text: "Partido: ", bold: true }),
                            new TextRun({ text: data.inmuebles?.partido_id || "N/A" }),
                        ],
                    }),

                    new Paragraph({
                        spacing: { after: 120 },
                        children: [
                            new TextRun({ text: "Número de Partida: ", bold: true }),
                            new TextRun({ text: data.inmuebles?.nro_partida || "N/A" }),
                        ],
                    }),

                    new Paragraph({
                        spacing: { after: 120 },
                        children: [
                            new TextRun({ text: "Ubicación: ", bold: true }),
                            new TextRun({ text: data.inmuebles?.domicilio_real || "N/A" }),
                        ],
                    }),

                    // Operación Section
                    new Paragraph({
                        text: "DATOS DE LA OPERACIÓN",
                        heading: HeadingLevel.HEADING_2,
                        spacing: { before: 400, after: 200 },
                    }),

                    new Paragraph({
                        spacing: { after: 120 },
                        children: [
                            new TextRun({ text: "Tipo de Acto: ", bold: true }),
                            new TextRun({ text: data.operaciones?.[0]?.tipo_acto || "N/A" }),
                        ],
                    }),

                    new Paragraph({
                        spacing: { after: 120 },
                        children: [
                            new TextRun({ text: "Monto: ", bold: true }),
                            new TextRun({ text: `$${data.operaciones?.[0]?.monto_operacion || "0.00"}` }),
                        ],
                    }),

                    // Protocolo Section
                    new Paragraph({
                        text: "PROTOCOLO",
                        heading: HeadingLevel.HEADING_2,
                        spacing: { before: 400, after: 200 },
                    }),

                    new Paragraph({
                        spacing: { after: 120 },
                        children: [
                            new TextRun({ text: "Número de Protocolo: ", bold: true }),
                            new TextRun({ text: data.nro_protocolo || "Por asignar" }),
                        ],
                    }),

                    new Paragraph({
                        spacing: { after: 120 },
                        children: [
                            new TextRun({ text: "Fecha de Escritura: ", bold: true }),
                            new TextRun({ text: data.fecha_escritura || "Pendiente" }),
                        ],
                    }),

                    // Footer
                    new Paragraph({
                        text: "",
                        spacing: { before: 600 },
                    }),

                    new Paragraph({
                        text: "___________________________________________",
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 400, after: 120 },
                    }),

                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                            new TextRun({
                                text: "Firma del Titular del Registro Notarial",
                                italics: true,
                            }),
                        ],
                    }),
                ],
            },
        ],
    });

    const blob = await require("docx").Packer.toBlob(doc);
    saveAs(blob, `minuta_${data.nro_protocolo || "draft"}.docx`);
}
