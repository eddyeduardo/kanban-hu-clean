import React, { useState, useRef, useEffect } from 'react';
import { FiChevronDown, FiChevronUp, FiUser, FiEdit2, FiTrash2, FiCheck, FiZap, FiTag, FiArrowRight } from 'react-icons/fi';
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
  onMoveToColumn,
  columns,
  index
}) => {
  const [isCriteriaExpanded, setIsCriteriaExpanded] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const moveMenuRef = useRef(null);

  // Cerrar el menú al hacer clic fuera
  useEffect(() => {
    if (!showMoveMenu) return;
    const handleClickOutside = (e) => {
      if (moveMenuRef.current && !moveMenuRef.current.contains(e.target)) {
        setShowMoveMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMoveMenu]);

  // Columna actual de la historia
  const currentColumnId = typeof story.column === 'object' ? story.column?._id : story.column;
  const otherColumns = (columns || []).filter(col => col._id !== currentColumnId);

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
      {/* Story ID - Prioridad 2 */}
      <div className="flex items-center justify-between mb-2">
        <span className="
          inline-flex items-center gap-1.5
          text-xs font-semibold tracking-wide
          px-2.5 py-1 rounded-md
          bg-primary-50 text-primary-600
          border border-primary-100
        ">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          {story.id_historia || story._id?.substring(0, 8) || 'N/A'}
        </span>
        {isCompleted && (
          <span className="flex items-center gap-1 text-[10px] text-success-600 font-medium">
            <FiCheck className="w-3 h-3" />
          </span>
        )}
      </div>

      {/* Title - Prioridad 1 */}
      <h3 className={`
        font-semibold text-[15px] leading-snug mb-2
        ${isCompleted ? 'text-success-700' : 'text-neutral-900'}
      `}>
        {story.title || 'Historia sin título'}
      </h3>

      {/* Metadata badges: User, Esfuerzo, Tipo */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        {story.user && (
          <span className="badge-neutral text-xs">
            <FiUser className="w-3 h-3" />
            {story.user}
          </span>
        )}
        {story.esfuerzo && (
          <span className="
            inline-flex items-center gap-1
            text-[11px] font-medium
            px-2 py-0.5 rounded-md
            bg-amber-50 text-amber-700
            border border-amber-200
          ">
            <FiZap className="w-3 h-3" />
            {story.esfuerzo} pts
          </span>
        )}
        {story.tipo && (
          <span className="
            inline-flex items-center gap-1
            text-[11px] font-medium
            px-2 py-0.5 rounded-md
            bg-violet-50 text-violet-700
            border border-violet-200
          ">
            <FiTag className="w-3 h-3" />
            {story.tipo}
          </span>
        )}
      </div>

      {/* Completed date */}
      {isCompleted && (
        <div className="text-[11px] text-success-600 mb-2">
          Completada el {new Date(story.completedAt).toLocaleDateString()}
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

        {/* Botón Mover a columna */}
        {onMoveToColumn && otherColumns.length > 0 && (
          <div className="relative" ref={moveMenuRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMoveMenu(prev => !prev);
              }}
              className="btn-icon w-7 h-7 text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50"
              title="Mover a columna"
            >
              <FiArrowRight className="w-3.5 h-3.5" />
            </button>

            {showMoveMenu && (
              <div className="
                absolute bottom-full right-0 mb-1 z-50
                bg-white rounded-apple-lg shadow-apple-lg border border-neutral-100
                py-1 min-w-[160px]
                animate-fade-in
              ">
                <p className="px-3 py-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                  Mover a
                </p>
                {otherColumns.map(col => (
                  <button
                    key={col._id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMoveMenu(false);
                      onMoveToColumn(story, col._id);
                    }}
                    className="
                      w-full text-left px-3 py-1.5
                      text-sm text-neutral-700
                      hover:bg-primary-50 hover:text-primary-700
                      transition-colors duration-100
                    "
                  >
                    {col.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StoryCard;
