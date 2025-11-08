import React from 'react';
import { NavLink } from 'react-router-dom';

const Sidebar = () => {
  return (
    <div className="w-64 bg-gray-800 text-white flex flex-col">
      <div className="p-4 text-2xl font-bold">Professor</div>
      <nav className="flex-1 px-2 py-4 space-y-2">
        <NavLink
          to="/professor/dashboard"
          className={({ isActive }) =>
            `block px-4 py-2 rounded-md text-sm font-medium ${
              isActive ? 'bg-gray-900' : 'hover:bg-gray-700'
            }`
          }
        >
          Dashboard
        </NavLink>
<NavLink to="/professor/dossiers" className={({ isActive }) => `flex items-center p-2 text-base font-normal rounded-lg ${isActive ? 'bg-gray-700' : 'hover:bg-gray-700'}`}>
          Dossiers
        </NavLink>
        <NavLink
          to="/professor/criteria"
          className={({ isActive }) =>
            `block px-4 py-2 rounded-md text-sm font-medium ${
              isActive ? 'bg-gray-900' : 'hover:bg-gray-700'
            }`
          }
        >
          Critérios
        </NavLink>
        <NavLink
          to="/professor/instruments"
          className={({ isActive }) =>
            `block px-4 py-2 rounded-md text-sm font-medium ${
              isActive ? 'bg-gray-900' : 'hover:bg-gray-700'
            }`
          }
        >
          Instrumentos
        </NavLink>
        <NavLink
          to="/professor/counters"
          className={({ isActive }) =>
            `block px-4 py-2 rounded-md text-sm font-medium ${
              isActive ? 'bg-gray-900' : 'hover:bg-gray-700'
            }`
          }
        >
          Contadores
        </NavLink>
        <NavLink
          to="/professor/student-view"
          className={({ isActive }) =>
            `block px-4 py-2 rounded-md text-sm font-medium ${
              isActive ? 'bg-gray-900' : 'hover:bg-gray-700'
            }`
          }
        >
          Student View
        </NavLink>
      </nav>
    </div>
  );
};

export default Sidebar;