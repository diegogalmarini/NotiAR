---
name: notary-mortgage-reader
description: Extrae condiciones financieras de hipotecas (Montos, Tasas, UVA, Amortización).
license: Proprietary
---

# Notary Mortgage Reader

## Goal
Extraer detalladamente las condiciones financieras de una constitución de hipoteca o mutuo con garantía hipotecaria.

## Extraction Rules

### 1. Condiciones del Crédito
Extrae los términos financieros del préstamo. Cada campo debe seguir la estructura estricta `{ "valor": any, "evidencia": "string", "confianza": number }`.

**Campos a extraer:**
- **loan_amount_original**: El monto del capital prestado (numérico).
- **currency**: ENUM [ARS, USD, UVA].
- **uva_value_quoted**: Si la escritura menciona el valor de la UVA a una fecha específica, extraer el monto en pesos (ej: "Valor UVA al 20/01: $1234.56").
- **interest_rate**: Descripción de la tasa de interés (ej: "TNA 8.5%", "TEA Variable").
- **amortization_system**: Sistema de amortización (ej: "Francés", "Alemán", "Directo").

### 2. Garantía y Letras
- **letra_hipotecaria**: Indica si se menciona la creación de una letra hipotecaria (Booleano).
- **grado_hipoteca**: Grado de la hipoteca (ej: "Primer Grado").

## Expected JSON Output Format
```json
{
  "financial_terms": {
    "capital": { "valor": 1000000, "currency": "UVA", "evidencia": "..." },
    "uva_quoted": { "valor": 1234.56, "evidencia": "..." },
    "rate": { "valor": "TNA 5%", "evidencia": "..." },
    "system": { "valor": "FRANCES", "evidencia": "..." }
  },
  "legal_status": {
    "grado": "PRIMERO",
    "letra_hipotecaria": true
  }
}
```

**STRICT CONSTRAINT**: Si no encuentras evidencia exacta de un campo financiero, devuelve `null`. No inventes tasas ni montos.
