import React, { useState, useEffect } from 'react';
import api from '../services/api';

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
        {currentJsonFile && (
          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
            Archivo: {currentJsonFile}
          </span>
        )}
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
