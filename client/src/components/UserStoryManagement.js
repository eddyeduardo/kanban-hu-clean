import React from 'react';
import FileUpload from './FileUpload';
import CollapsibleSection from './CollapsibleSection';
import DateRangeSelector from './DateRangeSelector';

/**
 * UserStoryManagement component for managing user stories
 * 
 * @param {Object} props - Component props
 * @param {String} props.currentJsonFile - Current JSON file name
 * @param {Function} props.onFileUpload - Function to handle file upload
 * @param {Function} props.onFileSelect - Function to handle file selection
 * @param {Array} props.jsonFiles - List of available JSON files
 * @param {Date} props.startDate - Start date for the chart
 * @param {Date} props.endDate - End date for the chart
 * @param {Function} props.onStartDateChange - Function to handle start date change
 * @param {Function} props.onEndDateChange - Function to handle end date change
 */
const UserStoryManagement = ({ 
  currentJsonFile, 
  onFileUpload, 
  onFileSelect, 
  jsonFiles,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onFileDelete
}) => {
  return (
    <CollapsibleSection title="Gestión de Historias de Usuario" initiallyExpanded={!currentJsonFile}>
      <div className="space-y-4">
        <div>
          <div className="flex flex-col md:flex-row md:space-x-4">
            <div className="md:w-1/2">
              <h3 className="text-sm font-medium text-slate-700 mb-2">Seleccionar archivo JSON existente:</h3>
              <FileUpload 
                onFileUpload={onFileUpload} 
                onFileSelect={onFileSelect}
                onFileDelete={onFileDelete}
                currentJsonFile={currentJsonFile}
                jsonFiles={jsonFiles}
              />
            </div>
            {currentJsonFile && (
              <div className="md:w-1/2">
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
        </div>
      </div>
    </CollapsibleSection>
  );
};

export default UserStoryManagement;
