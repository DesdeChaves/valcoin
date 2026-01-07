import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom'; // Import Outlet
import FeedbackSidebar from './FeedbackSidebar'; // Import new sidebar
import FeedbackHeader from './FeedbackHeader';   // Import new header
import { getDepartments } from '../../utils/api'; // Import getDepartments

const Layout = ({ onLogout, currentUser, userType, activeTab, setActiveTab }) => {
  return (
    <div className="flex h-screen bg-gray-100">
      <FeedbackSidebar activeTab={activeTab} setActiveTab={setActiveTab} userType={userType} currentUser={currentUser} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <FeedbackHeader onLogout={onLogout} currentUser={currentUser} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6"> {/* Changed bg-gray-200 to bg-gray-100 */}
          <Outlet /> {/* Render nested routes here */}
        </main>
        {/* Removed Footer */}
      </div>
    </div>
  );
};

export default Layout;
