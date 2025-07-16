import jsPDF from 'jspdf';

export const exportToPDF = (stories, columns, title = 'Plan de Pruebas') => {
  return new Promise((resolve, reject) => {
    try {
      // Verificar si hay datos para exportar
      if (!stories || stories.length === 0) {
        throw new Error('No hay datos para exportar');
      }

      // Crear un nuevo documento PDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Agregar título
      doc.setFontSize(20);
      doc.text(title, 14, 20);
      doc.setFontSize(12);
      doc.text(`Generado el: ${new Date().toLocaleDateString()}`, 14, 30);

      // Configuración de la tabla
      let y = 40;
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;
      const maxWidth = pageWidth - 2 * margin;

      // Establecer fuente más pequeña para la tabla
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);

      // Encabezados de la tabla
      const headers = ['Columna', 'ID Historia', 'Título', 'Criterios', 'Estado'];
      const colWidths = [30, 20, 50, 70, 20];
      
      // Dibujar encabezados
      let x = margin;
      doc.setFont(undefined, 'bold');
      headers.forEach((header, i) => {
        doc.text(header, x, y);
        x += colWidths[i];
      });
      y += 7;

      // Dibujar línea debajo de los encabezados
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y - 2, pageWidth - margin, y - 2);

      // Función para agregar una nueva página si es necesario
      const checkPageBreak = (requiredHeight) => {
        const pageHeight = doc.internal.pageSize.getHeight();
        if (y + requiredHeight > pageHeight - 10) {
          doc.addPage();
          y = 20;
          return true;
        }
        return false;
      };

      // Función para agregar texto con ajuste de línea
      const addText = (text, x, y, maxWidth) => {
        const splitText = doc.splitTextToSize(text, maxWidth);
        doc.text(splitText, x, y);
        return splitText.length * 7; // Aproximación de la altura
      };

      // Agregar filas de la tabla
      doc.setFont(undefined, 'normal');
      stories.forEach(story => {
        const column = columns.find(c => c._id === (story.column?._id || story.column)) || {};
        
        if (story.criteria?.length > 0) {
          // Si hay criterios, agregar una fila por cada criterio
          story.criteria.forEach((criterion, index) => {
            checkPageBreak(10);
            
            let x = margin;
            const rowData = [
              index === 0 ? column.name || 'Sin columna' : '',
              index === 0 ? story.id_historia || 'N/A' : '',
              index === 0 ? story.title || 'Sin título' : '',
              criterion.text || '',
              criterion.checked ? '✅' : '❌'
            ];

            // Dibujar celdas
            rowData.forEach((cell, i) => {
              if (i < rowData.length - 1) {
                doc.text(cell, x, y, { maxWidth: colWidths[i] - 2 });
              } else {
                doc.text(cell, x + colWidths[i] - 10, y);
              }
              x += colWidths[i];
            });

            y += 7;
          });
        } else {
          // Si no hay criterios, agregar una sola fila
          checkPageBreak(10);
          
          let x = margin;
          const rowData = [
            column.name || 'Sin columna',
            story.id_historia || 'N/A',
            story.title || 'Sin título',
            'Sin criterios definidos',
            'N/A'
          ];

          // Dibujar celdas
          rowData.forEach((cell, i) => {
            if (i < rowData.length - 1) {
              doc.text(cell, x, y, { maxWidth: colWidths[i] - 2 });
            } else {
              doc.text(cell, x + colWidths[i] - 10, y);
            }
            x += colWidths[i];
          });

          y += 7;
        }

        // Agregar línea divisoria entre historias
        doc.setDrawColor(240, 240, 240);
        doc.line(margin, y - 1, pageWidth - margin, y - 1);
        y += 3;
      });

      // Guardar el PDF
      const fileName = `${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      resolve();

    } catch (error) {
      console.error('Error al generar el PDF:', error);
      reject(new Error(`Ocurrió un error al generar el PDF: ${error.message}`));
    }
  });
};

export default exportToPDF;
