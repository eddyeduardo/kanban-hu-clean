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
        ['Columna', 'ID Historia', 'Título', 'Esfuerzo', 'Tipo', 'Criterios', 'Estado', 'Fecha de Finalización']
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
            story.esfuerzo || '',
            story.tipo || '',
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
        { wch: 12 }, // Esfuerzo
        { wch: 15 }, // Tipo
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
        orientation: 'portrait',  // Cambiado a vertical para mejor lectura
        unit: 'mm',
        format: 'a4'
      });
      
      // Título del documento
      const title = 'Alcance del Proyecto';
      const date = new Date().toLocaleDateString();
      
      // Agregar encabezado
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 14, 20);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`Total de historias: ${currentTotal}`, 14, 30);
      doc.text(`Historias completadas: ${currentCompleted} (${currentPercentage}%)`, 14, 35);
      doc.text(`Generado el: ${date}`, 14, 40);
      
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

          tableData.push([
            column.name,
            story.id_historia || 'N/A',
            {
              content: story.title || 'Sin título',
              styles: { fontStyle: 'bold' }
            },
            story.esfuerzo || '',
            story.tipo || '',
            `${completedCriteria}/${totalCriteria} (${progress}%)`,
            {
              content: story.completedAt ? 'Completada' : 'En progreso',
              styles: {
                textColor: story.completedAt ? [0, 128, 0] : [200, 100, 0],
                fontStyle: story.completedAt ? 'bold' : 'normal'
              }
            },
            completionDate || 'N/A'
          ]);
        });
      });
      
      // El encabezado ya fue agregado anteriormente, no es necesario repetirlo
      
      // Configuración de la tabla
      autoTable(doc, {
        head: [
          [
            { content: 'Columna', styles: { halign: 'center', fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' } },
            { content: 'ID', styles: { halign: 'center', fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' } },
            { content: 'Título', styles: { halign: 'center', fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' } },
            { content: 'Esfuerzo', styles: { halign: 'center', fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' } },
            { content: 'Tipo', styles: { halign: 'center', fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' } },
            { content: 'Criterios', styles: { halign: 'center', fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' } },
            { content: 'Estado', styles: { halign: 'center', fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' } },
            { content: 'Fecha Fin', styles: { halign: 'center', fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' } }
          ]
        ],
        body: tableData,
        startY: 45,
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center',
          cellPadding: 3,
          lineWidth: 0.1,
          lineColor: [255, 255, 255]
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        bodyStyles: {
          lineWidth: 0.1,
          lineColor: [200, 200, 200]
        },
        columnStyles: {
          0: { cellWidth: 22, halign: 'left' },   // Columna
          1: { cellWidth: 15, halign: 'center' }, // ID
          2: { cellWidth: 45, halign: 'left' },   // Título
          3: { cellWidth: 15, halign: 'center' }, // Esfuerzo
          4: { cellWidth: 18, halign: 'center' }, // Tipo
          5: { cellWidth: 22, halign: 'center' }, // Criterios
          6: { cellWidth: 22, halign: 'center' }, // Estado
          7: { cellWidth: 22, halign: 'center' }  // Fecha
        },
        margin: { 
          top: 50,  // Aumentado para dar espacio al título y resumen
          left: 10,
          right: 10,
          bottom: 20
        },
        tableWidth: 'wrap',
        theme: 'grid',  // Usar tema grid para bordes consistentes
        showHead: 'firstPage',
        tableLineWidth: 0.1,
        tableLineColor: [200, 200, 200],
        styles: {
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
          fontSize: 8,
          cellPadding: 3,
          overflow: 'linebreak',
          cellWidth: 'wrap',
          minCellHeight: 8,
          valign: 'middle'
        },
        didDrawPage: function(data) {
          // Agregar número de página
          const pageCount = doc.internal.getNumberOfPages();
          const currentPage = data.pageNumber;
          
          doc.setFontSize(9);
          doc.setTextColor(100);
          doc.setFont('helvetica', 'normal');
          const pageText = `Página ${currentPage} de ${pageCount}`;
          const pageWidth = doc.getStringUnitWidth(pageText) * doc.getFontSize() / doc.internal.scaleFactor;
          doc.text(
            pageText,
            doc.internal.pageSize.width - 15 - pageWidth,  // Alinear a la derecha con margen
            doc.internal.pageSize.height - 10
          );
        }
      });
      
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
      
      let csvContent = 'Columna,ID Historia,Título,Esfuerzo,Tipo,Criterios,Estado\n';

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
            escapeCsv(story.esfuerzo || ''),
            escapeCsv(story.tipo || ''),
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
        <FiRefreshCw className="animate-spin text-primary-500 text-2xl mb-2" />
        <p className="text-neutral-500">Cargando datos del alcance...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900">Alcance del Proyecto</h2>
          <p className="text-sm text-neutral-500 mt-0.5">Vista general de las historias por columna</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={reloadData}
            disabled={exporting || loading}
            className="btn btn-secondary text-xs inline-flex items-center gap-1.5"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          <div className="relative inline-block group">
            <button
              disabled={exporting || loading}
              className="btn btn-secondary text-xs inline-flex items-center gap-1.5"
            >
              <FiDownload className="w-3.5 h-3.5" />
              Exportar
            </button>
            <div className="absolute right-0 mt-1 w-48 rounded-apple shadow-apple-lg bg-white/95 backdrop-blur-sm border border-neutral-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
              <div className="py-1">
                <button
                  onClick={exportToCSV}
                  disabled={exporting || loading}
                  className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 flex items-center"
                >
                  <FaFileCsv className="mr-2 text-success-600" />
                  Exportar a CSV
                </button>
                <button
                  onClick={exportToExcel}
                  disabled={exporting || loading}
                  className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 flex items-center"
                >
                  <FaFileExcel className="mr-2 text-success-700" />
                  Exportar a Excel
                </button>
                <button
                  onClick={exportToPDF}
                  disabled={exporting || loading}
                  className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 flex items-center"
                >
                  <FaFilePdf className="mr-2 text-error-600" />
                  Exportar a PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-error-50 border border-error-200 text-error-700 rounded-apple">
          {error}
          <button 
            onClick={() => setError(null)}
            className="float-right font-semibold text-error-800"
          >
            ×
          </button>
        </div>
      )}

      {/* KPI Cards - Estilo Apple */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-apple bg-primary-50 flex items-center justify-center">
              <FiFileText className="w-4.5 h-4.5 text-primary-500" />
            </div>
            <span className="text-2xl font-bold text-neutral-900">{totalStories}</span>
          </div>
          <p className="text-xs text-neutral-500">Total de Historias</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-apple bg-success-50 flex items-center justify-center">
              <FiFileText className="w-4.5 h-4.5 text-success-500" />
            </div>
            <span className="text-2xl font-bold text-neutral-900">{completedStories}</span>
          </div>
          <p className="text-xs text-neutral-500">Historias Completadas</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-apple bg-purple-50 flex items-center justify-center">
              <FiFileText className="w-4.5 h-4.5 text-purple-500" />
            </div>
            <span className="text-2xl font-bold text-neutral-900">{completionPercentage}%</span>
          </div>
          <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full transition-all duration-500 ease-apple"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <p className="text-xs text-neutral-500 mt-2">Progreso General</p>
        </div>
      </div>

      {/* Tabla de historias - Estilo Apple */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                  Columna
                </th>
                <th scope="col" className="px-6 py-3 text-left text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                  ID Historia
                </th>
                <th scope="col" className="px-6 py-3 text-left text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                  Título
                </th>
                <th scope="col" className="px-6 py-3 text-center text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                  Esfuerzo
                </th>
                <th scope="col" className="px-6 py-3 text-left text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th scope="col" className="px-6 py-3 text-left text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                  Criterios
                </th>
                <th scope="col" className="px-6 py-3 text-left text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-100">
              {sortedColumns.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-sm text-neutral-400">
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
                      <td colSpan="6" className="px-6 py-4 text-sm text-slate-500">
                        No hay historias en esta columna
                      </td>
                    </tr>
                  ) : (
                    columnStories.map((story, index) => {
                      const totalCriteria = story.criteria?.length || 0;
                      const completedCriteria = story.criteria?.filter(c => c.checked).length || 0;
                      const progress = totalCriteria > 0 ? Math.round((completedCriteria / totalCriteria) * 100) : 0;
                      
                      return (
                        <tr key={story._id} className={index % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}>
                          {index === 0 && (
                            <td 
                              rowSpan={columnStories.length} 
                              className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-neutral-900 border-r border-neutral-100"
                            >
                              {column.name}
                            </td>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 font-mono">
                            {story.id_historia || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-neutral-900 max-w-xs truncate">
                            {story.title || 'Sin título'}
                          </td>
                          <td className="px-6 py-4 text-center whitespace-nowrap">
                            {story.esfuerzo ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                {story.esfuerzo} pts
                              </span>
                            ) : (
                              <span className="text-sm text-neutral-300">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {story.tipo ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200">
                                {story.tipo}
                              </span>
                            ) : (
                              <span className="text-sm text-neutral-300">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-24 bg-neutral-200 rounded-full h-1.5 mr-2">
                                <div 
                                  className="bg-success-500 h-1.5 rounded-full transition-all duration-300" 
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-medium text-neutral-600">
                                {completedCriteria}/{totalCriteria} · {progress}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`badge-${story.completedAt ? 'success' : 'primary'} text-[11px]`}>
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
