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
    console.log('App - Estado inicial:', { columns, stories, currentJsonFile, preguntas });
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Cargar la lista de archivos JSON disponibles
        const jsonFilesResponse = await api.getJsonFiles();
        setJsonFiles(jsonFilesResponse.data);
        
        // Si hay un archivo JSON seleccionado, cargar sus columnas y historias
        if (currentJsonFile) {
          const columnsResponse = await api.getColumns(currentJsonFile);
          console.log('App - Columnas cargadas:', columnsResponse.data);
          setColumns(columnsResponse.data);
          
          const storiesResponse = await api.getStories(currentJsonFile);
          console.log('App - Historias cargadas:', storiesResponse.data);
          setStories(storiesResponse.data);
        } else {
          // Si no hay un archivo JSON seleccionado pero hay archivos disponibles, seleccionar el primero
          if (jsonFilesResponse.data && jsonFilesResponse.data.length > 0) {
            const firstJsonFile = jsonFilesResponse.data[0].fileName;
            console.log('Seleccionando el primer archivo JSON disponible:', firstJsonFile);
            await handleLoadJsonFile(firstJsonFile);
            return; // Salir de la función ya que handleLoadJsonFile ya carga las columnas y historias
          } else {
            // Cargar solo las columnas por defecto (sin jsonFileName)
            const columnsResponse = await api.getColumns();
            setColumns(columnsResponse.data);

            // Cargar solo las historias que no tienen jsonFileName o que están en columnas por defecto
            const storiesResponse = await api.getStories();
            setStories(storiesResponse.data);
          }
        }
        
        setLoading(false);
        console.log('App - Datos cargados:', { columns, stories, currentJsonFile });
      } catch (err) {
        setError('Error loading data: ' + err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, [currentJsonFile]);



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
  const handleLoadJsonFile = async (fileName) => {
    try {
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
      
      // Guardar el nombre del archivo actual en el estado
      setCurrentJsonFile(fileName);
      
      // Cargar la configuración del proyecto (fechas para el Burn Down Chart)
      try {
        const configResponse = await api.getProjectConfig(fileName);
        if (configResponse.data) {
          setChartStartDate(new Date(configResponse.data.chartStartDate));
          setChartEndDate(new Date(configResponse.data.chartEndDate));
        } else {
          // Si no hay configuración, usar fechas por defecto
          const fileInfo = jsonFiles.find(file => file.fileName === fileName);
          if (fileInfo && fileInfo.uploadDate) {
            const uploadDate = new Date(fileInfo.uploadDate);
            setChartStartDate(uploadDate);
            setChartEndDate(getNextFriday(uploadDate));
          }
        }
      } catch (configErr) {
        console.error('Error al cargar la configuración del proyecto:', configErr);
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
      setLoading(false);
      throw err;
    }
  };

  // Handler para mover historias entre columnas (para SimpleKanban)
  const handleStoryMove = async (storyId, targetColumnId, newPosition) => {
    try {
      console.log(`Moving story ${storyId} to column ${targetColumnId} at position ${newPosition}`);
      
      // Update the story's column and position
      const updatedStory = {
        column: targetColumnId,
        position: newPosition
      };

      const response = await api.updateStory(storyId, updatedStory);
      console.log('Server response:', response.data);

      // Optimistic update to the UI
      const updatedStories = stories.map(story => {
        if (story._id.toString() === storyId) {
          return { ...story, column: targetColumnId, position: newPosition };
        }
        return story;
      });

      setStories(updatedStories);
    } catch (err) {
      setError('Error moving story: ' + (err.response?.data?.message || err.message));
    }
  };

  // Handler for opening the story modal
  const openStoryModal = (story = null, columnId) => {
    setCurrentStory(story);
    setTargetColumnId(columnId);
    setModalOpen(true);
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
    <div className="bg-slate-100 text-slate-800 p-4 md:p-8 min-h-screen">
      <div className="container mx-auto">
        <Header />

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
            <button 
              className="ml-2 font-bold"
              onClick={() => setError('')}
            >
              ×
            </button>
          </div>
        )}

        <UserStoryManagement 
          currentJsonFile={currentJsonFile} 
          onFileUpload={handleImportJSON} 
          onFileSelect={handleLoadJsonFile} 
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
                  onStoryMove={handleStoryMove}
                  onOpenStoryModal={openStoryModal}
                  onCriterionCheck={handleCriterionCheck}
                  onCriterionDelete={handleCriterionDelete}
                  onCriteriaReorder={handleCriteriaReorder}
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