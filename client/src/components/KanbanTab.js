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
    <div className="kanban-tab w-full max-w-full">
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

      {/* Kanban Board or Empty State */}
      {columns.length > 0 ? (
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
      ) : (
        <div className="grid place-items-center py-24 text-neutral-400 w-full animate-in overflow-hidden">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-apple-2xl bg-white shadow-apple-sm flex items-center justify-center mb-6 border border-neutral-100 transition-transform hover:scale-105 duration-300">
              <FiGrid className="w-10 h-10 text-neutral-300" />
            </div>
            <h3 className="text-xl font-semibold text-neutral-800 mb-2">
              El tablero está vacío
            </h3>
            <p className="text-neutral-500 max-w-sm text-balance">
              Crea una columna nueva o importa un archivo JSON para comenzar a organizar tus historias de usuario.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default KanbanTab;
