import React from 'react';

/**
 * Header component for the application
 */
const Header = () => {
  return (
    <header className="mb-8 text-center">
      <h1 className="text-3xl md:text-4xl font-bold text-slate-700">Tablero Kanban con Asignaciones</h1>
      <p className="text-slate-500 mt-2">Sube un JSON o gestiona historias y columnas.</p>
    </header>
  );
};

export default Header;