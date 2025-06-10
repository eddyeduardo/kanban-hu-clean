import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { FiDownload, FiFileText, FiFile, FiSave } from 'react-icons/fi';
import { FaFileCsv, FaFileExcel } from 'react-icons/fa';

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
      alert('Respuesta guardada exitosamente');
    } catch (err) {
      console.error('Error al guardar la respuesta:', err);
      alert('Error al guardar la respuesta');
    }
  };

  // Exportar a Excel
  const exportToExcel = useCallback(() => {
    try {
      setExporting(true);
      
      // Preparar datos para la hoja de cálculo
      const data = [
        ['#', 'Pregunta', 'Respuesta', 'Fecha de Respuesta']
      ];
      
      // Agregar cada pregunta y su respuesta
      preguntas.forEach((pregunta, index) => {
        data.push([
          index + 1,
          pregunta,
          respuestas[index] || 'Sin responder',
          respuestas[index] ? new Date().toLocaleString() : 'N/A'
        ]);
      });
      
      // Crear libro de trabajo y hoja de cálculo
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(data);
      
      // Ajustar el ancho de las columnas
      const wscols = [
        { wch: 5 },   // #
        { wch: 80 },  // Pregunta
        { wch: 80 },  // Respuesta
        { wch: 25 }   // Fecha
      ];
      ws['!cols'] = wscols;
      
      // Agregar hoja al libro
      XLSX.utils.book_append_sheet(wb, ws, 'Preguntas');
      
      // Generar archivo y descargar
      const fileName = `preguntas_${currentJsonFile || 'export'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
    } catch (err) {
      console.error('Error al exportar a Excel:', err);
      setError('Error al exportar a Excel. Por favor, inténtalo de nuevo.');
    } finally {
      setExporting(false);
    }
  }, [preguntas, respuestas, currentJsonFile]);
  
  // Exportar a CSV
  const exportToCSV = useCallback(() => {
    try {
      setExporting(true);
      
      let csvContent = 'Número,Pregunta,Respuesta,Fecha de Respuesta\n';
      
      // Agregar cada pregunta y su respuesta
      preguntas.forEach((pregunta, index) => {
        // Escapar comas y comillas en los textos
        const escapeCsv = (text) => {
          if (text === null || text === undefined) return '';
          return `"${String(text).replace(/"/g, '""')}"`;
        };
        
        csvContent += [
          index + 1,
          escapeCsv(pregunta),
          escapeCsv(respuestas[index] || 'Sin responder'),
          escapeCsv(respuestas[index] ? new Date().toLocaleString() : 'N/A')
        ].join(',') + '\n';
      });
      
      // Crear y descargar el archivo
      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const fileName = `preguntas_${currentJsonFile || 'export'}_${new Date().toISOString().split('T')[0]}.csv`;
      saveAs(blob, fileName);
      
    } catch (err) {
      console.error('Error al exportar a CSV:', err);
      setError('Error al exportar a CSV. Por favor, inténtalo de nuevo.');
    } finally {
      setExporting(false);
    }
  }, [preguntas, respuestas, currentJsonFile]);

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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Preguntas para Aclarar</h2>
          {currentJsonFile && (
            <p className="text-sm text-slate-500 mt-1">Archivo: {currentJsonFile}</p>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2">
          <div className="relative inline-block group">
            <button
              disabled={exporting || preguntas.length === 0}
              className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiDownload className="mr-2 h-4 w-4" />
              Exportar
            </button>
            <div className="absolute right-0 mt-1 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
              <div className="py-1">
                <button
                  onClick={exportToCSV}
                  disabled={exporting || preguntas.length === 0}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center"
                >
                  <FaFileCsv className="mr-2 text-green-600" />
                  Exportar a CSV
                </button>
                <button
                  onClick={exportToExcel}
                  disabled={exporting || preguntas.length === 0}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center"
                >
                  <FaFileExcel className="mr-2 text-green-700" />
                  Exportar a Excel
                </button>
              </div>
            </div>
          </div>
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
