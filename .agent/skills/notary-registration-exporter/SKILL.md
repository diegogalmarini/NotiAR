---
name: notary-registration-exporter
description: Transforma los datos jurídicos narrativos de una escritura finalizada en metadatos estructurados y codificados (XML/JSON/PDF) exigidos por el Registro de la Propiedad Inmueble (RPI) y Catastro para la inscripción del título. Genera automáticamente la "Minuta Rogatoria" y los formularios anexos, mapeando actos, calles y personas a sus códigos oficiales.
license: Proprietary
---

# Notary Registration Exporter

## Overview

Una escritura firmada no tiene efectos plenos frente a terceros hasta su inscripción registral. El proceso de inscripción requiere traducir la narrativa jurídica (el texto de la escritura) a formularios registrales rígidos ("Minutas") que utilizan códigos numéricos en lugar de palabras.

Esta habilidad automatiza la **Rogación Registral**. Elimina la carga manual de datos en los aplicativos web de los Colegios de Escribanos y Registros, reduciendo drásticamente los errores de rechazo por discrepancias entre la Escritura y la Minuta.

## Workflow Logic

### 1. Extracción de Datos Finales (Post-Firma)
El input debe ser el objeto `Escritura` finalizado, no un borrador.
* **Fuente:** Datos validados de la base de datos (Precio final, Fecha de firma, Número de folio).
* **Validación Previa:** Verificar que la suma de porcentajes de titularidad transmitidos coincida con los adquiridos (Checksum 100%).

### 2. Mapping de Codificación Registral (The Codec)
Transformar valores de texto a códigos estándar del RPI (Provincia de Buenos Aires / CABA):
* **Actos:**
    * `COMPRAVENTA` -> Código `101` (RPI PBA).
    * `HIPOTECA` -> Código `201`.
    * `DONACIÓN` -> Código `108`.
* **Calles (Bahía Blanca):**
    * `AVENIDA ALEM` -> Código `254`.
    * `ESTOMBA` -> Código `44`.
* **Personas:**
    * `SOLTERO` -> Código `1`.
    * `CASADO` -> Código `2` (+ Datos Nupcias).

### 3. Estructura de Salida (Minuta Rogatoria)
Generar un objeto JSON intermedio que respete la estructura del Formulario Registral Universal:
* **Rubro 1 (Inmueble):** Matrícula, Nomenclatura, Unidad Funcional, Valuación.
* **Rubro 2 (Transmitentes):** Lista de quienes se desprenden del derecho (con sus % previos).
* **Rubro 3 (Adquirentes):** Lista de quienes reciben el derecho (con % adquiridos, carácter del bien, datos conyugales).
* **Rubro 4 (Monto y Acto):** Precio, Moneda, Acto Jurídico.
* **Rubro 5 (Documentos Habilitantes):** Certificados utilizados (Nros y Fechas).

### 4. Generación de Archivos
* **XML:** Formato de interoperabilidad para subir al "Sistema de Minutas Web".
* **PDF:** Versión imprimible para el legajo papel (si el registro lo exige).

## Implementation Script (Python)

```python
import json
from datetime import datetime

# Mock de base de datos de códigos (En producción, esto es una tabla en DB o archivo RAG)
REGISTRY_CODES = {
    "ACTOS": {"VENTA": "101", "HIPOTECA": "201", "DONACION": "108"},
    "ESTADO_CIVIL": {"SOLTERO": "1", "CASADO": "2", "DIVORCIADO": "3", "VIUDO": "4"},
    "CARACTER_BIEN": {"PROPIO": "P", "GANANCIAL": "G"}
}

def generate_registration_packet(deed_data):
    """
    Genera el paquete de datos para inscripción registral (Minuta Rogatoria).
    """
    
    # 1. Header del Trámite
    minuta = {
        "encabezado": {
            "fecha_escritura": deed_data.get("fecha_firma"),
            "numero_escritura": deed_data.get("numero"),
            "folio": deed_data.get("folio"),
            "escribano_registro": deed_data.get("registro_notarial"),
            "partido": deed_data.get("partido_inmueble", "007") # 007 = Bahía Blanca (ejemplo)
        },
        "inmueble": map_inmueble(deed_data.get("inmueble", {})),
        "operacion": map_operacion(deed_data),
        "titulares_origen": [],
        "titulares_destino": []
    }

    # 2. Procesar Partes (Transmitentes y Adquirentes)
    partes = deed_data.get("partes", [])
    
    for p in partes:
        persona_registral = {
            "nombre": f"{p['apellido']}, {p['nombre']}".upper(),
            "documento_tipo": "DNI",
            "documento_nro": p['dni'],
            "cuit": p['cuit'],
            "estado_civil_cod": REGISTRY_CODES["ESTADO_CIVIL"].get(p['estado_civil'].upper(), "0"),
            "domicilio": p.get("domicilio_real"),
            "porcentaje": p.get("porcentaje_titularidad")
        }

        # Si es casado, agregar datos del cónyuge
        if p['estado_civil'].upper() == "CASADO":
            persona_registral["conyuge"] = {
                "nombre": p.get("conyuge_nombre", "").upper(),
                "nupcias": p.get("nupcias", "1")
            }

        if p['rol'] == 'VENDEDOR':
            minuta["titulares_origen"].append(persona_registral)
        elif p['rol'] == 'COMPRADOR':
            # Determinar carácter del bien
            caracter = "G" # Default Ganancial
            if p.get("origen_fondos_propio", False) or p['estado_civil'] != "CASADO":
                caracter = "P"
            
            persona_registral["caracter_bien"] = caracter
            minuta["titulares_destino"].append(persona_registral)

    # 3. Validación de Balance de Porcentajes
    total_transmitido = sum(t['porcentaje'] for t in minuta["titulares_origen"])
    total_adquirido = sum(t['porcentaje'] for t in minuta["titulares_destino"])
    
    # Nota: En una venta del 100%, ambos deben sumar 100.
    # En venta de parte indivisa, deben ser iguales entre sí.
    if abs(total_transmitido - total_adquirido) > 0.01:
        return {"error": f"Desbalance de titularidad. Sale: {total_transmitido}%, Entra: {total_adquirido}%"}

    return json.dumps(minuta, indent=2, ensure_ascii=False)

def map_inmueble(inm_data):
    return {
        "nomenclatura": inm_data.get("nomenclatura_catastral"),
        "matricula_rpi": inm_data.get("matricula"),
        "valuacion_fiscal": inm_data.get("valuacion_fiscal"),
        "superficie_total": inm_data.get("superficie_m2")
    }

def map_operacion(data):
    acto_str = data.get("tipo_acto", "VENTA").upper()
    codigo = REGISTRY_CODES["ACTOS"].get(acto_str, "000")
    
    return {
        "codigo_acto": codigo,
        "descripcion": acto_str,
        "monto": data.get("precio"),
        "moneda": data.get("moneda")
    }

# --- CASO DE PRUEBA ---
mock_escritura = {
    "fecha_firma": "2024-03-15",
    "numero": "104",
    "folio": "230",
    "registro_notarial": "45",
    "tipo_acto": "VENTA",
    "precio": 50000.00,
    "moneda": "USD",
    "inmueble": {
        "nomenclatura": "Circ I Sec B Manz 40 Parc 12",
        "matricula": "45020",
        "valuacion_fiscal": 1500000
    },
    "partes": [
        {
            "rol": "VENDEDOR",
            "nombre": "Juan", "apellido": "Perez", "dni": "20.123.456", "cuit": "20-20123456-1",
            "estado_civil": "CASADO", "conyuge_nombre": "Maria Diaz", "porcentaje_titularidad": 100.00
        },
        {
            "rol": "COMPRADOR",
            "nombre": "Pedro", "apellido": "Gomez", "dni": "30.987.654", "cuit": "20-30987654-9",
            "estado_civil": "SOLTERO", "porcentaje_titularidad": 100.00,
            "origen_fondos_propio": True
        }
    ]
}

print(generate_registration_packet(mock_escritura))