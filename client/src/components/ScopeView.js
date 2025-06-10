import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { saveAs } from 'file-saver';

/**
 * Componente para mostrar el alcance del proyecto en un formato amigable
 * sin utilizar terminología específica de metodologías ágiles
 */
const ScopeView = ({ columns: propColumns, stories: propStories }) => {
  const [columns, setColumns] = useState(propColumns);
  const [stories, setStories] = useState(propStories);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  
  // Función para recargar los datos
  // Función para exportar criterios según el estado de finalización
  const exportCriteria = useCallback((type = 'all') => {
    setExporting(true);
    try {
      // Obtener columnas ordenadas (excluyendo la primera columna - Backlog)
      const sortedCols = [...(Array.isArray(columns) ? columns : [])]
        .sort((a, b) => (a.position || 0) - (b.position || 0))
        .filter((_, index) => index > 0);
      
      // Crear un mapa de historias por columna
      const storiesByCol = {};
      const storiesList = Array.isArray(stories) ? stories : [];
      
      // Inicializar el mapa con arrays vacíos para cada columna
      sortedCols.forEach(col => {
        if (col._id) storiesByCol[col._id] = [];
      });
      
      // Asignar historias a sus columnas
      storiesList.forEach(story => {
        if (!story.column) return;
        const colId = typeof story.column === 'object' ? story.column._id : story.column;
        if (storiesByCol[colId]) storiesByCol[colId].push(story);
      });
      
      // Ordenar historias por posición en cada columna
      Object.values(storiesByCol).forEach(colStories => {
        colStories.sort((a, b) => (a.position || 0) - (b.position || 0));
      });
      
      // Construir el contenido CSV
      let csvLines = [];
      let hasData = false;
      
      // Recorrer cada columna ordenada
      for (const column of sortedCols) {
        if (!column._id) continue;
        
        const columnStories = storiesByCol[column._id] || [];
        if (columnStories.length === 0) continue;
        
        // Agregar encabezado de columna
        csvLines.push(`"${column.name}",,,,,`);
        
        // Recorrer historias de la columna
        for (const story of columnStories) {
          if (!story.criteria || !Array.isArray(story.criteria)) continue;
          
          // Filtrar criterios según el tipo
          const filteredCriteria = story.criteria.filter(criterion => {
            if (type === 'all') return true;
            return type === 'completed' ? criterion.checked : !criterion.checked;
          });
          
          if (filteredCriteria.length === 0) continue;
          
          hasData = true;
          
          // Agregar historia
          csvLines.push(`"${(story.title || '').replace(/"/g, '""')}","${(story.description || '').replace(/"/g, '""')}",,,`);
          
          // Agregar cada criterio
          for (const criterion of filteredCriteria) {
            const status = criterion.checked ? 'Completado' : 'Pendiente';
            const date = criterion.completedAt ? new Date(criterion.completedAt).toLocaleDateString() : 'N/A';
            csvLines.push(`,,"${(criterion.text || '').replace(/"/g, '""')}","${status}","${date}"`);
          }
          
          // Espacio después de cada historia
          csvLines.push(',,,,');
        }
        
        // Espacio después de cada columna
        csvLines.push('');
      }
      
      if (!hasData) {
        setError(`No hay criterios ${type === 'completed' ? 'completados' : type === 'pending' ? 'pendientes' : ''} para exportar.`);
        return;
      }
      
      // Agregar encabezados al principio
      const headers = ['Historia', 'Descripción', 'Criterio', 'Estado', 'Fecha de Completado'];
      csvLines.unshift(headers.join(','));
      
      // Unir todas las líneas del CSV
      const csvContent = csvLines.join('\n');
      
      // Crear y descargar el archivo
      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const fileName = `criterios_${type}_${new Date().toISOString().split('T')[0]}.csv`;
      saveAs(blob, fileName);
      
    } catch (err) {
      console.error('Error al exportar criterios:', err);
      setError('Error al exportar los criterios. Por favor, inténtalo de nuevo.');
    } finally {
      setExporting(false);
    }
  }, [stories, columns]);

  const reloadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Obtener las columnas y las historias directamente de la API
      const columnsResponse = await api.getColumns();
      const storiesResponse = await api.getStories();
      
      console.log('ScopeView - Datos recargados:', {
        columns: columnsResponse.data,
        stories: storiesResponse.data
      });
      
      // Verificar que hay datos
      if (!columnsResponse.data || columnsResponse.data.length === 0) {
        setError('No se encontraron columnas. Por favor, crea algunas columnas en el tablero Kanban.');
      }
      
      if (!storiesResponse.data || storiesResponse.data.length === 0) {
        setError('No se encontraron historias. Por favor, crea algunas historias en el tablero Kanban.');
      }
      
      // Verificar la estructura de los datos
      if (storiesResponse.data && storiesResponse.data.length > 0) {
        const sampleStory = storiesResponse.data[0];
        console.log('Estructura de una historia de ejemplo:', {
          id: sampleStory._id,
          title: sampleStory.title,
          column: sampleStory.column,
          columnType: typeof sampleStory.column
        });
      }
      
      setColumns(columnsResponse.data);
      setStories(storiesResponse.data);
    } catch (err) {
      console.error('Error al recargar los datos:', err);
      setError('Error al recargar los datos. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };
  
  // Usar los datos de las props cuando cambien
  useEffect(() => {
    setColumns(propColumns);
    setStories(propStories);
  }, [propColumns, propStories]);
  console.log('ScopeView - Columnas recibidas:', columns);
  console.log('ScopeView - Historias recibidas:', stories);
  
  // Verificar si hay datos
  if (!columns || columns.length === 0) {
    console.warn('No hay columnas disponibles');
  }
  
  if (!stories || stories.length === 0) {
    console.warn('No hay historias disponibles');
  }
  
  // Asegurarse de que columns es un array
  const columnsArray = Array.isArray(columns) ? columns : [];
  console.log('ScopeView - Array de columnas:', columnsArray);
  
  // Asegurarse de que stories es un array
  const storiesArray = Array.isArray(stories) ? stories : [];
  console.log('ScopeView - Array de historias:', storiesArray);
  
  // Ordenar las columnas según su posición y excluir la primera columna (Backlog)
  const sortedColumns = [...columnsArray]
    .sort((a, b) => (a.position || 0) - (b.position || 0))
    .filter((column, index) => index > 0); // Excluir la primera columna (Backlog)
  console.log('ScopeView - Columnas filtradas (sin Backlog):', sortedColumns);
  
  // Enfoque alternativo: Crear un mapa de historias por columna
  const storiesByColumnMap = {};
  
  // Inicializar el mapa con arrays vacíos para cada columna
  sortedColumns.forEach(column => {
    if (column._id) {
      storiesByColumnMap[column._id] = [];
    }
  });
  
  // Asignar cada historia a su columna correspondiente
  storiesArray.forEach(story => {
    if (!story.column) {
      console.warn('Historia sin columna asignada:', story);
      return;
    }
    
    // Obtener el ID de la columna (puede ser un string o un objeto)
    const columnId = typeof story.column === 'object' ? story.column._id : story.column;
    
    // Verificar si esta columna está en nuestro mapa (es decir, no es la primera columna/backlog)
    if (storiesByColumnMap[columnId]) {
      storiesByColumnMap[columnId].push(story);
      console.log(`Historia '${story.title}' asignada a columna ID: ${columnId}`);
    }
  });
  
  // Ordenar las historias por posición en cada columna
  Object.keys(storiesByColumnMap).forEach(columnId => {
    storiesByColumnMap[columnId].sort((a, b) => (a.position || 0) - (b.position || 0));
  });
  
  // Mostrar resumen de historias por columna
  sortedColumns.forEach(column => {
    if (column._id) {
      const stories = storiesByColumnMap[column._id] || [];
      console.log(`Columna '${column.name}' (ID: ${column._id}): ${stories.length} historias`);
    }
  });
  
  // Usar el mapa como nuestro storiesByColumn
  const storiesByColumn = storiesByColumnMap;

  return (
    <div className="scope-view p-4">
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-slate-700">Alcance del Proyecto</h2>
        <div className="space-x-2">
          <button
            onClick={() => exportCriteria('all')}
            disabled={exporting}
            className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? 'Exportando...' : 'Exportar Todo'}
          </button>
          <button
            onClick={() => exportCriteria('completed')}
            disabled={exporting}
            className="px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? 'Exportando...' : 'Exportar Finalizados'}
          </button>
          <button
            onClick={() => exportCriteria('pending')}
            disabled={exporting}
            className="px-3 py-1.5 text-xs font-medium bg-yellow-50 text-yellow-700 rounded hover:bg-yellow-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? 'Exportando...' : 'Exportar Pendientes'}
          </button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      
      {/* Mostrar mensaje si no hay columnas */}
      {sortedColumns.length === 0 && (
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6 text-center">
          <p className="text-slate-600">No hay columnas para mostrar en el alcance del proyecto.</p>
        </div>
      )}
      
      {/* Mostrar todas las columnas */}
      {sortedColumns.map(column => {
        // Verificar que la columna tenga un ID válido
        if (!column._id) {
          console.error('Columna sin ID válido:', column);
          return null;
        }
        
        const columnStories = storiesByColumn[column._id] || [];
        console.log(`Renderizando columna ${column.name} con ${columnStories.length} historias:`, columnStories);
        
        // Mostrar la columna incluso si no tiene historias
        return (
          <div key={column._id} className="mb-8">
            <h3 className="text-lg font-bold text-slate-800 mb-3 border-b pb-2">
              {column.name}
            </h3>
            
            {columnStories.length === 0 ? (
              <p className="text-sm text-slate-500 italic">No hay elementos en esta columna.</p>
            ) : columnStories.map(story => {
              console.log(`Renderizando historia: ${story.title}`, story);
              return (
                <div key={story._id} className="mb-6 bg-white p-4 rounded-lg shadow-sm">
                  <h4 className="text-md font-semibold text-slate-700 mb-2">
                    {story.title}
                  </h4>
                  
                  {story.description && (
                    <p className="text-sm text-slate-600 mb-3">
                      {story.description}
                    </p>
                  )}
                  
                  {story.criteria && story.criteria.length > 0 && (
                    <div className="mt-3">
                      <h5 className="text-sm font-medium text-slate-700 mb-2">Criterios de Aceptación:</h5>
                      <ul className="text-xs text-slate-600 list-disc pl-5 space-y-1">
                        {story.criteria.map((criterion, idx) => (
                          <li key={idx}>
                            {criterion.text}
                            {criterion.checked && criterion.completedAt && (
                              <span className="ml-2 text-xs text-slate-500">
                                (Completado: {new Date(criterion.completedAt).toLocaleDateString()})
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {story.priority && (
                    <div className="mt-3 text-xs text-slate-500">
                      <span className="font-medium">Prioridad:</span> {story.priority}
                    </div>
                  )}
                  
                  {story.storyPoints && (
                    <div className="mt-1 text-xs text-slate-500">
                      <span className="font-medium">Esfuerzo estimado:</span> {story.storyPoints} puntos
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
      
      {/* Mostrar ejemplo si no hay columnas o si todas las columnas están vacías */}
      {(sortedColumns.length === 0 || sortedColumns.every(column => (storiesByColumn[column._id] || []).length === 0)) && (
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <h3 className="text-lg font-bold text-slate-800 mb-3 border-b pb-2">
            Ejemplo: Desarrollo
          </h3>
          <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-slate-100">
            <h4 className="text-md font-semibold text-slate-700 mb-2">
              Implementar funcionalidad de inicio de sesión
            </h4>
            <p className="text-sm text-slate-600 mb-3">
              Los usuarios deben poder iniciar sesión en la aplicación utilizando su correo electrónico y contraseña.
            </p>
            <div className="mt-3">
              <h5 className="text-sm font-medium text-slate-700 mb-2">Criterios de Aceptación:</h5>
              <ul className="text-xs text-slate-600 list-disc pl-5 space-y-1">
                <li>El formulario debe validar el formato del correo electrónico</li>
                <li>La contraseña debe tener al menos 8 caracteres</li>
                <li>Debe mostrarse un mensaje de error si las credenciales son incorrectas</li>
              </ul>
            </div>
          </div>
          <p className="text-xs text-slate-500 italic">Este es un ejemplo de cómo se verá el contenido cuando agregues columnas e historias a tu proyecto.</p>
        </div>
      )}
      
      {sortedColumns.length > 0 && sortedColumns.every(column => (storiesByColumn[column._id] || []).length === 0) && (
        <div className="text-center py-8 text-slate-500">
          No hay elementos para mostrar en el alcance del proyecto.
        </div>
      )}
    </div>
  );
};

export default ScopeView;
