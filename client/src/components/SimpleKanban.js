import React, { useState, useEffect } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import KanbanColumn from './KanbanColumn';
import api from '../services/api';

// Componente para manejar el arrastre de columnas
const DraggableColumn = ({ column, children, index, moveColumn }) => {
  const ref = React.useRef(null);
  
  const [, drop] = useDrop({
    accept: 'COLUMN',
    hover(item, monitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;
      
      // No hacer nada si estamos sobre el mismo elemento
      if (dragIndex === hoverIndex) {
        return;
      }
      
      // No permitir mover la columna "Por hacer"
      if (column.name === 'Por hacer') {
        return;
      }
      
      // Determinar el tamaño del rectángulo y la posición del puntero
      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleX = (hoverBoundingRect.right - hoverBoundingRect.left) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientX = clientOffset.x - hoverBoundingRect.left;
      
      // Solo realizar el movimiento cuando el mouse ha cruzado la mitad del elemento
      // Arrastrando de izquierda a derecha
      if (dragIndex < hoverIndex && hoverClientX < hoverMiddleX) {
        return;
      }
      // Arrastrando de derecha a izquierda
      if (dragIndex > hoverIndex && hoverClientX > hoverMiddleX) {
        return;
      }
      
      // Mover la columna
      moveColumn(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });
  
  const [{ isDragging }, drag] = useDrag({
    type: 'COLUMN',
    item: () => ({ id: column._id, index }),
    canDrag: column.name !== 'Por hacer',
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });
  
  const opacity = isDragging ? 0.5 : 1;
  
  // Conectar el drag y drop al mismo elemento
  drag(drop(ref));
  
  return (
    <div ref={ref} style={{ opacity }}>
      {children}
    </div>
  );
};

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
const SimpleKanban = ({ 
  columns: propColumns, 
  stories, 
  onStoryMove, 
  onOpenStoryModal, 
  onCriterionCheck, 
  onCriterionDelete, 
  onCriteriaReorder,
  onColumnMove,
  onDeleteStory
}) => {
  const [columns, setColumns] = useState(propColumns);
  
  // Sincronizar las columnas cuando cambian las props
  useEffect(() => {
    setColumns(propColumns);
  }, [propColumns]);
  
  // Función para manejar el reordenamiento de columnas
  const moveColumn = (dragIndex, hoverIndex) => {
    // No permitir mover la columna "Por hacer"
    if (columns[dragIndex]?.name === 'Por hacer' || columns[hoverIndex]?.name === 'Por hacer') {
      return;
    }
    
    // No hacer nada si se suelta en la misma posición
    if (dragIndex === hoverIndex) return;
    
    // Obtener los IDs de las columnas involucradas
    const draggedId = columns[dragIndex]?._id;
    const targetId = columns[hoverIndex]?._id;
    
    if (!draggedId || !targetId) {
      console.error('No se encontraron los IDs de las columnas');
      return;
    }
    
    // Crear una copia del array de columnas
    const newColumns = [...columns];
    // Eliminar la columna arrastrada
    const [movedColumn] = newColumns.splice(dragIndex, 1);
    // Insertar en la nueva posición
    newColumns.splice(hoverIndex, 0, movedColumn);
    
    // Actualizar el estado local
    setColumns(newColumns);
    
    // Llamar a la función de ordenación en el servidor si está disponible
    if (onColumnMove) {
      try {
        console.log('Moviendo columna:', { draggedId, targetId });
        onColumnMove(draggedId, targetId);
      } catch (error) {
        console.error('Error al mover la columna:', error);
        // Revertir los cambios si hay un error
        setColumns(columns);
      }
    }
  };
  

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
  
  // Iniciar arrastre de historia
  const handleDragStart = (e, story) => {
    // No hacer nada si es un arrastre de columna
    if (e.target.closest('.kanban-column-header')) {
      return;
    }
    
    e.stopPropagation();
    setDraggedStory(story);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `story:${story._id}`);
    // Añadir clase de estilo para el elemento arrastrado
    e.target.classList.add('dragging');
    console.log('Iniciando arrastre de historia:', story.title);
  };

  // Permitir soltar
  const handleDragOver = (e) => {
    // Solo permitir soltar si es una historia
    const data = e.dataTransfer.types.includes('text/plain') && 
                 e.dataTransfer.getData('text/plain').startsWith('story:');
    if (data) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  };

  // Manejar soltar en una columna
  const handleDrop = async (e, columnId) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Verificar si se está soltando una historia
    const data = e.dataTransfer.getData('text/plain');
    if (!data.startsWith('story:')) {
      return; // No es una historia, podría ser una columna
    }
    
    const storyId = data.replace('story:', '');
    
    if (!storyId || !draggedStory) {
      console.log('No hay historia arrastrada válida');
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
      
      // Obtener el nombre de la columna de destino
      const targetColumn = columns.find(col => col._id === columnId);
      const columnName = targetColumn ? targetColumn.name : 'Sin columna';
      
      // Actualizar la historia en el servidor con la nueva columna y el usuario
      const updateData = { 
        column: columnId,
        user: columnName // Actualizar el usuario con el nombre de la columna
      };
      
      // Si la historia no tiene id_historia, asegurarse de mantenerlo
      if (draggedStory.id_historia) {
        updateData.id_historia = draggedStory.id_historia;
      }
      
      await api.updateStory(draggedStory._id, updateData);
      
      // Actualizar el estado local
      const updatedStories = localStories.map(story => {
        if (story._id === draggedStory._id) {
          const updatedStory = { 
            ...story, 
            column: columnId,
            column: { _id: columnId },
            user: columnName // Actualizar el usuario localmente también
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
  
  // Manejar la eliminación de una historia
  const handleDeleteStory = async (storyId) => {
    try {
      await onDeleteStory(storyId);
      console.log(`Historia ${storyId} eliminada correctamente`);
    } catch (error) {
      console.error('Error al eliminar la historia:', error);
    }
  };

  return (
    <div className="mb-8 flex overflow-x-auto pb-4" style={{ minHeight: '100%' }}>
      {columns.map((column, index) => {
        const columnStories = getStoriesForColumn(column._id);
        
        return (
          <DraggableColumn 
            key={column._id} 
            column={column} 
            index={index}
            moveColumn={moveColumn}
          >
            <div className="relative">
              <KanbanColumn
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
                onDelete={handleDeleteStory}
              />
            </div>
          </DraggableColumn>
        );
      })}
    </div>
  );
};

export default SimpleKanban;
