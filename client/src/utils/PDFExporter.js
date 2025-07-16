/**
 * Utilidad para exportar datos a PDF
 * @param {Array} stories - Lista de historias de usuario
 * @param {Array} columns - Lista de columnas
 * @param {string} title - Título del documento
 * @returns {Promise} Promesa que se resuelve cuando se completa la exportación
 */
// Importar jsPDF y autoTable
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Asegurarse de que autoTable esté disponible globalmente
jsPDF.autoTable = autoTable;

export const exportToPDF = (stories, columns, title = 'Plan de Pruebas') => {
  return new Promise((resolve, reject) => {
    // Verificar si hay datos para exportar
    if (!stories || stories.length === 0) {
      reject(new Error('No hay datos para exportar'));
      return;
    }

    try {
      // Crear el documento PDF
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      // Título del documento
      doc.setFontSize(16);
      doc.text(title, 14, 15);
      doc.setFontSize(10);
      doc.text(`Generado el: ${new Date().toLocaleDateString()}`, 14, 22);
      
      // Preparar datos para la tabla
      const tableData = [];
        
        // Procesar cada historia
        stories.forEach(story => {
          try {
            const column = columns.find(c => c._id === (story.column?._id || story.column)) || {};
            
            if (story.criteria?.length > 0) {
              // Si hay criterios, agregar una fila por cada criterio
              story.criteria.forEach(criterion => {
                tableData.push([
                  column.name || 'Sin columna',
                  story.id_historia || 'N/A',
                  story.title || 'Sin título',
                  criterion.text || '',
                  criterion.checked ? 'Aprobado' : 'Pendiente'
                ]);
              });
            } else {
              // Si no hay criterios, agregar una sola fila
              tableData.push([
                column.name || 'Sin columna',
                story.id_historia || 'N/A',
                story.title || 'Sin título',
                'Sin criterios definidos',
                'N/A'
              ]);
            }
          } catch (error) {
            console.error('Error al procesar la historia:', story, error);
          }
        });
        
      // Verificar si hay datos para mostrar
      if (tableData.length === 0) {
        throw new Error('No se encontraron datos válidos para exportar');
      }

      // Configuración de la tabla
      doc.autoTable({
        head: [['Columna', 'ID Historia', 'Título', 'Criterios de Aceptación', 'Estado']],
        body: tableData,
        startY: 30, // Espacio para el título
        headStyles: {
          fillColor: [79, 70, 229], // Color azul
          textColor: 255, // Texto blanco
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
          lineWidth: 0.1,
          lineColor: [200, 200, 200]
        },
        styles: {
          fontSize: 8,
          cellPadding: 2,
          lineWidth: 0.1,
          lineColor: [200, 200, 200],
          overflow: 'linebreak',
          cellWidth: 'wrap',
          font: 'helvetica',
          textColor: [0, 0, 0],
          minCellHeight: 10
        },
        columnStyles: {
          0: { cellWidth: 25, halign: 'left', valign: 'middle' },
          1: { cellWidth: 20, halign: 'left', valign: 'middle' },
          2: { cellWidth: 40, halign: 'left', valign: 'middle' },
          3: { cellWidth: 80, halign: 'left', valign: 'middle' },
          4: { cellWidth: 20, halign: 'center', valign: 'middle' }
        },
        margin: { top: 30, right: 10, bottom: 20, left: 10 },
        pageBreak: 'auto',
        tableWidth: 'wrap',
        showHead: 'everyPage',
        tableLineColor: [200, 200, 200],
        tableLineWidth: 0.1,
        didDrawPage: function(data) {
          // Agregar número de página
          const pageSize = doc.internal.pageSize;
          const pageHeight = pageSize.height || pageSize.getHeight();
          doc.setFontSize(8);
          doc.setTextColor(100);
          doc.text(
            `Página ${doc.internal.getNumberOfPages()}`,
            data.settings.margin.left,
            pageHeight - 10
          );
        }
        });
        
      // Guardar el PDF
      const fileName = `${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      resolve();
    } catch (error) {
      console.error('Error inesperado al generar PDF:', error);
      reject(new Error(`Ocurrió un error al generar el PDF: ${error.message}`));
    }
  });
};

export default exportToPDF;
