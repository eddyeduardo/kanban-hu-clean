import React, { useState } from 'react';
import DraggableCriteriaList from './DraggableCriteriaList';
import CollapsibleSection from './CollapsibleSection';

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
const StoryCard = ({ story, index, onEdit, onCriterionCheck, onCriteriaReorder, onCriterionDelete, onDragStart, onDragEnd }) => {
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
      <div className="flex justify-between items-start mb-1">
        <h3 className="font-semibold text-blue-600">{story.title || 'Historia sin título'}</h3>
        {story.user && (
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
            {story.user}
          </span>
        )}
      </div>
      
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
        <div className="mt-2">
          <CollapsibleSection 
            title={`Criterios (${story.criteria.length})`} 
            defaultCollapsed={false}
            titleClassName="text-xs font-medium text-slate-500"
          >
            <DraggableCriteriaList
              criteria={story.criteria}
              onCriterionCheck={onCriterionCheck}
              onCriteriaReorder={onCriteriaReorder}
              onCriterionDelete={onCriterionDelete}
              storyId={story._id}
            />
          </CollapsibleSection>
        </div>
      )}
    </div>
  );
};

export default StoryCard;