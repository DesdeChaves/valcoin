import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import FeedbackSidebar from './FeedbackSidebar';
import FeedbackHeader from './FeedbackHeader';

const Layout = ({ onLogout, currentUser, userType, activeTab, setActiveTab }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <FeedbackSidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen}
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        userType={userType} 
        currentUser={currentUser} 
      />

      {/* Content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <FeedbackHeader 
          onLogout={onLogout} 
          currentUser={currentUser}
          onMenuClick={() => setIsSidebarOpen(true)} 
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 md:p-6">
          <Outlet /> {/* Render nested routes here */}
        </main>
      </div>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black opacity-50 z-10" 
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default Layout;
