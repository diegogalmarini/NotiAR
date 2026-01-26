---
name: notary-entity-extractor
description: Extractor especializado en escrituras argentinas. Distingue roles corporativos, separa nombres/apellidos compuestos y normaliza fechas textuales.
license: Proprietary
version: 3.0.0 (Correction Release)
---

# Notary Entity Extractor (Argentine Legal Context)

## 🎯 Objetivo
Extraer una representación JSON estructurada y **jurídicamente válida** de los comparecientes y el acto.
**CRÍTICO:** Debes razonar como un Oficial de Registro. La precisión es más importante que la velocidad.

---

## 🛠️ Reglas de Corrección de Errores (LEER ANTES DE PROCESAR)

### 1. Estrategia de Nombres y Apellidos (Fix Compound Names)
En Argentina, los nombres compuestos y apellidos dobles son comunes.
* **Regla de la Coma:** Si el texto dice "PEREZ AGUIRRE, Carlos Alberto", la coma separa Apellido (izquierda) de Nombre (derecha).
* **Regla de Mayúsculas:** A menudo los apellidos están en MAYÚSCULAS ("Carlos Alberto PEREZ AGUIRRE"). Úsalo para separar.
* **Output:** Devuelve `apellido` y `nombres` por separado en el objeto.

### 2. Geografía Literal (Fix Address)
* **NO** normalices ni abrevies direcciones.
* **INCORRECTO:** "Horacio Quiroga 2256"
* **CORRECTO:** "calle Horacio Quiroga número 2.256"
* Debes incluir el tipo de vía (Calle, Avenida, Pasaje, Ruta) tal cual aparece en la escritura.

### 3. Lógica de Identidad (Fix DNI vs CUIT)
Nunca confundas DNI con CUIT. Son matemáticamente distintos.
* **DNI:** Número de 7 u 8 dígitos (ej: 25.765.599). Si encuentras esto, va al campo `dni`.
* **CUIT/CUIL:** Número de 11 dígitos con guiones (ej: 20-25765599-8). Si encuentras esto, va al campo `cuit_cuil`.
* **Verificación:** Si el texto dice "DNI X y CUIT Y", extrae AMBOS por separado.

### 4. Datos Biográficos Profundos (Fix Fechas/Cónyuge)
No te detengas en el nombre. Sigue leyendo la frase completa del compareciente.
* Busca patrones: "nacido el [FECHA]", "de nacionalidad [PAIS]", "estado civil [ESTADO]".
* **Cónyuge:** Si dice "casado en X nupcias con [NOMBRE]", extrae a [NOMBRE] como objeto `conyuge`.

### 5. Conversión de Fechas (Fix "Fecha Pendiente")
Las escrituras usan lenguaje natural ("quince días del mes de enero del año dos mil veinticinco").
* **TU TAREA:** Convertir ese texto a formato ISO 8601: `"2025-01-15"`.
* Nunca devuelvas "Pendiente" si el texto de la fecha está presente en el encabezado.

---

## 📜 Estructura de Extracción (Paso a Paso)

### PASO 1: Clasificación del Acto
Determina si es: `COMPRAVENTA`, `HIPOTECA`, `DONACION`, `PODER`.
* Si hay un Banco involucrado ("Banco de Galicia"), es probable que sea una `HIPOTECA`.

### PASO 2: Extracción de Entidades (Jerarquía de Poder)
Detecta si hay representación.
* **Entidad Principal:** ¿Quién es el dueño del interés? (Ej: El Banco, La Sociedad S.A.).
* **Firmante/Representante:** ¿Quién pone la mano? (Ej: Norman Roberto Giralde).
* **Instrucción JSON:** Coloca al Banco como la `entidad` principal y a Norman dentro de `representantes`.

### PASO 3: Validación OCR
* Ignora símbolos de ruido como `$` dentro de números de matrícula (ej: lee `98 $31510/3$` como `98-31510-3`).

---

## 📤 Formato de Salida JSON (Strict Schema)

```json
{
  "tipo_objeto": "ACTA_EXTRACCION_PARTES",
  "meta": {
    "tipo_acto": "HIPOTECA",
    "numero_escritura": "24",
    "fecha_escritura": "2025-01-15", // Convertido de texto a YYYY-MM-DD
    "lugar": "Bahía Blanca"
  },
  "entidades": [
    {
      "rol": "ACREEDOR",
      "tipo_persona": "JURIDICA",
      "razon_social": "BANCO DE GALICIA Y BUENOS AIRES S.A.U.",
      "cuit": "30-50000173-5",
      "domicilio": "Tte Gral Perón 407, CABA",
      "representacion": {
        "es_representado": true,
        "detalles_poder": "Escritura de Poder Nro...",
        "representantes": [
          {
            "nombre_completo": "Norman Roberto GIRALDE",
            "dni": "21.502.903", // Extraído específicamente como DNI
            "cuit": "20-21502903-5", // Extraído específicamente como CUIT
            "caracter": "Apoderado"
          }
        ]
      }
    },
    {
      "rol": "DEUDOR", // O VENDEDOR/COMPRADOR según corresponda
      "tipo_persona": "FISICA",
      "apellido": "PEREZ AGUIRRE",
      "nombres": "Carlos Alberto",
      "identificacion": {
        "dni": "25.765.599",
        "cuit_cuil": "20-25765599-8"
      },
      "biografia": {
        "fecha_nacimiento": "1977-02-18", // Extraído de "18 de febrero de 1.977"
        "nacionalidad": "Argentino",
        "estado_civil": "Casado",
        "nupcias": "Primeras",
        "conyuge": {
            "nombre": "Natalia Nittoli",
            "requiere_asentimiento": true
        }
      },
      "domicilio_real": "calle Horacio Quiroga número 2.256"
    }
  ],
  "inmuebles": [
    {
      "nomenclatura": "Circ I, Secc B...",
      "partida": "12345",
      "monto_operacion": {
        "valor": 50000,
        "moneda": "UVA" // O PESOS/DOLARES
      }
    }
  ]
}