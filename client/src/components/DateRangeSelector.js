import React, { useEffect } from 'react';

/**
 * DateRangeSelector component for selecting date range for Burn Down Chart
 * 
 * @param {Object} props - Component props
 * @param {Date} props.startDate - Start date for the chart
 * @param {Date} props.endDate - End date for the chart
 * @param {Function} props.onStartDateChange - Function to handle start date change
 * @param {Function} props.onEndDateChange - Function to handle end date change
 * @param {String} props.currentJsonFile - Current JSON file name
 * @param {Array} props.jsonFiles - List of available JSON files
 */
const DateRangeSelector = ({ 
  startDate, 
  endDate, 
  onStartDateChange, 
  onEndDateChange,
  currentJsonFile,
  jsonFiles
}) => {
  // Función para calcular el primer viernes después de una fecha
  const getNextFriday = (date) => {
    const result = new Date(date);
    // Si ya es viernes (5), avanzar una semana
    if (date.getDay() === 5) {
      result.setDate(date.getDate() + 7);
      return result;
    }
    // Calcular días hasta el próximo viernes
    result.setDate(date.getDate() + (5 - date.getDay() + 7) % 7);
    return result;
  };

  // Ya no actualizamos las fechas automáticamente aquí, ahora se gestionan desde App.js
  // y se cargan desde la base de datos

  // Formatear fecha para el input date (YYYY-MM-DD)
  const formatDateForInput = (date) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  return (
    <div className="date-range-selector">
      <div className="flex flex-col md:flex-row md:space-x-4">
        <div className="mb-2 md:mb-0">
          <label className="block text-xs font-medium text-gray-600 mb-1">Fecha Inicio:</label>
          <input
            type="date"
            className="border border-gray-300 rounded p-2 w-full"
            value={formatDateForInput(startDate)}
            onChange={(e) => onStartDateChange(new Date(e.target.value))}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Fecha Fin:</label>
          <input
            type="date"
            className="border border-gray-300 rounded p-2 w-full"
            value={formatDateForInput(endDate)}
            onChange={(e) => onEndDateChange(new Date(e.target.value))}
          />
        </div>
      </div>
    </div>
  );
};

export default DateRangeSelector;
