# Kanban Board Application

Una aplicación web para gestionar historias de usuario en un tablero Kanban con asignaciones a desarrolladores, métricas de esfuerzo por tipo de tarea y soporte de múltiples proyectos.

## Características

- Tablero Kanban con columnas personalizables (desarrolladores)
- Arrastrar y soltar historias entre columnas
- Importación de historias desde archivo JSON con deduplicación automática
- Criterios de aceptación con posibilidad de marcar como completados
- Campos **Esfuerzo** (puntos/horas) y **Tipo de tarea** (Operativa, Soporte, Comercial, Administrativa)
- Dashboard con gráfico donut por tipo + progreso planificado vs. realizado
- Vista de Alcance con exportación a Excel, PDF y CSV
- Plan de pruebas por historia
- Transcripción de video/audio con OpenAI Whisper
- Gestión de preguntas de aclaración por proyecto
- Insights generados con IA
- Soporte multi-proyecto (un archivo JSON por proyecto)

## Tecnologías Utilizadas

- **Frontend**: React, Tailwind CSS, Recharts, react-beautiful-dnd
- **Backend**: Node.js, Express.js
- **Base de Datos**: MongoDB con Mongoose
- **IA**: OpenAI API (Whisper para transcripción, GPT para Insights)

## Requisitos Previos

- Node.js (v14 o superior)
- MongoDB (local en puerto 27019, o Atlas)
- Clave de API de OpenAI (para transcripción e Insights)

## Instalación y Ejecución

1. Instalar dependencias:
   ```bash
   npm run install:all
   ```

2. Configurar variables de entorno:
   ```bash
   cp server/.env.example server/.env
   # Editar server/.env con los valores reales
   ```

3. Iniciar la aplicación (servidor + cliente):
   ```bash
   npm start
   ```

4. Acceder a la aplicación:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## Variables de Entorno

| Variable        | Descripción                                  | Ejemplo                                    |
|-----------------|----------------------------------------------|--------------------------------------------|
| `PORT`          | Puerto del servidor Express                  | `5000`                                     |
| `MONGODB_URI`   | URI de conexión a MongoDB                    | `mongodb://localhost:27017/kanban-hu`       |
| `OPENAI_API_KEY`| Clave de API de OpenAI                       | `sk-...`                                   |
| `NODE_ENV`      | Entorno de ejecución                         | `development` / `production`               |

> En producción, configurar estas variables en el panel de la plataforma de hosting (Railway, Render, Heroku, etc.) en lugar de usar un archivo `.env`.

## Estructura de la Base de Datos

La aplicación utiliza MongoDB con las siguientes colecciones:

| Colección       | Descripción                                                             |
|-----------------|-------------------------------------------------------------------------|
| `columns`       | Columnas del tablero; pueden ser por defecto (`isDefault`) o por proyecto |
| `stories`       | Historias de usuario con criterios, esfuerzo, tipo y posición          |
| `jsonfiles`     | Registro de archivos JSON importados y sus preguntas de aclaración     |
| `projectconfigs`| Configuración de fechas del sprint por proyecto                        |

## Formato de Importación JSON

```json
{
  "historias_de_usuario": [
    {
      "id_historia": "PROYECTO-001",
      "titulo": "Título de la historia",
      "usuario": "Nombre del desarrollador",
      "esfuerzo": "3",
      "tipo": "Operativa",
      "requerimiento": "",
      "objetivo": "",
      "criterios_de_aceptacion": [
        "El sistema debe hacer X correctamente.",
        "El sistema debe validar Y ante el evento Z."
      ]
    }
  ],
  "preguntas_para_aclarar": [
    "Sobre 'Título': ¿Cuál es el alcance exacto de este requerimiento?"
  ]
}
```

### Campos del JSON

| Campo                      | Requerido | Descripción                                                                 |
|----------------------------|-----------|-----------------------------------------------------------------------------|
| `id_historia`              | No        | Identificador único de la historia (ej. `PROYECTO-001`). Se usa para deduplicar en reimportaciones. |
| `titulo`                   | No*       | Título de la historia. Se usa como `title` en la base de datos.             |
| `requerimiento`            | No*       | Alternativo a `titulo`. Se usa si `titulo` está vacío.                      |
| `usuario`                  | No        | Nombre del desarrollador asignado.                                          |
| `esfuerzo`                 | No        | Puntos o horas estimadas (ej. `"2"`, `"0,5"`). Acepta coma decimal.        |
| `tipo`                     | No        | Tipo de tarea: `Operativa`, `Soporte`, `Comercial`, `Administrativa`.       |
| `criterios_de_aceptacion`  | No        | Lista de criterios. Se ignoran automáticamente textos nulos o vacíos.       |
| `preguntas_para_aclarar`   | No        | Lista de preguntas de aclaración asociadas al proyecto.                     |

> \* Al menos uno de `titulo` o `requerimiento` debe tener valor. Si ambos están vacíos, se asigna `"Sin título"`.

### Comportamiento de la Importación

- **Primera importación**: crea todas las historias en la columna "Por Hacer".
- **Reimportación del mismo archivo**: las historias con el mismo `id_historia` se omiten (no se duplican); solo se crean las que no existen todavía.
- **Historias sin `id_historia`**: se crean siempre sin verificar duplicados.
- La respuesta del endpoint indica cuántas historias fueron `created`, `skipped` (duplicadas) y `failed` (error de validación).

## Licencia

Este proyecto está licenciado bajo la licencia MIT.