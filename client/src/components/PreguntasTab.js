import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FiDownload } from 'react-icons/fi';

/**
 * Componente para mostrar preguntas y permitir respuestas
 * @param {Object} props - Propiedades del componente
 * @param {Array} props.preguntas - Array de preguntas a mostrar
 * @param {string} props.currentJsonFile - Nombre del archivo JSON actual
 */
const PreguntasTab = ({ preguntas = [], currentJsonFile }) => {
  console.log('PreguntasTab - Props recibidas:', { preguntas, currentJsonFile });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [respuestas, setRespuestas] = useState({});
  const [respuestasGuardadas, setRespuestasGuardadas] = useState({});
  const [exporting, setExporting] = useState(false);

  // Inicializar respuestas cuando cambian las preguntas
  useEffect(() => {
    try {
      console.log('Inicializando respuestas para preguntas:', preguntas);
      setLoading(true);
      
      if (!preguntas || !Array.isArray(preguntas)) {
        console.log('No hay preguntas para mostrar');
        setRespuestas({});
        setLoading(false);
        return;
      }
      
      // Inicializar respuestas vacías para cada pregunta
      const nuevasRespuestas = {};
      preguntas.forEach((pregunta, index) => {
        if (pregunta && typeof pregunta === 'string') {
          console.log(`Pregunta ${index + 1}:`, pregunta);
          nuevasRespuestas[index] = '';
        }
      });
      
      console.log('Nuevas respuestas inicializadas:', nuevasRespuestas);
      setRespuestas(nuevasRespuestas);
      
      // Aquí podrías cargar respuestas guardadas si las tienes
      // Por ejemplo: cargarRespuestasGuardadas();
      
    } catch (err) {
      console.error('Error al inicializar las respuestas:', err);
      setError('Error al cargar las preguntas. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  }, [preguntas, currentJsonFile]);

  // Manejar cambios en las respuestas
  const handleRespuestaChange = (index, valor) => {
    setRespuestas(prev => ({
      ...prev,
      [index]: valor
    }));
  };

  // Guardar respuesta
  const guardarRespuesta = async (index) => {
    try {
      // Aquí podrías implementar la lógica para guardar la respuesta en el servidor
      // Por ahora, solo mostramos un mensaje de éxito
      console.log('Respuesta guardada:', { preguntaIndex: index, respuesta: respuestas[index] });
      // Actualizar respuestas guardadas
      setRespuestasGuardadas(prev => ({
        ...prev,
        [index]: respuestas[index] || 'Sin respuesta'
      }));
      alert('Respuesta guardada exitosamente');
    } catch (err) {
      console.error('Error al guardar la respuesta:', err);
      alert('Error al guardar la respuesta');
    }
  };

  // Exportar a PDF
  const exportToPDF = useCallback(() => {
    try {
      setExporting(true);
      
      // Crear un nuevo documento PDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Título del documento
      const title = 'Preguntas y Respuestas';
      const subtitle = currentJsonFile || 'Documento sin título';
      const date = new Date().toLocaleDateString();
      
      // Agregar encabezado
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 14, 20);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`Archivo: ${subtitle}`, 14, 28);
      doc.text(`Generado el: ${date}`, 14, 34);
      
      // Preparar datos para la tabla (solo preguntas)
      const tableData = preguntas.map((pregunta, index) => ({
        id: index + 1,
        pregunta: pregunta || 'Sin pregunta'
      }));
      
      // Configuración de la tabla
      const tableConfig = {
        startY: 45,
        head: [['#', 'Pregunta']],
        body: tableData.map(item => [
          item.id, 
          { content: item.pregunta, styles: { cellWidth: 'auto' } }
        ]),
        headStyles: {
          fillColor: [59, 130, 246], // Color azul
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center',
          cellPadding: 5
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        styles: {
          fontSize: 10,
          cellPadding: 4,
          valign: 'middle',
          overflow: 'linebreak',
          cellWidth: 'wrap',
          minCellHeight: 10,
          lineWidth: 0.1,
          lineColor: [200, 200, 200]
        },
        columnStyles: {
          0: { 
            cellWidth: 15, 
            halign: 'center',
            valign: 'top',
            fontStyle: 'bold'
          },
          1: { 
            cellWidth: 'auto',
            halign: 'left',
            valign: 'top'
          }
        },
        margin: { 
          top: 10,
          left: 10,
          right: 10
        },
        tableWidth: 'auto',
        tableLineColor: [200, 200, 200],
        tableLineWidth: 0.1
      };
      
      // Generar la tabla con la configuración
      autoTable(doc, tableConfig);
      
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
      const fileName = `preguntas_respuestas_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
    } catch (err) {
      console.error('Error al exportar a PDF:', err);
      setError(`Error al exportar a PDF: ${err.message}`);
    } finally {
      setExporting(false);
    }
  }, [preguntas, currentJsonFile]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-500">Cargando preguntas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
        <p className="font-medium">Error al cargar las preguntas</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-slate-800">Preguntas para Aclarar</h2>
        <div className="flex items-center space-x-3">
          {currentJsonFile && (
            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
              Archivo: {currentJsonFile}
            </span>
          )}
          <button
            onClick={exportToPDF}
            disabled={!preguntas || preguntas.length === 0 || exporting}
            className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiDownload className="mr-1.5 h-4 w-4" />
            {exporting ? 'Exportando...' : 'Exportar PDF'}
          </button>
        </div>
      </div>
      
      {!preguntas || preguntas.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">No hay preguntas disponibles</h3>
          <p className="mt-1 text-gray-500">Este archivo no contiene preguntas para aclarar.</p>
          <p className="mt-2 text-sm text-gray-500">Asegúrate de que el archivo JSON tenga una sección 'preguntas_para_aclarar' con un array de preguntas.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {preguntas.map((pregunta, index) => (
            <div key={index} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <h3 className="font-medium text-slate-700 mb-2">Pregunta {index + 1}:</h3>
              <p className="text-slate-600 mb-4">{pregunta}</p>
              
              <div className="mb-3">
                <label htmlFor={`respuesta-${index}`} className="block text-sm font-medium text-slate-700 mb-1">
                  Tu respuesta:
                </label>
                <textarea
                  id={`respuesta-${index}`}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={respuestas[index] || ''}
                  onChange={(e) => handleRespuestaChange(index, e.target.value)}
                  placeholder="Escribe tu respuesta aquí..."
                />
              </div>
              
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => guardarRespuesta(index)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Guardar Respuesta
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PreguntasTab;
