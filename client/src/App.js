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

  // Handler for adding a new column
  const handleAddColumn = async (name) => {
    try {
      setLoading(true);
      
      // Si hay un archivo JSON seleccionado, asociar la columna a ese archivo
      const columnData = { name };
      
      if (currentJsonFile) {
        columnData.jsonFileName = currentJsonFile;
        columnData.isDefault = false;
      } else {
        // Si no hay archivo JSON seleccionado, crear una columna por defecto
        columnData.isDefault = true;
      }
      
      const response = await api.createColumn(columnData);
      setColumns([...columns, response.data]);
      setLoading(false);
    } catch (err) {
      setError('Error adding column: ' + (err.response?.data?.message || err.message));
      setLoading(false);
    }
  };

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
      // Si hay criterios nuevos, marcarlos como creados manualmente
      if (storyData.criteria && storyData.criteria.length > 0) {
        // Si es una historia existente, solo marcar los criterios nuevos
        if (currentStory && currentStory.criteria) {
          const existingCriteriaTexts = currentStory.criteria.map(c => c.text);
          storyData.criteria = storyData.criteria.map(criterion => {
            // Si el criterio no existía antes, marcarlo como creado manualmente
            if (!existingCriteriaTexts.includes(criterion.text)) {
              return { ...criterion, isManuallyCreated: true };
            }
            return criterion;
          });
        } else {
          // Si es una historia nueva, marcar todos los criterios como creados manualmente
          storyData.criteria = storyData.criteria.map(criterion => ({
            ...criterion,
            isManuallyCreated: true
          }));
        }
      }
      
      if (currentStory) {
        // Update existing story
        const response = await api.updateStory(currentStory._id, storyData);
        setStories(stories.map(s => s._id === currentStory._id ? response.data : s));
      } else {
        // Create new story
        const response = await api.createStory({
          ...storyData,
          column: targetColumnId
        });
        setStories([...stories, response.data]);
      }
      setModalOpen(false);
    } catch (err) {
      setError('Error saving story: ' + (err.response?.data?.message || err.message));
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
      </div>

      <StoryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveStory}
        story={currentStory}
      />
    </div>
  );
}

export default App;