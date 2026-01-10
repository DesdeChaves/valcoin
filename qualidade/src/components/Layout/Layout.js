import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import QualidadeSidebar from './QualidadeSidebar';
import QualidadeHeader from './QualidadeHeader';

const Layout = ({ onLogout, currentUser, userType, activeTab, setActiveTab }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-100">
      <QualidadeSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userType={userType}
        currentUser={currentUser}
        isSidebarOpen={isSidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <QualidadeHeader onLogout={onLogout} currentUser={currentUser} setSidebarOpen={setSidebarOpen} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;