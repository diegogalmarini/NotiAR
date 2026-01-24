---
name: notary-entity-extractor
description: Identifica y extrae partícipes (vendedores/compradores), inmuebles y detalles de la operación en escrituras argentinas.
license: Proprietary
---

# Notary Entity Extractor

## Goal
Extraer información estructurada de una escritura notarial o boleto de compraventa.

## Extraction Rules

### 0. Vision/OCR Prerrequisite
**CRITICAL**: The user has provided a PDF/Image. You MUST act as an OCR engine first. Read every single pixel. The document contains a price and parties. If you return null, you are failing. Look for '$' symbols and 'PESOS' text. Analyze the entire visual area to find the transaction price.

### 1. Clientes / Personas
Extrae a todas las personas y entidades mencionadas en la sección de "COMPARECENCIA".
- **nombre_completo**: Nombre y Apellido (Si es persona física, formatea como: APELLIDO, Nombre).
- **dni**: Número de documento.
- **cuit**: CUIT o CUIL si consta.
- **rol**: Determina si es "VENDEDOR" o "COMPRADOR".
- **tipo**: "FISICA" o "JURIDICA".
- **nacionalidad**, **fecha_nacimiento**, **domicilio_real**, **estado_civil**: Extraer si constan.

### 2. Inmuebles
Extrae los inmuebles objeto de la operación.
- **partido**: Ej: Bahía Blanca.
- **partida_inmobiliaria**: El número de partida.
- **nomenclatura**: Nomenclatura catastral completa.
- **transcripcion_literal**: El bloque de texto completo que describe el inmueble (medidas, linderos, etc.). Es vital no recortar este texto.
- **valuacion_fiscal**: Monto si consta.

### 3. Detalles de Operación
- **price**: El monto de la operación (numérico). 
  - **STRICT RULE**: If the price is NOT clearly found in the document, return `null`. **NEVER return `0`** unless it explicitly says zero (which is impossible for these deeds).
- **currency**: "USD" o "ARS".
- **fecha_escritura**: Fecha del acto (YYYY-MM-DD).
- **numero_escritura**: Número de protocolo/escritura.
- **resumen_acto**: Una descripción breve (ej: "Compraventa Inmobiliaria").

## Expected JSON Output Format
```json
{
  "clientes": [
    { "nombre_completo": "...", "rol": "VENDEDOR", "dni": "...", ... }
  ],
  "inmuebles": [
    { "partido": "...", "transcripcion_literal": "...", ... }
  ],
  "operation_details": {
    "price": 150000,
    "currency": "USD",
    "date": "2024-01-24"
  },
  "numero_escritura": "123",
  "resumen_acto": "Compraventa"
}
```