import React, { useState, useEffect } from 'react';

/**
 * FileUpload component for uploading and selecting JSON files
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onFileUpload - Function to handle file upload
 * @param {Function} props.onFileSelect - Function to handle file selection
 * @param {String} props.currentJsonFile - Current JSON file name
 * @param {Array} props.jsonFiles - List of available JSON files
 */
const FileUpload = ({ onFileUpload, onFileSelect, currentJsonFile, jsonFiles }) => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState('');
  
  // Actualizar el valor seleccionado cuando cambie el archivo JSON actual
  useEffect(() => {
    if (currentJsonFile) {
      setSelectedFile(currentJsonFile);
    }
  }, [currentJsonFile]);

  // Manejar la selección de un archivo JSON existente
  const handleJsonFileSelect = async (e) => {
    const fileName = e.target.value;
    setSelectedFile(fileName);
    
    if (!fileName) return;
    
    try {
      setIsLoading(true);
      setError('');
      setSuccess('');
      
      // Cargar las historias del archivo seleccionado
      await onFileSelect(fileName);
      setSuccess(`Historias del archivo ${fileName} cargadas correctamente`);
    } catch (err) {
      setError(`Error al cargar el archivo: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Reset states
    setError('');
    setSuccess('');
    
    // Validate file type
    if (file.type !== 'application/json') {
      setError('Error: El archivo seleccionado no es un archivo JSON.');
      e.target.value = '';
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Read file
      const fileContent = await readFileAsync(file);
      const jsonData = JSON.parse(fileContent);
      
      // Validate structure
      if (!jsonData.historias_de_usuario || !Array.isArray(jsonData.historias_de_usuario)) {
        throw new Error('JSON no contiene "historias_de_usuario" o no es un array.');
      }
      
      // Añadir el nombre del archivo a los datos
      const fileName = file.name;
      // Calcular fecha local (medianoche local del usuario)
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const uploadDate = now.toISOString();
      const dataWithFileName = {
        jsonFileName: fileName,
        historias_de_usuario: jsonData.historias_de_usuario,
        uploadDate,
        // Incluir las preguntas si existen en el JSON
        preguntas_para_aclarar: jsonData.preguntas_para_aclarar || []
      };
      
      // Import stories
      const message = await onFileUpload(dataWithFileName);
      setSuccess(message || `Historias del archivo ${fileName} importadas correctamente`);
      
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
      e.target.value = '';
    }
  };

  // Helper function to read file contents
  const readFileAsync = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('Error reading file'));
      reader.readAsText(file);
    });
  };

  return (
    <div>
      {/* Selector de archivos JSON existentes */}
      <div className="mb-4">
        <select
          id="existingJsonFile"
          value={selectedFile}
          onChange={handleJsonFileSelect}
          disabled={isLoading}
          className="block w-full p-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">-- Seleccionar archivo --</option>
          {jsonFiles.map(file => (
            <option key={file._id} value={file.fileName}>
              {file.fileName} ({new Date(file.uploadDate).toLocaleDateString()}) - {file.storyCount} historias
            </option>
          ))}
        </select>
      </div>
      
      {/* Separador */}
      <div className="my-4 border-t border-slate-200 pt-4">
        <p className="text-sm text-slate-500 mb-2">O cargar un nuevo archivo JSON:</p>
      </div>
      
      {/* Carga de nuevo archivo JSON */}
      <div className="mb-2">
        <input 
          type="file" 
          id="jsonFile" 
          accept=".json" 
          onChange={handleFileChange}
          disabled={isLoading}
          className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
        />
      </div>
      
      {/* Mensajes de estado */}
      {error && <div className="mt-2 text-red-600 text-sm">{error}</div>}
      {success && <div className="mt-2 text-green-600 text-sm">{success}</div>}
      {isLoading && <div className="mt-2 text-slate-600 text-sm">Procesando...</div>}
    </div>
  );
};

export default FileUpload;