import React from 'react';
// Removiendo la importación no utilizada de Droppable
import KanbanColumn from './KanbanColumn';

/**
 * KanbanBoard component renders the entire kanban board with all columns
 * 
 * @param {Object} props - Component props
 * @param {Array} props.columns - List of columns
 * @param {Array} props.stories - List of all stories
 * @param {Function} props.onOpenStoryModal - Function to open story modal
 * @param {Function} props.onCriterionCheck - Function to handle criterion check status change
 */
const KanbanBoard = ({ columns, stories, onOpenStoryModal, onCriterionCheck }) => {
  // Función auxiliar para verificar si una historia pertenece a una columna
  const storyBelongsToColumn = (story, columnId) => {
    // Si story.column es un string (ID), comparamos directamente
    if (typeof story.column === 'string') {
      return story.column === columnId;
    }
    
    // Si story.column es un objeto, comparamos con su _id
    if (story.column && story.column._id) {
      return story.column._id === columnId;
    }
    
    // Si story.column es un ObjectId de MongoDB (como string)
    return story.column === columnId || story.column === columnId.toString();
  };

  return (
    <div id="kanbanBoardContainer" className="mb-8 flex overflow-x-auto pb-4">
      {columns.map(column => {
        // Filter stories for this column
        const columnStories = stories.filter(story => storyBelongsToColumn(story, column._id));
        
        // Sort stories by position
        const sortedStories = [...columnStories].sort((a, b) => a.position - b.position);
        
        console.log(`Columna ${column.name}: ${columnStories.length} historias`);
        
        return (
          <KanbanColumn
            key={column._id}
            column={column}
            stories={sortedStories}
            onOpenStoryModal={onOpenStoryModal}
            onCriterionCheck={onCriterionCheck}
          />
        );
      })}
    </div>
  );
};

export default KanbanBoard;