import React, { useState, useEffect, useMemo } from 'react';
import { FaTrash } from 'react-icons/fa';

/**
 * FileUpload component for uploading and selecting JSON files
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onFileUpload - Function to handle file upload
 * @param {Function} props.onFileSelect - Function to handle file selection
 * @param {String} props.currentJsonFile - Current JSON file name
 * @param {Array} props.jsonFiles - List of available JSON files
 */
const FileUpload = ({ onFileUpload, onFileSelect, currentJsonFile, jsonFiles, onFileDelete }) => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
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

  // Manejar la eliminación de un archivo
  const handleDeleteClick = (e, file) => {
    console.log('handleDeleteClick llamado con archivo:', file);
    e.stopPropagation();
    e.preventDefault(); // Prevenir cualquier acción por defecto
    console.log('Estableciendo archivo a eliminar:', file.fileName);
    setFileToDelete(file);
    // No cerrar el menú desplegable aquí
    e.nativeEvent.stopImmediatePropagation();
  };

  const confirmDelete = async () => {
    console.log('confirmDelete llamado');
    
    // Asegurarse de que tenemos un archivo para eliminar
    if (!fileToDelete) {
      console.log('No hay archivo para eliminar');
      return;
    }
    
    // Obtener el nombre del archivo, asegurando que sea un string
    const fileName = typeof fileToDelete === 'string' ? fileToDelete : 
                   (fileToDelete.fileName || fileToDelete._id || '');
    
    if (!fileName) {
      console.error('No se pudo determinar el nombre del archivo a eliminar');
      setError('No se pudo determinar el archivo a eliminar');
      return;
    }
    
    console.log('Iniciando proceso de eliminación para:', fileName);
    setIsDeleting(true);
    setError('');
    setSuccess('');
    
    try {
      console.log('Llamando a onFileDelete con:', fileName);
      const result = await onFileDelete(fileName);
      console.log('Resultado de onFileDelete:', result);
      
      if (result && result.success) {
        const successMsg = result.message || 'Archivo eliminado correctamente';
        console.log('Éxito:', successMsg);
        setSuccess(successMsg);
        
        // Limpiar la selección actual si el archivo eliminado es el que está seleccionado
        if (currentJsonFile === fileName) {
          console.log('Limpiando archivo actualmente seleccionado');
          setSelectedFile('');
          
          // Notificar al componente padre que se eliminó el archivo actual
          if (onFileSelect) {
            console.log('Notificando al componente padre que se eliminó el archivo actual');
            // Pasar un objeto con una propiedad que indique que se eliminó el archivo
            await onFileSelect({ 
              target: { 
                value: '',
                dataset: { deleted: 'true' }
              } 
            });
          }
        } else if (onFileSelect) {
          // Si no es el archivo actual, solo actualizar la lista
          console.log('Actualizando lista de archivos');
          await onFileSelect({ target: { value: '' } });
        }
      } else {
        const errorMsg = result?.message || 'Error al eliminar el archivo';
        console.error('Error al eliminar:', errorMsg);
        setError(errorMsg);
      }
    } catch (error) {
      console.error('Error al eliminar el archivo:', error);
      setError('Error al eliminar el archivo: ' + (error.message || 'Error desconocido'));
    } finally {
      setIsDeleting(false);
      // Cerrar el modal solo después de completar todas las operaciones
      setFileToDelete(null);
    }
  };

  const cancelDelete = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    console.log('Cancelando eliminación');
    setFileToDelete(null);
  };

  // Manejar la selección de un archivo JSON existente
  const handleJsonFileSelect = async (e) => {
    const fileName = e.target.value;
    setSelectedFile(fileName);
    
    if (!fileName) return;
    
    try {
      setIsLoading(true);
      setError('');
      setSuccess('');
      
      // Crear un objeto de evento simulado que coincida con lo que handleLoadJsonFile espera
      const simulatedEvent = {
        target: {
          value: fileName,
          dataset: {}
        }
      };
      
      // Cargar las historias del archivo seleccionado
      await onFileSelect(simulatedEvent);
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
      <div className="mb-4 relative" onClick={(e) => e.stopPropagation()}>
        <input
          type="text"
          placeholder="Buscar archivo..."
          className="w-full p-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsDropdownOpen(true)}
          onBlur={() => {
            // Pequeño retraso para permitir que se haga clic en los botones
            setTimeout(() => {
              setIsDropdownOpen(false);
            }, 200);
          }}
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
                    >
                      <div 
                        className="flex-1 min-w-0"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSelectedFile(file.fileName);
                          // Crear un evento simulado con la estructura correcta
                          const simulatedEvent = {
                            target: {
                              value: file.fileName,
                              dataset: {}
                            },
                            preventDefault: () => {},
                            stopPropagation: () => {}
                          };
                          handleJsonFileSelect(simulatedEvent);
                          setIsDropdownOpen(false);
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div className="truncate pr-2 flex-1">
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
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleDeleteClick(e, file);
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                        className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition-colors"
                        title="Eliminar archivo"
                        disabled={isDeleting}
                        type="button"
                      >
                        <FaTrash className="w-3.5 h-3.5" />
                      </button>
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

      {/* Modal de confirmación de eliminación */}
      {fileToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Confirmar eliminación</h3>
            <p className="text-slate-600 mb-6">
              ¿Estás seguro de que deseas eliminar el archivo <span className="font-medium">{fileToDelete?.fileName}</span>?
              Esta acción no se puede deshacer y también se eliminarán todas las historias asociadas.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {isDeleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;