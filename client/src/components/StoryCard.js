import React, { useState, useEffect } from 'react';
import DraggableCriteriaList from './DraggableCriteriaList';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';

/**
 * StoryCard - Componente que representa una tarjeta de historia en el tablero Kanban
 * 
 * @param {Object} props - Propiedades del componente
 * @param {Object} props.story - Datos de la historia
 * @param {Function} props.onEdit - Función para editar la historia
 * @param {Function} props.onCriterionCheck - Función para manejar el cambio de estado de un criterio
 * @param {Function} props.onCriterionDelete - Función para manejar la eliminación de un criterio
 * @param {Function} props.onCriteriaReorder - Función para manejar el reordenamiento de criterios
 * @param {boolean} props.draggable - Indica si la tarjeta es arrastrable
 * @param {Function} props.onDragStart - Función para manejar el inicio del arrastre
 * @param {Function} props.onDragEnd - Función para manejar el fin del arrastre
 */
const StoryCard = ({ 
  story, 
  onEdit, 
  onCriterionCheck, 
  onCriterionDelete, 
  onCriteriaReorder,
  onDragStart,
  onDragEnd,
  index
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCriteriaExpanded, setIsCriteriaExpanded] = useState(false);
  const [completedCriteria, setCompletedCriteria] = useState(0);
  const totalCriteria = story.criteria ? story.criteria.length : 0;
  
  // Actualizar el contador de criterios completados cuando cambien los criterios
  useEffect(() => {
    if (story.criteria) {
      const completed = story.criteria.filter(c => c.checked).length;
      setCompletedCriteria(completed);
    }
  }, [story.criteria]);
  
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handleDragStart = (e) => {
    e.stopPropagation();
    if (onDragStart) onDragStart(e, story);
  };

  const handleDragEnd = (e) => {
    e.stopPropagation();
    if (onDragEnd) onDragEnd(e);
  };

  return (
    <div 
      className={`bg-white rounded-lg shadow p-4 mb-3 border-l-4 ${
        story.completedAt ? 'border-green-500' : 'border-blue-500'
      }`}
      draggable={true}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={toggleExpand}
    >
      <div className="flex justify-between items-start mb-1">
        <h3 className="font-semibold text-blue-600">{story.title || 'Historia sin título'}</h3>
        <span 
          className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-mono" 
          title={story.id_historia || story._id}
        >
          {story.id_historia || story._id?.substring(0, 6) || 'N/A'}
        </span>
      </div>
      
      {story.completedAt && (
        <div className="text-xs text-green-600 mb-2">
          Completada el: {new Date(story.completedAt).toLocaleDateString()}
        </div>
      )}
      
      <div className="text-sm text-slate-600 mb-2">
        {story.description && story.description.length > 100 && !isExpanded
          ? `${story.description.substring(0, 100)}...`
          : story.description}
      </div>
      
      {story.criteria && story.criteria.length > 0 && (
        <div className="mt-2">
          <div 
            className="flex items-center text-sm text-slate-600 cursor-pointer hover:text-blue-600"
            onClick={(e) => {
              e.stopPropagation();
              setIsCriteriaExpanded(!isCriteriaExpanded);
            }}
          >
            {isCriteriaExpanded ? (
              <FiChevronUp className="mr-1" />
            ) : (
              <FiChevronDown className="mr-1" />
            )}
            <span>Criterios de aceptación ({completedCriteria}/{totalCriteria})</span>
          </div>
          
          {isCriteriaExpanded && (
            <div className="mt-1">
              <DraggableCriteriaList
                criteria={story.criteria}
                onCriterionCheck={onCriterionCheck}
                onCriterionDelete={onCriterionDelete}
                onCriteriaReorder={onCriteriaReorder}
                storyId={story._id}
              />
            </div>
          )}
        </div>
      )}
      
      <div className="mt-2 flex justify-between items-center text-xs text-slate-500">
        <span>
          {story.criteria ? story.criteria.filter(c => c.checked).length : 0} / {story.criteria?.length || 0} criterios
        </span>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onEdit(story);
          }}
          className="text-blue-600 hover:text-blue-800"
        >
          Editar
        </button>
      </div>
    </div>
  );
};

export default StoryCard;