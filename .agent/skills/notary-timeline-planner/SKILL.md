---
name: notary-timeline-planner
description: Motor de "Planificación Inversa" (Reverse Scheduling) para la gestión de proyectos notariales. A partir de una fecha de escritura deseada, calcula las fechas límites exactas para solicitar certificados (Dominio, Catastro, Tasas), considerando los tiempos de demora administrativos de cada organismo (RPI PBA, ARBA, Municipios) y evitando vencimientos prematuros.
license: Proprietary
---

# Notary Timeline Planner

## Overview

Esta habilidad materializa la funcionalidad de **"Cálculo Inverso"** definida en el Módulo C del Roadmap.

El problema común en las escribanías es doble:
1.  Pedir los certificados **demasiado tarde**: No llegan para la firma (se cae la escritura).
2.  Pedir los certificados **demasiado temprano**: Se vencen antes de la firma (hay que gastar dinero en pedirlos de nuevo).

Esta habilidad genera un **Cronograma de Solicitudes (Request Schedule)** optimizado, asegurando que la documentación llegue "Just in Time" (JIT) para la firma.

## Workflow Logic

### 1. Definición de Tiempos de Proceso (Lead Times)
El sistema carga una matriz de demoras basada en la jurisdicción y la modalidad del trámite:
* **RPI (La Plata - PBA):**
    * Trámite Simple: ~20 días corridos.
    * Trámite Urgente: ~7 días corridos.
* **Catastro (ARBA):** ~15 días.
* **Municipios (Libre Deuda):** ~10 días.
* **Buffer de Seguridad:** Se agrega un margen de seguridad (ej. 3 días) para contratiempos.

### 2. Cálculo Retrospectivo (Backwards Calculation)
* **Input:** `Fecha Objetivo de Firma`.
* **Algoritmo:** Para cada requisito, `Fecha Solicitud = Fecha Firma - (Demora Organismo + Buffer)`.
* **Validación de Viabilidad:**
    * Si `Fecha Solicitud Calculada` < `Fecha Actual (Hoy)`, la operación está **EN RIESGO**.
    * **Acción:** Recomendar cambio a modalidad "URGENTE" o mover la fecha de firma.

### 3. Sincronización de Vigencia
Verifica que la `Fecha Solicitud` no sea *tan lejana* que provoque el vencimiento del certificado antes de la firma.
* *Regla:* `(Fecha Firma - Fecha Solicitud)` debe ser MENOR que `Vigencia Legal del Certificado` (calculada por `notary-certificate-manager`).

## Implementation Script (Python)

```python
from datetime import datetime, timedelta

# Matriz de Demoras Promedio (Configurable según realidad de Galmarini)
PROCESSING_TIMES = {
    "PBA": {
        "DOMINIO_SIMPLE": 20,
        "DOMINIO_URGENTE": 7,
        "INHIBICION_SIMPLE": 20,
        "INHIBICION_URGENTE": 7,
        "CATASTRO": 15,
        "MUNICIPAL": 10
    }
}

def plan_timeline(target_date_str, jurisdiction="PBA", mode="SIMPLE"):
    """
    Calcula cuándo pedir cada certificado para llegar a la fecha objetivo.
    """
    try:
        target_date = datetime.strptime(target_date_str, "%Y-%m-%d")
    except ValueError:
        return {"error": "Formato de fecha inválido. Usar YYYY-MM-DD"}

    today = datetime.now()
    safety_buffer = 3 # Días extra por seguridad
    
    plan = {
        "target_signing_date": target_date_str,
        "planning_date": today.strftime("%Y-%m-%d"),
        "tasks": [],
        "feasibility": "OK"
    }
    
    critical_alerts = []

    # Definir qué pedir según el modo
    reqs = ["DOMINIO", "INHIBICION", "CATASTRO", "MUNICIPAL"]
    
    for req in reqs:
        # Construir key para buscar tiempos (ej. DOMINIO_SIMPLE)
        key_suffix = f"_{mode}" if req in ["DOMINIO", "INHIBICION"] else ""
        lookup_key = f"{req}{key_suffix}"
        
        days_needed = PROCESSING_TIMES[jurisdiction].get(lookup_key, 15)
        total_lead_time = days_needed + safety_buffer
        
        # Fecha límite para pedirlo (Last Responsible Moment)
        request_deadline = target_date - timedelta(days=total_lead_time)
        
        # Evaluar viabilidad
        status = "ON_TIME"
        if request_deadline < today:
            days_late = (today - request_deadline).days
            status = "LATE"
            critical_alerts.append(f"Imposible llegar con {req} en modo {mode}. Retraso: {days_late} días.")
            
            # Sugerencia automática
            if mode == "SIMPLE":
                critical_alerts.append(f"SUGERENCIA: Cambiar {req} a modalidad URGENTE.")

        plan["tasks"].append({
            "action": f"Solicitar {req} ({mode})",
            "deadline_date": request_deadline.strftime("%Y-%m-%d"),
            "days_before_signing": total_lead_time,
            "status": status
        })

    if critical_alerts:
        plan["feasibility"] = "CRITICAL_RISK"
        plan["alerts"] = critical_alerts
    
    # Ordenar tareas por fecha (la más urgente primero)
    plan["tasks"].sort(key=lambda x: x["deadline_date"])

    return plan

# --- CASOS DE PRUEBA ---

# Caso 1: Planificación con tiempo (Firma en 45 días)
print("--- Test 1: Comfortable Timeline ---")
future_date = (datetime.now() + timedelta(days=45)).strftime("%Y-%m-%d")
print(plan_timeline(future_date, mode="SIMPLE"))

# Caso 2: Cliente apurado (Firma en 10 días - Imposible en Simple)
print("\n--- Test 2: Rush Job (Risk) ---")
soon_date = (datetime.now() + timedelta(days=10)).strftime("%Y-%m-%d")
print(plan_timeline(soon_date, mode="SIMPLE"))

# Caso 3: Solución con Urgente
print("\n--- Test 3: Rush Job (Solved with Urgente) ---")
print(plan_timeline(soon_date, mode="URGENTE"))