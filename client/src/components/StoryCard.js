import React from 'react';
import DraggableCriteriaList from './DraggableCriteriaList';

/**
 * StoryCard component represents a user story card that can be dragged
 * 
 * @param {Object} props - Component props
 * @param {Object} props.story - Story data
 * @param {number} props.index - Position index in the column
 * @param {Function} props.onEdit - Function to edit this story
 * @param {Function} props.onCriterionCheck - Function to handle criterion check status change
 * @param {Function} props.onCriteriaReorder - Function to handle criteria reordering
 * @param {Function} props.onDragStart - Function to handle drag start event
 * @param {Function} props.onDragEnd - Function to handle drag end event
 */
const StoryCard = ({ story, index, onEdit, onCriterionCheck, onCriteriaReorder, onDragStart, onDragEnd }) => {
  const draggable = true;

  // Manejar el inicio del arrastre
  const handleDragStart = (e) => {
    e.stopPropagation();
    // Asegurarse de que el efecto sea 'move'
    e.dataTransfer.effectAllowed = 'move';
    // Establecer los datos que se transferirán
    e.dataTransfer.setData('text/plain', story._id);
    // Añadir clase para el estilo durante el arrastre
    e.currentTarget.classList.add('dragging');
    // Llamar al manejador proporcionado si existe
    if (onDragStart) onDragStart(e, story);
  };

  // Manejar el final del arrastre
  const handleDragEnd = (e) => {
    e.stopPropagation();
    // Remover la clase de arrastre
    e.currentTarget.classList.remove('dragging');
    // Llamar al manejador proporcionado si existe
    if (onDragEnd) onDragEnd(e);
  };

  return (
    <div
      className="kanban-card bg-white p-3 rounded-md shadow-sm cursor-grab active:cursor-grabbing text-sm"
      draggable={true}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={onEdit}
    >
      <h3 className="font-semibold text-blue-600 mb-1">{story.title || 'Historia sin título'}</h3>
      
      {story.completedAt && (
        <div className="text-xs text-green-600 font-medium mt-1 mb-2">
          <span className="mr-1">✓</span>
          Completada: {new Date(story.completedAt).toLocaleDateString()} 
          {story.createdAt && (
            <span className="text-slate-500">
              (Duración: {Math.ceil((new Date(story.completedAt) - new Date(story.createdAt)) / (1000 * 60 * 60 * 24))} días)
            </span>
          )}
        </div>
      )}
      
      {story.criteria && story.criteria.length > 0 && (
        <>
          <p className="text-xs font-medium text-slate-500 mb-1 mt-2">Criterios:</p>
          <DraggableCriteriaList
            criteria={story.criteria}
            onCriterionCheck={onCriterionCheck}
            onCriteriaReorder={onCriteriaReorder}
            storyId={story._id}
          />
        </>
      )}
    </div>
  );
};

export default StoryCard;