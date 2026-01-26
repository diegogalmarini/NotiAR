-- ============================================
-- SCRIPT DE CORRECCIÓN SQL v1.2.15
-- Escritura 24.pdf - Corrección de Datos
-- ============================================

-- PASO 1: Insertar Norman Roberto GIRALDE (Persona faltante)
-- Representante del Banco de Galicia
INSERT INTO personas (
    dni,
    nombre_completo,
    nacionalidad,
    fecha_nacimiento,
    estado_civil_detalle,
    cuit,
    domicilio_real,
    origen_dato,
    created_at,
    updated_at
) VALUES (
    '21502903',
    'Norman Roberto Giralde',
    'Argentino',
    '1970-10-05',
    'Divorciado',
    '20-21502903-5',
    '{"literal": "Bahía Blanca, Provincia de Buenos Aires"}'::jsonb,
    'IA_OCR',
    NOW(),
    NOW()
);

-- PASO 2: Corregir CUIT de Carlos Alberto Perez Aguirre
-- Actual: 25765599 → Correcto: 20-25765599-8
UPDATE personas
SET 
    cuit = '20-25765599-8',
    updated_at = NOW()
WHERE dni = '25765599';

-- PASO 3: Corregir CUIT de Natalia Nittoli
-- Actual: 28219058 → Correcto: 27-28219058-9
UPDATE personas
SET 
    cuit = '27-28219058-9',
    estado_civil_detalle = 'Casada en primeras nupcias con Carlos Alberto Perez Aguirre',
    updated_at = NOW()
WHERE dni = '28219058';

-- PASO 4: Actualizar datos biográficos completos de Carlos Alberto
UPDATE personas
SET 
    estado_civil_detalle = 'Casado en primeras nupcias con Natalia Nittoli',
    fecha_nacimiento = '1977-02-18',
    datos_conyuge = '{
        "nombre_completo": "Natalia Nittoli",
        "dni": "28219058",
        "cuit": "27-28219058-9"
    }'::jsonb,
    updated_at = NOW()
WHERE dni = '25765599';

-- PASO 5: Actualizar datos biográficos de Natalia
UPDATE personas
SET 
    fecha_nacimiento = '1980-05-26',
    datos_conyuge = '{
        "nombre_completo": "Carlos Alberto Perez Aguirre",
        "dni": "25765599",
        "cuit": "20-25765599-8"
    }'::jsonb,
    updated_at = NOW()
WHERE dni = '28219058';

-- PASO 6: Actualizar Transcripción Completa del Inmueble
-- Suponiendo que el inmueble está asociado a la escritura 24
UPDATE inmuebles
SET 
    transcripcion_literal = 'una unidad funcional que es parte del edificio ubicado en el ejido de esta ciudad, con frente a calle Calfucurá número 384/398, que según plano característica P.H. 7-94-2004 que cita su antecedente, se designa como UNIDAD FUNCIONAL OCHO, integrada por los POLIGONOS: CERO CERO – CERO OCHO, con Superficie Cubierta de Veintiocho metros dieciocho decímetros cuadrados; Semicubierta de Doce metros cuarenta y seis decímetros cuadrados; Descubierta de Treinta y tres metros sesenta y siete decímetros cuadrados.- Total para el Polígono de Setenta y cuatro metros treinta y un decímetros cuadrados.- Y CERO UNO – CERO TRES, con Superficie Cubierta de Treinta y cinco metros treinta y siete decímetros cuadrados; Descubierta de Un metro setenta y siete decímetros cuadrados.- Total para el polígono de Treinta y siete metros catorce decímetros cuadrados.- Superficie total para los polígonos y la unidad funcional de CIENTO ONCE METROS CUARENTA Y CINCO DECIMETROS CUADRADOS.- Le corresponde un porcentual del 0,2548 con relación al valor del conjunto.- NOMENCLATURA CATASTRAL:- Circunscripción I, Sección C, Manzana 126, Parcela 37, Subparcela 8; Poligonos 00-03 y 01-03.- PARTIDA:- número 185.648.- VALUACION FISCAL :- $ 948.241.- VALUACION FISCAL AL ACTO:- $ 8.564.135.- La unidad funcional descripta forma parte del Inmueble general ubicado en el ejido de esta ciudad, con frente a calle Calfucurá número 384/398 esquina Lavalle, que es parte del lote Dos de la Quinta Seis y mide Diez metros de frente al Sud Este, por Veintiocho metros ochenta centímetros de fondo al Sud Oeste.- Superficie de DOSCIENTOS OCHENTA Y OCHO METROS CUADRADOS.- Linda al Sud Este, con calle Lavalle; al Sud Oeste, con calle Calfucurá; al Nord Oeste, con fracción B; y al Nord Este, con el lote Tres.',
    nomenclatura_catastral = 'Circunscripción I, Sección C, Manzana 126, Parcela 37, Subparcela 8; Polígonos 00-03 y 01-03',
    valuacion_fiscal = 948241.00,
    updated_at = NOW()
WHERE 
    -- Ajusta este filtro según tu identificador real
    transcripcion_literal LIKE '%UNIDAD FUNCIONAL OCHO%'
    AND transcripcion_literal NOT LIKE '%una unidad funcional que es parte del edificio%';

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Ver todas las personas con sus CUITs corregidos
SELECT 
    nombre_completo,
    dni,
    cuit,
    estado_civil_detalle,
    fecha_nacimiento
FROM personas
WHERE dni IN ('25765599', '28219058', '21502903')
ORDER BY dni;

-- Ver inmueble con transcripción completa
SELECT 
    id,
    LEFT(transcripcion_literal, 200) as transcripcion_preview,
    nomenclatura_catastral,
    valuacion_fiscal
FROM inmuebles
WHERE transcripcion_literal LIKE '%UNIDAD FUNCIONAL OCHO%';
