import React, { useState } from 'react';

/**
 * AddColumnForm component allows users to add a new column
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onAddColumn - Function to handle column addition
 * @param {String} props.currentJsonFile - Current JSON file name (if any)
 */
const AddColumnForm = ({ onAddColumn, currentJsonFile }) => {
  const [columnName, setColumnName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (columnName.trim()) {
      onAddColumn(columnName.trim());
      setColumnName('');
    }
  };

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
      </form>
    </div>
  );
};

export default AddColumnForm;