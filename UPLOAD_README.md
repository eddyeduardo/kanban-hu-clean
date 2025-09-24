# Sistema de Carga de Archivos Grandes (Chunked Upload)

Este documento proporciona una guía completa sobre el sistema de carga de archivos grandes implementado, que divide los archivos en fragmentos (chunks) para una carga más confiable y eficiente.

## Características Principales

- **Carga en Fragmentos**: Divide archivos grandes en fragmentos de 50MB para una carga más confiable
- **Reanudación de Cargas**: Permite reanudar cargas interrumpidas desde donde quedaron
- **Validación de Archivos**: Verifica tipos de archivo y tamaños tanto en cliente como en servidor
- **Progreso en Tiempo Real**: Muestra el progreso de carga con velocidad y tiempo estimado
- **Limpieza Automática**: Elimina archivos temporales antiguos automáticamente
- **Soporte para Pausa/Reanudación**: Permite pausar y reanudar cargas en cualquier momento

## Requisitos del Sistema

### Backend (Node.js/Express)
- Node.js 14+
- Express 4.x
- Multer (para manejo de archivos)
- FFmpeg (para procesamiento de video/audio)
- Espacio en disco suficiente para archivos temporales

### Frontend (React)
- React 16.8+
- Axios para peticiones HTTP
- Soporte para File API y Blob

## Instalación y Configuración

### Backend

1. Instalar dependencias:
   ```bash
   npm install express multer fluent-ffmpeg @ffmpeg-installer/ffmpeg
   ```

2. Configurar variables de entorno (.env):
   ```
   PORT=5000
   TEMP_DIR=./temp_uploads
   MAX_FILE_SIZE=2147483648  # 2GB
   ```

3. Iniciar el servidor:
   ```bash
   node server.js
   ```

### Frontend

1. Instalar dependencias:
   ```bash
   npm install axios react-icons
   ```

2. Importar el componente VideoUpload:
   ```jsx
   import VideoUpload from './components/VideoUpload';
   ```

3. Usar el componente:
   ```jsx
   <VideoUpload 
     onUploadComplete={(fileId, fileName) => {
       console.log('Upload complete!', fileId, fileName);
     }}
     onError={(error) => {
       console.error('Upload error:', error);
     }}
     apiEndpoint="/api/transcription"
   />
   ```

## Flujo de Carga

1. **Preparación**: El archivo se divide en fragmentos de 50MB
2. **Verificación**: Se comprueban los fragmentos ya existentes en el servidor
3. **Carga**: Se suben los fragmentos faltantes secuencialmente
4. **Combinación**: El servidor combina los fragmentos en el archivo final
5. **Procesamiento**: Se inicia el procesamiento del archivo completo

## Endpoints de la API

### POST /api/transcription/upload-chunk
Sube un fragmento de archivo.

**Parámetros:**
- `chunk`: El fragmento de archivo (FormData)
- `fileId`: ID único del archivo
- `chunkIndex`: Índice del fragmento
- `totalChunks`: Número total de fragmentos
- `filename`: Nombre original del archivo
- `startByte`: Byte de inicio del fragmento
- `endByte`: Byte final del fragmento
- `totalSize`: Tamaño total del archivo en bytes

### POST /api/transcription/check-chunks
Verifica qué fragmentos ya han sido subidos.

**Parámetros (JSON):**
- `fileId`: ID del archivo
- `totalChunks`: Número total de fragmentos
- `fileSize`: Tamaño total del archivo en bytes

**Respuesta:**
```json
{
  "uploadedChunks": [0, 1, 2],
  "totalChunks": 5
}
```

### POST /api/transcription/combine-chunks
Combina los fragmentos en un archivo final.

**Parámetros (JSON):**
- `fileId`: ID del archivo
- `filename`: Nombre del archivo
- `fileType`: Tipo MIME del archivo

## Manejo de Errores

### Errores Comunes

| Código | Mensaje | Solución |
|--------|---------|-----------|
| 400 | Invalid file type | El tipo de archivo no está soportado |
| 400 | File too large | El archivo excede el tamaño máximo permitido |
| 404 | File not found | El archivo o fragmento no existe |
| 500 | Internal server error | Error en el servidor al procesar la solicitud |

### Reintentos Automáticos

El cliente realiza hasta 3 intentos por fragmento antes de marcar el error como fatal.

## Seguridad

- Se validan los tipos MIME en el servidor
- Se verifica el tamaño de cada fragmento
- Los archivos temporales se almacenan con nombres únicos
- Se limpian automáticamente los archivos antiguos

## Rendimiento

- Fragmentos de 50MB para equilibrar rendimiento y confiabilidad
- Procesamiento en paralelo cuando es posible
- Uso eficiente de memoria con streams

## Personalización

### Tamaño de Fragmento

Para cambiar el tamaño de los fragmentos, modifica la constante `CHUNK_SIZE` en el frontend:

```javascript
// En el componente VideoUpload
const CHUNK_SIZE = 50 * 1024 * 1024; // 50MB
```

### Tipos de Archivo Permitidos

Para modificar los tipos de archivo permitidos, actualiza las constantes en el backend y frontend:

**Backend:**
```javascript
const ALLOWED_MIME_TYPES = {
  'video/mp4': ['.mp4', '.m4v'],
  'video/quicktime': ['.mov', '.qt'],
  // ... otros tipos
};
```

**Frontend:**
```javascript
const ALLOWED_TYPES = {
  'video/mp4': ['.mp4', '.m4v'],
  'video/quicktime': ['.mov', '.qt'],
  // ... otros tipos
};
```

## Solución de Problemas

### La carga se detiene o falla

1. Verifica la conexión a internet
2. Revisa los logs del servidor para errores
3. Asegúrate de que haya suficiente espacio en disco
4. Verifica los permisos de escritura en el directorio temporal

### Los fragmentos no se combinan correctamente

1. Verifica que todos los fragmentos se hayan subido correctamente
2. Comprueba que los tamaños de los fragmentos sean los esperados
3. Revisa los logs del servidor durante la combinación

## Mejoras Futuras

- Soporte para carga en paralelo de fragmentos
- Cifrado de extremo a extremo
- Compresión de fragmentos antes de la carga
- Soporte para pausa/reanudación entre sesiones
- Interfaz de administración para monitorear cargas

## Licencia

[Incluir información de licencia aquí]

---

*Documentación actualizada el 2023-11-15*
