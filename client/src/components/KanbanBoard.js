import React, { useState } from 'react';
import KanbanColumn from './KanbanColumn';
import api from '../services/api';

/**
 * KanbanBoard component renders the entire kanban board with all columns
 * 
 * @param {Object} props - Component props
 * @param {Array} props.columns - List of columns
 * @param {Array} props.stories - List of all stories
 * @param {Function} props.onOpenStoryModal - Function to open story modal
 * @param {Function} props.onCriterionCheck - Function to handle criterion check status change
 * @param {Function} props.onStoriesChange - Function to update stories after drag and drop
 */
const KanbanBoard = ({ columns, stories, onOpenStoryModal, onCriterionCheck, onStoriesChange }) => {
  const [draggedStory, setDraggedStory] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Handle drag start
  const handleDragStart = (e, story) => {
    e.stopPropagation();
    setDraggedStory(story);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', story._id);
  };

  // Handle drag end
  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedStory(null);
  };

  // Handle drag over
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Handle drop
  const handleDrop = async (e, targetColumnId) => {
    e.preventDefault();
    
    if (!draggedStory || draggedStory.column === targetColumnId) {
      return;
    }

    try {
      // Update the story's column in the database
      const updatedStory = { ...draggedStory, column: targetColumnId };
      
      // Call the API to update the story
      await api.updateStory(draggedStory._id, { column: targetColumnId });
      
      // Update the local state
      if (onStoriesChange) {
        const updatedStories = stories.map(story => 
          story._id === draggedStory._id ? { ...story, column: targetColumnId } : story
        );
        onStoriesChange(updatedStories);
      }
      
      console.log(`Moved story ${draggedStory.title} to column ${targetColumnId}`);
    } catch (error) {
      console.error('Error moving story:', error);
    }
  };

  // Handle criteria reordering
  const handleCriteriaReorder = async (storyId, newCriteria) => {
    try {
      // Update the story's criteria in the database
      await api.updateStory(storyId, { criteria: newCriteria });
      
      // Update the local state
      if (onStoriesChange) {
        const updatedStories = stories.map(story => 
          story._id === storyId ? { ...story, criteria: newCriteria } : story
        );
        onStoriesChange(updatedStories);
      }
    } catch (error) {
      console.error('Error reordering criteria:', error);
    }
  };
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
            onCriteriaReorder={handleCriteriaReorder}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column._id)}
          />
        );
      })}
    </div>
  );
};

export default KanbanBoard;