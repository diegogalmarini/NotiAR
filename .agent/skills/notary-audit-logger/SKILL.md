---
name: notary-audit-logger
description: Sistema de auditoría forense y trazabilidad documental. Genera una huella digital inmutable (SHA-256) de cada documento o dato crítico modificado en la Carpeta Digital. Estructura el "Libro de Intervenciones Digital" preparándolo para su sellado en Blockchain (BFA), garantizando la integridad y no repudio de las actuaciones.
license: Proprietary
---

# Notary Audit Logger

## Overview

En la escribanía moderna, la "Fe Pública" se traduce tecnológicamente en **Integridad de Datos**. Si un documento se modifica un milisegundo después de la firma, debe quedar registrado.

Esta habilidad no es un simple archivo de logs (`print("error")`). Es un **Motor de Integridad**. Su función es calcular hashes criptográficos de los activos digitales y registrar cada evento (Quién, Cuándo, Qué, Hash Anterior, Hash Nuevo), creando una cadena de custodia digital que sirve como prueba pre-constituida ante litigios.

## Workflow Logic

### 1. Generación de Huella Digital (Hashing)
Cada vez que se sube un archivo (PDF, Imagen) o se finaliza la redacción de una Escritura:
* **Acción:** Calcular el hash **SHA-256** del contenido binario.
* **Propósito:** Este hash es el "ADN" del archivo. Si cambia una sola coma, el hash cambia radicalmente.

### 2. Estructura del Evento de Auditoría (The Secure Log)
El sistema debe capturar el contexto completo de la acción (Contextual Awareness):
* **Actor:** Usuario (Escribano/Colaborador) + IP + ID de Sesión.
* **Acción:** `DOCUMENT_UPLOAD`, `DEED_DRAFTING_COMPLETED`, `TAX_VALUES_UPDATED`.
* **Delta:** Diferencia entre el estado anterior y el nuevo (si aplica).
* **Integridad:** `previous_block_hash` (para encadenamiento tipo blockchain interno) + `current_hash`.

### 3. Preparación para Blockchain (BFA Ready)
Aunque esta skill no conecta con la Blockchain Federal Argentina directamente, prepara el payload estándar (JSON) para que el conector de BFA solo tenga que firmarlo y enviarlo.
* **Regla:** Los eventos críticos (`FIRMA_ESCRITURA`, `CIERRE_CARPETA`) deben marcarse con `requires_timestamping = True`.

## Implementation Script (Python)

Este script implementa la lógica de hashing y la creación de una cadena de auditoría segura.

```python
import hashlib
import json
from datetime import datetime
import uuid

class AuditLogger:
    def __init__(self):
        # En producción, esto vendría de la DB para mantener la cadena
        self.last_entry_hash = "0000000000000000000000000000000000000000000000000000000000000000"

    def calculate_hash(self, content):
        """
        Genera SHA-256 de cualquier string o bytes.
        """
        if isinstance(content, str):
            content = content.encode('utf-8')
        return hashlib.sha256(content).hexdigest()

    def log_event(self, actor, action_type, target_id, data_payload, previous_data=None):
        """
        Registra un evento con integridad criptográfica.
        
        Args:
            actor (dict): Datos del usuario {id, ip, role}.
            action_type (str): Ej. 'UPDATE_DEED_TEXT'.
            target_id (str): ID de la Carpeta o Documento.
            data_payload (dict/str): El contenido nuevo.
            previous_data (dict/str): El contenido anterior (para diff).
        """
        
        timestamp = datetime.utcnow().isoformat() + "Z"
        
        # 1. Calcular Hash del contenido (Payload)
        payload_str = json.dumps(data_payload, sort_keys=True)
        payload_hash = self.calculate_hash(payload_str)
        
        # 2. Construir el objeto de Auditoría
        audit_entry = {
            "event_id": str(uuid.uuid4()),
            "timestamp": timestamp,
            "actor": actor,
            "target_entity": target_id,
            "action": action_type,
            "data_hash": payload_hash,
            "previous_chain_hash": self.last_entry_hash, # Enlaza con el evento anterior
            "metadata": {
                "has_changed": data_payload != previous_data if previous_data else True,
                "data_size": len(payload_str)
            }
        }
        
        # 3. Sellar el evento completo (Hash del bloque)
        # Esto asegura que nadie pueda editar la fecha o el actor del log a posteriori
        entry_string = json.dumps(audit_entry, sort_keys=True)
        final_hash = self.calculate_hash(entry_string)
        
        audit_entry["integrity_signature"] = final_hash
        
        # Actualizar el puntero de la cadena
        self.last_entry_hash = final_hash
        
        return audit_entry

    def verify_integrity(self, audit_entry):
        """
        Verifica si un log ha sido manipulado recalculando su hash.
        """
        stored_signature = audit_entry.pop("integrity_signature")
        recalculated = self.calculate_hash(json.dumps(audit_entry, sort_keys=True))
        
        audit_entry["integrity_signature"] = stored_signature # Restaurar
        
        return stored_signature == recalculated

# --- CASOS DE USO ---
logger = AuditLogger()

# 1. Escribano modifica el precio en una escritura
actor_data = {"id": "usr_123", "name": "Alejandro Galmarini", "role": "ESCRIBANO_TITULAR"}
new_deed_data = {"texto": "VENTA por el precio de USD 100.000", "version": 2}
old_deed_data = {"texto": "VENTA por el precio de USD 90.000", "version": 1}

log_1 = logger.log_event(
    actor=actor_data,
    action_type="UPDATE_DEED_DRAFT",
    target_id="carpeta_2025_001",
    data_payload=new_deed_data,
    previous_data=old_deed_data
)

print("--- LOG GENERADO (Secure) ---")
print(json.dumps(log_1, indent=2))

# 2. Verificación de Integridad
is_valid = logger.verify_integrity(log_1)
print(f"\n¿Log válido?: {is_valid}")

# 3. Intento de Hackeo (Alguien cambia el log en la base de datos)
log_1["actor"]["name"] = "Hacker Externo" 
is_valid_hacked = logger.verify_integrity(log_1)
print(f"¿Log hackeado es válido?: {is_valid_hacked}")