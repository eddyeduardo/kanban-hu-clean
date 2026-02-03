import React, { useState, useCallback, useMemo } from 'react';
import { FaFilePdf } from 'react-icons/fa';
import { FiFileText, FiDownload, FiFile, FiFileText as FiFileTextIcon } from 'react-icons/fi';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

/**
 * Componente para mostrar el plan de pruebas del proyecto
 * Muestra los criterios de aceptación de cada historia de usuario
 * con opciones de exportación a Excel, CSV y PDF
 */
const TestPlanView = ({ columns: propColumns = [], stories: propStories = [] }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Ordenar columnas por posición y excluir la primera columna (Backlog)
  const sortedColumns = useMemo(() => {
    return [...propColumns]
      .sort((a, b) => (a.position || 0) - (b.position || 0))
      .filter((_, index) => index > 0);
  }, [propColumns]);

  // Agrupar historias por columna
  const storiesByColumn = useMemo(() => {
    const result = {};

    // Inicializar con arrays vacíos para cada columna
    sortedColumns.forEach(column => {
      if (column._id) result[column._id] = [];
    });

    // Asignar historias a sus columnas
    propStories.forEach(story => {
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
  }, [propStories, sortedColumns]);

  // Función para exportar a Excel
  const exportToExcel = useCallback(() => {
    try {
      setExporting(true);

      // Preparar datos para la hoja de cálculo
      const data = [
        ['Columna', 'ID Historia', 'Título', 'Criterios de Aceptación', 'Estado']
      ];

      // Recorrer cada historia y sus criterios
      Object.entries(storiesByColumn).forEach(([columnId, columnStories]) => {
        const column = sortedColumns.find(c => c._id === columnId);
        if (!column) return;

        columnStories.forEach(story => {
          if (story.criteria && story.criteria.length > 0) {
            story.criteria.forEach(criterion => {
              data.push([
                column.name,
                story.id_historia || 'N/A',
                story.title || 'Sin título',
                criterion.text || '',
                criterion.checked ? 'Aprobado' : 'Pendiente'
              ]);
            });
          } else {
            data.push([
              column.name,
              story.id_historia || 'N/A',
              story.title || 'Sin título',
              'Sin criterios definidos',
              'N/A'
            ]);
          }
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
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      };

      // Aplicar estilos a la cabecera
      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell_address = { c: C, r: 0 };
        const cell_ref = XLSX.utils.encode_cell(cell_address);
        if (!ws[cell_ref]) continue;
        ws[cell_ref].s = headerStyle;
      }

      // Ajustar el ancho de las columnas
      const colWidths = [
        { wch: 20 }, // Columna
        { wch: 15 }, // ID Historia
        { wch: 40 }, // Título
        { wch: 80 }, // Criterios
        { wch: 15 }  // Estado
      ];
      ws['!cols'] = colWidths;

      // Agregar la hoja al libro
      XLSX.utils.book_append_sheet(wb, ws, 'Plan de Pruebas');

      // Generar archivo y descargar
      const fileName = `plan_pruebas_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName, { bookType: 'xlsx', bookSST: false, type: 'binary' });

    } catch (err) {
      console.error('Error al exportar a Excel:', err);
      setError('Error al exportar a Excel. Por favor, inténtalo de nuevo.');
    } finally {
      setExporting(false);
    }
  }, [storiesByColumn, sortedColumns]);

  // Función para exportar a CSV
  const exportToCSV = useCallback(() => {
    try {
      setExporting(true);

      // Preparar datos para el CSV
      let csvContent = 'Columna,ID Historia,Título,Criterios de Aceptación,Estado\n';

      // Recorrer cada columna
      Object.entries(storiesByColumn).forEach(([columnId, columnStories]) => {
        const column = sortedColumns.find(c => c._id === columnId);
        if (!column) return;

        columnStories.forEach(story => {
          // Agregar cada criterio como una fila separada
          if (story.criteria && story.criteria.length > 0) {
            story.criteria.forEach((criterion, index) => {
              const row = [
                `"${column.name}"`,
                `"${story.id_historia || 'N/A'}"`,
                `"${story.title || 'Sin título'}"`,
                `"${(criterion.text || '').replace(/"/g, '""')}"`,
                `"${criterion.checked ? 'Aprobado' : 'Pendiente'}"`
              ].join(',');
              csvContent += row + '\n';
            });
          } else {
            // Si no hay criterios, agregar una fila vacía
            const row = [
              `"${column.name}"`,
              `"${story.id_historia || 'N/A'}"`,
              `"${story.title || 'Sin título'}"`,
              '"Sin criterios definidos"',
              '"N/A"'
            ].join(',');
            csvContent += row + '\n';
          }
        });
      });

      // Crear y descargar el archivo CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const fileName = `plan_pruebas_${new Date().toISOString().split('T')[0]}.csv`;
      saveAs(blob, fileName);

    } catch (err) {
      console.error('Error al exportar a CSV:', err);
      setError('Error al exportar a CSV. Por favor, inténtalo de nuevo.');
    } finally {
      setExporting(false);
    }
  }, [storiesByColumn, sortedColumns]);

  // Función para exportar a PDF
  const handleExportPDF = useCallback(() => {
    try {
      console.log('Iniciando exportación a PDF...');
      setExporting(true);
      setError(null);

      // Obtener todas las historias de todas las columnas
      const allStories = [];
      Object.entries(storiesByColumn).forEach(([columnId, columnStories]) => {
        columnStories.forEach(story => {
          allStories.push({
            ...story,
            columnId: columnId
          });
        });
      });

      if (allStories.length === 0) {
        throw new Error('No hay historias para exportar');
      }

      // Crear un nuevo documento PDF con orientación vertical
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Título del documento
      const title = 'Plan de Pruebas';
      const date = new Date().toLocaleDateString();

      // Agregar encabezado con mejor formato
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(40, 62, 80);
      doc.text(title, 105, 20, { align: 'center' });

      // Línea decorativa debajo del título
      doc.setDrawColor(59, 130, 246);
      doc.setLineWidth(0.5);
      doc.line(30, 25, 180, 25);

      // Información de la exportación
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total de historias: ${allStories.length}`, 30, 35);
      doc.text(`Generado el: ${date}`, 150, 35);

      // Preparar datos para la tabla
      const tableData = [];

      // Recorrer cada historia
      allStories.forEach(story => {
        const column = sortedColumns.find(c => c._id === story.columnId);

        if (story.criteria?.length > 0) {
          // Si hay criterios, agregar una fila por cada criterio
          story.criteria.forEach((criterion, index) => {
            tableData.push([
              column?.name || 'Sin columna',
              story.id_historia || 'N/A',
              index === 0 ? (story.title || 'Sin título') : '',
              criterion.text || 'Sin descripción'
            ]);
          });
        } else {
          // Si no hay criterios, mostrar solo la historia
          tableData.push([
            column?.name || 'Sin columna',
            story.id_historia || 'N/A',
            story.title || 'Sin título',
            'Sin criterios definidos'
          ]);
        }
      });

      // Configuración de la tabla con mejor distribución
      doc.autoTable({
        head: [
          [
            { content: 'Columna', styles: { halign: 'center', cellWidth: 30 } },
            { content: 'ID', styles: { halign: 'center', cellWidth: 20 } },
            { content: 'Título / Criterio', styles: { halign: 'center', cellWidth: 60 } },
            { content: 'Descripción', styles: { halign: 'center', cellWidth: 85 } }
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
        // Estilos de columnas optimizados para A4 vertical con márgenes ajustados
        columnStyles: {
          0: {
            cellWidth: 30,  // Columna (aumentado de 25)
            halign: 'left',
            fontStyle: 'bold',
            cellPadding: { top: 3, right: 1, bottom: 3, left: 1 },
            minCellWidth: 25
          },
          1: {
            cellWidth: 18,  // ID (ligeramente reducido)
            halign: 'center',
            cellPadding: { top: 3, right: 1, bottom: 3, left: 1 },
            minCellWidth: 15
          },
          2: {
            cellWidth: 60,  // Título/Criterio (aumentado de 50)
            halign: 'left',
            cellPadding: { top: 3, right: 1, bottom: 3, left: 1 },
            minCellWidth: 50
          },
          3: {
            cellWidth: 85,  // Descripción (aumentado de 70)
            halign: 'left',
            cellPadding: { top: 3, right: 1, bottom: 3, left: 1 },
            minCellWidth: 75
          }
        },
        // Márgenes optimizados para aprovechar mejor el ancho
        margin: { top: 50, right: 5, bottom: 20, left: 5 },
        tableWidth: 'wrap',
        // Estilos generales mejorados
        styles: {
          fontSize: 8,
          cellPadding: { top: 2, right: 1, bottom: 2, left: 1 },
          overflow: 'linebreak',
          lineWidth: 0.1,
          lineColor: [200, 200, 200],
          textColor: [40, 40, 40],
          font: 'helvetica',
          valign: 'middle'
        },
        // Estilo para celdas del encabezado
        headStyles: {
          fillColor: [59, 89, 152],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center',
          lineWidth: 0.1,
          lineColor: [255, 255, 255],
          cellPadding: { top: 4, right: 2, bottom: 4, left: 2 }
        },
        // Estilo para filas alternas
        alternateRowStyles: {
          fillColor: [245, 247, 250]
        },
        // Estilo para celdas del cuerpo
        bodyStyles: {
          lineWidth: 0.1,
          lineColor: [220, 220, 220]
        },
        didDrawPage: function (data) {
          // Agregar pie de página con número de página
          const pageSize = doc.internal.pageSize;
          const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
          const pageNumber = doc.internal.getNumberOfPages();

          // Línea decorativa en el pie de página
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.3);
          doc.line(30, pageHeight - 15, 180, pageHeight - 15);

          // Texto del pie de página
          doc.setFontSize(8);
          doc.setTextColor(100);
          doc.setFont('helvetica', 'normal');

          // Texto a la izquierda
          doc.text(
            `Generado el ${date}`,
            30,
            pageHeight - 10
          );

          // Número de página centrado
          doc.text(
            `Página ${pageNumber}`,
            105,
            pageHeight - 10,
            { align: 'center' }
          );

          // Texto a la derecha
          doc.text(
            `Total de historias: ${allStories.length}`,
            180,
            pageHeight - 10,
            { align: 'right' }
          );
        }
      });

      // Guardar el PDF
      const fileName = `plan_de_pruebas_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

    } catch (err) {
      console.error('Error al exportar a PDF:', err);
      setError(`Error al exportar a PDF: ${err.message}`);
    } finally {
      setExporting(false);
    }
  }, [storiesByColumn, sortedColumns]);

  // Actualizar cuando cambien las propiedades
  React.useEffect(() => {
    // No es necesario actualizar el estado local ya que usamos useMemo
  }, [propColumns, propStories]);

  // Mostrar mensaje si no hay datos
  if (propStories.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="text-neutral-300 mb-4">
          <FiFileText className="inline-block text-4xl" />
        </div>
        <h3 className="text-base font-semibold text-neutral-700 mb-2">No hay historias disponibles</h3>
        <p className="text-sm text-neutral-500">Agrega historias para ver el plan de pruebas</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-full box-border">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900">Plan de Pruebas</h2>
          <p className="text-sm text-neutral-500 mt-0.5">Criterios de aceptación por historia</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToExcel}
            disabled={exporting}
            className="btn btn-secondary text-xs inline-flex items-center gap-1.5"
            title="Exportar a Excel"
          >
            <FiFileTextIcon className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>
          <button
            onClick={exportToCSV}
            disabled={exporting}
            className="btn btn-secondary text-xs inline-flex items-center gap-1.5"
            title="Exportar a CSV"
          >
            <FiFileTextIcon className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
          <button
            onClick={handleExportPDF}
            disabled={exporting || propStories.length === 0}
            className={`btn ${propStories.length === 0 ? 'btn-disabled' : 'btn-secondary'} text-xs inline-flex items-center gap-1.5`}
            title={propStories.length === 0 ? 'No hay datos para exportar' : 'Exportar a PDF'}
          >
            {exporting ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generando...
              </>
            ) : (
              <>
                <FaFilePdf className="w-3.5 h-3.5" />
                <span>PDF</span>
              </>
            )}
          </button>
          <button
            onClick={() => window.print()}
            className="btn btn-secondary text-xs inline-flex items-center gap-1.5"
            title="Imprimir"
          >
            <FiFileText className="w-3.5 h-3.5" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* Tabla - Estilo Apple */}
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
                <th scope="col" className="px-6 py-3 text-left text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                  Criterios de Aceptación
                </th>
                <th scope="col" className="px-6 py-3 text-left text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-100">
              {sortedColumns.flatMap(column => {
                const columnStories = storiesByColumn[column._id] || [];
                return columnStories.flatMap((story, storyIndex) => {
                  if (!story.criteria || story.criteria.length === 0) {
                    return (
                      <tr key={`${story._id || storyIndex}-no-criteria`} className="bg-neutral-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-neutral-900">
                          {column.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 font-mono">
                          {story.id_historia || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">
                          {story.title || 'Sin título'}
                        </td>
                        <td className="px-6 py-4 text-sm text-neutral-400 italic" colSpan="2">
                          No hay criterios de aceptación definidos
                        </td>
                      </tr>
                    );
                  }

                  return story.criteria.map((criterion, critIndex) => (
                    <tr
                      key={`${story._id || storyIndex}-${critIndex}`}
                      className={critIndex % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}
                    >
                      {critIndex === 0 && (
                        <>
                          <td
                            className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-neutral-900 border-r border-neutral-100"
                            rowSpan={story.criteria.length}
                          >
                            {column.name}
                          </td>
                          <td
                            className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 font-mono border-r border-neutral-100"
                            rowSpan={story.criteria.length}
                          >
                            {story.id_historia || 'N/A'}
                          </td>
                          <td
                            className="px-6 py-4 whitespace-normal text-sm font-medium text-neutral-900 border-r border-neutral-100"
                            rowSpan={story.criteria.length}
                          >
                            {story.title || 'Sin título'}
                          </td>
                        </>
                      )}
                      <td className="px-6 py-4 text-sm text-neutral-700 whitespace-normal">
                        {criterion.text || 'Sin descripción'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`badge-${criterion.checked ? 'success' : 'warning'} text-[11px]`}>
                          {criterion.checked ? 'Aprobado' : 'Pendiente'}
                        </span>
                      </td>
                    </tr>
                  ));
                });
              })}
            </tbody>
          </table>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-error-50 border-l-4 border-error-400 rounded-apple">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-error-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-error-700">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {exporting && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="card p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-center mb-4">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
            </div>
            <p className="text-center text-neutral-700">Generando archivo, por favor espere...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestPlanView;
