import React, { useState } from 'react';

/**
 * AddColumnForm component allows users to add a new column
 *
 * @param {Object} props - Component props
 * @param {Function} props.onAddColumn - Function to handle column addition
 * @param {Function} props.onAutoAddColumns - Function to handle auto-adding columns based on user attribute
 * @param {String} props.currentJsonFile - Current JSON file name (if any)
 * @param {Array} props.stories - List of stories to extract users from
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

  // Contar usuarios únicos en las historias
  const uniqueUsersCount = stories
    ? [...new Set(stories.map(s => s.user).filter(u => u && u.trim() !== ''))].length
    : 0;

  return (
    <div className="mb-8 p-4 bg-white rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-slate-700 mb-2">
        Añadir Nueva Columna
        {currentJsonFile && (
          <span className="ml-2 text-sm font-normal text-blue-600">
            (Proyecto: {currentJsonFile})
          </span>
        )}
        {!currentJsonFile && (
          <span className="ml-2 text-sm font-normal text-slate-500">
            (Columna por defecto)
          </span>
        )}
      </h3>
      <form onSubmit={handleSubmit} className="flex space-x-2">
        <input
          type="text"
          value={columnName}
          onChange={(e) => setColumnName(e.target.value)}
          placeholder={currentJsonFile ? "Nombre de la columna" : "Nombre de la columna por defecto"}
          className="flex-grow p-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 font-semibold"
        >
          Añadir Columna
        </button>
        {currentJsonFile && onAutoAddColumns && (
          <button
            type="button"
            onClick={handleAutoAdd}
            disabled={isAutoAdding || uniqueUsersCount === 0}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 font-semibold disabled:bg-blue-300 disabled:cursor-not-allowed"
            title={uniqueUsersCount === 0 ? "No hay usuarios en las historias" : `Crear columnas para ${uniqueUsersCount} usuarios`}
          >
            {isAutoAdding ? 'Agregando...' : 'Agregar automáticamente'}
          </button>
        )}
      </form>
    </div>
  );
};

export default AddColumnForm;