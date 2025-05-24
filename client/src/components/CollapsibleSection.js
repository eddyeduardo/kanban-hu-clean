import React, { useState } from 'react';

/**
 * CollapsibleSection component for creating collapsible sections
 * 
 * @param {Object} props - Component props
 * @param {String} props.title - Title of the section
 * @param {Node} props.children - Content to be displayed inside the section
 * @param {Boolean} props.initiallyExpanded - Whether the section should be initially expanded
 */
const CollapsibleSection = ({ title, children, initiallyExpanded = false }) => {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="border border-slate-200 rounded-lg mb-4">
      <div 
        className="flex justify-between items-center p-3 bg-slate-50 rounded-t-lg cursor-pointer"
        onClick={toggleExpand}
      >
        <h2 className="text-lg font-medium text-slate-700">{title}</h2>
        <button className="text-slate-500 hover:text-blue-600">
          {isExpanded ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </button>
      </div>
      
      {isExpanded && (
        <div className="p-3 border-t border-slate-200">
          {children}
        </div>
      )}
    </div>
  );
};

export default CollapsibleSection;
