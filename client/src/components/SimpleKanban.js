import React, { useState } from 'react';
import KanbanColumn from './KanbanColumn';

/**
 * SimpleKanban - Un componente Kanban simple que implementa arrastrar y soltar sin usar react-beautiful-dnd
 * 
 * @param {Object} props - Propiedades del componente
 * @param {Array} props.columns - Lista de columnas
 * @param {Array} props.stories - Lista de historias
 * @param {Function} props.onStoryMove - Función para manejar el movimiento de historias
 * @param {Function} props.onOpenStoryModal - Función para abrir el modal de historia
 * @param {Function} props.onCriterionCheck - Función para manejar el cambio de estado de un criterio
 * @param {Function} props.onCriteriaReorder - Función para manejar el reordenamiento de criterios
 */
const SimpleKanban = ({ columns, stories, onStoryMove, onOpenStoryModal, onCriterionCheck, onCriteriaReorder }) => {
  const [draggedStory, setDraggedStory] = useState(null);

  // Filtrar historias por columna
  const getStoriesForColumn = (columnId) => {
    return stories
      .filter(story => {
        // Manejar diferentes formatos de IDs de columna
        if (typeof story.column === 'string') {
          return story.column === columnId;
        }
        if (story.column && story.column._id) {
          return story.column._id === columnId;
        }
        return story.column === columnId || story.column === columnId.toString();
      })
      .sort((a, b) => a.position - b.position);
  };

  // Iniciar arrastre
  const handleDragStart = (e, story) => {
    setDraggedStory(story);
    e.dataTransfer.effectAllowed = 'move';
    // Necesario para Firefox
    e.dataTransfer.setData('text/plain', story._id);
    // Añadir clase de estilo para el elemento arrastrado
    e.target.classList.add('dragging');
  };

  // Permitir soltar
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Manejar soltar en una columna
  const handleDrop = (e, columnId) => {
    e.preventDefault();
    if (!draggedStory) return;

    // Limpiar estilos
    document.querySelectorAll('.dragging').forEach(el => {
      el.classList.remove('dragging');
    });

    // Si la historia ya está en esta columna, no hacer nada
    if (draggedStory.column === columnId || 
        (draggedStory.column && draggedStory.column._id === columnId)) {
      return;
    }

    // Calcular la nueva posición (al final de la columna)
    const columnStories = getStoriesForColumn(columnId);
    const newPosition = columnStories.length;

    // Llamar a la función de callback para mover la historia
    onStoryMove(draggedStory._id, columnId, newPosition);
    
    // Limpiar estado
    setDraggedStory(null);
  };

  // Terminar arrastre
  const handleDragEnd = (e) => {
    e.target.classList.remove('dragging');
    setDraggedStory(null);
  };

  return (
    <div className="mb-8 flex overflow-x-auto pb-4">
      {columns.map(column => {
        const columnStories = getStoriesForColumn(column._id);
        
        // Usar el componente KanbanColumn
        return (
          <KanbanColumn
            key={column._id}
            column={column}
            stories={columnStories}
            onOpenStoryModal={onOpenStoryModal}
            onCriterionCheck={onCriterionCheck}
            onCriteriaReorder={onCriteriaReorder}
            onDrop={e => handleDrop(e, column._id)}
            onDragOver={handleDragOver}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          />
        );
      })}
    </div>
  );
};

export default SimpleKanban;
