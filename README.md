# Kanban Board Application

Una aplicación web para gestionar historias de usuario en un tablero Kanban con asignaciones a desarrolladores.

## Características

- Tablero Kanban con columnas personalizables (desarrolladores)
- Arrastrar y soltar historias entre columnas
- Importación de historias desde archivo JSON
- Criterios de aceptación con posibilidad de marcar como completados
- Conexión a base de datos MongoDB

## Tecnologías Utilizadas

- **Frontend**: React, Tailwind CSS, react-beautiful-dnd
- **Backend**: Node.js, Express.js
- **Base de Datos**: MongoDB

## Requisitos Previos

- Node.js (v14 o superior)
- MongoDB (corriendo en puerto 27019)

## Instalación y Ejecución

1. Instalar dependencias:
   ```
   npm run install:all
   ```

2. Iniciar la aplicación (servidor + cliente):
   ```
   npm start
   ```

3. Acceder a la aplicación:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## Estructura de la Base de Datos

La aplicación utiliza MongoDB con dos colecciones principales:

- **Columns**: Representa las columnas del tablero (desarrolladores)
- **Stories**: Representa las historias de usuario con sus criterios

## Formato de Importación JSON

El formato para importar historias debe ser:

```json
{
  "historias_de_usuario": [
    {
      "id_historia": "opcional-uuid",
      "titulo": "Título de la historia",
      "criterios_de_aceptacion": [
        "Criterio 1",
        "Criterio 2"
      ]
    }
  ]
}
```

## Licencia

Este proyecto está licenciado bajo la licencia MIT.