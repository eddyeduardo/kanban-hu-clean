import React, { useMemo } from 'react';
import { FiPlus } from 'react-icons/fi';
import StoryCard from './StoryCard';
import { sortStoriesWithCompletedLast } from '../utils/storyUtils';

/**
 * KanbanColumn component - Apple Design System
 * Columna de Kanban con diseño limpio y minimalista
 */
const KanbanColumn = ({
  column,
  stories,
  onOpenStoryModal,
  onCriterionCheck,
  onCriterionDelete,
  onCriteriaReorder,
  onDrop,
  onDragOver,
  onDragStart,
  onDragEnd,
  onDelete
}) => {
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const data = e.dataTransfer.getData('text/plain');
    if (!data.startsWith('column:') && onDrop) {
      onDrop(e, column._id);
    }
  };

  const sortedStories = useMemo(() => {
    return sortStoriesWithCompletedLast(stories);
  }, [stories]);

  const completedCount = stories.filter(story => !!story.completedAt).length;
  const totalCount = stories.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div
      className="kanban-column bg-neutral-100/80 rounded-apple-xl flex-shrink-0 flex flex-col"
      style={{ width: '320px' }}
      data-column-id={column._id}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* Column Header */}
      <div className="p-4 pb-3">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-neutral-900 truncate">
              {column.name}
            </h2>
          </div>
          <div className="flex items-center gap-2 ml-2">
            {totalCount > 0 && (
              <span className="badge-primary text-xs">
                {completedCount}/{totalCount}
              </span>
            )}
            <button
              className="btn-icon w-8 h-8"
              title="Agregar historia"
              onClick={() => onOpenStoryModal(null, column._id)}
            >
              <FiPlus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        {totalCount > 0 && (
          <div className="h-1 bg-neutral-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-success-500 rounded-full transition-all duration-500 ease-apple"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Column Content */}
      <div className="kanban-column-content flex-1 px-3 pb-3 space-y-2.5 overflow-y-auto">
        {sortedStories.map((story, index) => (
          <StoryCard
            key={story._id}
            story={story}
            index={index}
            onEdit={() => onOpenStoryModal(story, column._id)}
            onCriterionCheck={onCriterionCheck}
            onCriterionDelete={onCriterionDelete}
            onCriteriaReorder={onCriteriaReorder}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDelete={onDelete}
          />
        ))}

        {/* Empty state */}
        {sortedStories.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-neutral-400">
            <div className="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center mb-3">
              <FiPlus className="w-5 h-5" />
            </div>
            <p className="text-sm">Sin historias</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;
