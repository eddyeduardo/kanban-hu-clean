import React from 'react';
import { FiGrid } from 'react-icons/fi';
import AddColumnForm from './AddColumnForm';
import SimpleKanban from './SimpleKanban';

/**
 * KanbanTab component - Apple Design System
 * Contenedor del tablero Kanban con diseño limpio
 */
const KanbanTab = ({
  columns,
  stories,
  onAddColumn,
  onAutoAddColumns,
  onStoryMove,
  onOpenStoryModal,
  onCriterionCheck,
  onCriterionDelete,
  onCriteriaReorder,
  onDeleteStory,
  currentJsonFile
}) => {
  return (
    <div className="kanban-tab">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-apple-lg bg-primary-500 flex items-center justify-center">
          <FiGrid className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-neutral-900">
            Tablero
          </h2>
          {currentJsonFile && (
            <p className="text-sm text-neutral-500">
              {currentJsonFile}
            </p>
          )}
        </div>
      </div>

      {/* Add Column Form */}
      <AddColumnForm
        onAddColumn={onAddColumn}
        onAutoAddColumns={onAutoAddColumns}
        currentJsonFile={currentJsonFile}
        stories={stories}
      />

      {/* Kanban Board */}
      <SimpleKanban
        columns={columns}
        stories={stories}
        onStoryMove={onStoryMove}
        onOpenStoryModal={onOpenStoryModal}
        onCriterionCheck={onCriterionCheck}
        onCriterionDelete={onCriterionDelete}
        onCriteriaReorder={onCriteriaReorder}
        onDeleteStory={onDeleteStory}
      />

      {/* Empty State */}
      {columns.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
          <div className="w-16 h-16 rounded-full bg-neutral-200 flex items-center justify-center mb-4">
            <FiGrid className="w-8 h-8" />
          </div>
          <p className="text-lg font-medium text-neutral-600 mb-1">
            El tablero está vacío
          </p>
          <p className="text-sm">
            Crea una columna o importa un archivo JSON para comenzar
          </p>
        </div>
      )}
    </div>
  );
};

export default KanbanTab;
