---
name: notary-uif-compliance
description: Motor de cumplimiento normativo (Anti-Lavado de Dinero) para Escribanos Públicos en Argentina. Evalúa operaciones inmobiliarias frente a las resoluciones de la UIF, verificando Listas de Terrorismo (RePET), Personas Expuestas Políticamente (PEP) y determinando la exigencia de justificación de Origen de Fondos según umbrales vigentes.
license: Proprietary
---

# Notary UIF Compliance

## Overview

El Escribano Público es un "Sujeto Obligado" ante la Unidad de Información Financiera (UIF). La falta de debida diligencia (Know Your Customer) o la omisión de reportes puede derivar en sanciones penales.

Esta habilidad automatiza la **Matriz de Riesgo** de cada operación. No solo verifica si el cliente "puede comprar", sino qué documentación respaldatoria debe exigir el escribano para proteger su matrícula antes de autorizar la escritura.

## Workflow Logic

### 1. Normalización Monetaria (Currency Normalization)
Para aplicar los umbrales de la UIF, todos los montos deben estandarizarse a Pesos Argentinos (ARS).
* **Input:** `Monto`, `Moneda`.
* **Regla:** Si la operación es en USD, convertir utilizando la cotización "Vendedor Banco Nación" del cierre del día hábil anterior.

### 2. Detección de Perfil (Profile Screening)
Para cada sujeto interviniente (extraído por `notary-entity-extractor`), verificar:
* **PEP (Persona Expuesta Políticamente):** ¿El cliente figura en la nómina de funcionarios públicos o personas políticamente expuestas?
* **RePET (Registro Público de Personas y Entidades vinculadas al Terrorismo):** Chequeo de bloqueo absoluto.
* **Sujeto Obligado:** Si una de las partes es otro Sujeto Obligado (ej. Banco), la carga de diligencia se comparte o delega.

### 3. Análisis de Umbrales de Licitud (Threshold Analysis)
Comparar el `Monto_Normalizado` contra los topes vigentes (actualizables por el módulo Knowledge):
* **Nivel 1 (Bajo Riesgo / Monto Menor):** Requiere declaración jurada simple sobre licitud de fondos en la escritura.
* **Nivel 2 (Riesgo Medio / Documentación):** Requiere que el escribano tenga a la vista documentación que justifique el origen (ej. Boleto anterior, herencia, venta de rodado).
* **Nivel 3 (Alto Riesgo / Certificación):** Requiere Certificación Contable de Ingresos legalizada por el Consejo de Ciencias Económicas.

### 4. Generación de Cláusulas
El output debe indicar exactamente qué texto jurídico insertar en la escritura (ej. *"Declara bajo juramento que los fondos provienen de..."*).

## Implementation Script (Python)

```python
import json

def audit_operation_compliance(operation_data, uif_params):
    """
    Audita una operación notarial según reglas UIF (Argentina).
    
    Args:
        operation_data (dict): Datos de la operación y partes.
        uif_params (dict): Umbrales vigentes y cotización USD.
    """
    
    # 1. Variables de Configuración (Deben venir actualizadas del Knowledge Base)
    THRESHOLD_JUSTIFICACION = uif_params.get("tope_justificacion_ars", 120000000) # Ejemplo dinámico
    THRESHOLD_HABITUALIDAD = uif_params.get("tope_habitualidad_ars", 60000000)
    COTIZACION_BNA = uif_params.get("cotizacion_usd_bna", 1000)
    
    # 2. Cálculo del Monto Total en Pesos
    monto_operacion = operation_data.get("precio", 0)
    moneda = operation_data.get("moneda", "ARS")
    
    monto_final_ars = monto_operacion
    if moneda == "USD":
        monto_final_ars = monto_operacion * COTIZACION_BNA

    report = {
        "compliance_status": "PENDING",
        "risk_level": "LOW",
        "alerts": [],
        "required_docs": [],
        "drafting_clauses": [] # Cláusulas obligatorias para el redactor
    }

    # 3. Screening de Partes (PEPs y Terrorismo)
    has_pep = False
    for party in operation_data.get("parties", []):
        # En producción, esto conecta con una API de Listas de Sanciones
        is_pep = party.get("is_pep", False)
        is_blocked = party.get("is_blocked_repet", False)
        
        if is_blocked:
            report["compliance_status"] = "BLOCKED"
            report["risk_level"] = "CRITICAL"
            report["alerts"].append(f"CRÍTICO: La parte {party['name']} figura en RePET (Terrorismo). NO OPERAR.")
            return report # Abortar inmediatamente
            
        if is_pep:
            has_pep = True
            report["alerts"].append(f"ADVERTENCIA: {party['name']} es PEP. Reforzar Debida Diligencia.")
            report["drafting_clauses"].append("CLAUSULA_PEP_AFIRMATIVA")
            report["required_docs"].append(f"DDJJ PEP firmada por {party['name']}")

    if has_pep:
        report["risk_level"] = "HIGH"

    # 4. Determinación de Origen de Fondos
    report["drafting_clauses"].append("CLAUSULA_LICITUD_FONDOS") # Siempre va
    
    if monto_final_ars >= THRESHOLD_JUSTIFICACION:
        report["compliance_status"] = "CONDITIONAL"
        if report["risk_level"] != "HIGH": report["risk_level"] = "MEDIUM"
        
        report["alerts"].append(f"MONTO ({monto_final_ars:,.2f} ARS) SUPERA UMBRAL DE JUSTIFICACIÓN.")
        report["required_docs"].append("CERTIFICACIÓN CONTABLE DE ORIGEN DE FONDOS (Legalizada) o DOCUMENTACIÓN RESPALDATORIA FEHACIENTE")
        
    elif monto_final_ars >= THRESHOLD_HABITUALIDAD:
        report["compliance_status"] = "OK_WITH_DOCS"
        report["required_docs"].append("CONSTANCIA DOCUMENTAL SIMPLE (Boleto, Extracto Bancario, Recibo de Sueldo)")
        
    else:
        report["compliance_status"] = "OK"
        report["required_docs"].append("DECLARACIÓN JURADA EN ESCRITURA (Sin soporte documental extra)")

    return json.dumps(report, indent=2, ensure_ascii=False)

# --- CASOS DE PRUEBA ---

# Configuración Simulada
uif_config = {
    "tope_justificacion_ars": 120000000, 
    "cotizacion_usd_bna": 1150
}

# Caso 1: Operación pequeña (Lote)
op_small = {
    "precio": 30000, "moneda": "USD",
    "parties": [{"name": "Juan Perez", "is_pep": False}]
}

# Caso 2: Operación grande con PEP (Mansión)
op_large_pep = {
    "precio": 250000, "moneda": "USD", # 250k * 1150 = 287M (Supera 120M)
    "parties": [{"name": "Diputado Gomez", "is_pep": True}]
}

print("--- Test 1: Operación Baja ---")
print(audit_operation_compliance(op_small, uif_config))

print("\n--- Test 2: Operación Alta + PEP ---")
print(audit_operation_compliance(op_large_pep, uif_config))