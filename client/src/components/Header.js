import React from 'react';

/**
 * Header component - Apple Design System
 * Minimalista, claro, con jerarquía tipográfica definida
 */
const Header = () => {
  return (
    <header className="mb-10 pt-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-semibold text-neutral-900 tracking-tight">
            Kanban
          </h1>
          <p className="text-neutral-500 mt-1 text-base">
            Gestiona historias de usuario y asignaciones
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <span className="badge-neutral">
            <span className="w-2 h-2 bg-success-500 rounded-full animate-pulse-soft"></span>
            Sincronizado
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;
