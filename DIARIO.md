# Diario de Proyecto - NotiAR

Este documento registra los hitos alcanzados y las funcionalidades que han sido validadas y se consideran **ESTABLES**. El objetivo es preservar esta lógica mientras se avanza en nuevas capacidades.

## Hitos Alcanzados (Enero 2026)

### 1. Extracción de Inmuebles (Literal) ✅
- **Estado:** Estable / No tocar.
- **Logro:** El sistema extrae la transcripción técnica completa de los inmuebles sin recortes (medidas, linderos y superficies íntegros).
- **Componente:** `notary-property-extractor`.

### 2. Gestión Integral de Clientes ✅
- **Estado:** Estable / No tocar.
- **Logro:** Extracción completa de datos personales y biográficos. Fuente única de verdad (la edición en carpeta actualiza la ficha global).
- **Control:** Prevención de duplicados por DNI/Upsert.

### 3. Diferenciación de Personas Jurídicas ✅
- **Estado:** Estable / No tocar.
- **Logro:** Identificación automática de bancos/empresas por CUIT. UI adaptada (etiquetas "Const:", ocultamiento de DNI).

### 4. Estandarización de Apellidos ✅
- **Estado:** Estable / No tocar.
- **Logro:** Apellidos siempre en MAYÚSCULAS (incluyendo cónyuges). Soporte para apellidos compuestos.

---

## Próximos Desafíos
- [ ] Identificación de nuevos modelos de documentos.
- [ ] Lectura de documentos no identificados.
- [ ] Validaciones legales automáticas (Art. 470 CCyC).

> **Aviso:** No modificar la lógica de normalización ni extracción de inmuebles sin revisión previa, dado el alto nivel de satisfacción actual.
