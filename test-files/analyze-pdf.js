const fs = require('fs');
const https = require('https');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const pdfPath = 'C:\\Users\\diego\\NotiAr\\test-files\\7.pdf';

// Read PDF as base64
const pdfBuffer = fs.readFileSync(pdfPath);
const base64PDF = pdfBuffer.toString('base64');

const prompt = `Analiza este documento PDF notarial argentino y extrae TODOS los datos estructurados que puedas encontrar:

1. TIPO DE DOCUMENTO (Escritura, Certificado de Dominio, DNI, etc.)
2. DATOS DEL ACTO (si es escritura):
   - Tipo de acto
   - Número de escritura/protocolo
   - Fecha
   - Escribano

3. PERSONAS/PARTES:
   - Nombres completos
   - DNI/CUIT
   - Estado civil
   - Domicilios

4. INMUEBLES:
   - Nomenclatura catastral
   - Partida inmobiliaria
   - Domicilio del inmueble
   - Linderos y medidas
   - Superficies

5. DATOS ECONÓMICOS:
   - Montos
   - Forma de pago

Responde en formato JSON estructurado y legible.`;

const requestData = JSON.stringify({
    contents: [{
        parts: [
            { text: prompt },
            {
                inline_data: {
                    mime_type: "application/pdf",
                    data: base64PDF
                }
            }
        ]
    }]
});

const options = {
    hostname: 'generativelanguage.googleapis.com',
    path: `/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': requestData.length
    }
};

const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const response = JSON.parse(data);
            const text = response.candidates[0].content.parts[0].text;
            console.log(text);
        } catch (e) {
            console.error('Error parsing response:', e);
            console.error('Raw response:', data);
        }
    });
});

req.on('error', (e) => {
    console.error('Request error:', e);
});

req.write(requestData);
req.end();
