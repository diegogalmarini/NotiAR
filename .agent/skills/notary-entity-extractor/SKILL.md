---
name: notary-entity-extractor
description: Extractor especializado en escrituras argentinas con manejo de casos edge basados en errores reales del sistema.
license: Proprietary
version: 4.1.0 (v1.2.17 - Unión Convivencial Recognition)
---

# Notary Entity Extractor - Manual de Casos Edge

> **Nota:** Las reglas críticas están en el System Prompt. Este documento complementa con casos difíciles y contexto jurídico argentino.

---

## 📋 CASOS REALES RESUELTOS

### Caso 1: Escritura 24.pdf - Préstamo Hipotecario (4 Entidades)

**Problema Original:** Sistema extraía 3 personas en vez de 4, duplicaba DNI en CUIT.

**Entidades Correctas:**
1. **Carlos Alberto PEREZ AGUIRRE** - DEUDOR
   - DNI: `25765599` | CUIT: `20-25765599-8`
   - Casado con Natalia Nittoli
   
2. **Norman Roberto GIRALDE** - REPRESENTANTE del Banco
   - DNI: `21502903` | CUIT: `20-21502903-5`
   - Divorciado
   - **Rol:** Actúa "en nombre y representación del Banco"

3. **BANCO DE GALICIA Y BUENOS AIRES S.A.U.** - ACREEDOR
   - CUIT: `30-50000173-5` (sin DNI)
   - Representado por: Norman Giralde

4. **Natalia NITTOLI** - FIADOR / GARANTE
   - DNI: `28219058` | CUIT: `27-28219058-9`
   - Casada con Carlos Alberto Perez Aguirre
   - **Rol:** Art. 470 CCyC (Asentimiento conyugal + Fianza)

**Lección:** Un representante legal es una entidad SEPARADA del representado.

---

## 🎯 PATRONES DE IDENTIFICACIÓN DE ROLES

### Comparecientes Directos
Busca frases como:
- "comparece" / "comparecen"
- "INTERVIENEN"
- "presente a este acto"

### Representantes Legales
Busca:
- "en nombre y representación de"
- "actuando en ejercicio del poder"
- "en carácter de apoderado"

**Regla:** Extrae AMBOS (representante + representado) como entidades separadas.

### Cónyuges Presentes
Busca:
- "PRESENTE a este acto [NOMBRE]"
- "presta el consentimiento requerido por el artículo 470"
- "se constituye en fiador solidario"

**Regla:** Si el cónyuge firma, es entidad separada. Si solo se menciona de paso, va en campo `conyuge`.

---

## 🔢 DIFERENCIACIÓN DNI vs CUIT (Casos Edge)

### Edge Case 1: CUIT sin DNI previo
```
"Norman Roberto GIRALDE, C.U.I.L. número 20-21502903-5"
```
**Acción:** Extrae CUIT directamente. Deduce DNI quitando prefijo/verificador.

```json
{
  "dni": "21502903",
  "cuit_cuil": "20-21502903-5"
}
```

### Edge Case 2: Persona Jurídica con CUIT largo
```
"BANCO DE GALICIA, C.U.I.T. número 30-50000173-5"
```
**Acción:** NUNCA inventes DNI para jurídicas.

```json
{
  "dni": null,
  "cuit_cuil": "30-50000173-5"
}
```

### Edge Case 3: Solo DNI mencionado
```
"Carlos Alberto PEREZ AGUIRRE, DNI 25.765.599"
```
**Acción:** Busca en TODO el documento si aparece CUIT después.

Si NO aparece:
```json
{
  "dni": "25765599",
  "cuit_cuil": null
}
```

### Edge Case 4: Formato sin guiones
```
"CUIT 20257655998"
```
**Acción:** Reconstruye guiones automáticamente (2-8-1):

```json
{
  "cuit_cuil": "20-25765599-8"
}
```

---

## 👥 ESTADO CIVIL Y CÓNYUGES

### Caso: "Casado en primeras nupcias"
```
"casado en primeras nupcias con Natalia Nittoli"
```

**Extracción correcta:**
```json
{
  "estado_civil": "Casado",
  "regimen_matrimonial": "Primeras nupcias",
  "conyuge": {
    "nombre_completo": "Natalia Nittoli",
    "dni": "28219058",  // Buscar en el documento
    "cuit_cuil": "27-28219058-9"
  }
}
```

**❌ Incorrecto:**
```json
{
  "estado_civil": "Casado",
  "conyuge": "Natalia Nittoli"  // Debe ser objeto, no string
}
```

### Caso: "Unión Convivencial Inscripta"
```
"soltero, en unión convivencial inscripta con Mercedes Mercatante"
```

**Marco Legal:** Art. 509-528 CCyC - NO es matrimonio, pero requiere registro oficial.

**Extracción correcta:**
```json
{
  "estado_civil": "Unión Convivencial",
  "regimen_matrimonial": null,  // No aplica
  "conviviente": {
    "nombre_completo": "Mercedes Mercatante",
    "dni": "34295254",  // Buscar en el documento
    "cuit_cuil": "27-34295254-8"
  }
}
```

**❌ Incorrecto:**
```json
{
  "estado_civil": "Soltero"  // Pierde info de convivencia
}
```

**Regla Crítica:** Si dice "soltero EN unión convivencial" → Devolver **"Unión Convivencial"**, NO "Soltero".

### Valores Permitidos de Estado Civil
- `"Soltero"` - Sin pareja registrada
- `"Casado"` - Matrimonio formal
- `"Divorciado"` - Vínculo disuelto
- `"Viudo"` - Cónyuge fallecido
- `"Unión Convivencial"` - Pareja registrada Art. 509 CCyC
- `"Separado"` - Separación de hecho


## 📆 FECHAS TEXTUALES (Conversión a ISO)

### Patrón Argentino Formal:
```
"quince días del mes de enero del año dos mil veinticinco"
```

**Conversión:** `"2025-01-15"`

### Tabla de Conversión Rápida:
| Texto | ISO |
|-------|-----|
| "dieciocho de febrero de mil novecientos setenta y siete" | `1977-02-18` |
| "veintiséis de mayo de mil novecientos ochenta" | `1980-05-26` |
| "cinco de octubre de mil novecientos setenta" | `1970-10-05` |

**Regla:** Si aparece "mil novecientos", estamos en 1900-1999. "Dos mil" = 2000+.

---

## 🏛️ PERSONAS JURÍDICAS

### Indicadores de Entidad Jurídica:
- S.A. / S.A.U. / S.R.L.
- Banco / Compañía / Sociedad
- CUIT empieza con 30/33/34

### Campos Específicos:
```json
{
  "tipo_persona": "Jurídica",
  "razon_social": "BANCO DE GALICIA Y BUENOS AIRES S.A.U.",
  "dni": null,
  "cuit_cuil": "30-50000173-5",
  "representante_legal": {
    "nombre": "Norman Roberto Giralde",
    "dni": "21502903",
    "cargo": "Apoderado"
  }
}
```

**Regla:** El representante NO reemplaza a la entidad, ambos van en el array.

---

## 📍 DIRECCIONES (Formato Notarial)

### ❌ Incorrecto:
```
"Horacio Quiroga 2256"
```

### ✅ Correcto:
```
"calle Horacio Quiroga número 2.256 de esta ciudad"
```

**Regla:** Mantén el estilo literal de la escritura (tipo de vía + "número" + puntos en miles).

---

## 🔍 FLUJO DE EXTRACCIÓN COMPLETO

1. **Identificar Encabezado:** "comparecen" marca inicio de sección de partes
2. **Extraer por Orden:** Cada "I)", "II)", "III)" es una entidad
3. **Leer Párrafo Completo:** No te detengas en el nombre, sigue hasta el punto final
4. **Buscar Cruzado:** Si menciona cónyuge, buscar sus datos en otro párrafo
5. **Validar Roles:** Deudor, Acreedor, Garante, Representante
6. **Verificar Conteo:** ¿Extraje a TODOS los firmantes?

---

## ⚠️ CHECKLIST FINAL

Antes de devolver el JSON, verifica:

- [ ] ¿Todos los CUITs tienen prefijo (XX-) y verificador (-X)?
- [ ] ¿Las Personas Jurídicas NO tienen DNI?
- [ ] ¿Los representantes están como entidad separada?
- [ ] ¿Los cónyuges tienen sus propios datos (si firman)?
- [ ] ¿Las fechas están en formato ISO (YYYY-MM-DD)?
- [ ] ¿Las direcciones mantienen "calle ... número ..."?
- [ ] ¿Extraje a TODOS los comparecientes del documento?
- [ ] ¿Detecto "Unión Convivencial" en lugar de "Soltero" cuando corresponde?

---

## 📚 CONTEXTO LEGAL ARGENTINO

### Artículo 470 CCyC (Asentimiento Conyugal)
Si un cónyuge grava un bien ganancial, el otro **debe dar consentimiento**.  
**Indicador:** "PRESENTE a este acto [CÓNYUGE]... presta el consentimiento"

### Roles Típicos en Escrituras:
- **DEUDOR/MUTUARIO:** Quien recibe el préstamo
- **ACREEDOR/MUTANTE:** Quien otorga el préstamo (banco)
- **GARANTE/FIADOR:** Quien garantiza con bienes o firma solidaria
- **REPRESENTANTE:** Quien firma en nombre de otro (persona jurídica)

---

## 🎓 REGLAS DE ORO

1. **DNI ≠ CUIT** → El DNI son 8 dígitos, el CUIT son 11 con guiones
2. **Un documento, múltiples entidades** → Extrae TODAS
3. **Representante ≠ Representado** → Son 2 entidades separadas
4. **Cónyuge presente = Entidad** → Si firma, va separado
5. **Literal > Normalizado** → Copia exacto del documento
6. **Buscar cruzado** → Los datos pueden estar en párrafos separados
7. **Verificar conteo** → Si dice "comparecen 4 personas", deben ser 4 entidades

---

**Versión 4.0.0** - Actualizado con casos reales del 24.pdf  
Complementa las reglas del System Prompt con contexto jurídico argentino.