---
name: notary-style-formatter
description: Normaliza y formatea datos crudos (fechas, montos, nombres) según el estricto protocolo notarial argentino. Convierte números a letras (obligatorio por Art. 306 CCyC), formatea fechas completas y estandariza la escritura de apellidos y DNI para su inserción en escrituras públicas.
license: Proprietary
---

# Notary Style Formatter

## Overview

En la redacción notarial, no basta con tener el dato correcto; debe estar expresado en la forma legal correcta. Un error en un número (ej. poner "$10.000" sin aclarar "DIEZ MIL PESOS") puede impugnar la validez del instrumento.

Esta habilidad actúa como un "traductor de estilo". Recibe datos crudos (int, date, string) y devuelve cadenas de texto listas para ser pegadas en el protocolo, garantizando el cumplimiento de la normativa de fondo y forma.

## Workflow Logic

### 1. Regla de "Letras y Números" (Cardinal Rule)
Para cualquier monto (Precio, Valuación, Saldo) o cantidad relevante (Superficie):
* **Input:** `150000.50` (float) y `USD` (moneda).
* **Lógica:**
    1. Convertir la parte entera a texto en mayúsculas ("CIENTO CINCUENTA MIL").
    2. Convertir la parte decimal (si existe) o indicar "con 50/100".
    3. Concatenar la moneda.
    4. Agregar el formato numérico entre paréntesis al final.
* **Output:** "DÓLARES ESTADOUNIDENSES CIENTO CINCUENTA MIL CON CINCUENTA CENTAVOS (U$S 150.000,50)".

### 2. Regla de Fechas Extendidas (Protocolo)
Las fechas en el cuerpo de la escritura (encabezado, nacimientos) no pueden ir abreviadas.
* **Input:** `1977-02-18`
* **Output:** "dieciocho de febrero de mil novecientos setenta y siete".

### 3. Regla de Identidad Visual
Estandarización de nombres para rápida lectura en el folio.
* **Input:** `Juan Carlos Perez`
* **Output:** `PEREZ, Juan Carlos`. (Apellido en Mayúsculas sostenidas, Nombre en Title Case).

## Implementation Script (Python)

Este script utiliza librerías estándar y lógica específica para el formateo argentino.

```python
import locale
from datetime import datetime

# En un entorno real, instalar: pip install num2words
try:
    from num2words import num2words
except ImportError:
    # Fallback simple para demostración si no está la librería
    def num2words(num, lang='es'):
        return f"[REQUIERE NUM2WORDS PARA: {num}]"

def format_notary_style(data_type, value, extra_params=None):
    """
    Formatea un valor según reglas notariales.
    Args:
        data_type (str): 'DATE', 'MONEY', 'NAME', 'DNI', 'SURFACE'.
        value (any): El valor a formatear.
        extra_params (dict): Parámetros opcionales (ej. moneda).
    """
    
    # Configurar locale para separadores de miles/decimales (Arg)
    try:
        locale.setlocale(locale.LC_ALL, 'es_AR.UTF-8')
    except:
        pass # Fallback si el sistema no tiene el locale instalado

    if data_type == 'DATE':
        # Input esperado: datetime object o string 'YYYY-MM-DD'
        if isinstance(value, str):
            date_obj = datetime.strptime(value, "%Y-%m-%d")
        else:
            date_obj = value
            
        # Diccionario manual para asegurar texto completo (num2words gestiona años mejor)
        dia_txt = num2words(date_obj.day, lang='es')
        anio_txt = num2words(date_obj.year, lang='es')
        meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", 
                 "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
        mes_txt = meses[date_obj.month - 1]
        
        return f"{dia_txt} de {mes_txt} del año {anio_txt}".lower()

    elif data_type == 'MONEY':
        # Input esperado: float o int
        amount = float(value)
        currency = extra_params.get('currency', 'PESOS') if extra_params else 'PESOS'
        symbol = "$ " if currency == 'PESOS' else "U$S "
        
        entero = int(amount)
        decimal = int(round((amount - entero) * 100))
        
        texto_entero = num2words(entero, lang='es').upper()
        
        texto_final = f"{currency} {texto_entero}"
        
        if decimal > 0:
            texto_final += f" CON {num2words(decimal, lang='es').upper()} CENTAVOS"
        
        # Formato numérico visual
        numero_visual = "{:,.2f}".format(amount).replace(",", "@").replace(".", ",").replace("@", ".")
        
        return f"{texto_final} ({symbol}{numero_visual})"

    elif data_type == 'NAME':
        # Input: "Nombre Segundo Apellido"
        parts = value.strip().split()
        if not parts: return ""
        
        # Heurística simple: Última palabra es apellido (Skill Entity Extractor es más preciso, esto es solo formateo)
        lastname = parts[-1].upper()
        names = " ".join([p.capitalize() for p in parts[:-1]])
        
        return f"{lastname}, {names}"

    elif data_type == 'DNI':
        # Input: 25765599
        # Output: "veinticinco millones setecientos sesenta y cinco mil quinientos noventa y nueve (25.765.599)"
        num = int(str(value).replace(".", ""))
        texto = num2words(num, lang='es').lower()
        visual = "{:,}".format(num).replace(",", ".")
        return f"{texto} ({visual})"

    return str(value)

# --- TEST CASES ---

# 1. Fecha de Escritura
print(f"FECHA: {format_notary_style('DATE', '2025-12-23')}")

# 2. Precio Venta (Pesos)
print(f"PRECIO ARS: {format_notary_style('MONEY', 26550000.00, {'currency': 'PESOS'})}")

# 3. Precio Venta (Dólares)
print(f"PRECIO USD: {format_notary_style('MONEY', 150000.50, {'currency': 'DÓLARES ESTADOUNIDENSES BILLETES'})}")

# 4. Nombre Cliente
print(f"NOMBRE: {format_notary_style('NAME', 'ramses antonio castillo maracay')}")

# 5. DNI Compareciente
print(f"DNI: {format_notary_style('DNI', 25765599)}")