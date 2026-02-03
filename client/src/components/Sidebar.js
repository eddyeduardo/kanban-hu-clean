import React, { useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiFolder, FiCalendar, FiUpload } from 'react-icons/fi';
import FileUpload from './FileUpload';
import DateRangeSelector from './DateRangeSelector';

/**
 * Sidebar - Apple Design System
 * Menú lateral colapsable con gestión de archivos y fechas
 */
const Sidebar = ({
  currentJsonFile,
  onFileUpload,
  onFileSelect,
  onFileDelete,
  jsonFiles,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={`
        sidebar relative
        bg-white border-r border-neutral-200
        shadow-apple-sm
        transition-all duration-300 ease-apple
        flex flex-col flex-shrink-0
        overflow-y-auto overflow-x-hidden
        ${isCollapsed ? 'w-14' : 'w-[280px]'}
      `}
    >
      {/* Toggle button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`
          absolute -right-3 top-6
          w-6 h-6 rounded-full
          bg-white border border-neutral-200
          shadow-apple-sm
          flex items-center justify-center
          text-neutral-500 hover:text-primary-500
          transition-all duration-200 ease-apple
          z-10
          hover:shadow-apple
        `}
        title={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
      >
        {isCollapsed ? (
          <FiChevronRight className="w-3.5 h-3.5" />
        ) : (
          <FiChevronLeft className="w-3.5 h-3.5" />
        )}
      </button>

      {/* Collapsed state - icon strip */}
      {isCollapsed && (
        <div className="flex flex-col items-center gap-4 pt-14 px-2 animate-fade-in">
          <button
            onClick={() => setIsCollapsed(false)}
            className="btn-icon w-10 h-10 text-neutral-500 hover:text-primary-500 hover:bg-primary-50"
            title="Archivos"
          >
            <FiFolder className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsCollapsed(false)}
            className="btn-icon w-10 h-10 text-neutral-500 hover:text-primary-500 hover:bg-primary-50"
            title="Subir JSON"
          >
            <FiUpload className="w-5 h-5" />
          </button>
          {currentJsonFile && (
            <button
              onClick={() => setIsCollapsed(false)}
              className="btn-icon w-10 h-10 text-neutral-500 hover:text-primary-500 hover:bg-primary-50"
              title="Fechas"
            >
              <FiCalendar className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {/* Expanded state - full content */}
      {!isCollapsed && (
        <div className="flex flex-col h-full overflow-y-auto pt-4 px-4 pb-4 animate-fade-in">
          {/* Current project indicator */}
          {currentJsonFile && (
            <div className="mb-4 pb-4 border-b border-neutral-100">
              <div className="flex items-center gap-2 mb-1">
                <FiFolder className="w-4 h-4 text-primary-500" />
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                  Proyecto actual
                </span>
              </div>
              <p className="text-sm font-semibold text-neutral-900 truncate" title={currentJsonFile}>
                {currentJsonFile}
              </p>
            </div>
          )}

          {/* File selection section */}
          <div className="mb-4 pb-4 border-b border-neutral-100">
            <div className="flex items-center gap-2 mb-3">
              <FiFolder className="w-4 h-4 text-neutral-400" />
              <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                Archivos
              </span>
            </div>
            <FileUpload
              onFileUpload={onFileUpload}
              onFileSelect={onFileSelect}
              onFileDelete={onFileDelete}
              currentJsonFile={currentJsonFile}
              jsonFiles={jsonFiles}
            />
          </div>

          {/* Date range section */}
          {currentJsonFile && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <FiCalendar className="w-4 h-4 text-neutral-400" />
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                  Fechas del Sprint
                </span>
              </div>
              <DateRangeSelector
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={onStartDateChange}
                onEndDateChange={onEndDateChange}
                currentJsonFile={currentJsonFile}
                jsonFiles={jsonFiles}
              />
            </div>
          )}
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
