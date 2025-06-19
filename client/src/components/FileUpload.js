import React, { useState, useEffect, useMemo } from 'react';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Filtrar archivos basados en el término de búsqueda
  const filteredFiles = useMemo(() => {
    if (!searchTerm) return jsonFiles;
    return jsonFiles.filter(file => 
      file.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.uploadDate.includes(searchTerm) ||
      file.storyCount.toString().includes(searchTerm)
    );
  }, [jsonFiles, searchTerm]);
  
  // Agrupar archivos por mes/año
  const groupedFiles = useMemo(() => {
    const groups = {};
    const sortedFiles = [...filteredFiles].sort((a, b) => 
      new Date(b.uploadDate) - new Date(a.uploadDate)
    );
    
    sortedFiles.forEach(file => {
      const date = new Date(file.uploadDate);
      const monthYear = date.toLocaleDateString('es-ES', { 
        month: 'long', 
        year: 'numeric' 
      }).replace(/\b\w/g, l => l.toUpperCase());
      
      if (!groups[monthYear]) {
        groups[monthYear] = [];
      }
      groups[monthYear].push(file);
    });
    
    return groups;
  }, [filteredFiles]);
  
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
      {/* Selector de archivos JSON existentes con búsqueda */}
      <div className="mb-4 relative">
        <input
          type="text"
          placeholder="Buscar archivo..."
          className="w-full p-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsDropdownOpen(true)}
          onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
        />
        
        {isDropdownOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-md shadow-lg max-h-96 overflow-y-auto">
            {Object.keys(groupedFiles).length > 0 ? (
              Object.entries(groupedFiles).map(([monthYear, files]) => (
                <div key={monthYear} className="border-b border-slate-100 last:border-b-0">
                  <div className="sticky top-0 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {monthYear}
                  </div>
                  {files.map(file => (
                    <div
                      key={file._id}
                      className={`px-3 py-2 hover:bg-blue-50 cursor-pointer flex justify-between items-center ${
                        selectedFile === file.fileName ? 'bg-blue-50' : ''
                      }`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSelectedFile(file.fileName);
                        handleJsonFileSelect({ target: { value: file.fileName } });
                        setIsDropdownOpen(false);
                      }}
                    >
                      <div className="truncate pr-2">
                        <div className="font-medium truncate">{file.fileName}</div>
                        <div className="text-xs text-slate-500">
                          {new Date(file.uploadDate).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                      <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                        {file.storyCount} {file.storyCount === 1 ? 'historia' : 'historias'}
                      </span>
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <div className="p-3 text-center text-slate-500">
                No se encontraron archivos
              </div>
            )}
          </div>
        )}
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