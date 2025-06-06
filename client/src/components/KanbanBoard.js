import React, { useState, useRef, useCallback } from 'react';
import KanbanColumn from './KanbanColumn';
import api from '../services/api';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Componente de columna arrastrable
const DraggableColumn = ({ column, index, moveColumn, children }) => {
  const ref = useRef(null);
  
  const [{ isDragging }, drag] = useDrag({
    type: 'COLUMN',
    item: { id: column._id, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });
  
  const [, drop] = useDrop({
    accept: 'COLUMN',
    hover(item, monitor) {
      if (!ref.current) return;
      
      const dragIndex = item.index;
      const hoverIndex = index;
      
      // No reemplazar elementos consigo mismos
      if (dragIndex === hoverIndex) return;
      
      // Determinar el rectángulo en pantalla
      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      if (!hoverBoundingRect) return;
      
      // Obtener la posición horizontal media
      const hoverMiddleX = (hoverBoundingRect.right - hoverBoundingRect.left) / 2;
      
      // Obtener la posición del ratón
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;
      
      // Obtener píxeles a la izquierda
      const hoverClientX = clientOffset.x - hoverBoundingRect.left;
      
      // Solo realizar el movimiento cuando el ratón haya cruzado la mitad del elemento
      if (dragIndex < hoverIndex && hoverClientX < hoverMiddleX) return;
      if (dragIndex > hoverIndex && hoverClientX > hoverMiddleX) return;
      
      // Realizar el movimiento
      moveColumn(dragIndex, hoverIndex);
      
      // Actualizar el índice del elemento arrastrado
      item.index = hoverIndex;
    },
  });
  
  const opacity = isDragging ? 0.5 : 1;
  
  // Usar useCallback para la referencia del drag and drop
  const setRef = useCallback(
    (node) => {
      ref.current = node;
      drag(drop(node));
    },
    [drag, drop]
  );
  
  return (
    <div 
      ref={setRef}
      style={{ 
        opacity,
        cursor: 'move',
        transition: 'opacity 0.2s ease-in-out'
      }} 
      className="flex-shrink-0 w-80 mx-2"
    >
      {children}
    </div>
  );
};

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

  // Handle drag over for stories
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Mover una columna
  const moveColumn = useCallback((dragIndex, hoverIndex) => {
    if (dragIndex === hoverIndex) return;
    
    // Crear una copia del array de columnas
    const newColumns = [...columns];
    const [movedColumn] = newColumns.splice(dragIndex, 1);
    newColumns.splice(hoverIndex, 0, movedColumn);
    
    // Actualizar el orden en la base de datos
    updateColumnOrder(newColumns);
    
    // Nota: No actualizamos el estado local aquí, esperamos a que la API confirme
    // Esto evita problemas de sincronización
  }, [columns]);
  
  // Actualizar el orden de las columnas en la base de datos
  const updateColumnOrder = async (newColumns) => {
    try {
      // Actualizar el orden en la base de datos
      await api.updateColumnOrder(newColumns.map(col => col._id));
      
      // Nota: El padre debe manejar la actualización del estado de las columnas
      // Esto asegura que el estado esté sincronizado con la base de datos
    } catch (error) {
      console.error('Error al actualizar el orden de las columnas:', error);
      // Podríamos querer revertir el cambio visual aquí
    }
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

  // Verificar que hay columnas para mostrar
  if (!columns || columns.length === 0) {
    return <div className="text-center p-4">No hay columnas para mostrar</div>;
  }
  
  // Asegurarse de que las columnas tengan un _id
  const validColumns = columns.filter(col => col && col._id);

  return (
    <DndProvider backend={HTML5Backend}>
      <div 
        id="kanbanBoardContainer" 
        className="mb-8 flex overflow-x-auto pb-4 px-2 min-h-screen"
        style={{ minHeight: 'calc(100vh - 200px)' }}
      >
        {validColumns.map((column, index) => {
          // Filter stories for this column
          const columnStories = stories.filter(story => storyBelongsToColumn(story, column._id));
          
          // Sort stories by position
          const sortedStories = [...columnStories].sort((a, b) => a.position - b.position);
          
          return (
            <DraggableColumn 
              key={column._id} 
              column={column} 
              index={index}
              moveColumn={moveColumn}
            >
              <div key={column._id} className="h-full">
                <KanbanColumn
                  column={column}
                  stories={sortedStories}
                  onOpenStoryModal={onOpenStoryModal}
                  onCriterionCheck={onCriterionCheck}
                  onCriteriaReorder={handleCriteriaReorder}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, column._id)}
                  data-column-id={column._id}
                />
              </div>
            </DraggableColumn>
          );
        })}
      </div>
    </DndProvider>
  );
};

export default KanbanBoard;