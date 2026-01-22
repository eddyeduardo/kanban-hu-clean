import React, { useState, useEffect } from 'react';
import { FiChevronDown, FiChevronUp, FiUser, FiEdit2, FiTrash2, FiCheck } from 'react-icons/fi';
import DraggableCriteriaList from './DraggableCriteriaList';

/**
 * StoryCard - Apple Design System
 * Tarjeta de historia con diseño elegante y microinteracciones
 */
const StoryCard = ({
  story,
  onEdit,
  onCriterionCheck,
  onCriterionDelete,
  onCriteriaReorder,
  onDragStart,
  onDragEnd,
  onDelete,
  index
}) => {
  const [isCriteriaExpanded, setIsCriteriaExpanded] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const totalCriteria = story.criteria ? story.criteria.length : 0;
  const completedCriteria = story.criteria ? story.criteria.filter(c => c.checked).length : 0;
  const progress = totalCriteria > 0 ? (completedCriteria / totalCriteria) * 100 : 0;
  const isCompleted = !!story.completedAt;

  const handleDragStart = (e) => {
    e.stopPropagation();
    e.currentTarget.classList.add('dragging');
    if (onDragStart) onDragStart(e, story);
  };

  const handleDragEnd = (e) => {
    e.stopPropagation();
    e.currentTarget.classList.remove('dragging');
    if (onDragEnd) onDragEnd(e);
  };

  return (
    <div
      className={`
        kanban-card card p-4
        border-l-[3px]
        ${isCompleted ? 'border-l-success-500 bg-success-50/30' : 'border-l-primary-500'}
        cursor-grab active:cursor-grabbing
        hover:shadow-apple-md
        transition-all duration-200 ease-apple
      `}
      draggable={true}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Header */}
      <div className="flex justify-between items-start gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className={`
            font-semibold text-sm leading-snug
            ${isCompleted ? 'text-success-700' : 'text-neutral-900'}
          `}>
            {story.title || 'Historia sin título'}
          </h3>

          {/* User badge */}
          {story.user && (
            <div className="flex items-center mt-2">
              <span className="badge-primary">
                <FiUser className="w-3 h-3" />
                {story.user}
              </span>
            </div>
          )}
        </div>

        {/* Story ID */}
        <div className="flex-shrink-0">
          <span className="
            text-[10px] font-mono font-medium
            px-2 py-1 rounded-md
            bg-neutral-100 text-neutral-500
            border border-neutral-200
          ">
            {story.id_historia || story._id?.substring(0, 8) || 'N/A'}
          </span>
        </div>
      </div>

      {/* Completed date */}
      {isCompleted && (
        <div className="flex items-center gap-1.5 text-xs text-success-600 mb-2">
          <FiCheck className="w-3.5 h-3.5" />
          <span>Completada el {new Date(story.completedAt).toLocaleDateString()}</span>
        </div>
      )}

      {/* Description */}
      {story.description && (
        <p className="text-sm text-neutral-600 mb-3 line-clamp-2">
          {story.description}
        </p>
      )}

      {/* Criteria section */}
      {totalCriteria > 0 && (
        <div className="mt-3 pt-3 border-t border-neutral-100">
          {/* Criteria header with progress */}
          <button
            className="
              w-full flex items-center justify-between
              text-xs text-neutral-500 hover:text-neutral-700
              transition-colors duration-150
            "
            onClick={(e) => {
              e.stopPropagation();
              setIsCriteriaExpanded(!isCriteriaExpanded);
            }}
          >
            <div className="flex items-center gap-2">
              {isCriteriaExpanded ? (
                <FiChevronUp className="w-3.5 h-3.5" />
              ) : (
                <FiChevronDown className="w-3.5 h-3.5" />
              )}
              <span className="font-medium">Criterios de aceptación</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`
                font-medium
                ${completedCriteria === totalCriteria ? 'text-success-600' : ''}
              `}>
                {completedCriteria}/{totalCriteria}
              </span>
            </div>
          </button>

          {/* Mini progress bar */}
          <div className="mt-2 h-1 bg-neutral-100 rounded-full overflow-hidden">
            <div
              className={`
                h-full rounded-full transition-all duration-300 ease-apple
                ${completedCriteria === totalCriteria ? 'bg-success-500' : 'bg-primary-500'}
              `}
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Criteria list */}
          {isCriteriaExpanded && (
            <div className="mt-3 animate-fade-in">
              <DraggableCriteriaList
                criteria={story.criteria}
                onCriterionCheck={onCriterionCheck}
                onCriterionDelete={onCriterionDelete}
                onCriteriaReorder={onCriteriaReorder}
                storyId={story._id}
              />
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className={`
        mt-3 pt-3 border-t border-neutral-100
        flex justify-end gap-1
        transition-opacity duration-200
        ${showActions ? 'opacity-100' : 'opacity-0'}
      `}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm('¿Eliminar esta historia?')) {
              onDelete(story._id);
            }
          }}
          className="btn-icon w-7 h-7 text-neutral-400 hover:text-danger-500 hover:bg-danger-50"
          title="Eliminar"
        >
          <FiTrash2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(story);
          }}
          className="btn-icon w-7 h-7 text-neutral-400 hover:text-primary-500 hover:bg-primary-50"
          title="Editar"
        >
          <FiEdit2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default StoryCard;
