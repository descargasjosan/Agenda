# 🏥 Importación de Registros Médicos

Script para importar reconocimientos médicos desde un archivo Excel a la aplicación Josan v2.

## 📋 Formato del Excel

El archivo Excel debe tener 4 columnas en este orden:

| Columna | Contenido | Formato |
|---------|----------|---------|
| A | Fecha de realización | DD/MM/YYYY |
| B | Fecha de caducidad | DD/MM/YYYY |
| C | (No usada) | - |
| D | DNI del operario | Texto |

**Ejemplo:**
```
A           B           C     D
15/01/2024  15/01/2025        12345678A
20/02/2024  20/02/2025        87654321B
```

## 🚀 Pasos para importar

### 1. Preparar el archivo Excel
- Asegúrate que tu archivo tenga el formato correcto
- La primera fila contiene cabeceras (se omitirá automáticamente)
- Guarda el archivo como `medical_records.xlsx` en la raíz del proyecto

### 2. Ejecutar el script
```bash
# Instalar dependencias (si no lo has hecho)
npm install xlsx @supabase/supabase-js

# Ejecutar la importación
node import-medical.js
```

## 📊 Qué hace el script

1. **Carga operarios** desde Supabase para buscar por DNI
2. **Lee el Excel** omitiendo la primera fila (cabeceras)
3. **Convierte fechas** de DD/MM/YYYY a YYYY-MM-DD
4. **Busca operarios** por DNI en la columna D
5. **Crea registros médicos** con:
   - Tipo: `recognition` (Reconocimiento médico)
   - Proveedor: `Antea`
   - Fechas: Columnas A y B
   - Operarios: Encontrados por DNI
6. **Inserta en Supabase** en la tabla `medical_courses`

## ⚠️ Manejo de errores

- **DNIs no encontrados**: Te avisa con una lista de DNIs que no coinciden con ningún operario
- **Fechas inválidas**: Intenta convertirlas y te avisa si hay problemas
- **Errores de inserción**: Muestra el error específico de cada registro fallido

## 📈 Reporte de resultados

Al finalizar, el script muestra:
- Total de filas procesadas
- Registros válidos importados
- Registros omitidos (por DNI no encontrado)
- DNIs no encontrados (lista completa)
- Resumen de inserciones exitosas y con error

## 🔍 Verificación

Después de importar:
1. Abre la aplicación
2. Ve a "Salud Laboral" → "Registros Médicos"
3. Verifica que los nuevos aparezcan con:
   - Tipo: 🏥 Reconocimiento
   - Proveedor: Antea
   - Fechas correctas
   - Operarios asignados

## 🛠️ Personalización

Si necesitas cambiar algo:
- **Proveedor**: Edita la línea `provider = 'Antea'` en el script
- **Tipo**: Cambia `type = 'recognition'` si quieres cursos en lugar de reconocimientos
- **Columnas**: Modifica los índices `[0]`, `[1]`, `[3]` para cambiar las columnas

## 🆘 Problemas comunes

**"No se encuentra el archivo"**: Asegúrate que el Excel se llama `medical_records.xlsx` y está en la raíz

**"DNIs no encontrados"**: Verifica que los DNIs del Excel coinciden exactamente con los de la aplicación (sin espacios, mayúsculas/minúsculas)

**"Error de conexión"**: Revisa que las credenciales de Supabase en el script sean correctas
