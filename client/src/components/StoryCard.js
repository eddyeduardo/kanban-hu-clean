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
      } cursor-grab active:cursor-grabbing`}
      draggable={true}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={toggleExpand}
      title="Arrastrar para mover"
    >
      <div className="flex justify-between items-start mb-1">
        <h3 className="font-semibold text-blue-600 flex-grow pr-2">
          {story.title || 'Historia sin título'}
        </h3>
        <div 
          className="flex-shrink-0 group relative"
          title={`ID: ${story.id_historia || story._id || 'N/A'}`}
        >
          <span className="
            text-xs 
            bg-blue-50 
            hover:bg-blue-100 
            text-blue-700 
            px-2 py-1 
            rounded 
            font-mono 
            border border-blue-200 
            transition-colors 
            duration-200
            flex items-center
            cursor-help
          ">
            {story.id_historia || story._id?.substring(0, 8) || 'N/A'}
            {story.id_historia && (
              <span className="ml-1 text-blue-400 group-hover:text-blue-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
                  <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM15 11h2a1 1 0 100-2h-2v2z" />
                </svg>
              </span>
            )}
          </span>
        </div>
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
            <span>Criterios de aceptación</span>
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