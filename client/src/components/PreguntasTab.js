import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FiDownload, FiCheck, FiPlus, FiTrash2 } from 'react-icons/fi';

/**
 * Componente para mostrar preguntas y permitir respuestas.
 * Al guardar una respuesta, crea una historia de usuario en la columna "Por hacer".
 */
const PreguntasTab = ({ preguntas = [], currentJsonFile, onCreateStory, onUpdateStory, onDeletePregunta, columns = [], stories = [] }) => {
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

  // Manejar eliminación de pregunta con confirmación
  const handleEliminarPregunta = async (index) => {
    const pregunta = preguntas[index];
    const confirmMessage = `¿Estás seguro de que deseas eliminar esta pregunta?\n\n"${pregunta.substring(0, 100)}${pregunta.length > 100 ? '...' : ''}"`;

    if (window.confirm(confirmMessage)) {
      try {
        await onDeletePregunta(index);
        setError('');
      } catch (err) {
        // El error ya se maneja en App.js
      }
    }
  };

  // Guardar respuesta: si ya existe una historia con ese título, agrega los criterios; si no, crea una nueva
  const guardarRespuesta = async (index) => {
    const respuesta = respuestas[index];
    if (!respuesta || respuesta.trim() === '') {
      setError('Escribe una respuesta antes de guardar.');
      return;
    }

    try {
      // Buscar la columna "Por hacer" (case-insensitive)
      const porHacerColumn = columns.find(
        col => col.name.toLowerCase() === 'por hacer'
      );

      if (!porHacerColumn) {
        setError('No se encontró la columna "Por hacer". Créala primero en el tablero.');
        return;
      }

      const pregunta = preguntas[index];

      // Extraer criterios de aceptación de la respuesta
      const lineas = respuesta.split('\n').filter(l => l.trim() !== '');
      const newCriteria = lineas.map(linea => ({
        text: linea.trim().replace(/^[-•*]\s*/, ''),
        checked: false
      }));

      if (newCriteria.length === 0) {
        newCriteria.push({ text: respuesta.trim(), checked: false });
      }

      // Buscar si ya existe una historia con el mismo título (pregunta)
      const existingStory = stories.find(
        s => s.title && s.title.trim().toLowerCase() === pregunta.trim().toLowerCase()
      );

      let action = 'created';

      if (existingStory && onUpdateStory) {
        // Agregar los nuevos criterios a la historia existente (sin duplicar)
        const existingTexts = (existingStory.criteria || []).map(c => c.text.toLowerCase());
        const uniqueNewCriteria = newCriteria.filter(
          c => !existingTexts.includes(c.text.toLowerCase())
        );

        if (uniqueNewCriteria.length === 0) {
          setError('Todos los criterios ya existen en la historia.');
          return;
        }

        const mergedCriteria = [...(existingStory.criteria || []), ...uniqueNewCriteria];
        await onUpdateStory(existingStory._id, { criteria: mergedCriteria });
        action = 'updated';
      } else if (onCreateStory) {
        // Crear nueva historia
        const storyData = {
          title: pregunta,
          description: respuesta,
          criteria: newCriteria,
          column: porHacerColumn._id,
          jsonFileName: currentJsonFile || null,
          user: 'Por hacer'
        };
        await onCreateStory(storyData);
      }

      // Marcar como guardada con el tipo de acción
      setRespuestasGuardadas(prev => ({
        ...prev,
        [index]: { text: respuesta, action }
      }));

      setError('');
    } catch (err) {
      console.error('Error al guardar la respuesta:', err);
      setError('Error al crear/actualizar la historia: ' + (err.message || 'Error desconocido'));
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
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-neutral-500 text-sm">Cargando preguntas...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full box-border">
      {error && (
        <div className="mb-4 p-3 bg-danger-50 text-danger-700 rounded-apple text-sm border border-danger-100 animate-fade-in">
          {error}
        </div>
      )}

      <div className="flex flex-wrap justify-between items-center mb-6 gap-2">
        <h2 className="text-xl font-semibold text-neutral-900">Preguntas para Aclarar</h2>
        <div className="flex items-center gap-3">
          {currentJsonFile && (
            <span className="badge-primary text-xs">
              {currentJsonFile}
            </span>
          )}
          <button
            onClick={exportToPDF}
            disabled={!preguntas || preguntas.length === 0 || exporting}
            className="btn btn-secondary text-sm inline-flex items-center gap-1.5"
          >
            <FiDownload className="w-4 h-4" />
            {exporting ? 'Exportando...' : 'PDF'}
          </button>
        </div>
      </div>
      
      {!preguntas || preguntas.length === 0 ? (
        <div className="text-center py-12 bg-neutral-50 rounded-apple-lg border border-neutral-200">
          <svg className="mx-auto h-12 w-12 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-neutral-900">No hay preguntas disponibles</h3>
          <p className="mt-1 text-neutral-500">Este archivo no contiene preguntas para aclarar.</p>
          <p className="mt-2 text-sm text-neutral-400">Asegúrate de que el archivo JSON tenga una sección 'preguntas_para_aclarar'.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-neutral-500">
            Al guardar una respuesta, se creará una historia de usuario en la columna "Por hacer" con los criterios de aceptación extraídos de tu respuesta (cada línea = un criterio).
          </p>
          {preguntas.map((pregunta, index) => {
            const savedData = respuestasGuardadas[index];
            const existingStory = stories.find(
              s => s.title && s.title.trim().toLowerCase() === pregunta.trim().toLowerCase()
            );

            return (
              <div key={index} className={`card p-4 ${savedData ? 'border-l-[3px] border-l-success-500' : ''}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <span className="badge-primary text-xs flex-shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    <p className="text-sm font-medium text-neutral-800">{pregunta}</p>
                  </div>
                  {onDeletePregunta && (
                    <button
                      type="button"
                      onClick={() => handleEliminarPregunta(index)}
                      className="p-1.5 text-neutral-400 hover:text-danger-500 hover:bg-danger-50 rounded-apple transition-colors flex-shrink-0"
                      title="Eliminar pregunta"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Previous save confirmation */}
                {savedData && (
                  <div className="ml-8 mb-3">
                    <div className="flex items-center gap-2 text-success-600 text-xs mb-1">
                      <FiCheck className="w-3.5 h-3.5" />
                      <span className="font-medium">
                        {savedData.action === 'updated'
                          ? 'Criterios agregados a historia existente'
                          : 'Historia creada en "Por hacer"'}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 whitespace-pre-line">{savedData.text}</p>
                  </div>
                )}

                {/* Always show textarea to allow adding more criteria */}
                <div className="ml-8">
                  <textarea
                    id={`respuesta-${index}`}
                    rows="3"
                    className="input w-full text-sm resize-y"
                    value={respuestas[index] || ''}
                    onChange={(e) => handleRespuestaChange(index, e.target.value)}
                    placeholder={existingStory
                      ? 'Agrega más criterios de aceptación (cada línea = un criterio)...'
                      : 'Escribe tu respuesta (cada línea se convierte en un criterio de aceptación)...'}
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={() => guardarRespuesta(index)}
                      disabled={!respuestas[index] || respuestas[index].trim() === ''}
                      className="btn btn-primary text-sm inline-flex items-center gap-1.5"
                    >
                      <FiPlus className="w-3.5 h-3.5" />
                      {existingStory ? 'Agregar Criterios' : 'Crear Historia'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PreguntasTab;
