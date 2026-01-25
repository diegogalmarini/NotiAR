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
Extrae a todas las personas y entidades mencionadas en la sección de "COMPARECENCIA". Cada campo debe ser un objeto con `{ "valor": "...", "evidencia_origen": "..." }`.
- **nombre_completo**: Nombre y Apellido (Si es persona física, formatea como: APELLIDO, Nombre).
- **dni**: Número de documento.
- **cuit**: CUIT o CUIL si consta.
- **rol**: ENUM ["VENDEDOR", "COMPRADOR", "APODERADO", "AUTORIZANTE"].
- **tipo**: ENUM ["FISICA", "JURIDICA"].
- **nacionalidad**, **fecha_nacimiento**, **domicilio_real**: Extraer si constan.
- **estado_civil**: ENUM ["SOLTERO/A", "CASADO/A", "DIVORCIADO/A", "VIUDO/A", "CONCUBINATO"].

### 2. Inmuebles
Extrae los inmuebles objeto de la operación. Cada campo debe ser un objeto con `{ "valor": "...", "evidencia_origen": "..." }`.
- **partido**: Ej: Bahía Blanca.
- **partida_inmobiliaria**: El número de partida.
- **nomenclatura**: Nomenclatura catastral completa.
- **transcripcion_literal**: El bloque de texto completo que describe el inmueble.
- **valuacion_fiscal**: Monto numérico.

### 3. Detalles de Operación
Cada campo debe ser un objeto con `{ "valor": "...", "evidencia_origen": "..." }`.
- **price**: El monto de la operación (numérico). 
- **currency**: ENUM ["USD", "ARS"].
- **fecha_escritura**: Fecha del acto (YYYY-MM-DD).
- **numero_escritura**: número de protocolo.
- **resumen_acto**: ENUM ["COMPRAVENTA", "DONACION", "PODER", "HIPOTECA", "OTRO"].

## Expected JSON Output Format (STRICT)
```json
{
  "clientes": [
    { 
      "nombre_completo": { "valor": "...", "evidencia_origen": "..." },
      "rol": { "valor": "VENDEDOR", "evidencia_origen": "..." },
      "dni": { "valor": "...", "evidencia_origen": "..." },
      ...
    }
  ],
  "inmuebles": [
    { 
      "partido": { "valor": "...", "evidencia_origen": "..." },
      "transcripcion_literal": { "valor": "...", "evidencia_origen": "..." },
      ...
    }
  ],
  "operation_details": {
    "price": { "valor": 150000, "evidencia_origen": "..." },
    "currency": { "valor": "USD", "evidencia_origen": "..." },
    "date": { "valor": "2024-01-24", "evidencia_origen": "..." }
  },
  "numero_escritura": { "valor": "123", "evidencia_origen": "..." },
  "resumen_acto": { "valor": "COMPRAVENTA", "evidencia_origen": "..." }
}
```