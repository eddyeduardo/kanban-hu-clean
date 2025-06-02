import React, { useState, useEffect } from 'react';
import KanbanColumn from './KanbanColumn';
import api from '../services/api';

/**
 * SimpleKanban - Un componente Kanban simple que implementa arrastrar y soltar
 * 
 * @param {Object} props - Propiedades del componente
 * @param {Array} props.columns - Lista de columnas
 * @param {Array} props.stories - Lista de historias
 * @param {Function} props.onStoryMove - Función para manejar el movimiento de historias
 * @param {Function} props.onOpenStoryModal - Función para abrir el modal de historia
 * @param {Function} props.onCriterionCheck - Función para manejar el cambio de estado de un criterio
 * @param {Function} props.onCriterionDelete - Función para manejar la eliminación de un criterio
 * @param {Function} props.onCriteriaReorder - Función para manejar el reordenamiento de criterios
 */
const SimpleKanban = ({ columns, stories, onStoryMove, onOpenStoryModal, onCriterionCheck, onCriterionDelete, onCriteriaReorder }) => {
  const [localStories, setLocalStories] = useState(stories);
  const [draggedStory, setDraggedStory] = useState(null);
  
  // Sincronizar las historias locales cuando cambian las props
  useEffect(() => {
    setLocalStories(stories);
  }, [stories]);
  
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

  // Filtrar historias por columna
  const getStoriesForColumn = (columnId) => {
    if (!localStories) return [];
    
    return localStories
      .filter(story => storyBelongsToColumn(story, columnId))
      .sort((a, b) => (a.position || 0) - (b.position || 0));
  };
  
  // Iniciar arrastre
  const handleDragStart = (e, story) => {
    e.stopPropagation();
    setDraggedStory(story);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', story._id);
    // Añadir clase de estilo para el elemento arrastrado
    e.target.classList.add('dragging');
    console.log('Iniciando arrastre de:', story.title);
  };

  // Permitir soltar
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Manejar soltar en una columna
  const handleDrop = async (e, columnId) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedStory) {
      console.log('No hay historia arrastrada');
      return;
    }

    console.log(`Soltando historia en columna ${columnId}`, { draggedStory });

    // Limpiar estilos
    const draggingElements = document.querySelectorAll('.dragging');
    draggingElements.forEach(el => {
      el.classList.remove('dragging');
    });

    // Si la historia ya está en esta columna, no hacer nada
    if (storyBelongsToColumn(draggedStory, columnId)) {
      console.log('La historia ya está en esta columna');
      setDraggedStory(null);
      return;
    }

    try {
      console.log(`Actualizando historia ${draggedStory._id} a columna ${columnId}`);
      
      // Actualizar la columna de la historia en el servidor
      await api.updateStory(draggedStory._id, { column: columnId });
      
      // Actualizar el estado local
      const updatedStories = localStories.map(story => {
        if (story._id === draggedStory._id) {
          const updatedStory = { 
            ...story, 
            column: columnId,
            column: { _id: columnId } 
          };
          console.log('Historia actualizada:', updatedStory);
          return updatedStory;
        }
        return story;
      });
      
      setLocalStories(updatedStories);
      
      // Si hay un callback de onStoryMove, llamarlo
      if (onStoryMove) {
        const columnStories = getStoriesForColumn(columnId);
        const newPosition = columnStories.length;
        console.log(`Llamando a onStoryMove con posición ${newPosition}`);
        await onStoryMove(draggedStory._id, columnId, newPosition);
      }
    } catch (error) {
      console.error('Error al mover la historia:', error);
    } finally {
      setDraggedStory(null);
    }
  };

  // Terminar arrastre
  const handleDragEnd = (e) => {
    if (e.target) {
      e.target.classList.remove('dragging');
    }
    setDraggedStory(null);
  };

  return (
    <div className="mb-8 flex overflow-x-auto pb-4">
      {columns.map(column => {
        const columnStories = getStoriesForColumn(column._id);
        
        return (
          <KanbanColumn
            key={column._id}
            column={column}
            stories={columnStories}
            onOpenStoryModal={onOpenStoryModal}
            onCriterionCheck={onCriterionCheck}
            onCriterionDelete={onCriterionDelete}
            onCriteriaReorder={onCriteriaReorder}
            onDrop={(e) => handleDrop(e, column._id)}
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
