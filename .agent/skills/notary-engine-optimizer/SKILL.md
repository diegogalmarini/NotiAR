# Skill: Notary Engine Optimizer (Internal)

## Propósito
Garantizar que el sistema NotiAR siempre utilice el modelo de inteligencia artificial más potente y preciso disponible, evitando caídas del servicio (SaaS "muerto") ante cambios inesperados en la API de Google Gemini.

## Lógica de Funcionamiento (Auto-Sanación)
Este "Escudo de Inteligencia" opera mediante una jerarquía determinista de modelos:

1. **Vigilancia de Salud (Health Check):** Antes de procesar una escritura crítica, el sistema realiza un "ping" ligero al modelo preferido.
2. **Jerarquía Escalonada:**
   - **Nivel Oro:** `gemini-1.5-pro-002` (Máxima precisión para extracción notarial).
   - **Nivel Plata:** `gemini-2.0-flash-exp` (Alta velocidad con visión avanzada).
   - **Nivel Bronce:** `gemini-1.5-flash` (Garantía de disponibilidad total).
3. **Fallback Automático:** Si el modelo de Nivel Oro devuelve un error (404, 500 o cuota agotada), el optimizador selecciona instantáneamente el siguiente mejor modelo sin intervención humana.
4. **Caché Inteligente:** Verifica la salud cada 30 minutos para no afectar la velocidad de respuesta del usuario.

## Beneficios para el Cliente
- **Integridad de Datos:** Prioriza siempre el modelo con menor margen de error para la extracción de partes y medidas.
- **Continuidad Total:** El SaaS nunca se detiene por cambios en las versiones de Google.
- **Transparencia:** Registra logs internos cuando ocurre un cambio de motor para auditoría técnica.

---
*Implementado en `src/lib/aiConfig.ts` como el núcleo de fiabilidad de NotiAR.*
