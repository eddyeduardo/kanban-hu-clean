import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { FiCpu, FiAlertTriangle, FiFileText, FiRefreshCw, FiZap } from 'react-icons/fi';

const InsightsTab = ({ stories, columns }) => {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchInsights = useCallback(async () => {
    if (!stories || stories.length === 0) {
      setInsights([]);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await api.getInsights({ stories, columns });
      setInsights(response.data.insights || []);
    } catch (err) {
      console.error('Error fetching insights:', err);
      setError('No se pudieron generar los insights. Verifica la conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  }, [stories, columns]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const handleRefresh = () => {
    fetchInsights();
  };

  // Determinar el tipo de insight por el emoji
  const getInsightStyle = (insight) => {
    if (insight.includes('⚠️')) return 'border-l-4 border-l-amber-400 bg-amber-50';
    if (insight.includes('✅')) return 'border-l-4 border-l-green-400 bg-green-50';
    if (insight.includes('🎯')) return 'border-l-4 border-l-blue-400 bg-blue-50';
    if (insight.includes('💡')) return 'border-l-4 border-l-yellow-400 bg-yellow-50';
    if (insight.includes('🔄')) return 'border-l-4 border-l-purple-400 bg-purple-50';
    if (insight.includes('👥')) return 'border-l-4 border-l-indigo-400 bg-indigo-50';
    return 'border-l-4 border-l-primary-400 bg-primary-50';
  };

  return (
    <div className="w-full max-w-full box-border">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-2">
        <div className="flex items-center gap-2">
          <FiZap className="w-5 h-5 text-primary-500" />
          <h2 className="text-xl font-semibold text-neutral-900">Insights del Tablero</h2>
          <span className="text-xs bg-primary-100 text-primary-600 px-2 py-0.5 rounded-full">
            Powered by AI
          </span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary-500 text-white rounded-apple hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Analizando...' : 'Regenerar'}
        </button>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center h-64 bg-gradient-to-b from-primary-50 to-white rounded-apple-lg border border-primary-100">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
            <FiCpu className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-primary-500" />
          </div>
          <p className="mt-4 text-neutral-600 font-medium">Analizando el tablero con IA...</p>
          <p className="text-neutral-400 text-sm mt-1">Generando insights personalizados</p>
        </div>
      )}

      {error && !loading && (
        <div className="text-center py-12 bg-danger-50 rounded-apple-lg border border-danger-200">
          <FiAlertTriangle className="mx-auto h-12 w-12 text-danger-400" />
          <h3 className="mt-2 text-lg font-medium text-neutral-900">Error al generar insights</h3>
          <p className="mt-1 text-neutral-500">{error}</p>
          <button
            onClick={handleRefresh}
            className="mt-4 px-4 py-2 text-sm bg-danger-500 text-white rounded-apple hover:bg-danger-600 transition-colors"
          >
            Intentar de nuevo
          </button>
        </div>
      )}

      {!loading && !error && insights.length === 0 && (
        <div className="text-center py-12 bg-neutral-50 rounded-apple-lg border border-neutral-200">
          <FiFileText className="mx-auto h-12 w-12 text-neutral-400" />
          <h3 className="mt-2 text-lg font-medium text-neutral-900">No hay datos suficientes</h3>
          <p className="mt-1 text-neutral-500">Agrega historias al tablero para obtener insights de valor.</p>
        </div>
      )}

      {!loading && !error && insights.length > 0 && (
        <div className="space-y-3">
          {insights.map((insight, index) => (
            <div
              key={index}
              className={`card p-4 ${getInsightStyle(insight)} transition-all hover:shadow-md`}
            >
              <div className="flex items-start gap-3">
                <p className="text-sm text-neutral-800 leading-relaxed">{insight}</p>
              </div>
            </div>
          ))}
          <div className="mt-6 pt-4 border-t border-neutral-200">
            <p className="text-xs text-neutral-400 text-center">
              Insights generados automáticamente basados en los datos actuales del tablero.
              Los análisis se actualizan cada vez que hay cambios en las historias.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default InsightsTab;
