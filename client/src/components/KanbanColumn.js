import React from 'react';
import StoryCard from './StoryCard';

/**
 * KanbanColumn component represents a single column in the Kanban board
 * 
 * @param {Object} props - Component props
 * @param {Object} props.column - Column data
 * @param {Array} props.stories - Stories in this column
 * @param {Function} props.onOpenStoryModal - Function to open story modal
 * @param {Function} props.onCriterionCheck - Function to handle criterion check status change
 * @param {Function} props.onCriteriaReorder - Function to handle criteria reordering
 * @param {Function} props.onDrop - Function to handle drop event
 * @param {Function} props.onDragOver - Function to handle drag over event
 * @param {Function} props.onDragStart - Function to handle drag start event
 * @param {Function} props.onDragEnd - Function to handle drag end event
 */
const KanbanColumn = ({ column, stories, onOpenStoryModal, onCriterionCheck, onCriteriaReorder, onDrop, onDragOver, onDragStart, onDragEnd }) => {
  // Manejar el evento de arrastrar sobre la columna
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    // Llamar al manejador proporcionado si existe
    if (onDragOver) onDragOver(e);
  };

  // Manejar el evento de soltar en la columna
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Llamar al manejador proporcionado si existe
    if (onDrop) onDrop(e);
  };

  return (
    <div
      className="kanban-column bg-slate-200 p-3 rounded-lg shadow flex-shrink-0"
      style={{ width: '300px', marginRight: '1.5rem' }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <div className="flex justify-between items-center mb-3 border-b-2 border-slate-300 pb-2">
        <h2 className="text-lg font-semibold text-slate-700">{column.name}</h2>
        <button 
          className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-300 rounded-full"
          title="Añadir nueva historia"
          onClick={() => onOpenStoryModal(null, column._id)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
        </button>
      </div>
      
      <div className="kanban-column-content space-y-3">
        {stories.map((story, index) => (
          <StoryCard 
            key={story._id} 
            story={story} 
            index={index}
            onEdit={() => onOpenStoryModal(story, column._id)}
            onCriterionCheck={onCriterionCheck}
            onCriteriaReorder={onCriteriaReorder}
            draggable
            onDragStart={e => onDragStart(e, story)}
            onDragEnd={onDragEnd}
          />
        ))}
      </div>
    </div>
  );
};

export default KanbanColumn;