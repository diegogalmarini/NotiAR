import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";
import { saveAs } from "file-saver";

/**
 * Exports the provided text content to a .docx file.
 * Handles basic formatting: splits by newlines and preserves multiple spaces/indentation.
 */
export async function exportToDocx(title: string, content: string) {
    // Split content into paragraphs by new lines
    const lines = content.split("\n");

    const doc = new Document({
        sections: [
            {
                properties: {},
                children: [
                    // Title
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: title.toUpperCase(),
                                bold: true,
                                size: 32,
                                font: "Times New Roman",
                            }),
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 400 },
                    }),
                    // Body content
                    ...lines.map((line) => {
                        // Preserving empty lines
                        if (line.trim() === "") {
                            return new Paragraph({
                                children: [new TextRun("")],
                                spacing: { after: 200 }
                            });
                        }

                        return new Paragraph({
                            children: [
                                new TextRun({
                                    text: line,
                                    size: 24, // 12pt approx
                                    font: "Times New Roman",
                                }),
                            ],
                            spacing: { after: 200, line: 360 }, // 1.5 line spacing approx
                            alignment: AlignmentType.JUSTIFIED,
                        });
                    }),
                ],
            },
        ],
    });

    // Generate and save the file
    const blob = await Packer.toBlob(doc);
    const filename = `${title.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.docx`;
    saveAs(blob, filename);
}
