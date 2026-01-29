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

## 🏦 FIDEICOMISOS (Entidades Especiales)

### Indicadores de Fideicomiso:
- Palabra "FIDEICOMISO" en el nombre
- CUIT propio (generalmente 30-XXXXXXXX-X)
- "Administrado por" / "Fiduciaria" / "Fiduciario"
- Instrumento de constitución mencionado
- "CUIT del fideicomiso"

### Diferencia CRÍTICA: Fiduciaria ≠ Fideicomiso

```
❌ Incorrecto: "FIDEICOMISO G-4 SOMAJOFA S.A." (Combinado)
✅ Correcto: 
   1. "SOMAJOFA S.A." (Rol: FIDUCIARIA)
   2. "FIDEICOMISO G-4" (Rol: VENDEDOR_FIDUCIARIO / VEHICULO)
```

**Regla de Oro**: Si el documento menciona "FIDEICOMISO [NOMBRE]" administrado por "EMPRESA X", debes generar **DOS** objetos en el array `entidades`.
- El Fideicomiso lleva el CUIT que empieza con 30-71... (generalmente).
- La Fiduciaria lleva su propio CUIT.
- **NUNCA** concatenes los nombres en el campo `nombre` o `razon_social`.

---

## 📄 CESIONES DE BENEFICIARIO (Operaciones Fiduciarias)

### 👥 Participantes Obligatorios en Cesión:
1. **Cedente**: El beneficiario original (ej: "Claudio Wagner"). **DEBE** incluirse en el array de `entidades` con `rol: "CEDENTE"`.
2. **Cesionario**: El nuevo beneficiario (ej: "Juan Moran"). **DEBE** incluirse en el array de `entidades` con `rol: "CESIONARIO" / "COMPRADOR"`.

**Regla de Ubicación**: Los datos del Cedente suelen estar en el "Anexo", "Constancia Notarial" o en los "Incisos" de antecedentes. Aunque no firme la escritura actual, es parte de la operación y debe ser extraído.

### Indicadores de Cesión:
- "cesión de condición de beneficiario"
- "cesión de derechos fiduciarios"
- "beneficiario original" → "beneficiario final"
- Dos personas mencionadas: cedente y cesionario
- Precio de cesión en USD

### Búsqueda en Constancias Notariales

**Ubicación típica**: Sección "CONSTANCIAS NOTARIALES" incisos c), d), e)

Ejemplo de texto:
```
"c) De agregar a la presente Incorporación a Contrato de Fideicomiso 
    suscripta a favor de Claudio Jorge Wagner, con fecha 25 de junio de 2.013.
    
d) De agregar a la presente cesión de condición de beneficiario, 
   suscripta por Claudio Jorge Wagner a favor de Juan Francisco Moran 
   del día de la fecha, por la suma de Dólares Estadounidenses 
   Veintitrés mil (U$S 23.000)."
```

### Extracción Correcta:

```json
{
  "cesion_beneficiario": {
    "cedente": {
      "nombre": "Claudio Jorge Wagner",
      "fecha_incorporacion": "2013-06-25",
      "rol": "BENEFICIARIO_ORIGINAL"
    },
    "cesionario": {
      "nombre": "Juan Francisco Moran",
      "dni": "34877009",
      "rol": "BENEFICIARIO_FINAL"
    },
    "precio_cesion": {
      "monto": 23000,
      "moneda": "USD"
    },
    "fecha_cesion": "2025-03-06"
  }
}
```

**Regla CRÍTICA**: El beneficiario CEDENTE debe ir en el array de `clientes` aunque NO comparezca físicamente.

---

## 💰 DOBLE PRECIO EN FIDEICOMISOS

### Caso: Fideicomiso al Costo + Cesión de Beneficiario

En operaciones fiduciarias de "construcción al costo", hay **DOS precios distintos**:

#### 1. Precio de Construcción (Bajo)
- Monto aportado por beneficiario durante construcción
- Ya integrado ANTES del acto
- Incluye terreno proporcional + obra

**Indicadores**:
- "costo de construcción"
- "ha sido integrado antes de este acto"
- "importe correspondiente al costo de construcción"

#### 2. Precio de Cesión (Alto - Valor de Mercado)
- Precio real pagado por beneficiario final a beneficiario original
- Valor comercial actual del inmueble
- Generalmente en USD

**Indicadores**:
- "cesión de condición de beneficiario"
- "por la suma de Dólares..."
- Monto mucho más alto que construcción

### Ejemplo Real (103.pdf):

```json
{
  "precio_construccion": {
    "monto": 126212.66,
    "moneda": "ARS",
    "concepto": "Costo construcción + terreno proporcional",
    "estado": "INTEGRADO_ANTES_ACTO"
  },
  "precio_cesion": {
    "monto": 23000,
    "moneda": "USD",
    "equivalente_ars": 24943500,
    "tipo_cambio": 1084.50,
    "fecha_tipo_cambio": "2025-03-05",
    "concepto": "Cesión de beneficiario"
  },
  "precio_fiscal": "CESION"  // Para impuestos, usar precio de CESIÓN
}
```

**Regla Fiscal CRÍTICA**: 
- Para cálculo de **Impuesto de Sellos** e **ITI**: Usar precio de **CESIÓN** (más alto)
- Para **honorarios notariales**: Usar precio de **CESIÓN**
- El precio de construcción es **histórico**, el de cesión es el **actual**

### Cómo Detectar los Dos Precios

1. Buscar en párrafo principal:
   ```
   "por la suma de PESOS CIENTO VEINTISEIS MIL... ($ 126.212,66), 
    importe correspondiente al costo de construcción..."
   ```

2. Buscar en constancias notariales inciso d) o e):
   ```
   "cesión... por la suma de Dólares Estadounidenses 
    Veintitrés mil (U$S 23.000)"
   ```

3. Buscar conversión a pesos:
   ```
   "el precio equivale a PESOS VEINTICUATRO MILLONES 
    NOVECIENTOS CUARENTA Y TRES MIL QUINIENTOS ($24.943.500)"
   ```

**Regla**: Si encuentras DOS montos muy diferentes, uno en ARS (bajo) y otro en USD (alto), es doble precio.


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