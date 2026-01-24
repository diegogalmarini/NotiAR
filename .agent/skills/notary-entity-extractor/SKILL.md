---
name: notary-entity-extractor
description: Identifica y extrae con precisión las partes intervinientes en escrituras notariales argentinas, distinguiendo entre la 'Persona Humana que firma' (Representante) y el 'Cliente Real' (Entidad Representada/Titular del derecho) mediante análisis de cláusulas de personería.
license: Proprietary
---

# Notary Entity Extractor

## Overview

Esta habilidad resuelve el problema crítico de atribución de identidad en documentos notariales donde quien comparece físicamente no es necesariamente el sujeto del derecho (ej. Apoderados de Bancos, Presidentes de S.A.).

Utiliza esta habilidad cuando proceses documentos PDF o texto crudo de escrituras (Compraventas, Hipotecas, Poderes) para estructurar los datos de los clientes antes de guardarlos en la base de datos.

## Workflow Logic

### 1. Detección de Bloques
El sistema no debe leer el documento linealmente. Debe localizar dos bloques clave:
1.  **COMPARECENCIA:** Inicia con "COMPARECEN" o "ANTE MI...". Contiene a las personas físicas.
2.  **INTERVENCIÓN / PERSONERÍA:** Inicia con "INTERVIENEN", "POR SI" o "EN NOMBRE Y REPRESENTACIÓN". Define la capacidad jurídica.

### 2. Algoritmo de Decisión (Representation Check)
Para cada persona identificada en la comparecencia, verificar:
* **IF** (texto cercano contiene "por sí" OR "por derecho propio"):
    * Rol = **TITULAR** (Es el cliente).
* **IF** (texto cercano contiene "en nombre y representación de" OR "en su carácter de" OR "apoderado de"):
    * Acción: Extraer la entidad que sigue a esa frase (ej: "BANCO DE GALICIA").
    * Rol = **REPRESENTANTE**.
    * **Cliente Real** = Entidad Extraída.

### 3. Reglas de Formato (Data Cleaning)
* **Apellidos:** Convertir siempre a MAYÚSCULAS COMPLETAS.
* **Nombres:** Convertir a Title Case (Primera mayúscula).
* **Ejemplo:** `Giralde, Norman` -> `GIRALDE, Norman`.

## Implementation Script (Python)

Utiliza este script como referencia lógica para la extracción:

```python
import re
import json

def extract_entities(text):
    """
    Analiza el texto notarial para estructurar comparecientes y sus roles.
    """
    
    # 1. Normalización básica
    text = text.replace("\n", " ").strip()
    
    # 2. Patrones de Detección
    # Detecta: "Nombre Apellido... en nombre y representación de ENTIDAD"
    representation_pattern = r"([A-Z][a-z]+(?:\s[A-Z][a-z]+)*\s[A-Z]+(?:(?:\s[A-Z]+)*)).*?(?:en nombre y representación de|en carácter de apoderado de|por cuenta y orden de)\s+([A-Z0-9\s\.]+?)(?:,|$|\.)"
    
    # Detecta comparecencia simple (fallback)
    simple_person_pattern = r"([A-Z][a-z]+(?:\s[A-Z][a-z]+)*\s[A-Z]+(?:(?:\s[A-Z]+)*)).*?(?:dni|documento)"

    extracted_data = {
        "clients": [],       # Los que se facturan / Titulares
        "signatories": []    # Los que firman (pueden ser los mismos)
    }

    # Búsqueda de Representación (Prioridad Alta)
    rep_matches = re.finditer(representation_pattern, text, re.IGNORECASE)
    found_reps = False
    
    for match in rep_matches:
        found_reps = True
        signatory_raw = match.group(1).strip()
        entity_raw = match.group(2).strip()
        
        # Formatear
        signatory = format_name(signatory_raw)
        entity = entity_raw.upper().replace("S.A.", "S.A.").replace("S.R.L.", "S.R.L.")
        
        extracted_data["clients"].append({
            "name": entity,
            "type": "JURIDICA",
            "role": "TITULAR_DERECHO"
        })
        
        extracted_data["signatories"].append({
            "name": signatory,
            "represents": entity,
            "role": "REPRESENTANTE"
        })

    # Si no hay representación, asumimos actuación por derecho propio
    if not found_reps:
        simple_matches = re.finditer(simple_person_pattern, text, re.IGNORECASE)
        for match in simple_matches:
            name_raw = match.group(1).strip()
            name_fmt = format_name(name_raw)
            
            extracted_data["clients"].append({
                "name": name_fmt,
                "type": "FISICA",
                "role": "TITULAR_DERECHO"
            })
            extracted_data["signatories"].append({
                "name": name_fmt,
                "represents": "SELF",
                "role": "TITULAR"
            })

    return json.dumps(extracted_data, indent=2, ensure_ascii=False)

def format_name(raw_name):
    """
    Convierte 'Juan PEREZ' o 'juan perez' a 'PEREZ, Juan'
    """
    # Lógica simplificada de formateo
    parts = raw_name.split()
    if len(parts) >= 2:
        # Asumimos que el apellido está al final o en mayúsculas en el input original
        # Esta es una heurística que debería refinarse con IA
        last_name = parts[-1].upper()
        first_names = " ".join([p.capitalize() for p in parts[:-1]])
        return f"{last_name}, {first_names}"
    return raw_name

# Ejemplo de uso con texto sucio de PDF
test_text = "...comparece Norman Roberto GIRALDE... quien dice intervenir en nombre y representación del BANCO DE GALICIA Y BUENOS AIRES S.A.U..."
print(extract_entities(test_text))