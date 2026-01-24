---
name: notary-document-classifier
description: Analiza el contenido textual de archivos subidos (PDFs/Imágenes) para clasificarlos automáticamente dentro de la taxonomía notarial (ej. Escritura, DNI, Certificado de Dominio, Catastro). Funciona como el "Router" del sistema, decidiendo qué habilidad de extracción especializada ejecutar a continuación.
license: Proprietary
---

# Notary Document Classifier

## Overview

Para que el sistema sea un verdadero "Asistente Inteligente", no debe preguntar al usuario "¿Qué estás subiendo?". Debe saberlo.

Esta habilidad es el punto de entrada de la "Ingesta Inteligente". Recibe texto crudo (post-OCR) y devuelve la etiqueta del documento. Esto permite que el sistema organice automáticamente la Carpeta Digital y active validaciones específicas (ej. si es un DNI, activar `entity-extractor`; si es una Escritura, activar `property-extractor`).

## Workflow Logic

### 1. Análisis de Palabras Clave Ponderadas (Weighted Keyword Analysis)
El sistema escanea el encabezado y el cuerpo del texto buscando patrones exclusivos de documentos argentinos.
* **Patrón DNI:** "Registro Nacional de las Personas", "Documento Nacional de Identidad", Patrones numéricos aislados tipo `XX.XXX.XXX`.
* **Patrón Escritura:** "ESCRITURA NUMERO", "FOLIO", "ANTE MI", "REGISTRO NOTARIAL", "Escribano Autorizante".
* **Patrón Certificado RPI:** "Dirección Provincial del Registro de la Propiedad", "Informe de Dominio", "Informe de Anotaciones Personales", "Matrícula", "No posee inhibiciones".
* **Patrón Catastro/ARBA:** "Agencia de Recaudación", "Partida Inmobiliaria", "Nomenclatura Catastral", "Valuación Fiscal".
* **Patrón CUIT/AFIP:** "Constancia de Inscripción", "Administración Federal", "CUIT", "Impuestos Activos".

### 2. Detección de Jerarquía
Si un documento contiene múltiples señales (ej. una Escritura que cita un Certificado), el clasificador debe priorizar el **Documento Contenedor**.
* *Regla:* Si contiene "ESCRITURA NUMERO" al inicio, es una Escritura (aunque mencione certificados en su cuerpo).
* *Regla:* Si contiene "Solicitud Nro" y "Fecha Vigencia", es un Certificado.

### 3. Acción Post-Clasificación (Routing)
El output de esta habilidad debe disparar eventos:
* `IF CLASS == 'ESCRITURA'` -> Ejecutar `notary-property-extractor` + `notary-entity-extractor`.
* `IF CLASS == 'CERTIFICADO'` -> Ejecutar `notary-certificate-manager` (para leer fechas).

## Implementation Script (Python)

Este script utiliza un sistema de puntaje simple pero efectivo para clasificación determinística.

```python
import re

def classify_document(text):
    """
    Clasifica un documento notarial basado en su contenido textual.
    Retorna el tipo de documento y un score de confianza.
    """
    
    # Normalización
    text_sample = text[:3000].upper() # Analizamos solo los primeros 3k caracteres para eficiencia
    
    # Definición de Perfiles de Documentos
    profiles = {
        "ESCRITURA_PUBLICA": {
            "keywords": ["ESCRITURA NUMERO", "ANTE MI", "REGISTRO NOTARIAL", "COMPARECEN", "FOLIO", "ESCRIBANO AUTORIZANTE"],
            "threshold": 2
        },
        "DNI_TARJETA": {
            "keywords": ["REGISTRO NACIONAL DE LAS PERSONAS", "APELLIDO", "FECHA DE NACIMIENTO", "DOCUMENTO NACIONAL DE IDENTIDAD"],
            "threshold": 2
        },
        "CONSTANCIA_CUIT": {
            "keywords": ["CONSTANCIA DE INSCRIPCION", "ADMINISTRACION FEDERAL", "IMPUESTOS ACTIVOS", "DOMICILIO FISCAL"],
            "threshold": 2
        },
        "CERTIFICADO_DOMINIO": {
            "keywords": ["REGISTRO DE LA PROPIEDAD", "INFORME DE DOMINIO", "MATRICULA", "ASIENTO", "TITULAR DE DOMINIO"],
            "threshold": 3
        },
        "CERTIFICADO_INHIBICION": {
            "keywords": ["ANOTACIONES PERSONALES", "INHIBICION GENERAL", "NO SE REGISTRAN INHIBICIONES", "REGISTRO DE LA PROPIEDAD"],
            "threshold": 3
        },
        "BOLETO_COMPRAVENTA": {
            "keywords": ["BOLETO DE COMPRAVENTA", "SEÑA", "CONVENIO DE DESOCUPACION", "CLAUSULA", "PARTES"],
            "threshold": 2
        },
        "CATASTRO_ARBA": {
            "keywords": ["AGENCIA DE RECAUDACION", "CATASTRO TERRITORIAL", "VALUACION FISCAL", "PARTIDA INMOBILIARIA", "CEDULA CATASTRAL"],
            "threshold": 3
        }
    }

    best_match = "DESCONOCIDO"
    max_score = 0
    
    # Evaluación
    for doc_type, profile in profiles.items():
        score = 0
        for keyword in profile["keywords"]:
            if keyword in text_sample:
                score += 1
        
        # Penalización específica para desambiguar (ej. Escritura vs Boleto)
        if doc_type == "BOLETO_COMPRAVENTA" and "ESCRITURA NUMERO" in text_sample:
            score = -5 # Es probable que sea una escritura citando un boleto, o viceversa, pero 'Escritura' gana jerarquía
            
        if score >= profile["threshold"] and score > max_score:
            max_score = score
            best_match = doc_type

    return {
        "document_type": best_match,
        "confidence_score": max_score,
        "is_recognized": best_match != "DESCONOCIDO"
    }

# --- CASOS DE PRUEBA ---

# Caso 1: Header típico de Escritura (como 24.pdf)
test_escritura = """
ESCRITURA NUMERO VEINTICUATRO.- EN LA CIUDAD DE BAHIA BLANCA, PROVINCIA DE BUENOS AIRES, 
ANTE MI, ALEJANDRO GALMARINI, TITULAR DEL REGISTRO NOTARIAL...
"""

# Caso 2: Header de Informe de Dominio RPI Provincia
test_dominio = """
PROVINCIA DE BUENOS AIRES
MINISTERIO DE ECONOMIA
REGISTRO DE LA PROPIEDAD
INFORME DE DOMINIO - MATRICULA 12345
"""

print(f"Test 1: {classify_document(test_escritura)}")
print(f"Test 2: {classify_document(test_dominio)}")