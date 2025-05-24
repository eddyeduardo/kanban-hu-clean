import React, { useState } from 'react';

/**
 * DraggableCriteriaList component for handling drag and drop of criteria
 * 
 * @param {Object} props - Component props
 * @param {Array} props.criteria - List of criteria
 * @param {Function} props.onCriterionCheck - Function to handle criterion check
 * @param {Function} props.onCriteriaReorder - Function to handle criteria reordering
 * @param {String} props.storyId - ID of the story
 */
const DraggableCriteriaList = ({ criteria, onCriterionCheck, onCriteriaReorder, storyId }) => {
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);
  
  // Filtrar criterios no seleccionados (solo estos se pueden reordenar)
  const uncheckedCriteria = criteria.filter(criterion => !criterion.checked);
  const checkedCriteria = criteria.filter(criterion => criterion.checked);
  
  const handleDragStart = (e, index) => {
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Necesario para Firefox
    e.dataTransfer.setData('text/plain', index);
  };
  
  const handleDragOver = (e, index) => {
    e.preventDefault();
    return false;
  };
  
  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    
    // Solo permitir reordenar si se está arrastrando un elemento
    if (draggedItemIndex === null) return;
    
    // Crear una copia de los criterios no seleccionados
    const newUncheckedCriteria = [...uncheckedCriteria];
    
    // Obtener el elemento arrastrado
    const draggedItem = newUncheckedCriteria[draggedItemIndex];
    
    // Eliminar el elemento de su posición original
    newUncheckedCriteria.splice(draggedItemIndex, 1);
    
    // Insertar el elemento en la nueva posición
    newUncheckedCriteria.splice(dropIndex, 0, draggedItem);
    
    // Combinar los criterios no seleccionados reordenados con los seleccionados
    const newCriteria = [...newUncheckedCriteria, ...checkedCriteria];
    
    // Llamar a la función de reordenamiento
    onCriteriaReorder(storyId, newCriteria);
    
    // Resetear el índice del elemento arrastrado
    setDraggedItemIndex(null);
  };
  
  const handleDragEnd = () => {
    setDraggedItemIndex(null);
  };
  
  return (
    <ul className="text-xs text-slate-500 items-list">
      {/* Criterios no seleccionados (arrastrables) */}
      {uncheckedCriteria.map((criterion, idx) => (
        <li 
          key={idx} 
          draggable
          onDragStart={(e) => handleDragStart(e, idx)}
          onDragOver={(e) => handleDragOver(e, idx)}
          onDrop={(e) => handleDrop(e, idx)}
          onDragEnd={handleDragEnd}
          className={`cursor-move py-1 hover:bg-slate-50 rounded ${criterion.isManuallyCreated ? 'bg-green-100' : ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            id={`${storyId}-criterion-${criteria.indexOf(criterion)}`}
            checked={criterion.checked}
            onChange={(e) => onCriterionCheck(storyId, criteria.indexOf(criterion), e.target.checked)}
          />
          <span className={`ml-2 ${criterion.isManuallyCreated ? 'text-blue-500 font-medium' : ''}`}>
            {criterion.text}
          </span>
        </li>
      ))}
      
      {/* Criterios seleccionados (no arrastrables) */}
      {checkedCriteria.map((criterion, idx) => (
        <li 
          key={`checked-${idx}`} 
          className={`py-1 ${criterion.isManuallyCreated ? 'bg-green-100 rounded' : ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            id={`${storyId}-criterion-${criteria.indexOf(criterion)}`}
            checked={criterion.checked}
            onChange={(e) => onCriterionCheck(storyId, criteria.indexOf(criterion), e.target.checked)}
            className="form-checkbox h-3 w-3 text-blue-600 rounded focus:ring-blue-500"
          />
          <label 
            htmlFor={`${storyId}-criterion-${criteria.indexOf(criterion)}`}
            className={`text-content ml-1.5 flex-grow line-through text-slate-400 ${
              criterion.isManuallyCreated ? 'text-blue-500 font-medium' : ''
            }`}
          >
            {criterion.text}
            {criterion.completedAt && (
              <span className="ml-2 text-xs text-slate-400">
                {new Date(criterion.completedAt).toLocaleDateString()}
              </span>
            )}
          </label>
        </li>
      ))}
    </ul>
  );
};

export default DraggableCriteriaList;
