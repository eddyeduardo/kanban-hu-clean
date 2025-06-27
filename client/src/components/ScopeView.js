import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FiDownload, FiRefreshCw, FiFileText } from 'react-icons/fi';
import { FaFileCsv, FaFileExcel, FaFilePdf } from 'react-icons/fa';

/**
 * Componente para mostrar el alcance del proyecto en un formato de tabla
 * con opciones de exportación a Excel y CSV
 */
const ScopeView = ({ columns: propColumns = [], stories: propStories = [] }) => {
  const [columns, setColumns] = useState(propColumns);
  const [stories, setStories] = useState(propStories);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  
  // Variables para el resumen
  const [totalStories, setTotalStories] = useState(0);
  const [completedStories, setCompletedStories] = useState(0);
  const [completionPercentage, setCompletionPercentage] = useState(0);

  // Ordenar columnas por posición y excluir la primera columna (Backlog)
  const sortedColumns = React.useMemo(() => {
    return [...columns]
      .sort((a, b) => (a.position || 0) - (b.position || 0))
      .filter((_, index) => index > 0);
  }, [columns]);

  // Agrupar historias por columna
  const storiesByColumn = React.useMemo(() => {
    const result = {};
    
    // Inicializar con arrays vacíos para cada columna
    sortedColumns.forEach(column => {
      if (column._id) result[column._id] = [];
    });
    
    // Asignar historias a sus columnas
    stories.forEach(story => {
      if (!story.column) return;
      const columnId = typeof story.column === 'object' ? story.column._id : story.column;
      if (result[columnId]) {
        result[columnId].push(story);
      }
    });
    
    // Ordenar historias por posición en cada columna
    Object.values(result).forEach(columnStories => {
      columnStories.sort((a, b) => (a.position || 0) - (b.position || 0));
    });
    
    return result;
  }, [stories, sortedColumns]);

  // Función para exportar a Excel
  const exportToExcel = useCallback(() => {
    try {
      setExporting(true);
      
      // Preparar datos para la hoja de cálculo
      const data = [
        ['Columna', 'ID Historia', 'Título', 'Descripción', 'Criterios', 'Estado', 'Fecha de Finalización']
      ];
      
      // Recorrer cada columna
      Object.entries(storiesByColumn).forEach(([columnId, columnStories]) => {
        const column = sortedColumns.find(c => c._id === columnId);
        if (!column) return;
        
        columnStories.forEach(story => {
          const totalCriteria = story.criteria?.length || 0;
          const completedCriteria = story.criteria?.filter(c => c.checked).length || 0;
          const progress = totalCriteria > 0 ? Math.round((completedCriteria / totalCriteria) * 100) : 0;
          const completionDate = story.completedAt ? new Date(story.completedAt).toLocaleDateString() : '';
          
          data.push([
            column.name,
            story.id_historia || 'N/A',
            story.title || 'Sin título',
            story.description || '',
            `${completedCriteria}/${totalCriteria} (${progress}%)`,
            story.completedAt ? 'Completada' : 'En progreso',
            completionDate
          ]);
        });
      });
      
      // Crear libro de trabajo y hoja de cálculo
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(data);
      
      // Aplicar estilos a la cabecera
      const headerStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '4F46E5' } }, // Color azul
        alignment: { horizontal: 'center' },
        border: {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        }
      };
      
      // Aplicar estilos a las celdas
      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const headerCell = XLSX.utils.encode_cell({ r: 0, c: C });
        if (!ws[headerCell]) continue;
        ws[headerCell].s = headerStyle;
      }
      
      // Ajustar el ancho de las columnas
      const wscols = [
        { wch: 20 }, // Columna
        { wch: 15 }, // ID Historia
        { wch: 40 }, // Título
        { wch: 60 }, // Descripción
        { wch: 20 }, // Criterios
        { wch: 15 }, // Estado
        { wch: 20 }  // Fecha de Finalización
      ];
      ws['!cols'] = wscols;
      
      // Agregar hoja al libro
      XLSX.utils.book_append_sheet(wb, ws, 'Alcance');
      
      // Generar archivo y descargar
      const fileName = `alcance_proyecto_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName, { bookType: 'xlsx', bookSST: false, type: 'binary' });
      
    } catch (err) {
      console.error('Error al exportar a Excel:', err);
      setError('Error al exportar a Excel. Por favor, inténtalo de nuevo.');
    } finally {
      setExporting(false);
    }
  }, [storiesByColumn, sortedColumns]);
  
  // Función para exportar a PDF
  const exportToPDF = useCallback(() => {
    try {
      console.log('Iniciando exportación a PDF...');
      console.log('Total de historias:', stories.length);
      
      // Calcular valores actuales
      const currentTotal = stories.length;
      const currentCompleted = stories.filter(s => s.completedAt).length;
      const currentPercentage = currentTotal > 0 
        ? Math.round((currentCompleted / currentTotal) * 100) 
        : 0;
        
      console.log('Datos calculados:', { currentTotal, currentCompleted, currentPercentage });
      setExporting(true);
      
      // Crear un nuevo documento PDF
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      // Título del documento
      const title = 'Alcance del Proyecto';
      const date = new Date().toLocaleDateString();
      
      // Configuración de la tabla
      const columns = [
        { header: 'Columna', dataKey: 'column' },
        { header: 'ID Historia', dataKey: 'id' },
        { header: 'Título', dataKey: 'title' },
        { header: 'Descripción', dataKey: 'description' },
        { header: 'Criterios', dataKey: 'criteria' },
        { header: 'Estado', dataKey: 'status' },
        { header: 'Fecha Finalización', dataKey: 'completionDate' }
      ];
      
      // Preparar datos para la tabla
      const tableData = [];
      
      // Recorrer cada columna
      Object.entries(storiesByColumn).forEach(([columnId, columnStories]) => {
        const column = sortedColumns.find(c => c._id === columnId);
        if (!column) return;
        
        columnStories.forEach(story => {
          const totalCriteria = story.criteria?.length || 0;
          const completedCriteria = story.criteria?.filter(c => c.checked).length || 0;
          const progress = totalCriteria > 0 ? Math.round((completedCriteria / totalCriteria) * 100) : 0;
          const completionDate = story.completedAt ? new Date(story.completedAt).toLocaleDateString() : '';
          
          tableData.push({
            column: column.name,
            id: story.id_historia || 'N/A',
            title: story.title || 'Sin título',
            description: story.description || '',
            criteria: `${completedCriteria}/${totalCriteria} (${progress}%)`,
            status: story.completedAt ? 'Completada' : 'En progreso',
            completionDate: completionDate
          });
        });
      });
      
      // Agregar título y fecha
      doc.setFontSize(18);
      doc.text(title, 14, 20);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generado el: ${date}`, 14, 27);
      
      // Agregar resumen
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(`Total de historias: ${currentTotal}`, 14, 35);
      doc.text(`Historias completadas: ${currentCompleted} (${currentPercentage}%)`, 14, 40);
      
      // Agregar tabla
      autoTable(doc, {
        head: [columns.map(col => col.header)],
        body: tableData.map(row => columns.map(col => row[col.dataKey])),
        startY: 50,
        headStyles: {
          fillColor: [79, 70, 229], // Color azul
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center'
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        margin: { top: 10 },
        styles: {
          cellPadding: 3,
          fontSize: 9,
          valign: 'middle',
          overflow: 'linebreak',
          cellWidth: 'wrap'
        },
        columnStyles: {
          0: { cellWidth: 25 }, // Columna
          1: { cellWidth: 20 }, // ID Historia
          2: { cellWidth: 35 }, // Título
          3: { cellWidth: 60 }, // Descripción
          4: { cellWidth: 20 }, // Criterios
          5: { cellWidth: 20 }, // Estado
          6: { cellWidth: 25 }  // Fecha Finalización
        },
        didDrawPage: function(data) {
          // Pie de página
          const pageSize = doc.internal.pageSize;
          const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
          doc.text(`Página ${data.pageNumber}`, data.settings.margin.left, pageHeight - 10);
        }
      });
      
      // Agregar número de páginas
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text(
          `Página ${i} de ${pageCount}`,
          doc.internal.pageSize.width - 30,
          doc.internal.pageSize.height - 10
        );
      }
      
      // Guardar el PDF
      const fileName = `alcance_proyecto_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
    } catch (err) {
      console.error('Error al exportar a PDF:', err);
      console.error('Stack trace:', err.stack);
      console.error('Error details:', {
        message: err.message,
        name: err.name,
        constructor: err.constructor.name
      });
      setError(`Error al exportar a PDF: ${err.message}. Por favor, inténtalo de nuevo.`);
    } finally {
      setExporting(false);
    }
  }, [storiesByColumn, sortedColumns, stories, setError, setExporting]);
  
  // Función para exportar a CSV
  const exportToCSV = useCallback(() => {
    try {
      setExporting(true);
      
      let csvContent = 'Columna,ID Historia,Título,Descripción,Criterios,Estado\n';
      
      // Recorrer cada columna
      Object.entries(storiesByColumn).forEach(([columnId, columnStories]) => {
        const column = sortedColumns.find(c => c._id === columnId);
        if (!column) return;
        
        columnStories.forEach(story => {
          const totalCriteria = story.criteria?.length || 0;
          const completedCriteria = story.criteria?.filter(c => c.checked).length || 0;
          const progress = totalCriteria > 0 ? Math.round((completedCriteria / totalCriteria) * 100) : 0;
          
          // Escapar comas y comillas en los textos
          const escapeCsv = (text) => {
            if (text === null || text === undefined) return '';
            return `"${String(text).replace(/"/g, '""')}"`;
          };
          
          csvContent += [
            escapeCsv(column.name),
            escapeCsv(story.id_historia || 'N/A'),
            escapeCsv(story.title || 'Sin título'),
            escapeCsv(story.description || ''),
            escapeCsv(`${completedCriteria}/${totalCriteria} (${progress}%)`),
            escapeCsv(story.completedAt ? 'Completada' : 'En progreso')
          ].join(',') + '\n';
        });
      });
      
      // Crear y descargar el archivo
      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const fileName = `alcance_proyecto_${new Date().toISOString().split('T')[0]}.csv`;
      saveAs(blob, fileName);
      
    } catch (err) {
      console.error('Error al exportar a CSV:', err);
      setError('Error al exportar a CSV. Por favor, inténtalo de nuevo.');
    } finally {
      setExporting(false);
    }
  }, [storiesByColumn, sortedColumns]);

  // Manejar recarga de datos
  const reloadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Obtener datos actualizados desde la API
      const [columnsRes, storiesRes] = await Promise.all([
        api.getColumns(),
        api.getStories()
      ]);
      
      setColumns(columnsRes.data || []);
      setStories(storiesRes.data || []);
      
    } catch (err) {
      console.error('Error al recargar datos:', err);
      setError('Error al cargar los datos. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Efecto para cargar datos iniciales si no se proporcionan como props
  useEffect(() => {
    if (propColumns.length === 0 || propStories.length === 0) {
      reloadData();
    }
  }, [propColumns, propStories, reloadData]);

  // Calcular totales
  useEffect(() => {
    const total = stories.length;
    const completed = stories.filter(s => s.completedAt).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    setTotalStories(total);
    setCompletedStories(completed);
    setCompletionPercentage(percentage);
  }, [stories]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <FiRefreshCw className="animate-spin text-blue-500 text-2xl mb-2" />
        <p className="text-slate-600">Cargando datos del alcance...</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Alcance del Proyecto</h2>
          <p className="text-slate-500">Vista general de las historias por columna</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={reloadData}
            disabled={exporting || loading}
            className="inline-flex items-center px-3 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <FiRefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          <div className="relative inline-block group">
            <button
              disabled={exporting || loading}
              className="inline-flex items-center px-3 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <FiDownload className="mr-2 h-4 w-4" />
              Exportar
            </button>
            <div className="absolute right-0 mt-1 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
              <div className="py-1">
                <button
                  onClick={exportToCSV}
                  disabled={exporting || loading}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center"
                >
                  <FaFileCsv className="mr-2 text-green-600" />
                  Exportar a CSV
                </button>
                <button
                  onClick={exportToExcel}
                  disabled={exporting || loading}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center"
                >
                  <FaFileExcel className="mr-2 text-green-700" />
                  Exportar a Excel
                </button>
                <button
                  onClick={exportToPDF}
                  disabled={exporting || loading}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center"
                >
                  <FaFilePdf className="mr-2 text-red-600" />
                  Exportar a PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
          <button 
            onClick={() => setError(null)}
            className="float-right font-bold text-red-800"
          >
            ×
          </button>
        </div>
      )}

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-slate-500">Total de Historias</h3>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {totalStories}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-slate-500">Historias Completadas</h3>
          <p className="mt-1 text-2xl font-semibold text-green-600">
            {completedStories}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-slate-500">Progreso General</h3>
          <div className="mt-1">
            <div className="w-full bg-slate-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <p className="mt-1 text-sm text-slate-700">
              {totalStories > 0 
                ? `${completionPercentage}% completado`
                : 'No hay historias'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabla de historias */}
      <div className="bg-white shadow overflow-hidden rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Columna
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  ID Historia
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Título
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Descripción
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Criterios
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {sortedColumns.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-sm text-slate-500">
                    No hay columnas disponibles. Crea columnas en el tablero Kanban para ver el alcance.
                  </td>
                </tr>
              ) : (
                Object.entries(storiesByColumn).map(([columnId, columnStories]) => {
                  const column = sortedColumns.find(c => c._id === columnId);
                  if (!column) return null;
                  
                  return columnStories.length === 0 ? (
                    <tr key={`empty-${columnId}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                        {column.name}
                      </td>
                      <td colSpan="5" className="px-6 py-4 text-sm text-slate-500">
                        No hay historias en esta columna
                      </td>
                    </tr>
                  ) : (
                    columnStories.map((story, index) => {
                      const totalCriteria = story.criteria?.length || 0;
                      const completedCriteria = story.criteria?.filter(c => c.checked).length || 0;
                      const progress = totalCriteria > 0 ? Math.round((completedCriteria / totalCriteria) * 100) : 0;
                      
                      return (
                        <tr key={story._id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          {index === 0 && (
                            <td 
                              rowSpan={columnStories.length} 
                              className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 border-r border-slate-200"
                            >
                              {column.name}
                            </td>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">
                            {story.id_historia || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-900 max-w-xs truncate">
                            {story.title || 'Sin título'}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500 max-w-md truncate">
                            {story.description || 'Sin descripción'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-24 bg-slate-200 rounded-full h-2.5 mr-2">
                                <div 
                                  className="bg-green-600 h-2.5 rounded-full" 
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium text-slate-700">
                                {completedCriteria}/{totalCriteria}  - {progress}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              story.completedAt ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {story.completedAt ? 'Completada' : 'En progreso'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ScopeView;
