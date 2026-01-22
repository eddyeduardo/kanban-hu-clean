import React, { useState } from 'react';
import { FiPlus, FiZap } from 'react-icons/fi';

/**
 * AddColumnForm component - Apple Design System
 * Formulario limpio con feedback visual claro
 */
const AddColumnForm = ({ onAddColumn, onAutoAddColumns, currentJsonFile, stories }) => {
  const [columnName, setColumnName] = useState('');
  const [isAutoAdding, setIsAutoAdding] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (columnName.trim()) {
      onAddColumn(columnName.trim());
      setColumnName('');
    }
  };

  const handleAutoAdd = async () => {
    if (!onAutoAddColumns) return;
    setIsAutoAdding(true);
    try {
      await onAutoAddColumns();
    } catch (error) {
      console.error('Error al agregar columnas automáticamente:', error);
    } finally {
      setIsAutoAdding(false);
    }
  };

  const uniqueUsersCount = stories
    ? [...new Set(stories.map(s => s.user).filter(u => u && u.trim() !== ''))].length
    : 0;

  return (
    <div className="card p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900">
            Nueva Columna
          </h3>
          {currentJsonFile && (
            <p className="text-sm text-neutral-500 mt-0.5">
              Proyecto: <span className="text-primary-600 font-medium">{currentJsonFile}</span>
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="flex-1">
          <input
            type="text"
            value={columnName}
            onChange={(e) => setColumnName(e.target.value)}
            placeholder="Nombre de la columna..."
            className="input"
          />
        </div>

        <button
          type="submit"
          disabled={!columnName.trim()}
          className="btn-primary"
        >
          <FiPlus className="w-4 h-4" />
          <span className="hidden sm:inline">Crear</span>
        </button>

        {currentJsonFile && onAutoAddColumns && (
          <button
            type="button"
            onClick={handleAutoAdd}
            disabled={isAutoAdding || uniqueUsersCount === 0}
            className="btn-secondary group"
            title={uniqueUsersCount === 0
              ? "No hay usuarios en las historias"
              : `Crear columnas para ${uniqueUsersCount} usuarios`}
          >
            <FiZap className={`w-4 h-4 ${isAutoAdding ? 'animate-pulse' : 'group-hover:text-primary-500'}`} />
            <span className="hidden sm:inline">
              {isAutoAdding ? 'Procesando...' : 'Auto'}
            </span>
            {uniqueUsersCount > 0 && !isAutoAdding && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary-100 text-primary-700 rounded-full">
                {uniqueUsersCount}
              </span>
            )}
          </button>
        )}
      </form>
    </div>
  );
};

export default AddColumnForm;
