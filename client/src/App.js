import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import SimpleKanban from './components/SimpleKanban';
import StoryModal from './components/StoryModal';
import AddColumnForm from './components/AddColumnForm';
import FileUpload from './components/FileUpload';
import TabSystem from './components/TabSystem';
import KanbanTab from './components/KanbanTab';
import Dashboard from './components/Dashboard';
import UserStoryManagement from './components/UserStoryManagement';
import VideoTranscription from './components/VideoTranscription';
import ScopeView from './components/ScopeView';
import TestPlanView from './components/TestPlanView';
import PreguntasTab from './components/PreguntasTab';
import api from './services/api';

function App() {
  const [columns, setColumns] = useState([]);
  const [stories, setStories] = useState([]);
  const [preguntas, setPreguntas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentJsonFile, setCurrentJsonFile] = useState(null);
  const [jsonFiles, setJsonFiles] = useState([]);
  const [activeTab, setActiveTab] = useState('Kanban');
  const [modalOpen, setModalOpen] = useState(false);
  const [currentStory, setCurrentStory] = useState(null);
  const [targetColumnId, setTargetColumnId] = useState(null);
  const [chartStartDate, setChartStartDate] = useState(new Date());
  const [chartEndDate, setChartEndDate] = useState(new Date());
  
  // Función para actualizar la fecha de inicio del Burn Down Chart
  const handleStartDateChange = async (date) => {
    setChartStartDate(date);
    if (currentJsonFile) {
      try {
        await api.updateProjectConfig(currentJsonFile, { chartStartDate: date });
      } catch (err) {
        console.error('Error al guardar la fecha de inicio:', err);
      }
    }
  };
  
  // Función para agregar columnas automáticamente basadas en el atributo usuario de las historias
  const handleAutoAddColumns = async () => {
    try {
      setLoading(true);

      // Obtener usuarios únicos de las historias (excluyendo vacíos y nulos)
      const uniqueUsers = [...new Set(
        stories
          .map(story => story.user)
          .filter(user => user && user.trim() !== '')
      )];

      if (uniqueUsers.length === 0) {
        setLoading(false);
        return { created: 0, assigned: 0, message: 'No hay usuarios en las historias' };
      }

      // Obtener nombres de columnas existentes
      const existingColumnNames = columns.map(col => col.name.toLowerCase());

      // Filtrar usuarios que no tienen columna creada
      const usersWithoutColumn = uniqueUsers.filter(
        user => !existingColumnNames.includes(user.toLowerCase())
      );

      // Crear columnas para cada usuario único que no tenga columna
      const createdColumns = [];
      for (const userName of usersWithoutColumn) {
        const newColumn = {
          name: userName,
          jsonFileName: currentJsonFile || null
        };
        const response = await api.createColumn(newColumn);
        createdColumns.push(response.data);
      }

      // Actualizar el estado con las nuevas columnas
      const allColumns = [...columns, ...createdColumns];
      if (createdColumns.length > 0) {
        setColumns(allColumns);
      }

      // Asignar TODAS las historias a sus columnas correspondientes según el usuario
      const updatedStories = [];
      for (const story of stories) {
        if (story.user && story.user.trim() !== '') {
          // Buscar la columna que coincide con el usuario de la historia
          const targetColumn = allColumns.find(
            col => col.name.toLowerCase() === story.user.toLowerCase()
          );

          if (targetColumn) {
            // Actualizar la historia con la columna correspondiente
            const response = await api.updateStory(story._id, {
              column: targetColumn._id
            });
            updatedStories.push(response.data);
          }
        }
      }

      // Actualizar el estado de las historias
      if (updatedStories.length > 0) {
        setStories(prevStories =>
          prevStories.map(story => {
            const updated = updatedStories.find(u => u._id === story._id);
            return updated || story;
          })
        );
      }

      setLoading(false);
      return {
        created: createdColumns.length,
        assigned: updatedStories.length,
        message: `Se crearon ${createdColumns.length} columnas y se asignaron ${updatedStories.length} historias`
      };
    } catch (error) {
      console.error('Error al crear columnas automáticamente:', error);
      setError('Error al crear columnas: ' + (error.response?.data?.message || error.message));
      setLoading(false);
      throw error;
    }
  };

  // Función para manejar la adición de una nueva columna
  const handleAddColumn = async (columnName) => {
    try {
      setLoading(true);
      
      // Si hay un archivo JSON actual, la columna se asocia a ese proyecto
      const newColumn = {
        name: columnName,
        jsonFileName: currentJsonFile || null
      };
      
      const response = await api.createColumn(newColumn);
      
      // Actualizar la lista de columnas
      setColumns(prevColumns => [...prevColumns, response.data]);
      
      return response.data;
    } catch (error) {
      console.error('Error al crear la columna:', error);
      setError('Error al crear la columna: ' + (error.response?.data?.message || error.message));
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Función para actualizar la fecha de fin del Burn Down Chart
  const handleEndDateChange = async (date) => {
    setChartEndDate(date);
    if (currentJsonFile) {
      try {
        await api.updateProjectConfig(currentJsonFile, { chartEndDate: date });
      } catch (err) {
        console.error('Error al guardar la fecha de fin:', err);
      }
    }
  };

  // Cargar datos iniciales
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Cargar lista de archivos JSON
        const jsonFilesResponse = await api.getJsonFiles();
        setJsonFiles(jsonFilesResponse.data);
        
        // Si no hay archivos, terminar
        if (jsonFilesResponse.data.length === 0) {
          setLoading(false);
          return;
        }
        
        // Verificar si hay un archivo guardado en localStorage
        const savedJsonFile = localStorage.getItem('currentJsonFile');
        
        // Intentar cargar el archivo guardado si existe
        if (savedJsonFile && jsonFilesResponse.data.some(file => file.fileName === savedJsonFile)) {
          try {
            await handleLoadJsonFile(savedJsonFile);
            return;
          } catch (err) {
            console.error('Error al cargar el archivo guardado:', err);
            // Continuar con la carga del primer archivo si hay un error
          }
        }
        
        // Si llegamos aquí, cargar el primer archivo disponible
        if (jsonFilesResponse.data.length > 0) {
          const firstJsonFile = jsonFilesResponse.data[0].fileName;
          await handleLoadJsonFile(firstJsonFile);
        }
        
      } catch (err) {
        console.error('Error al cargar datos iniciales:', err);
        setError('Error al cargar los datos: ' + (err.response?.data?.message || err.message));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Limpiar el archivo guardado al desmontar la aplicación
    return () => {
      localStorage.removeItem('currentJsonFile');
    };
  }, []);



  // Handler for importing stories from JSON
  const handleImportJSON = async (data) => {
    try {
      setLoading(true);
      const response = await api.importStories(data);
      
      // Obtener el nombre del archivo JSON
      const jsonFileName = data.jsonFileName;
      
      // Guardar el nombre del archivo actual en el estado
      setCurrentJsonFile(jsonFileName);
      
      // Cargar las columnas específicas de este archivo JSON
      const columnsResponse = await api.getColumns(jsonFileName);
      setColumns(columnsResponse.data);

      // Cargar las historias asociadas a este archivo JSON
      if (response.data.stories) {
        setStories(response.data.stories);
      } else {
        const storiesResponse = await api.getStoriesByJsonFile(jsonFileName);
        setStories(storiesResponse.data.stories);
      }
      
      // Cargar las preguntas asociadas a este archivo JSON
      try {
        const jsonFileResponse = await api.getJsonFile(jsonFileName);
        if (jsonFileResponse.data && jsonFileResponse.data.preguntas_para_aclarar) {
          console.log('Preguntas cargadas desde la base de datos:', jsonFileResponse.data.preguntas_para_aclarar);
          setPreguntas(jsonFileResponse.data.preguntas_para_aclarar);
        } else {
          console.log('No se encontraron preguntas para este archivo en la base de datos');
          setPreguntas([]);
        }
      } catch (preguntasError) {
        console.error('Error al cargar las preguntas:', preguntasError);
        setPreguntas([]);
      }
      
      setLoading(false);
      return response.data.message || `Historias importadas correctamente desde ${jsonFileName}`;
    } catch (err) {
      setError('Error importing JSON: ' + (err.response?.data?.message || err.message));
      setLoading(false);
      throw err;
    }
  };
  
  // Función para calcular el primer viernes después de una fecha
  const getNextFriday = (date) => {
    const result = new Date(date);
    // Si ya es viernes (5), avanzar una semana
    if (date.getDay() === 5) {
      result.setDate(date.getDate() + 7);
      return result;
    }
    // Calcular días hasta el próximo viernes
    result.setDate(date.getDate() + (5 - date.getDay() + 7) % 7);
    return result;
  };

  // Handler for loading stories from an existing JSON file
  const handleLoadJsonFile = async (event) => {
    try {
      // Verificar si el evento es válido
      if (!event || typeof event !== 'object') {
        console.log('Evento no válido:', event);
        return;
      }
      
      // Obtener el nombre del archivo de manera segura
      const fileName = event?.target?.value;
      
      // Verificar si es una notificación de eliminación
      const isDeletionEvent = event?.target?.dataset?.deleted === 'true';
      
      // Si es una notificación de eliminación, limpiar el estado
      if (isDeletionEvent) {
        console.log('Archivo eliminado, limpiando estado');
        setCurrentJsonFile(null);
        setColumns([]);
        setStories([]);
        setPreguntas([]);
        return;
      }
      
      // Si no hay nombre de archivo, no hacer nada
      if (!fileName) {
        console.log('No se proporcionó nombre de archivo');
        return;
      }
      
      setLoading(true);
      
      // Cargar las historias y columnas del archivo seleccionado
      const response = await api.getStoriesByJsonFile(fileName);
      
      // Actualizar las columnas con las específicas de este archivo JSON y las columnas por defecto
      if (response.data.columns) {
        setColumns(response.data.columns);
      } else {
        // Si no se devuelven columnas, cargar las columnas por defecto
        const columnsResponse = await api.getColumns(fileName);
        setColumns(columnsResponse.data);
      }
      
      // Actualizar las historias con las del archivo seleccionado
      setStories(response.data.stories);
      setCurrentJsonFile(fileName);
      
      // Cargar las preguntas asociadas a este archivo JSON
      try {
        const jsonFileResponse = await api.getJsonFile(fileName);
        if (jsonFileResponse.data && jsonFileResponse.data.preguntas_para_aclarar) {
          console.log('Preguntas cargadas al seleccionar archivo:', jsonFileResponse.data.preguntas_para_aclarar);
          setPreguntas(jsonFileResponse.data.preguntas_para_aclarar);
        } else {
          console.log('No se encontraron preguntas para el archivo seleccionado');
          setPreguntas([]);
        }
      } catch (preguntasError) {
        console.error('Error al cargar las preguntas del archivo:', preguntasError);
        setPreguntas([]);
      }
      
      // Cargar la configuración del proyecto (fechas para el Burn Down Chart)
      try {
        const configResponse = await api.getProjectConfig(fileName);
        if (configResponse.data) {
          setChartStartDate(new Date(configResponse.data.chartStartDate || new Date()));
          setChartEndDate(new Date(configResponse.data.chartEndDate || new Date()));
        } else {
          // Si no hay configuración, usar fechas por defecto
          const fileInfo = jsonFiles.find(file => file.fileName === fileName);
          if (fileInfo && fileInfo.uploadDate) {
            const uploadDate = new Date(fileInfo.uploadDate);
            setChartStartDate(uploadDate);
            setChartEndDate(getNextFriday(uploadDate));
          }
        }
      } catch (configError) {
        console.error('Error al cargar la configuración del proyecto:', configError);
        // Si hay error, usar fechas por defecto
        const fileInfo = jsonFiles.find(file => file.fileName === fileName);
        if (fileInfo && fileInfo.uploadDate) {
          const uploadDate = new Date(fileInfo.uploadDate);
          setChartStartDate(uploadDate);
          setChartEndDate(getNextFriday(uploadDate));
        }
      }
      
      setLoading(false);
      return `Cargadas ${response.data.stories.length} historias del archivo ${fileName}`;
    } catch (err) {
      setError('Error loading JSON file: ' + (err.response?.data?.message || err.message));
      throw err;
    }
  };

  // Handler for moving a story between columns
  const handleStoryMove = async (storyId, targetColumnId, newPosition) => {
    try {
      console.log(`Moving story ${storyId} to column ${targetColumnId} at position ${newPosition}`);
      
      // Find the story to move and target column
      const storyToMove = stories.find(s => s._id === storyId);
      const targetColumn = columns.find(col => col._id === targetColumnId);
      
      if (!storyToMove) {
        console.error('Story not found:', storyId);
        return;
      }
      
      // If the story is already in the target column at the same position, do nothing
      if (storyToMove.column === targetColumnId && storyToMove.position === newPosition) {
        console.log('Story is already in the target position');
        return;
      }
      
      // Get the column name for the user field
      const columnName = targetColumn ? targetColumn.name : 'Sin columna';
      
      // Optimistic update to the UI first
      setStories(prevStories => {
        // Create a new array with the updated story
        return prevStories.map(story => {
          if (story._id === storyId) {
            const updatedStory = { 
              ...story, 
              column: targetColumnId, 
              position: newPosition,
              user: columnName, // Update user with column name
              updatedAt: new Date().toISOString() // Force re-render
            };
            console.log('Updating story in UI:', updatedStory);
            return updatedStory;
          }
          return story;
        });
      });
      
      // Update the story on the server
      const updateData = {
        column: targetColumnId,
        position: newPosition,
        user: columnName // Ensure user is updated on the server
      };
      
      console.log('Sending update to server:', { storyId, updateData });
      
      const response = await api.updateStory(storyId, updateData);
      console.log('Server response:', response.data);
      
      // If the server returns different data, update the UI to match
      if (response.data) {
        setStories(prevStories => 
          prevStories.map(story => 
            story._id === response.data._id 
              ? { 
                  ...story, 
                  ...response.data,
                  // Ensure user is preserved from our optimistic update
                  // in case server doesn't return it
                  user: response.data.user || story.user 
                }
              : story
          )
        );
      }
    } catch (err) {
      console.error('Error moving story:', err);
      
      // Revert the optimistic update in case of error
      setStories(prevStories => {
        const originalStory = stories.find(s => s._id === storyId);
        if (!originalStory) return prevStories;
        
        return prevStories.map(story => 
          story._id === storyId ? originalStory : story
        );
      });
      
      setError('Error moving story: ' + (err.response?.data?.message || err.message));
    }
  };

  const openStoryModal = (story = null, columnId) => {
    setCurrentStory(story);
    setTargetColumnId(columnId);
    setModalOpen(true);
  };

  // Handler para eliminar un archivo JSON
  const handleDeleteJsonFile = async (fileName) => {
    try {
      setLoading(true);
      
      // Llamar a la API para eliminar el archivo
      await api.deleteJsonFile(fileName);
      
      // Actualizar la lista de archivos disponibles
      const jsonFilesResponse = await api.getJsonFiles();
      setJsonFiles(jsonFilesResponse.data);
      
      // Si el archivo eliminado es el que está actualmente cargado, limpiar el estado
      if (currentJsonFile === fileName) {
        setCurrentJsonFile(null);
        setColumns([]);
        setStories([]);
        setPreguntas([]);
      }
      
      setLoading(false);
      return { 
        success: true, 
        message: `Archivo "${fileName}" eliminado correctamente` 
      };
    } catch (err) {
      console.error('Error al eliminar el archivo:', err);
      setLoading(false);
      return { 
        success: false, 
        message: 'Error al eliminar el archivo: ' + (err.response?.data?.message || err.message) 
      };
    }
  };

  // Handler para eliminar una historia
  const handleDeleteStory = async (storyId) => {
    try {
      console.log(`Eliminando historia con ID: ${storyId}`);
      
      // Llamar a la API para eliminar la historia
      await api.deleteStory(storyId);
      
      // Actualizar el estado local eliminando la historia
      setStories(stories.filter(story => story._id !== storyId));
      
      console.log(`Historia ${storyId} eliminada correctamente`);
      return true;
    } catch (err) {
      console.error('Error al eliminar la historia:', err);
      setError('Error al eliminar la historia: ' + (err.response?.data?.message || err.message));
      return false;
    }
  };

  // Handler for saving a story
  const handleSaveStory = async (storyData) => {
    try {
      console.log('=== INICIO handleSaveStory ===');
      console.log('Datos de la historia recibidos:', JSON.stringify(storyData, null, 2));
      console.log('Historia actual:', JSON.stringify(currentStory, null, 2));
      console.log('Archivo JSON actual:', currentJsonFile);
      
      // Procesar los criterios
      if (storyData.criteria && storyData.criteria.length > 0) {
        if (currentStory && currentStory.criteria) {
          // Para historias existentes, mapear los criterios para mantener los IDs existentes
          const updatedCriteria = storyData.criteria.map(newCriterion => {
            // Buscar si existe un criterio con el mismo texto en la historia actual
            const existingCriterion = currentStory.criteria.find(
              c => c.text === newCriterion.text
            );
            
            if (existingCriterion) {
              // Mantener el criterio existente con su _id y estado actual
              return {
                _id: existingCriterion._id,
                text: newCriterion.text,
                checked: existingCriterion.checked,
                isManuallyCreated: existingCriterion.isManuallyCreated || false
              };
            } else {
              // Es un nuevo criterio
              return {
                text: newCriterion.text,
                checked: newCriterion.checked || false,
                isManuallyCreated: true  // Marcar como creado manualmente
              };
            }
          });
          
          storyData.criteria = updatedCriteria;
        } else {
          // Para historias nuevas, marcar todos los criterios como creados manualmente
          storyData.criteria = storyData.criteria.map(criterion => ({
            text: criterion.text,
            checked: criterion.checked || false,
            isManuallyCreated: true
          }));
        }
      }
      
      if (currentStory) {
        // Update existing story - Asegurarse de incluir id_historia
        const updateData = { ...storyData };
        
        console.log('=== ACTUALIZANDO HISTORIA EXISTENTE ===');
        console.log('Datos antes de actualizar:', JSON.stringify(updateData, null, 2));
        
        // Asegurarse de que los campos importantes no se pierdan
        if (!updateData.id_historia && currentStory.id_historia) {
          updateData.id_historia = currentStory.id_historia;
          console.log('Manteniendo id_historia existente:', updateData.id_historia);
        }
        
        if (!updateData.user && currentStory.user) {
          updateData.user = currentStory.user;
          console.log('Manteniendo usuario existente:', updateData.user);
        }
        
        if (!updateData.jsonFileName && currentStory.jsonFileName) {
          updateData.jsonFileName = currentStory.jsonFileName;
          console.log('Manteniendo jsonFileName existente:', updateData.jsonFileName);
        }
        
        console.log('Datos que se enviarán al servidor:', JSON.stringify(updateData, null, 2));
        
        const response = await api.updateStory(currentStory._id, updateData);
        console.log('Respuesta del servidor:', JSON.stringify(response.data, null, 2));
        
        setStories(stories.map(s => s._id === currentStory._id ? response.data : s));
      } else {
        console.log('=== CREANDO NUEVA HISTORIA ===');
        console.log('Datos de la historia recibidos:', JSON.stringify(storyData, null, 2));
        
        // Obtener el nombre de la columna de destino
        const targetColumn = columns.find(col => col._id === targetColumnId);
        const columnName = targetColumn ? targetColumn.name : 'Sin columna';
        console.log('Columna de destino:', columnName);
        
        // Usar el ID de historia proporcionado o generar uno nuevo
        const storyId = storyData.id_historia || 
          `HU-${currentJsonFile ? currentJsonFile.substring(0, 5).toUpperCase() : 'CLI01'}-${String(stories.length + 1).padStart(3, '0')}`;
        
        console.log('ID de historia generado:', storyId);
        
        // Crear objeto con los datos de la historia
        const newStoryData = {
          ...storyData,
          column: targetColumnId,
          user: columnName,  // Guardar el nombre de la columna como usuario
        };
        
        // Solo agregar id_historia si no está vacío
        if (storyId) {
          newStoryData.id_historia = storyId;
          console.log('ID de historia asignado:', newStoryData.id_historia);
        }
        
        // Solo agregar jsonFileName si existe
        if (currentJsonFile) {
          newStoryData.jsonFileName = currentJsonFile;
          console.log('Archivo JSON asignado:', newStoryData.jsonFileName);
        }
        
        console.log('Datos completos que se enviarán al servidor:', JSON.stringify(newStoryData, null, 2));
        
        const response = await api.createStory(newStoryData);
        console.log('Respuesta del servidor:', JSON.stringify(response.data, null, 2));
        
        // Verificar que los campos se guardaron correctamente
        if (!response.data.id_historia) {
          console.error('ERROR: El servidor no devolvió el id_historia');
        }
        if (!response.data.user) {
          console.error('ERROR: El servidor no devolvió el usuario');
        }
        if (!response.data.jsonFileName) {
          console.error('ERROR: El servidor no devolvió el jsonFileName');
        }
        
        setStories([...stories, response.data]);
      }
      setModalOpen(false);
    } catch (err) {
      setError('Error guardando historia: ' + (err.response?.data?.message || err.message));
      console.error('Error al guardar la historia:', err);
    }
  };

  // Handler for reordering criteria
  const handleCriteriaReorder = async (storyId, newCriteria) => {
    try {
      const story = stories.find(s => s._id === storyId);
      if (!story) return;
      
      // Actualizar la historia con los criterios reordenados
      await api.updateStory(storyId, { criteria: newCriteria });
      
      // Actualizar el estado local
      setStories(stories.map(s => {
        if (s._id === storyId) {
          return { ...s, criteria: newCriteria };
        }
        return s;
      }));
    } catch (err) {
      setError('Error reordenando criterios: ' + (err.response?.data?.message || err.message));
    }
  };

  // Handler for deleting a criterion
  const handleCriterionDelete = async (storyId, criterionIndex) => {
    try {
      const story = stories.find(s => s._id === storyId);
      if (!story) return;

      // Crear una copia de los criterios sin el que se va a eliminar
      const updatedCriteria = [...story.criteria];
      updatedCriteria.splice(criterionIndex, 1);
      
      // Actualizar la historia en el servidor
      await api.updateStory(storyId, { criteria: updatedCriteria });
      
      // Actualizar el estado local
      setStories(stories.map(s => {
        if (s._id === storyId) {
          return { ...s, criteria: updatedCriteria };
        }
        return s;
      }));
    } catch (err) {
      setError('Error eliminando criterio: ' + (err.response?.data?.message || err.message));
    }
  };

  // Handler for updating a criterion's checked status
  const handleCriterionCheck = async (storyId, criterionIndex, checked) => {
    try {
      const story = stories.find(s => s._id === storyId);
      if (!story) return;

      // Actualizar el criterio seleccionado
      const updatedCriteria = [...story.criteria];
      updatedCriteria[criterionIndex].checked = checked;
      
      // Actualizar la fecha de completado del criterio
      if (checked) {
        updatedCriteria[criterionIndex].completedAt = new Date();
      } else {
        updatedCriteria[criterionIndex].completedAt = null;
      }
      
      // Ordenar los criterios: primero los no completados, luego los completados
      const sortedCriteria = [...updatedCriteria].sort((a, b) => {
        if (a.checked === b.checked) return 0;
        return a.checked ? 1 : -1; // Los no marcados primero
      });
      
      // Verificar si todos los criterios están completados
      const allCriteriaCompleted = sortedCriteria.every(criterion => criterion.checked);
      
      // Datos a actualizar en la historia
      const updateData = { criteria: sortedCriteria };
      
      // Si todos los criterios están completados y la historia no tiene fecha de finalización,
      // establecer la fecha de finalización
      if (allCriteriaCompleted && !story.completedAt && sortedCriteria.length > 0) {
        updateData.completedAt = new Date();
      } 
      // Si algún criterio no está completado, eliminar la fecha de finalización
      else if (!allCriteriaCompleted && story.completedAt) {
        updateData.completedAt = null;
      }

      // Enviar al servidor los datos actualizados
      await api.updateStory(storyId, updateData);

      // Actualizar el estado local
      setStories(stories.map(s => {
        if (s._id === storyId) {
          return { 
            ...s, 
            criteria: sortedCriteria,
            completedAt: updateData.completedAt !== undefined ? updateData.completedAt : s.completedAt
          };
        }
        return s;
      }));
    } catch (err) {
      setError('Error updating criterion: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="bg-neutral-100 text-neutral-900 min-h-screen">
      <div className="max-w-[1800px] mx-auto px-4 md:px-8 py-6">
        <Header />

        {error && (
          <div className="mb-6 p-4 bg-danger-50 text-danger-700 rounded-apple-lg border border-danger-100 flex items-center justify-between animate-fade-in">
            <span>{error}</span>
            <button
              className="ml-4 p-1 hover:bg-danger-100 rounded-full transition-colors"
              onClick={() => setError('')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <UserStoryManagement 
          currentJsonFile={currentJsonFile} 
          onFileUpload={handleImportJSON} 
          onFileSelect={handleLoadJsonFile}
          onFileDelete={handleDeleteJsonFile}
          jsonFiles={jsonFiles}
          startDate={chartStartDate}
          endDate={chartEndDate}
          onStartDateChange={handleStartDateChange}
          onEndDateChange={handleEndDateChange}
        />
        
        {loading ? (
          <p className="mt-8 text-center text-slate-500">Cargando...</p>
        ) : (
          <TabSystem
            activeTab={activeTab}
            onTabChange={setActiveTab}
            tabs={{
              'Kanban': (
                <KanbanTab
                  columns={columns}
                  stories={stories}
                  onAddColumn={handleAddColumn}
                  onAutoAddColumns={handleAutoAddColumns}
                  onStoryMove={handleStoryMove}
                  onOpenStoryModal={openStoryModal}
                  onCriterionCheck={handleCriterionCheck}
                  onCriterionDelete={handleCriterionDelete}
                  onCriteriaReorder={handleCriteriaReorder}
                  onDeleteStory={handleDeleteStory}
                  currentJsonFile={currentJsonFile}
                />
              ),
              'Dashboard': (
                <Dashboard
                  stories={stories}
                  columns={columns}
                  currentJsonFile={currentJsonFile}
                  startDate={chartStartDate}
                  endDate={chartEndDate}
                />
              ),
              'Alcance': (
                <ScopeView
                  columns={columns}
                  stories={stories}
                />
              ),
              'Plan de pruebas': (
                <TestPlanView
                  columns={columns}
                  stories={stories}
                />
              ),
              'Transcripción': (
                <VideoTranscription />
              ),
              'Preguntas': (
                <PreguntasTab preguntas={preguntas} currentJsonFile={currentJsonFile} />
              )
            }}
          />
        )}

        {/* Story Modal */}
        <StoryModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleSaveStory}
          story={currentStory}
          currentJsonFile={currentJsonFile}
        />
      </div>
    </div>
  );
};

export default App;