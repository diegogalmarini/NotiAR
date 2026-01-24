---
name: notary-rpi-reader
description: Analiza el contenido semántico de los informes registrales (Certificados de Dominio e Inhibición) emitidos por el Registro de la Propiedad Inmueble. Detecta automáticamente gravámenes (Embargos, Hipotecas), restricciones (Bien de Familia) o inhibiciones personales que bloquean la escritura, extrayendo montos, autos y juzgados.
license: Proprietary
---

# Notary RPI Report Analyzer

## Overview

Esta habilidad resuelve el problema crítico de "Firmar con un embargo vigente". Aunque el certificado esté en fecha (validado por `certificate-manager`), su **contenido** puede informar una restricción.

Esta skill lee el texto jurídico del informe del RPI (Registro de la Propiedad Inmueble) y determina si el inmueble o la persona están "Limpios" (Libre disponibilidad) o "Sucios" (Con gravámenes).

## Workflow Logic

### 1. Detección de Tipo de Informe
Verificar si el texto corresponde a:
* **Informe de Dominio (Folio Real):** Busca el estado jurídico del inmueble.
* **Anotaciones Personales (Inhibición):** Busca si la persona puede vender.

### 2. Análisis de "Libre Deuda/Disponibilidad"
El sistema busca patrones de texto negativo (ausencia de problemas) vs. patrones positivos (presencia de problemas).

#### Patrones de ÉXITO (Semáforo Verde):
* *"No registra inhibiciones"*
* *"No constan anotaciones"*
* *"Informe negativo"*
* *"Sin gravámenes vigentes"*

#### Patrones de ALERTA (Semáforo Rojo):
* **Gravámenes:** *"EMBARGO"*, *"HIPOTECA"*, *"USUFRUCTO"*.
* **Restricciones:** *"BIEN DE FAMILIA"*, *"CLÁUSULA DE INEMBARGABILIDAD"*, *"LITIS"*.
* **Personales:** *"INHIBICIÓN GENERAL DE BIENES"*.

### 3. Extracción de Detalles del Gravamen
Si se detecta una alerta, extraer estructuradamente:
* **Tipo:** (Ej. Embargo Preventivo).
* **Monto:** (Monto de la medida).
* **Autos:** (Nombre del expediente judicial).
* **Juzgado/Secretaría:** (Dónde se tramita el levantamiento).
* **Fecha de Inscripción:** (Para calcular caducidad registral, usualmente 5 años para embargos).

## Implementation Script (Python)

```python
import re

def analyze_rpi_report(text, report_type="UNKNOWN"):
    """
    Analiza informes del Registro de la Propiedad (Buenos Aires/CABA) para detectar bloqueos.
    """
    
    analysis = {
        "is_clean": True, # Asumimos inocencia hasta demostrar lo contrario
        "detected_liens": [], # Gravámenes encontrados
        "critical_flags": []
    }
    
    # Normalizar texto
    clean_text = text.upper().replace("\n", " ").replace("  ", " ")
    
    # --- DICCIONARIO DE RIESGOS ---
    risk_patterns = [
        {"type": "EMBARGO", "regex": r"EMBARGO\s+(PREVENTIVO|EJECUTIVO|DEFINITIVO)?", "severity": "BLOCKING"},
        {"type": "HIPOTECA", "regex": r"HIPOTECA\s+(EN PRIMER GRADO|VIGENTE)?", "severity": "WARNING"}, # Puede ser la que se cancela
        {"type": "INHIBICION", "regex": r"INHIBICION\s+GENERAL", "severity": "BLOCKING"},
        {"type": "BIEN_DE_FAMILIA", "regex": r"(BIEN DE FAMILIA|AFECTACION VIVIENDA|PROTECCION VIVIENDA)", "severity": "BLOCKING"},
        {"type": "LITIS", "regex": r"ANOTACION\s+DE\s+LITIS", "severity": "BLOCKING"},
        {"type": "USUFRUCTO", "regex": r"USUFRUCTO\s+(VITALICIO|GRATUITO|ONEROSO)", "severity": "WARNING"}
    ]

    # --- BARRIDO DE RIESGOS ---
    for risk in risk_patterns:
        matches = re.finditer(risk["regex"], clean_text)
        for match in matches:
            # Contexto: Verificar si dice "NO SE REGISTRA [RIESGO]" o "CANCELACION DE [RIESGO]"
            # Tomamos 50 caracteres antes para ver si hay negación
            start_index = max(0, match.start() - 50)
            context_pre = clean_text[start_index:match.start()]
            
            is_negated = re.search(r"(NO SE REGISTRA|NO CONSTA|CANCELACION|LEVANTAMIENTO|CADUCIDAD)", context_pre)
            
            if not is_negated:
                analysis["is_clean"] = False
                
                # Intentar extraer contexto posterior (Monto/Autos)
                # Tomamos 200 caracteres post-match
                context_post = clean_text[match.end():match.end() + 200]
                
                lien_data = {
                    "type": risk["type"],
                    "severity": risk["severity"],
                    "excerpt": f"...{match.group(0)} {context_post[:50]}...",
                    "details": extract_details(context_post)
                }
                
                analysis["detected_liens"].append(lien_data)
                
                if risk["severity"] == "BLOCKING":
                    analysis["critical_flags"].append(f"BLOQUEO REGISTRAL: {risk['type']} DETECTADO.")

    return analysis

def extract_details(text_segment):
    """ Intenta extraer montos y autos de un fragmento de texto de gravamen """
    details = {}
    
    # Regex Monto (busca signos de moneda o palabras clave)
    monto_match = re.search(r"(?:PESOS|DOLARES|U\$S|\$)\s*([\d\.,]+)", text_segment)
    if monto_match:
        details["monto_estimado"] = monto_match.group(0)
        
    # Regex Autos (busca "AUTOS", "CARATULADOS")
    autos_match = re.search(r"(?:AUTOS|CARATULA|EXPTE).*?[:]\s*([A-Z0-9\s/]+)", text_segment)
    if autos_match:
        details["autos"] = autos_match.group(1).strip()
        
    return details

# --- CASOS DE PRUEBA ---

# Caso 1: Limpio
report_clean = """
RPI PROVINCIA DE BUENOS AIRES. INFORME DE DOMINIO.
TITULAR: JUAN PEREZ.
GRAVAMENES: NO REGISTRA EMBARGOS NI OTRAS MEDIDAS CAUTELARES.
"""

# Caso 2: Sucio (Embargo)
report_dirty = """
...TITULAR: MARIA GONZALEZ.
GRAVAMENES: SE REGISTRA EMBARGO PREVENTIVO POR LA SUMA DE PESOS UN MILLON ($ 1.000.000)
EN AUTOS: GARCIA C/ GONZALEZ S/ COBRO EJECUTIVO. JUZGADO CIVIL 4.
"""

# Caso 3: Sucio (Bien de Familia)
report_dirty_2 = """
...AFECTADO AL REGIMEN DE BIEN DE FAMILIA LEY 14.394 SEGUN ESCRITURA...
"""

print("--- Test 1: Clean ---")
print(analyze_rpi_report(report_clean))
print("\n--- Test 2: Embargo ---")
print(analyze_rpi_report(report_dirty))
print("\n--- Test 3: Bien de Familia ---")
print(analyze_rpi_report(report_dirty_2))