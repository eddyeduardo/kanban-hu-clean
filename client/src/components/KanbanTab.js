import React from 'react';
import AddColumnForm from './AddColumnForm';
import SimpleKanban from './SimpleKanban';

/**
 * KanbanTab component that groups the Kanban board and the add column form
 *
 * @param {Object} props - Component props
 * @param {Array} props.columns - List of columns
 * @param {Array} props.stories - List of stories
 * @param {Function} props.onAddColumn - Function to handle adding a new column
 * @param {Function} props.onAutoAddColumns - Function to handle auto-adding columns based on user attribute
 * @param {Function} props.onStoryMove - Function to handle moving stories
 * @param {Function} props.onOpenStoryModal - Function to handle opening the story modal
 * @param {Function} props.onCriterionCheck - Function to handle criterion check
 * @param {Function} props.onCriterionDelete - Function to handle criterion deletion
 * @param {Function} props.onCriteriaReorder - Function to handle criteria reordering
 * @param {Function} props.onDeleteStory - Function to handle story deletion
 * @param {String} props.currentJsonFile - Current JSON file name
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
      <h2 className="text-xl font-semibold text-slate-700 mb-4">
        Tablero Kanban
        {currentJsonFile && (
          <span className="ml-2 text-sm font-normal text-blue-600">
            (Proyecto: {currentJsonFile})
          </span>
        )}
      </h2>
      
      <div className="mb-4">
        <AddColumnForm
          onAddColumn={onAddColumn}
          onAutoAddColumns={onAutoAddColumns}
          currentJsonFile={currentJsonFile}
          stories={stories}
        />
      </div>
      
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
      
      {columns.length === 0 && (
        <p className="mt-8 text-center text-slate-500">El tablero está vacío.</p>
      )}
    </div>
  );
};

export default KanbanTab;
