import React from 'react';

/**
 * TabSystem component for switching between different views
 * 
 * @param {Object} props - Component props
 * @param {string} props.activeTab - Currently active tab
 * @param {Function} props.onTabChange - Function to handle tab change
 * @param {Object} props.tabs - Object containing tab names as keys and components as values
 */
const TabSystem = ({ activeTab, onTabChange, tabs }) => {
  const tabNames = Object.keys(tabs);
  
  return (
    <div className="mb-6">
      <div className="flex border-b border-slate-200">
        {tabNames.map(tabName => (
          <button
            key={tabName}
            className={`py-2 px-4 font-medium text-sm focus:outline-none ${
              activeTab === tabName
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
            onClick={() => onTabChange(tabName)}
          >
            {tabName}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {tabs[activeTab]}
      </div>
    </div>
  );
};

export default TabSystem;
