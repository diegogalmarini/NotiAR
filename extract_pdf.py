import PyPDF2
import json

pdf_path = 'test-files/24.pdf'
output = {
    "total_pages": 0,
    "extracted_text": "",
    "pages": []
}

with open(pdf_path, 'rb') as pdf_file:
    reader = PyPDF2.PdfReader(pdf_file)
    output["total_pages"] = len(reader.pages)
    
    for i, page in enumerate(reader.pages):
        text = page.extract_text()
        output["pages"].append({
            "page_num": i + 1,
            "text": text
        })
        output["extracted_text"] += f"\n=== PÁGINA {i+1} ===\n{text}\n"

# Print full text
print(output["extracted_text"])

# Also save to JSON for inspection
with open('24_extracted.json', 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print("\n\n=== EXTRACTO GUARDADO EN 24_extracted.json ===")
