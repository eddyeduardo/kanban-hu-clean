import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

// Datos de ejemplo
const initialItems = [
  { id: 'item-1', content: 'Item 1' },
  { id: 'item-2', content: 'Item 2' },
  { id: 'item-3', content: 'Item 3' },
];

const DragTest = () => {
  const [items, setItems] = useState(initialItems);

  const onDragEnd = (result) => {
    console.log('Drag result:', result);
    
    // Si no hay destino o el destino es el mismo que el origen, no hacer nada
    if (!result.destination || result.destination.index === result.source.index) {
      return;
    }

    // Reordenar los items
    const newItems = Array.from(items);
    const [removed] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, removed);

    setItems(newItems);
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md mb-8">
      <h2 className="text-lg font-semibold mb-4">Prueba de Drag and Drop</h2>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="droppable-test">
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={`p-4 border-2 ${snapshot.isDraggingOver ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}
            >
              {items.map((item, index) => (
                <Draggable key={item.id} draggableId={item.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`p-3 mb-2 rounded-md ${
                        snapshot.isDragging ? 'bg-blue-100' : 'bg-gray-100'
                      }`}
                    >
                      {item.content}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};

export default DragTest;
