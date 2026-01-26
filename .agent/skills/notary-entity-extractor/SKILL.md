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

### 1. Entidades / Partes
Extrae a todas las personas y entidades mencionadas en la sección de "COMPARECENCIA" y "REPRESENTACIÓN". Cada campo debe seguir la estructura estricta `{ "valor": any, "evidencia": "string", "confianza": number }`.

**Reglas de extracción:**
- **rol**: ENUM [VENDEDOR, COMPRADOR, APODERADO, USUFRUCTUARIO, CONYUGE_ASINTIENTE, ACREEDOR, DEUDOR, FIADOR].
- **Logic**: If the document type is "HIPOTECA" or "MUTUO", prioritize ACREEDOR (Lender) and DEUDOR (Borrower) roles.
- **tipo_persona**: ENUM [FISICA, JURIDICA].
- **datos.nombre_completo**: Nombre y Apellido (APELLIDO, Nombre).
- **datos.dni_cuil_cuit**: ID nacional o tributario.
- **datos.estado_civil**: ENUM [SOLTERO, CASADO, DIVORCIADO, VIUDO, CONVIVIENTE].
- **datos.nupcias**: Objeto `{ valor: number (1, 2, etc), descripcion: "1ras, 2das", evidencia: "..." }`.
- **datos.domicilio**, **datos.nacionalidad**: Extraer literal.

**Representación:**
- **es_representado**: Booleano. True si actúa por poder o estatuto.
- **documento_base**: Nombre del documento justificativo (ej: "Poder Especial ante Esc. X").
- **folio_evidencia**: Mención del folio o foja de la representación.

### 2. Validación Sistémica
- **coherencia_identidad**: Booleano. ¿Los datos de DNI/CUIL coinciden en todo el texto?
- **observaciones_criticas**: String. Reportar inconsistencias legales (ej: falta asentimiento conyugal).

### 3. Inmuebles
Extrae los inmuebles objeto de la operación. Cada campo debe ser un objeto con `{ "valor": "...", "evidencia_origen": "..." }`.
- **partido**: Ej: Bahía Blanca.
- **partida_inmobiliaria**: El número de partida.
- **nomenclatura**: Nomenclatura catastral completa.
- **transcripcion_literal**: El bloque de texto completo que describe el inmueble.
- **valuacion_fiscal**: Monto numérico.

### 4. Detalles de Operación
Cada campo debe ser un objeto con `{ "valor": "...", "evidencia_origen": "..." }`.
- **price**: El monto de la operación (numérico). 
- **currency**: ENUM ["USD", "ARS"].
- **fecha_escritura**: Fecha del acto (YYYY-MM-DD).
- **numero_escritura**: número de protocolo.
- **resumen_acto**: ENUM ["COMPRAVENTA", "DONACION", "PODER", "HIPOTECA", "OTRO"].

## Expected JSON Output Format (STRICT SCHEMA)
```json
{
  "tipo_objeto": "ACTA_EXTRACCION_PARTES",
  "entidades": [
    {
      "rol": "VENDEDOR",
      "tipo_persona": "FISICA",
      "datos": {
        "nombre_completo": { "valor": "...", "evidencia": "...", "confianza": 0.99 },
        "dni_cuil_cuit": { "valor": "...", "evidencia": "...", "confianza": 0.99 },
        "estado_civil": { "valor": "CASADO", "evidencia": "..." },
        "nupcias": { "valor": 1, "descripcion": "1ras", "evidencia": "..." },
        "domicilio": { "valor": "...", "evidencia": "..." },
        "nacionalidad": { "valor": "...", "evidencia": "..." }
      },
      "representacion": {
        "es_representado": false,
        "documento_base": null,
        "folio_evidencia": null
      }
    }
  ],
  "validación_sistémica": {
    "coherencia_identidad": true,
    "observaciones_criticas": null
  }
}
```

**STRICT CONSTRAINT**: Si no encuentras evidencia exacta, el campo `valor` debe ser `null`. No inferir.