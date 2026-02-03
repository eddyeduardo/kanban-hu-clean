import React from 'react';

/**
 * TabSystem component - Apple Design System
 * Navegación por pestañas con transiciones suaves
 */
const TabSystem = ({ activeTab, onTabChange, tabs }) => {
  const tabNames = Object.keys(tabs);

  return (
    <div className="w-full max-w-full">
      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-neutral-100 rounded-apple-lg w-fit mb-6 overflow-x-auto">
        {tabNames.map(tabName => (
          <button
            key={tabName}
            className={`
              relative px-4 py-2 text-sm font-medium rounded-apple whitespace-nowrap
              transition-all duration-200 ease-apple
              focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50
              ${activeTab === tabName
                ? 'bg-white text-neutral-900 shadow-apple-sm'
                : 'text-neutral-500 hover:text-neutral-700 hover:bg-white/50'
              }
            `}
            onClick={() => onTabChange(tabName)}
          >
            {tabName}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="w-full max-w-full animate-fade-in">
        {tabs[activeTab]}
      </div>
    </div>
  );
};

export default TabSystem;
